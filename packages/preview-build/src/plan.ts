import { basename, dirname, extname, join, relative, resolve } from '@elitjs/path';

import type { BuildOptions } from '@elitjs/build';
import { normalizeRelativePath } from './helpers';
import type { StandalonePreviewBuildOptions, StandalonePreviewBuildPlan } from './types';

function resolveBuildOutputFile(buildConfig: BuildOptions): string {
    if (buildConfig.outFile) {
        return buildConfig.outFile;
    }

    const baseName = basename(buildConfig.entry, extname(buildConfig.entry));
    const ext = buildConfig.format === 'cjs' ? '.cjs' : '.js';
    return baseName + ext;
}

export function resolveStandalonePreviewBuildPlan(options: StandalonePreviewBuildOptions): StandalonePreviewBuildPlan {
    const cwd = resolve(options.cwd || process.cwd());
    const previewConfig = options.previewConfig || undefined;
    const allBuilds = options.allBuilds.length > 0 ? options.allBuilds : [options.buildConfig];
    const primaryBuild = options.buildConfig;
    const outputRoot = resolve(cwd, previewConfig?.root || primaryBuild.outDir || allBuilds[0]?.outDir || 'dist');
    const outputFile = options.outFile || previewConfig?.outFile || primaryBuild.standalonePreviewOutFile || 'index.js';
    const outputPath = resolve(join(outputRoot, outputFile));
    const clientOutputPath = resolve(join(resolve(cwd, primaryBuild.outDir || 'dist'), resolveBuildOutputFile(primaryBuild)));

    if (outputPath === clientOutputPath) {
        throw new Error(`Standalone preview output ${outputFile} conflicts with the client bundle. Set preview.outFile or --preview-out-file to a different filename.`);
    }

    const bundleDir = dirname(outputPath);

    if (previewConfig?.clients && previewConfig.clients.length > 0) {
        const clients = previewConfig.clients.map((client, index) => {
            const buildForClient = allBuilds[index] || primaryBuild;
            const clientRoot = resolve(cwd, buildForClient.outDir || primaryBuild.outDir || client.root || 'dist');

            return {
                basePath: client.basePath || '',
                index: client.index,
                rootRelativePath: normalizeRelativePath(relative(bundleDir, clientRoot)),
            };
        });

        return {
            clients,
            outputPath,
            outputRoot,
            packageJsonPath: join(outputRoot, 'package.json'),
            usesClientArray: true,
        };
    }

    const rootRelativePath = normalizeRelativePath(relative(bundleDir, outputRoot));

    return {
        index: previewConfig?.index,
        outputPath,
        outputRoot,
        packageJsonPath: join(outputRoot, 'package.json'),
        rootRelativePath,
        usesClientArray: false,
    };
}