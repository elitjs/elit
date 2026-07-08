import { readFileSync } from 'node:fs';
import { basename, isAbsolute, resolve } from 'node:path';

import { loadWapkConfig, type WapkGoogleDriveConfig, type WapkRunConfig } from '@elitjs/config';

import { runWapkOnline } from './online';
import { parseGoogleDriveArchiveSpecifier } from './remote';
import {
    WAPK_LOCKED_VERSION,
    type WapkCredentialsOptions,
    type WapkRuntimeName,
    formatSize,
    hasCredentialInput,
    normalizeNonEmptyString,
    normalizeRuntime,
    normalizeWapkRunConfig,
} from './shared';
import { decodeWapk, extractWapkArchive, packWapkDirectory, parseWapkEnvelope, patchWapkArchive } from './archive';
import { prepareWapkApp, runPreparedWapkApp } from './runtime';

function inspectWapkArchive(wapkPath: string, options: WapkCredentialsOptions = {}): void {
    const archivePath = resolve(wapkPath);
    const buffer = readFileSync(archivePath);
    const envelope = parseWapkEnvelope(buffer);

    console.log(`WAPK:     ${basename(archivePath)}`);
    console.log(`Size:     ${formatSize(buffer.length)}`);
    console.log(`Version:  ${envelope.version}`);
    console.log(`Locked:   ${envelope.version === WAPK_LOCKED_VERSION ? 'yes' : 'no'}`);

    if (envelope.version === WAPK_LOCKED_VERSION) {
        if (!hasCredentialInput(options)) {
            console.log('Status:   credentials required to inspect contents');
            return;
        }
    }

    const decoded = decodeWapk(buffer, options);
    const totalContentSize = decoded.files.reduce((total, file) => total + file.content.length, 0);

    console.log(`Name:     ${decoded.header.name}`);
    console.log(`App:      ${decoded.header.version}`);
    console.log(`Runtime:  ${decoded.header.runtime}`);
    console.log(`Entry:    ${decoded.header.entry}`);
    console.log(`App ID:   ${decoded.header.appId ?? 'n/a'}`);
    console.log(`Publisher:${decoded.header.publisherId ? ` ${decoded.header.publisherId}` : ' n/a'}`);
    console.log(`Port:     ${decoded.header.port ?? 'default'}`);
    console.log(`Created:  ${decoded.header.createdAt}`);

    if (decoded.header.env && Object.keys(decoded.header.env).length > 0) {
        console.log('Env:');
        for (const [key, value] of Object.entries(decoded.header.env)) {
            console.log(`  ${key}=${value}`);
        }
    }

    console.log(`Files:    ${decoded.files.length}`);
    for (const file of [...decoded.files].sort((left, right) => left.path.localeCompare(right.path))) {
        console.log(`  ${formatSize(file.content.length).padStart(10)}  ${file.path}`);
    }

    console.log(`Content:  ${formatSize(totalContentSize)}`);
}

