import { existsSync } from '@elitjs/fs';
import { dirname, join, resolve } from '@elitjs/path';

import { readPackageJson } from './package-json';

function findPackageDirectory(
    startDir: string,
    resolveMatch: (currentDir: string) => string | undefined,
): string | undefined {
    let currentDir = resolve(startDir);

    while (true) {
        const match = resolveMatch(currentDir);
        if (match) {
            return match;
        }

        const parentDir = dirname(currentDir);
        if (parentDir === currentDir) {
            return undefined;
        }

        currentDir = parentDir;
    }
}

export function findWorkspacePackageRoot(startDir: string, packageName: string): string | undefined {
    return findPackageDirectory(startDir, (currentDir) => {
        const packageJsonPath = join(currentDir, 'package.json');
        const packageJson = existsSync(packageJsonPath)
            ? readPackageJson(packageJsonPath)
            : undefined;

        return packageJson?.name === packageName
            ? currentDir
            : undefined;
    });
}

export function findInstalledPackageRoot(startDir: string, packageName: string): string | undefined {
    return findPackageDirectory(startDir, (currentDir) => {
        const candidate = join(currentDir, 'node_modules', ...packageName.split('/'));
        return existsSync(candidate) ? candidate : undefined;
    });
}