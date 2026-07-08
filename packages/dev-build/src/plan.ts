import { dirname, join, relative, resolve } from '@elitjs/path';

import { normalizeRelativePath } from '@elitjs/preview-build';
import type { StandaloneDevBuildOptions, StandaloneDevBuildPlan } from './types';

export function resolveStandaloneDevBuildPlan(options: StandaloneDevBuildOptions): StandaloneDevBuildPlan {
    const cwd = resolve(options.cwd || process.cwd());
    const devConfig = options.devConfig || undefined;
    const allBuilds = options.allBuilds && options.allBuilds.length > 0
        ? options.allBuilds
        : [options.buildConfig || {}];
    const primaryBuild = options.buildConfig || allBuilds[0] || {};
    const outputRoot = resolve(cwd, options.outDir || devConfig?.outDir || 'dev-dist');
    const outputFile = options.outFile || devConfig?.outFile || 'index.js';
    const outputPath = resolve(join(outputRoot, outputFile));
    const bundleDir = dirname(outputPath);

    if (devConfig?.clients && devConfig.clients.length > 0) {
        const clients = devConfig.clients.map((client, index) => {
            const buildForClient = allBuilds[index] || primaryBuild;

            return {
                basePath: client.basePath || '',
                fallbackRootRelativePath: normalizeRelativePath(relative(bundleDir, resolve(cwd, buildForClient.outDir || 'dist'))),
                index: client.index,
                rootRelativePath: normalizeRelativePath(relative(bundleDir, resolve(cwd, client.root || '.'))),
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

    const rootRelativePath = normalizeRelativePath(relative(bundleDir, resolve(cwd, devConfig?.root || '.')));
    const fallbackRootRelativePath = normalizeRelativePath(relative(bundleDir, resolve(cwd, primaryBuild.outDir || 'dist')));

    return {
        fallbackRootRelativePath,
        index: devConfig?.index,
        outputPath,
        outputRoot,
        packageJsonPath: join(outputRoot, 'package.json'),
        clients: undefined,
        rootRelativePath,
        usesClientArray: false,
    };
}

export function resolveStandaloneDevFallbackRootRelativePath(plan: StandaloneDevBuildPlan, options: StandaloneDevBuildOptions): string {
    if (plan.fallbackRootRelativePath) {
        return plan.fallbackRootRelativePath;
    }

    const cwd = resolve(options.cwd || process.cwd());
    const primaryBuild = options.buildConfig || options.allBuilds?.[0] || {};
    return normalizeRelativePath(relative(dirname(plan.outputPath), resolve(cwd, primaryBuild.outDir || 'dist')));
}

export function createStandaloneDevFallbackRootRelativePath(options: StandaloneDevBuildOptions): string {
    const plan = resolveStandaloneDevBuildPlan(options);
    return resolveStandaloneDevFallbackRootRelativePath(plan, options);
}