function printWapkHelp(): void {
    console.log([
        '',
        'WAPK packaging for Elit',
        '',
        'Usage:',
        '  wapk [file.wapk]',
        '  wapk gdrive://<fileId>',
        '  wapk run [file.wapk]',
        '  wapk run --google-drive-file-id <fileId> --google-drive-token-env <env>',
        '  wapk run [file.wapk] --runtime node|bun|deno',
        '  wapk run [file.wapk] --sync-interval 100',
        '  wapk run [file.wapk] --watcher',
        '  wapk run [file.wapk] --online',
        '  wapk gdrive://<fileId> --online',
        '  wapk pack [directory]',
        '  wapk pack [directory] --password secret-123',
        '  wapk patch <file.wapk> --from <patch.wapk>',
        '  wapk patch <file.wapk> --use <patch.wapk>',
        '  wapk inspect <file.wapk>',
        '  wapk extract <file.wapk>',
        '',
        'Options:',
        '  -r, --runtime <name>         Runtime override: node, bun, deno',
        '  --sync-interval <ms>         Polling interval for live sync (ms, default 300)',
        '  --archive-sync-interval <ms> Polling interval for reading archive source changes',
        '  --watcher, --use-watcher     Use event-driven file watcher instead of polling',
        '  --archive-watch              Pull external archive changes back into the temp workdir',
        '  --no-archive-watch           Disable external archive read sync',
        '  --online                     Create an Elit Run share session, stay alive, and close on Ctrl+C',
        '  --allow-sigterm-close        Allow SIGTERM to close an online shared session',
        '  --online-url <url>           Elit Run URL (default: auto-detect localhost:4177 or localhost:4179)',
        '  --google-drive-file-id <id>  Run a remote .wapk directly from Google Drive',
        '  --google-drive-token-env <name>  Env var containing the Google Drive OAuth token',
        '  --google-drive-access-token <value>  OAuth token for Google Drive API calls',
        '  --google-drive-shared-drive  Include supportsAllDrives=true for shared drives',
        '  --from <file.wapk>           Patch source archive for wapk patch',
        '  --use <file.wapk>            Alias for --from',
        '  --from-password <value>      Password for unlocking the patch archive',
        '  --include-deps               Legacy compatibility flag; node_modules are packed by default',
        '  --password <value>           Password for locking or unlocking the archive',
        '  -h, --help                   Show this help',
        '',
        'Notes:',
        '  - Pack reads wapk config from wapk.config.* (or elit.config.* wapk field) and falls back to package.json.',
        '  - If appId or publisherId is not configured, pack auto-generates stable defaults from package metadata.',
        '  - Pack includes node_modules by default; use .wapkignore if you need to exclude them, and !pattern to re-include later matches.',
        '  - Patch reads .wapkpatch from the patch archive and applies only matching archive-relative paths.',
        '  - Patch keeps the target archive metadata and lock mode; use --from-password when the patch archive uses a different password.',
        '  - Run never installs dependencies automatically; archives must include the runtime dependencies they need.',
        '  - Run mode can read wapk.config.* (run field) for default file/runtime/live-sync options.',
        '  - Browser-style archives with scripts.start or wapk.script.start run that start script automatically.',
        '  - Run mode keeps files in RAM and syncs changes both to and from the archive source.',
        '  - Google Drive mode talks to the Drive API directly; no local archive file is required.',
        '  - Online mode creates a shared session on Elit Run directly, keeps the CLI alive, and closes it on Ctrl+C.',
        '  - Online mode ignores SIGTERM by default; pass --allow-sigterm-close if an external supervisor should close the shared session with SIGTERM.',
        '  - Locked archives in online mode must provide --password so the CLI can build the shared snapshot.',
        '  - Locked archives require the same password for run/extract/inspect.',
        '  - Archives stay unlocked by default unless a password is provided.',
        '  - Use --watcher for faster file change detection (less CPU usage).',
        '  - Runtime commands use node, bun, or deno from PATH.',
    ].join('\n'));
}

function readRequiredOptionValue(args: string[], index: number, option: string): string {
    const value = args[index];
    if (value === undefined) {
        throw new Error(`${option} requires a value.`);
    }
    return value;
}

function parseArchiveAccessArgs(args: string[], usage: string): { file: string } & WapkCredentialsOptions {
    let file: string | undefined;
    let password: string | undefined;

    for (let index = 0; index < args.length; index++) {
        const arg = args[index];

        switch (arg) {
            case '--password':
                password = readRequiredOptionValue(args, ++index, '--password');
                break;
            default:
                if (arg.startsWith('-')) {
                    throw new Error(`Unknown WAPK option: ${arg}`);
                }
                if (file) {
                    throw new Error(usage);
                }
                file = arg;
                break;
        }
    }

    if (!file) {
        throw new Error(usage);
    }

    return { file, password };
}

