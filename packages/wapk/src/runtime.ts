import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, watch } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, delimiter, dirname, isAbsolute, join, resolve } from 'node:path';

import type { WapkGoogleDriveConfig } from '@elitjs/config';

import {
    DEFAULT_WAPK_PORT,
    WAPK_LOCKED_VERSION,
    type PreparedWapkApp,
    type WapkCredentialsOptions,
    type WapkLaunchCommand,
    type WapkLiveSyncController,
    type WapkRuntimeName,
    findNearestPackageDirectory,
    isRecord,
    normalizeNonEmptyString,
    normalizePackageEntry,
    readJsonFile,
    resolveArchiveCredentials,
    tokenizeCommand,
} from './shared';
import {
    applyArchiveFilesToWorkDir,
    collectRuntimeSyncFiles,
    decodeWapk,
    extractFiles,
    filesEqual,
    parseWapkEnvelope,
    readArchiveRuntimeState,
    writeWapkArchiveFromMemory,
} from './archive';
import { resolveArchiveHandle } from './remote';

function isTypescriptRuntimeEntry(filePath: string): boolean {
    return /\.(?:ts|tsx|cts|mts)$/i.test(filePath);
}

function commandExists(command: string): boolean {
    const result = spawnSync(command, ['--version'], {
        stdio: 'ignore',
        windowsHide: true,
    });

    return !result.error;
}

function resolveTsxExecutable(searchDirectories: readonly string[]): string | undefined {
    const executableName = process.platform === 'win32' ? 'tsx.cmd' : 'tsx';

    for (const directory of searchDirectories) {
        const localPath = join(directory, 'node_modules', '.bin', executableName);
        if (existsSync(localPath)) {
            return localPath;
        }
    }

    return commandExists(executableName) ? executableName : undefined;
}

function readUtf8FileIfExists(filePath: string): string | undefined {
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
        return undefined;
    }

    return readFileSync(filePath, 'utf8');
}

function hasLikelyWebAppAssets(directory: string): boolean {
    return [
        'public/index.html',
        'index.html',
        'dist/index.html',
    ].some((relativePath) => existsSync(join(directory, ...relativePath.split('/'))));
}

