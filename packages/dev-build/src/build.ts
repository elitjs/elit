import { mkdirSync } from '@elitjs/fs';
import { basename, dirname, resolve } from '@elitjs/path';

import {
    createWorkspacePackagePlugin,
    writeStandalonePackageJson,
} from '@elitjs/preview-build';
import { createStandaloneDevEntrySource } from './entry-source';
import { resolveStandaloneDevBuildPlan } from './plan';
import { standaloneDevNeedsEsbuildRuntime } from './runtime';
import type { StandaloneDevBuildOptions } from './types';

export async function buildStandaloneDevServer(options: StandaloneDevBuildOptions): Promise<string> {
    const cwd = resolve(options.cwd || process.cwd());
    const plan = resolveStandaloneDevBuildPlan({
        ...options,
        cwd,
    });
    const outputDir = dirname(plan.outputPath);

    mkdirSync(outputDir, { recursive: true });

    const { build, version } = await import('esbuild');
    const workspacePackagePlugin = createWorkspacePackagePlugin(cwd, {
        preferBuilt: true,
        preferredBuiltFormat: 'cjs',
    });
    const entrySource = createStandaloneDevEntrySource(options.configPath, plan, options.devConfig, {
        cwd,
        buildConfig: options.buildConfig,
        allBuilds: options.allBuilds,
    });
    const needsEsbuildRuntime = standaloneDevNeedsEsbuildRuntime(cwd, options.devConfig);

    await build({
        stdin: {
            contents: entrySource,
            loader: 'ts',
            resolveDir: cwd,
            sourcefile: 'elit-standalone-dev-entry.ts',
        },
        bundle: true,
        outfile: plan.outputPath,
        format: 'cjs',
        mainFields: ['module', 'main'],
        platform: 'node',
        plugins: [workspacePackagePlugin],
        external: ['esbuild', 'javascript-obfuscator', 'open'],
        sourcemap: false,
        target: 'es2020',
        logLevel: options.logging === false ? 'silent' : 'info',
    });

    writeStandalonePackageJson(plan.packageJsonPath, basename(plan.outputPath), {
        dependencies: needsEsbuildRuntime
            ? {
                esbuild: typeof version === 'string' && version.length > 0 ? `^${version}` : '*',
            }
            : {},
        replaceDependencies: true,
    });

    if (options.logging !== false) {
        console.log(`  ✓ Standalone dev server → ${plan.outputPath}`);
    }

    return plan.outputPath;
}