function parseRunArgs(args: string[]): {
    file?: string;
    googleDrive?: WapkGoogleDriveConfig;
    runtime?: WapkRuntimeName;
    syncInterval?: number;
    useWatcher?: boolean;
    watchArchive?: boolean;
    archiveSyncInterval?: number;
    online?: boolean;
    onlineUrl?: string;
    allowSigtermClose?: boolean;
} & WapkCredentialsOptions {
    let file: string | undefined;
    let googleDrive: WapkGoogleDriveConfig | undefined;
    let runtime: WapkRuntimeName | undefined;
    let syncInterval: number | undefined;
    let useWatcher: boolean | undefined;
    let watchArchive: boolean | undefined;
    let archiveSyncInterval: number | undefined;
    let online: boolean | undefined;
    let onlineUrl: string | undefined;
    let allowSigtermClose: boolean | undefined;
    let password: string | undefined;

    for (let index = 0; index < args.length; index++) {
        const arg = args[index];
        switch (arg) {
            case '--runtime':
            case '-r': {
                const value = normalizeRuntime(readRequiredOptionValue(args, ++index, arg));
                if (!value) {
                    throw new Error(`Unknown WAPK runtime: ${args[index]}`);
                }
                runtime = value;
                break;
            }
            case '--sync-interval': {
                const value = parseInt(readRequiredOptionValue(args, ++index, '--sync-interval'), 10);
                if (Number.isNaN(value) || value < 50) {
                    throw new Error('--sync-interval must be a number >= 50 (milliseconds)');
                }
                syncInterval = value;
                break;
            }
            case '--archive-sync-interval': {
                const value = parseInt(readRequiredOptionValue(args, ++index, '--archive-sync-interval'), 10);
                if (Number.isNaN(value) || value < 50) {
                    throw new Error('--archive-sync-interval must be a number >= 50 (milliseconds)');
                }
                archiveSyncInterval = value;
                break;
            }
            case '--use-watcher':
            case '--watcher': {
                useWatcher = true;
                break;
            }
            case '--archive-watch': {
                watchArchive = true;
                break;
            }
            case '--no-archive-watch': {
                watchArchive = false;
                break;
            }
            case '--online': {
                online = true;
                break;
            }
            case '--online-url': {
                online = true;
                onlineUrl = readRequiredOptionValue(args, ++index, '--online-url');
                break;
            }
            case '--allow-sigterm-close': {
                allowSigtermClose = true;
                break;
            }
            case '--google-drive-file-id': {
                googleDrive = {
                    ...googleDrive,
                    fileId: readRequiredOptionValue(args, ++index, '--google-drive-file-id'),
                };
                break;
            }
            case '--google-drive-token-env': {
                googleDrive = {
                    ...googleDrive,
                    accessTokenEnv: readRequiredOptionValue(args, ++index, '--google-drive-token-env'),
                };
                break;
            }
            case '--google-drive-access-token': {
                googleDrive = {
                    ...googleDrive,
                    accessToken: readRequiredOptionValue(args, ++index, '--google-drive-access-token'),
                };
                break;
            }
            case '--google-drive-shared-drive': {
                googleDrive = {
                    ...googleDrive,
                    supportsAllDrives: true,
                };
                break;
            }
            case '--password':
                password = readRequiredOptionValue(args, ++index, '--password');
                break;
            default:
                if (arg.startsWith('-')) {
                    throw new Error(`Unknown WAPK option: ${arg}`);
                }
                if (file) {
                    throw new Error('WAPK run accepts exactly one package file.');
                }
                file = arg;
                break;
        }
    }

    return { file, googleDrive, runtime, syncInterval, useWatcher, watchArchive, archiveSyncInterval, online, onlineUrl, allowSigtermClose, password };
}

function parsePackArgs(args: string[]): { directory: string; includeDeps: boolean } & WapkCredentialsOptions {
    let directory = '.';
    let includeDeps = false;
    let password: string | undefined;

    for (let index = 0; index < args.length; index++) {
        const arg = args[index];

        if (arg === '--include-deps') {
            includeDeps = true;
            continue;
        }

        if (arg === '--password') {
            password = readRequiredOptionValue(args, ++index, '--password');
            continue;
        }

        if (arg.startsWith('-')) {
            throw new Error(`Unknown WAPK option: ${arg}`);
        }

        if (directory !== '.') {
            throw new Error('WAPK pack accepts at most one directory argument.');
        }

        directory = arg;
    }

    return { directory, includeDeps, password };
}

