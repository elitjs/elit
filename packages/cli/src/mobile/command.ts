import { spawnSync } from 'node:child_process';
import { normalize } from 'node:path';

export function commandExists(command: string, cwd: string): boolean {
    const checker = process.platform === 'win32' ? 'where' : 'which';
    const result = spawnSync(checker, [command], {
        cwd,
        stdio: 'ignore',
        shell: false,
    });
    return result.status === 0;
}

export function resolveCommandPath(command: string, cwd: string, env?: NodeJS.ProcessEnv): string | undefined {
    const checker = process.platform === 'win32' ? 'where' : 'which';
    const result = spawnSync(checker, [command], {
        cwd,
        env,
        encoding: 'utf8',
        shell: false,
    });

    if (result.status !== 0) return undefined;
    const output = String(result.stdout ?? '').trim();
    if (!output) return undefined;

    const firstLine = output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean);
    return firstLine || undefined;
}

export function prependCommandPath(pathEntry: string): NodeJS.ProcessEnv {
    const pathKey = Object.keys(process.env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';
    const currentPath = process.env[pathKey];
    const delimiter = process.platform === 'win32' ? ';' : ':';

    return {
        ...process.env,
        [pathKey]: currentPath && currentPath.length > 0
            ? `${pathEntry}${delimiter}${currentPath}`
            : pathEntry,
    };
}

export function runWindowsBatchCommand(command: string, args: string[], cwd: string): void {
    const result = spawnSync(normalize(command), args, {
        cwd,
        stdio: 'inherit',
        shell: false,
    });

    if (typeof result.status === 'number' && result.status !== 0) {
        process.exit(result.status);
    }
}

export function runCommand(command: string, args: string[], cwd: string, env?: NodeJS.ProcessEnv): void {
    const normalizedCommand = normalize(command);
    const result = spawnSync(normalizedCommand, args, { cwd, env, stdio: 'inherit', shell: false });

    if (typeof result.status === 'number' && result.status !== 0) {
        process.exit(result.status);
    }
}

export function runCommandCapture(command: string, args: string[], cwd: string): string {
    const result = spawnSync(command, args, {
        cwd,
        encoding: 'utf8',
        shell: false,
    });

    if (typeof result.status === 'number' && result.status !== 0) {
        const stderr = String(result.stderr ?? '').trim();
        throw new Error(stderr || `${command} ${args.join(' ')} failed with exit code ${result.status}`);
    }

    return String(result.stdout ?? '');
}