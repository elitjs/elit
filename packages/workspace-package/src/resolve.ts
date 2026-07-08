import { existsSync } from '@elitjs/fs';

import { getWorkspacePackageImportCandidates } from './candidates';
import { findInstalledPackageRoot, findWorkspacePackageRoot } from './roots';
import type { WorkspacePackageImportOptions } from './types';

function isWorkspacePackageSpecifier(specifier: string): boolean {
    return specifier === 'elit' || specifier.startsWith('elit/');
}

export function resolveWorkspacePackageImport(
    specifier: string,
    startDir: string,
    options: WorkspacePackageImportOptions = {},
): string | undefined {
    if (!isWorkspacePackageSpecifier(specifier)) {
        return undefined;
    }

    const packageRoots = new Set<string>();
    const workspacePackageRoot = findWorkspacePackageRoot(startDir, 'elit');
    const installedPackageRoot = findInstalledPackageRoot(startDir, 'elit');

    if (workspacePackageRoot) {
        packageRoots.add(workspacePackageRoot);
    }

    if (installedPackageRoot) {
        packageRoots.add(installedPackageRoot);
    }

    for (const packageRoot of packageRoots) {
        for (const candidate of getWorkspacePackageImportCandidates(packageRoot, specifier, options)) {
            if (existsSync(candidate)) {
                return candidate;
            }
        }
    }

    return undefined;
}