function parsePatchArgs(
    args: string[],
): { file: string; from: string; fromPassword?: string } & WapkCredentialsOptions {
    let file: string | undefined;
    let from: string | undefined;
    let password: string | undefined;
    let fromPassword: string | undefined;

    for (let index = 0; index < args.length; index++) {
        const arg = args[index];

        switch (arg) {
            case '--from':
            case '--use': {
                if (from) {
                    throw new Error('WAPK patch accepts exactly one patch archive via --from or --use.');
                }
                from = readRequiredOptionValue(args, ++index, arg);
                break;
            }
            case '--password': {
                password = readRequiredOptionValue(args, ++index, '--password');
                break;
            }
            case '--from-password': {
                fromPassword = readRequiredOptionValue(args, ++index, '--from-password');
                break;
            }
            default:
                if (arg.startsWith('-')) {
                    throw new Error(`Unknown WAPK option: ${arg}`);
                }
                if (file) {
                    throw new Error('Usage: wapk patch <file.wapk> --from <patch.wapk>');
                }
                file = arg;
                break;
        }
    }

    if (!file || !from) {
        throw new Error('Usage: wapk patch <file.wapk> --from <patch.wapk>');
    }

    return { file, from, password, fromPassword };
}

async function readConfiguredWapkRunDefaults(cwd: string): Promise<WapkRunConfig | undefined> {
    const wapkConfig = await loadWapkConfig(cwd);
    const runConfig = normalizeWapkRunConfig(wapkConfig?.run);
    const fallbackPassword = normalizeNonEmptyString(wapkConfig?.lock?.password);

    if (!runConfig) {
        return fallbackPassword ? { password: fallbackPassword } : undefined;
    }

    if (!runConfig.password && fallbackPassword) {
        runConfig.password = fallbackPassword;
    }

    if (runConfig.file && runConfig.googleDrive?.fileId) {
        throw new Error('config.run.file and config.run.googleDrive.fileId are mutually exclusive.');
    }

    return runConfig;
}

function mergeGoogleDriveRunConfig(
    cliConfig: WapkGoogleDriveConfig | undefined,
    defaultConfig: WapkGoogleDriveConfig | undefined,
): WapkGoogleDriveConfig | undefined {
    if (!cliConfig && !defaultConfig) {
        return undefined;
    }

    const merged: WapkGoogleDriveConfig = {
        fileId: normalizeNonEmptyString(cliConfig?.fileId) ?? normalizeNonEmptyString(defaultConfig?.fileId),
        accessToken: normalizeNonEmptyString(cliConfig?.accessToken) ?? normalizeNonEmptyString(defaultConfig?.accessToken),
        accessTokenEnv: normalizeNonEmptyString(cliConfig?.accessTokenEnv) ?? normalizeNonEmptyString(defaultConfig?.accessTokenEnv),
        supportsAllDrives: cliConfig?.supportsAllDrives ?? defaultConfig?.supportsAllDrives,
    };

    return Object.values(merged).some((entry) => entry !== undefined)
        ? merged
        : undefined;
}

function resolveConfiguredWapkRunOptions(
    options: ReturnType<typeof parseRunArgs>,
    defaults: WapkRunConfig | undefined,
): {
    file?: string;
    googleDrive?: WapkGoogleDriveConfig;
    runtime?: WapkRuntimeName;
    syncInterval?: number;
    useWatcher?: boolean;
    watchArchive?: boolean;
    archiveSyncInterval?: number;
    online: boolean;
    onlineUrl?: string;
    allowSigtermClose: boolean;
    password?: string;
} {
    const onlineUrl = options.onlineUrl ?? defaults?.onlineUrl;

    return {
        file: options.file ?? defaults?.file,
        googleDrive: mergeGoogleDriveRunConfig(options.googleDrive, defaults?.googleDrive),
        runtime: options.runtime ?? defaults?.runtime,
        syncInterval: options.syncInterval ?? defaults?.syncInterval,
        useWatcher: options.useWatcher ?? defaults?.useWatcher,
        watchArchive: options.watchArchive ?? defaults?.watchArchive,
        archiveSyncInterval: options.archiveSyncInterval ?? defaults?.archiveSyncInterval,
        online: options.online ?? defaults?.online ?? Boolean(onlineUrl),
        onlineUrl,
        allowSigtermClose: options.allowSigtermClose === true,
        password: options.password ?? defaults?.password,
    };
}

