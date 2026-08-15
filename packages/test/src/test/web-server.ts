import { spawn, type ChildProcess } from 'node:child_process';

import type { TestOptions } from './types';

/**
 * Starts a dev/preview server around a test run (Playwright's webServer):
 * waits until the port/url responds, then runs the tests, then stops it.
 */
export interface RunningWebServer {
    stop(): Promise<void>;
}

async function isResponding(url: string): Promise<boolean> {
    try {
        const response = await fetch(url, { method: 'HEAD' }).catch(() => null);
        if (response) return true;
        return false;
    } catch {
        return false;
    }
}

export async function startWebServer(config: NonNullable<TestOptions['webServer']>): Promise<RunningWebServer> {
    const targetUrl =
        config.url ?? (config.port !== undefined ? `http://127.0.0.1:${config.port}` : undefined);
    if (!targetUrl) {
        throw new Error('webServer requires either "url" or "port"');
    }

    // An already-running server is reused instead of spawning a duplicate.
    if ((config.reuseExistingServer ?? true) && (await isResponding(targetUrl))) {
        return { stop: async () => undefined };
    }

    const child = spawn(config.command, {
        shell: true,
        stdio: 'ignore',
        // On Unix the shell wraps the real server, so run it in its own process
        // group — stop() can then take the whole tree down at once.
        detached: process.platform !== 'win32',
    });
    const timeout = config.timeout ?? 30000;
    const start = Date.now();

    while (Date.now() - start < timeout) {
        if (child.exitCode !== null) {
            throw new Error(`webServer command exited early with code ${child.exitCode}: ${config.command}`);
        }
        if (await isResponding(targetUrl)) {
            return { stop: () => terminate(child) };
        }
        await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
    }

    await terminate(child);
    throw new Error(`webServer did not respond at ${targetUrl} within ${timeout}ms`);
}

async function terminate(child: ChildProcess): Promise<void> {
    if (child.exitCode !== null) {
        return;
    }
    if (process.platform === 'win32') {
        // shell:true wraps the command in cmd.exe — killing the shell alone
        // orphans the real server, so take the whole process tree down and
        // wait for taskkill to finish before resolving.
        const { exec } = await import('node:child_process');
        const { promisify } = await import('node:util');
        if (child.pid) {
            await promisify(exec)(`taskkill /PID ${child.pid} /T /F`).catch(() => undefined);
        }
    } else {
        try {
            // Kill the shell's whole process group: killing the bare shell would
            // orphan the actual server and leave the port open.
            if (child.pid) process.kill(-child.pid, 'SIGTERM');
        } catch {
            child.kill('SIGTERM');
        }
    }
    await new Promise<void>((resolvePromise) => {
        child.once('exit', () => resolvePromise());
        setTimeout(resolvePromise, 3000);
    });
}
