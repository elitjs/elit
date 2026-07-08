import { resolve } from '@elitjs/path';

import type { WorkspacePackageImportOptions } from './types';

export function getWorkspacePackageImportCandidates(
    packageRoot: string,
    specifier: string,
    options: WorkspacePackageImportOptions = {},
): string[] {
    const subpath = specifier === 'elit' ? 'index' : specifier.slice('elit/'.length);

    const builtCandidates = options.preferredBuiltFormat === 'cjs'
        ? [
            resolve(packageRoot, 'dist', `${subpath}.cjs`),
            resolve(packageRoot, 'dist', `${subpath}.js`),
            resolve(packageRoot, 'dist', `${subpath}.mjs`),
        ]
        : [
            resolve(packageRoot, 'dist', `${subpath}.mjs`),
            resolve(packageRoot, 'dist', `${subpath}.js`),
            resolve(packageRoot, 'dist', `${subpath}.cjs`),
        ];
    const sourceCandidates = [
        resolve(packageRoot, 'src', `${subpath}.ts`),
        resolve(packageRoot, 'src', `${subpath}.tsx`),
    ];

    return options.preferBuilt
        ? [...builtCandidates, ...sourceCandidates]
        : [...sourceCandidates, ...builtCandidates];
}