function isLikelyBrowserEntry(entryPath: string): boolean {
    const source = readUtf8FileIfExists(entryPath);
    if (!source) {
        return false;
    }

    return /dom\.render\s*\(|\bwindow\.|\bdocument\.|\bnavigator\.|\blocation\.|from\s+['"]elit\/dom['"]/.test(source);
}

function resolveLocalBinExecutable(directory: string, command: string): string {
    if (command.includes('/') || command.includes('\\')) {
        return isAbsolute(command) ? command : resolve(directory, command);
    }

    const localBinDirectory = join(directory, 'node_modules', '.bin');
    const directLocalPath = join(localBinDirectory, command);

    if (process.platform === 'win32') {
        for (const extension of ['.cmd', '.exe']) {
            const localPath = join(localBinDirectory, `${command}${extension}`);
            if (existsSync(localPath)) {
                return localPath;
            }
        }

        if (existsSync(directLocalPath)) {
            return directLocalPath;
        }

        switch (command) {
            case 'npm':
                return 'npm.cmd';
            case 'npx':
                return 'npx.cmd';
            case 'pnpm':
                return 'pnpm.cmd';
            case 'pnpx':
                return 'pnpx.cmd';
            case 'yarn':
                return 'yarn.cmd';
            case 'tsx':
                return 'tsx.cmd';
            case 'elit':
                return 'elit.cmd';
            default:
                return command;
        }
    }

    if (existsSync(directLocalPath)) {
        return directLocalPath;
    }

    return command;
}

function resolvePackagedNodeBinScript(directory: string, command: string): string | undefined {
    if (command.includes('/') || command.includes('\\')) {
        return undefined;
    }

    const packageDirectory = join(directory, 'node_modules', ...command.split('/'));
    const packageJson = readJsonFile(join(packageDirectory, 'package.json'));
    if (!packageJson) {
        return undefined;
    }

    let binEntry: string | undefined;
    if (typeof packageJson.bin === 'string') {
        const packageName = normalizeNonEmptyString(packageJson.name);
        if (packageName === command) {
            binEntry = packageJson.bin;
        }
    } else if (isRecord(packageJson.bin)) {
        const directBin = packageJson.bin[command];
        if (typeof directBin === 'string') {
            binEntry = directBin;
        } else {
            const packageName = normalizeNonEmptyString(packageJson.name);
            if (packageName === command) {
                const entries = Object.values(packageJson.bin).filter((value): value is string => typeof value === 'string');
                if (entries.length === 1) {
                    binEntry = entries[0];
                }
            }
        }
    }

    const normalizedBinEntry = typeof binEntry === 'string'
        ? normalizePackageEntry(binEntry)
        : undefined;
    if (!normalizedBinEntry) {
        return undefined;
    }

    const binPath = resolve(packageDirectory, normalizedBinEntry);
    return existsSync(binPath) && statSync(binPath).isFile()
        ? binPath
        : undefined;
}

function prependLocalNodeModulesBinToPath(directory: string, env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
    const localBinDirectory = join(directory, 'node_modules', '.bin');
    if (!existsSync(localBinDirectory)) {
        return env;
    }

    const pathKey = Object.keys(env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';
    const currentPath = env[pathKey];

    return {
        ...env,
        [pathKey]: currentPath ? `${localBinDirectory}${delimiter}${currentPath}` : localBinDirectory,
    };
}

function hasShellMetacharacters(command: string): boolean {
    return /&&|\|\||[|;<>]/.test(command);
}

export function shouldUseShellExecution(command: string, platform: NodeJS.Platform = process.platform): boolean {
    return platform === 'win32' && /\.(?:cmd|bat|ps1)$/i.test(command);
}

function resolveWapkStartScript(prepared: PreparedWapkApp): string | undefined {
    const startScript = normalizeNonEmptyString(prepared.header.scripts.start);
    if (!startScript || prepared.runtimeWasExplicitlyRequested) {
        return undefined;
    }

    if (!existsSync(join(prepared.workDir, 'package.json'))) {
        return undefined;
    }

    if (isLikelyBrowserEntry(prepared.entryPath)) {
        return startScript;
    }

    return hasLikelyWebAppAssets(prepared.workDir) && /\b(?:preview|serve|dev)\b/i.test(startScript)
        ? startScript
        : undefined;
}

function resolveWapkStartScriptLaunchCommand(
    prepared: PreparedWapkApp,
    env: NodeJS.ProcessEnv,
    startScript: string,
): WapkLaunchCommand {
    const launchEnv = prependLocalNodeModulesBinToPath(prepared.workDir, env);

    if (hasShellMetacharacters(startScript)) {
        return {
            executable: startScript,
            args: [],
            env: launchEnv,
            label: `scripts.start (${startScript})`,
            shell: true,
        };
    }

    const tokens = tokenizeCommand(startScript);
    if (tokens.length === 0) {
        throw new Error('WAPK scripts.start is empty.');
    }

    const [command, ...args] = tokens;
    const packagedBinScript = resolvePackagedNodeBinScript(prepared.workDir, command);
    if (packagedBinScript) {
        return {
            executable: resolveWapkRuntimeExecutable('node'),
            args: [packagedBinScript, ...args],
            env: launchEnv,
            label: `scripts.start (${startScript})`,
        };
    }

    const executable = resolveLocalBinExecutable(prepared.workDir, command);

    return {
        executable,
        args,
        env: launchEnv,
        label: `scripts.start (${startScript})`,
        shell: shouldUseShellExecution(executable),
    };
}

function resolveWapkEntryLaunchCommand(
    prepared: PreparedWapkApp,
    env: NodeJS.ProcessEnv,
): WapkLaunchCommand {
    const isNodeTypescriptEntry = prepared.runtime === 'node' && isTypescriptRuntimeEntry(prepared.entryPath);
    const tsxExecutable = isNodeTypescriptEntry
        ? resolveTsxExecutable([prepared.workDir, process.cwd()])
        : undefined;

    if (isNodeTypescriptEntry && !tsxExecutable) {
        throw new Error('TypeScript WAPK execution with runtime "node" requires tsx to be installed, or use runtime "bun".');
    }

    const executable = tsxExecutable ?? resolveWapkRuntimeExecutable(prepared.runtime);
    const args = tsxExecutable
        ? [prepared.entryPath]
        : getWapkRuntimeArgs(prepared.runtime, prepared.entryPath);

    return {
        executable,
        args,
        env,
        label: tsxExecutable ? 'entry via tsx' : 'entry',
        shell: shouldUseShellExecution(executable),
    };
}

function resolveWapkLaunchCommand(
    prepared: PreparedWapkApp,
    env: NodeJS.ProcessEnv,
): WapkLaunchCommand {
    const startScript = resolveWapkStartScript(prepared);
    if (startScript) {
        return resolveWapkStartScriptLaunchCommand(prepared, env, startScript);
    }

    return resolveWapkEntryLaunchCommand(prepared, env);
}

function resolveRuntimeExecutable(runtime: WapkRuntimeName): string {
    const executableName = basename(process.execPath).toLowerCase();

    if (runtime === 'node' && process.release?.name === 'node' && executableName.startsWith('node')) {
        return process.execPath;
    }

    if (runtime === 'bun' && process.versions?.bun && executableName.startsWith('bun')) {
        return process.execPath;
    }

    return runtime;
}

function ensureRuntimeAvailable(runtime: WapkRuntimeName, executable: string): void {
    const result = spawnSync(executable, ['--version'], {
        stdio: 'ignore',
        windowsHide: true,
    });

    if (result.error) {
        if ((result.error as NodeJS.ErrnoException).code === 'ENOENT') {
            throw new Error(`WAPK runtime "${runtime}" was not found in PATH.`);
        }

        throw result.error;
    }
}

export function getWapkRuntimeArgs(runtime: WapkRuntimeName, entryPath: string): string[] {
    switch (runtime) {
        case 'bun':
            return ['run', entryPath];
        case 'deno':
            return ['run', '--allow-all', entryPath];
        default:
            return [entryPath];
    }
}

export function resolveWapkRuntimeExecutable(runtime: WapkRuntimeName): string {
    const executable = resolveRuntimeExecutable(runtime);
    ensureRuntimeAvailable(runtime, executable);
    return executable;
}

export function createWapkLiveSync(prepared: PreparedWapkApp): WapkLiveSyncController {
    const syncOptions = { includeNodeModules: prepared.syncIncludesNodeModules };
    let memoryFiles = collectRuntimeSyncFiles(prepared.workDir, syncOptions);
    const syncInterval = prepared.syncInterval ?? 300;
    const archiveSyncInterval = prepared.archiveSyncInterval ?? syncInterval;
    const watchArchive = prepared.watchArchive ?? true;
    let currentHeader = prepared.header;
    let currentArchiveLabel = prepared.archiveLabel;
    let stopped = false;
    let lastArchiveSignature = prepared.archiveSignature;
    let lastArchivePollAt = 0;
    let pendingOperation = Promise.resolve();

    const reportSyncError = (error: unknown): void => {
        console.warn(
            `[wapk] Sync error for ${currentArchiveLabel}: ${error instanceof Error ? error.message : String(error)}`,
        );
    };

    const pullArchiveChanges = async (): Promise<boolean> => {
        if (!watchArchive) {
            return false;
        }

        const archiveSignature = await prepared.archiveHandle.getSignature();
        if (!archiveSignature || archiveSignature === lastArchiveSignature) {
            return false;
        }

        try {
            const archiveState = await readArchiveRuntimeState(prepared.archiveHandle, prepared.lock, syncOptions);
            lastArchiveSignature = archiveState.signature ?? archiveSignature;
            currentHeader = archiveState.header;
            currentArchiveLabel = archiveState.label;

            if (filesEqual(memoryFiles, archiveState.files)) {
                return false;
            }

            applyArchiveFilesToWorkDir(prepared.workDir, archiveState.files, syncOptions);
            memoryFiles = archiveState.files;
            return true;
        } catch (error) {
            console.warn(
                `[wapk] Failed to pull external archive changes from ${currentArchiveLabel}: ${error instanceof Error ? error.message : String(error)}`,
            );
            return false;
        }
    };

    const flush = (): Promise<void> => {
        pendingOperation = pendingOperation
            .catch(() => undefined)
            .then(async () => {
                if (stopped) return;

                const nextFiles = collectRuntimeSyncFiles(prepared.workDir, syncOptions);
                const localDirty = !filesEqual(memoryFiles, nextFiles);
                const now = Date.now();
                const shouldPollArchive = watchArchive && (lastArchivePollAt === 0 || now - lastArchivePollAt >= archiveSyncInterval);

                if (!localDirty && shouldPollArchive) {
                    lastArchivePollAt = now;
                    await pullArchiveChanges();
                    return;
                }

                if (!localDirty) {
                    return;
                }

                if (shouldPollArchive) {
                    lastArchivePollAt = now;
                    const archiveSignature = await prepared.archiveHandle.getSignature();
                    if (archiveSignature && archiveSignature !== lastArchiveSignature) {
                        console.warn(
                            `[wapk] Both the workdir and ${currentArchiveLabel} changed; writing local workdir changes back to the archive.`,
                        );
                    }
                }

                memoryFiles = nextFiles;
                const writeResult = await writeWapkArchiveFromMemory(prepared.archiveHandle, currentHeader, memoryFiles, prepared.lock);
                currentHeader = writeResult.header;
                currentArchiveLabel = writeResult.label;
                lastArchiveSignature = writeResult.signature ?? await prepared.archiveHandle.getSignature();
            });

        return pendingOperation;
    };

    const scheduleFlush = (): void => {
        void flush().catch(reportSyncError);
    };

    if (prepared.useWatcher) {
        const watcher = watch(prepared.workDir, { recursive: true }, () => {
            scheduleFlush();
        });

        const archiveTimer = watchArchive
            ? setInterval(() => {
                scheduleFlush();
            }, archiveSyncInterval)
            : undefined;
        archiveTimer?.unref?.();

        const stop = async (): Promise<void> => {
            if (stopped) return pendingOperation;

            watcher.close();
            if (archiveTimer) {
                clearInterval(archiveTimer);
            }
            await flush();
            stopped = true;
            await pendingOperation;
        };

        return { flush, stop };
    }

    const timer = setInterval(scheduleFlush, watchArchive ? Math.min(syncInterval, archiveSyncInterval) : syncInterval);
    timer.unref?.();

    const stop = async (): Promise<void> => {
        if (stopped) return;

        clearInterval(timer);
        await flush();
        stopped = true;
        await pendingOperation;
    };

    return { flush, stop };
}

export async function prepareWapkApp(
    wapkPath: string,
    options: WapkCredentialsOptions & {
        runtime?: WapkRuntimeName;
        runtimeWasExplicitlyRequested?: boolean;
        dependencySearchRoots?: string[];
        syncInterval?: number;
        useWatcher?: boolean;
        watchArchive?: boolean;
        archiveSyncInterval?: number;
        googleDrive?: WapkGoogleDriveConfig;
    } = {},
): Promise<PreparedWapkApp> {
    const archiveHandle = resolveArchiveHandle(wapkPath, options.googleDrive);
    const archivePath = archiveHandle.identifier;
    const snapshot = await archiveHandle.readSnapshot();
    const buffer = snapshot.buffer;
    const envelope = parseWapkEnvelope(buffer);
    const lock = envelope.version === WAPK_LOCKED_VERSION
        ? resolveArchiveCredentials(options)
        : undefined;
    const decoded = decodeWapk(buffer, options);
    const runtime = options.runtime ?? decoded.header.runtime;
    const workDir = mkdtempSync(join(tmpdir(), 'elit-wapk-'));
    extractFiles(decoded.files, workDir);
    const entryPath = resolve(workDir, decoded.header.entry);
    const entryPackageDirectory = findNearestPackageDirectory(dirname(entryPath), workDir);
    const syncIncludesNodeModules = existsSync(join(workDir, 'node_modules')) || Boolean(
        entryPackageDirectory && existsSync(join(entryPackageDirectory, 'node_modules')),
    );

    if (!existsSync(entryPath) || !statSync(entryPath).isFile()) {
        rmSync(workDir, { recursive: true, force: true });
        throw new Error(`WAPK entry not found after extraction: ${entryPath}`);
    }

    return {
        archivePath,
        archiveLabel: snapshot.label ?? archiveHandle.label,
        archiveHandle,
        archiveSignature: snapshot.signature,
        workDir,
        entryPath,
        header: decoded.header,
        runtime,
        syncInterval: options.syncInterval,
        useWatcher: options.useWatcher,
        watchArchive: options.watchArchive,
        archiveSyncInterval: options.archiveSyncInterval,
        lock,
        runtimeWasExplicitlyRequested: options.runtimeWasExplicitlyRequested,
        syncIncludesNodeModules,
    };
}

export async function runPreparedWapkApp(prepared: PreparedWapkApp): Promise<number> {
    const port = prepared.header.port ?? DEFAULT_WAPK_PORT;
    const env = {
        ...process.env,
        ...prepared.header.env,
        PORT: String(port),
    };

    console.log(`[wapk] ${prepared.header.name}@${prepared.header.version}`);
    console.log(`[wapk] Runtime: ${prepared.runtime}`);
    console.log(`[wapk] Entry:   ${prepared.header.entry}`);
    console.log(`[wapk] Workdir: ${prepared.workDir}`);

    const sync = createWapkLiveSync(prepared);

    let launch: WapkLaunchCommand;
    try {
        launch = resolveWapkLaunchCommand(prepared, env);
    } catch (error) {
        await sync.stop();
        rmSync(prepared.workDir, { recursive: true, force: true });
        throw error;
    }

    if (launch.label !== 'entry') {
        console.log(`[wapk] Launch:  ${launch.label}`);
    }

    const child = spawn(launch.executable, launch.args, {
        cwd: prepared.workDir,
        env: launch.env,
        stdio: 'inherit',
        shell: launch.shell,
        windowsHide: true,
    });

    const onSigInt = (): void => {
        child.kill('SIGINT');
    };
    const onSigTerm = (): void => {
        child.kill('SIGTERM');
    };

    process.on('SIGINT', onSigInt);
    process.on('SIGTERM', onSigTerm);

    try {
        return await new Promise<number>((resolvePromise, rejectPromise) => {
            child.once('error', rejectPromise);
            child.once('close', (code) => resolvePromise(code ?? 1));
        });
    } finally {
        process.off('SIGINT', onSigInt);
        process.off('SIGTERM', onSigTerm);
        await sync.stop();
        rmSync(prepared.workDir, { recursive: true, force: true });
    }
}