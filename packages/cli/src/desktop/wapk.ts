import { randomUUID } from 'node:crypto';
import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { DesktopConfig } from '@elitjs/config';
import {
    createWapkLiveSync,
    getWapkRuntimeArgs,
    prepareWapkApp,
    resolveWapkRuntimeExecutable,
    type PreparedWapkApp,
} from '@elitjs/wapk';
import { ensureDesktopBinary, spawnDesktopProcess } from './binary';
import { parseDesktopWapkRunArgs, printDesktopHelp } from './config';
import { cleanupPreparedEntry } from './entry';
import type { PreparedEntry } from './shared';

export async function runDesktopWapkCommand(args: string[], config?: DesktopConfig): Promise<void> {
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        printDesktopHelp();
        return;
    }

    const options = parseDesktopWapkRunArgs(args, config?.wapk);
    const preparedApp = await prepareWapkApp(options.file, {
        runtime: options.runtime,
        syncInterval: options.syncInterval,
        useWatcher: options.useWatcher,
        password: options.password,
    });
    const preparedEntry = await createDesktopWapkEntry(preparedApp);
    const liveSync = createWapkLiveSync(preparedApp);

    try {
        const binary = ensureDesktopBinary({
            runtime: preparedApp.runtime,
            release: options.release,
            entryPath: preparedApp.entryPath,
        });

        const exitCode = await spawnDesktopProcess(binary, ['--runtime', preparedApp.runtime, preparedEntry.entryPath]);
        if (exitCode !== 0) {
            process.exit(exitCode);
        }
    } finally {
        await liveSync.stop();
        rmSync(preparedApp.workDir, { recursive: true, force: true });
        cleanupPreparedEntry(preparedEntry);
    }
}

async function createDesktopWapkEntry(preparedApp: PreparedWapkApp): Promise<PreparedEntry> {
    const port = await resolveDesktopWapkPort(preparedApp.header.port);
    const appName = sanitizeDesktopWapkName(preparedApp.header.name);
    const entryPath = join(preparedApp.workDir, `.elit-desktop-wapk-${appName}-${randomUUID()}.mjs`);
    const desktopOptions = buildDesktopWapkWindowOptions(preparedApp);
    const runtimeExecutable = resolveWapkRuntimeExecutable(preparedApp.runtime);
    const runtimeArgs = getWapkRuntimeArgs(preparedApp.runtime, preparedApp.entryPath);
    const env = {
        ...process.env,
        ...preparedApp.header.env,
        PORT: String(port),
    };

    writeFileSync(
        entryPath,
        [
            `import { spawn } from 'node:child_process';`,
            `import http from 'node:http';`,
            '',
            `const runtimeExecutable = ${JSON.stringify(runtimeExecutable)};`,
            `const runtimeArgs = ${JSON.stringify(runtimeArgs)};`,
            `const workDir = ${JSON.stringify(preparedApp.workDir)};`,
            `const runtimeEnv = ${JSON.stringify(env)};`,
            `const windowOptions = ${JSON.stringify(desktopOptions)};`,
            `const appUrl = ${JSON.stringify(`http://127.0.0.1:${port}`)};`,
            '',
            'function waitForServer(url, timeoutMs = 15000) {',
            '    return new Promise((resolvePromise, rejectPromise) => {',
            '        const startTime = Date.now();',
            '        const poll = () => {',
            '            const request = http.get(url, (response) => {',
            '                response.resume();',
            '                resolvePromise();',
            '            });',
            '            request.on(\'error\', () => {',
            '                if (Date.now() - startTime > timeoutMs) {',
            '                    rejectPromise(new Error(`Server did not start in ${timeoutMs}ms.`));',
            '                } else {',
            '                    setTimeout(poll, 200);',
            '                }',
            '            });',
            '            request.setTimeout(1000, () => {',
            '                request.destroy();',
            '            });',
            '        };',
            '        poll();',
            '    });',
            '}',
            '',
            'const child = spawn(runtimeExecutable, runtimeArgs, {',
            '    cwd: workDir,',
            '    env: runtimeEnv,',
            '    stdio: "inherit",',
            '    windowsHide: true,',
            '});',
            '',
            'const stopChild = () => {',
            '    try {',
            '        if (!child.killed) child.kill();',
            '    } catch {}',
            '};',
            '',
            'process.on(\'exit\', stopChild);',
            'process.on(\'SIGINT\', () => { stopChild(); process.exit(130); });',
            'process.on(\'SIGTERM\', () => { stopChild(); process.exit(143); });',
            '',
            'child.once(\'error\', (error) => {',
            '    console.error(error);',
            '    process.exit(1);',
            '});',
            '',
            'child.once(\'exit\', (code) => {',
            '    if (code && code !== 0) {',
            '        process.exit(code);',
            '        return;',
            '    }',
            '    if (typeof globalThis.windowQuit === "function") {',
            '        globalThis.windowQuit();',
            '    }',
            '});',
            '',
            '(async () => {',
            '    await waitForServer(appUrl);',
            '    if (typeof globalThis.createWindow !== "function") {',
            '        throw new Error(\'Desktop runtime did not expose createWindow().\');',
            '    }',
            '    globalThis.createWindow({ ...windowOptions, url: appUrl });',
            '})().catch((error) => {',
            '    console.error(error);',
            '    stopChild();',
            '    process.exit(1);',
            '});',
            '',
        ].join('\n'),
        'utf8',
    );

    return {
        appName,
        entryPath,
        cleanupPath: entryPath,
    };
}

function sanitizeDesktopWapkName(name: string): string {
    return name.replace(/[^a-zA-Z0-9._-]+/g, '-');
}

function buildDesktopWapkWindowOptions(preparedApp: PreparedWapkApp): Record<string, unknown> {
    const desktopOptions = preparedApp.header.desktop ? { ...preparedApp.header.desktop } : {};
    const icon = typeof desktopOptions.icon === 'string' ? desktopOptions.icon : undefined;

    if (icon && !/^(?:[a-z]+:)?[/\\]/i.test(icon)) {
        desktopOptions.icon = join(preparedApp.workDir, icon);
    }

    if (desktopOptions.title === undefined) {
        desktopOptions.title = preparedApp.header.name;
    }

    if (desktopOptions.width === undefined) {
        desktopOptions.width = 1280;
    }

    if (desktopOptions.height === undefined) {
        desktopOptions.height = 800;
    }

    if (desktopOptions.center === undefined) {
        desktopOptions.center = true;
    }

    delete desktopOptions.url;
    delete desktopOptions.proxy_port;
    delete desktopOptions.proxy_pipe;
    delete desktopOptions.proxy_secret;

    return desktopOptions;
}

async function resolveDesktopWapkPort(preferredPort?: number): Promise<number> {
    if (preferredPort) {
        return preferredPort;
    }

    const { createServer } = await import('node:net');
    return await new Promise<number>((resolvePromise, rejectPromise) => {
        const server = createServer();
        server.once('error', rejectPromise);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            server.close((closeError) => {
                if (closeError) {
                    rejectPromise(closeError);
                    return;
                }

                if (!address || typeof address === 'string') {
                    rejectPromise(new Error('Failed to allocate a desktop WAPK port.'));
                    return;
                }

                resolvePromise(address.port);
            });
        });
    });
}