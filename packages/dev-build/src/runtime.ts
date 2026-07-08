import { existsSync, readdirSync } from '@elitjs/fs';
import { extname, join, relative, resolve } from '@elitjs/path';

import type { DevServerOptions } from '@elitjs/server';
import { normalizeRelativePath } from '@elitjs/preview-build';

interface DirectoryEntry {
    name: string;
    isDirectory(): boolean;
    isFile(): boolean;
}

const defaultStandaloneDevRuntimeIgnorePatterns = ['node_modules/**', 'dist/**', 'dev-dist/**', '.git/**', 'coverage/**', '**/*.d.ts'];

function normalizeStandaloneDevRuntimeIgnorePatterns(devConfig?: DevServerOptions | null): string[] {
    const merged = new Set<string>(defaultStandaloneDevRuntimeIgnorePatterns);

    if (devConfig?.outDir) {
        merged.add(`${normalizeRelativePath(devConfig.outDir).replace(/^\.\//, '')}/**`);
    }

    for (const pattern of devConfig?.ignore || []) {
        merged.add(pattern);
    }

    return [...merged];
}

function shouldIgnoreStandaloneDevRuntimePath(relativePath: string, isDirectory: boolean, ignorePatterns: string[]): boolean {
    const normalizedPath = relativePath.replace(/\\/g, '/').replace(/^\.\//, '');

    if (!normalizedPath) {
        return false;
    }

    for (const pattern of ignorePatterns) {
        const normalizedPattern = pattern.replace(/\\/g, '/').replace(/^\.\//, '');

        if (normalizedPattern === '**/*.d.ts') {
            if (!isDirectory && normalizedPath.endsWith('.d.ts')) {
                return true;
            }
            continue;
        }

        const directoryToken = normalizedPattern
            .replace(/^\*\*\//, '')
            .replace(/\/\*\*$/, '')
            .replace(/\*.*$/, '')
            .replace(/\/+$/, '');

        if (!directoryToken) {
            continue;
        }

        if (normalizedPath === directoryToken || normalizedPath.startsWith(`${directoryToken}/`) || normalizedPath.includes(`/${directoryToken}/`)) {
            return true;
        }
    }

    return false;
}

function rootContainsEsbuildDependentSources(rootDir: string, ignorePatterns: string[]): boolean {
    if (!existsSync(rootDir)) {
        return false;
    }

    const pendingDirectories = [rootDir];

    while (pendingDirectories.length > 0) {
        const currentDirectory = pendingDirectories.pop()!;
        const entries = readdirSync(currentDirectory, { withFileTypes: true }) as DirectoryEntry[];

        for (const entry of entries) {
            const absolutePath = join(currentDirectory, entry.name);
            const relativePath = normalizeRelativePath(relative(rootDir, absolutePath));
            const isDirectory = entry.isDirectory();

            if (shouldIgnoreStandaloneDevRuntimePath(relativePath, isDirectory, ignorePatterns)) {
                continue;
            }

            if (isDirectory) {
                pendingDirectories.push(absolutePath);
                continue;
            }

            if (!entry.isFile()) {
                continue;
            }

            const extension = extname(entry.name).toLowerCase();
            if (extension === '.tsx' || extension === '.jsx') {
                return true;
            }
        }
    }

    return false;
}

export function standaloneDevNeedsEsbuildRuntime(cwd: string, devConfig?: DevServerOptions | null): boolean {
    const resolvedCwd = resolve(cwd || process.cwd());
    const clientRoots = devConfig?.clients && devConfig.clients.length > 0
        ? devConfig.clients.map((client) => resolve(resolvedCwd, client.root || '.'))
        : [resolve(resolvedCwd, devConfig?.root || '.')];
    const ignorePatterns = normalizeStandaloneDevRuntimeIgnorePatterns(devConfig);

    return clientRoots.some((clientRoot) => rootContainsEsbuildDependentSources(clientRoot, ignorePatterns));
}