function resolveRunArchivePath(file: string, cwd: string): string {
    return isAbsolute(file) ? file : resolve(cwd, file);
}

function resolveRunArchiveSpecifier(
    file: string | undefined,
    googleDrive: WapkGoogleDriveConfig | undefined,
    cwd: string,
): string | undefined {
    const googleDriveFileId = normalizeNonEmptyString(googleDrive?.fileId);
    if (googleDriveFileId) {
        if (file && !parseGoogleDriveArchiveSpecifier(file)) {
            throw new Error('WAPK run cannot use both a local archive file and googleDrive.fileId at the same time.');
        }

        return `gdrive://${googleDriveFileId}`;
    }

    if (!file) {
        return undefined;
    }

    return parseGoogleDriveArchiveSpecifier(file) ? file : resolveRunArchivePath(file, cwd);
}

export async function runWapkCommand(args: string[], cwd: string = process.cwd()): Promise<void> {
    if (args.includes('--help') || args.includes('-h')) {
        printWapkHelp();
        return;
    }

    if (args[0] === 'pack') {
        const options = parsePackArgs(args.slice(1));
        await packWapkDirectory(options.directory, {
            includeDeps: options.includeDeps,
            password: options.password,
        });
        return;
    }

    if (args[0] === 'patch') {
        const options = parsePatchArgs(args.slice(1));
        await patchWapkArchive(options.file, {
            from: options.from,
            password: options.password,
            fromPassword: options.fromPassword,
        });
        return;
    }

    if (args[0] === 'inspect') {
        const options = parseArchiveAccessArgs(args.slice(1), 'Usage: wapk inspect <file.wapk>');
        inspectWapkArchive(options.file, options);
        return;
    }

    if (args[0] === 'extract') {
        const options = parseArchiveAccessArgs(args.slice(1), 'Usage: wapk extract <file.wapk>');
        extractWapkArchive(options.file, '.', options);
        return;
    }

    const parsedRunOptions = args[0] === 'run' ? parseRunArgs(args.slice(1)) : parseRunArgs(args);
    const configuredRunDefaults = await readConfiguredWapkRunDefaults(cwd);
    const runOptions = resolveConfiguredWapkRunOptions(parsedRunOptions, configuredRunDefaults);

    const archiveSpecifier = resolveRunArchiveSpecifier(runOptions.file, runOptions.googleDrive, cwd);

    if (!archiveSpecifier) {
        if (args.length === 0) {
            printWapkHelp();
            return;
        }

        throw new Error('Usage: wapk run <file.wapk>');
    }

    if (runOptions.online) {
        if (
            parsedRunOptions.runtime !== undefined
            || parsedRunOptions.syncInterval !== undefined
            || parsedRunOptions.useWatcher !== undefined
            || parsedRunOptions.watchArchive !== undefined
            || parsedRunOptions.archiveSyncInterval !== undefined
        ) {
            console.warn('[wapk] --runtime, --sync-interval, --watcher, --archive-watch, and --archive-sync-interval are ignored with --online.');
        }

        await runWapkOnline(archiveSpecifier, {
            googleDrive: runOptions.googleDrive,
            onlineUrl: runOptions.onlineUrl,
            allowSigtermClose: runOptions.allowSigtermClose,
            password: runOptions.password,
        });
        return;
    }

    const prepared = await prepareWapkApp(archiveSpecifier, {
        googleDrive: runOptions.googleDrive,
        runtime: runOptions.runtime,
        runtimeWasExplicitlyRequested: parsedRunOptions.runtime !== undefined,
        dependencySearchRoots: [cwd],
        syncInterval: runOptions.syncInterval,
        useWatcher: runOptions.useWatcher,
        watchArchive: runOptions.watchArchive,
        archiveSyncInterval: runOptions.archiveSyncInterval,
        password: runOptions.password,
    });
    const exitCode = await runPreparedWapkApp(prepared);
    if (exitCode !== 0) {
        process.exit(exitCode);
    }
}