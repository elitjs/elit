import { mkdirSync } from '@elitjs/fs';
import { basename, dirname, resolve } from '@elitjs/path';

import { createStandalonePreviewEntrySource } from './entry-source';
import {
    createWorkspacePackagePlugin,
    writeStandalonePackageJson,
} from './helpers';
import { resolveStandalonePreviewBuildPlan } from './plan';
import type { StandalonePreviewBuildOptions } from './types';

export async function buildStandalonePreviewServer(options: StandalonePreviewBuildOptions): Promise<string> {
    const cwd = resolve(options.cwd || process.cwd());
    const plan = resolveStandalonePreviewBuildPlan({
        ...options,
        cwd,
    });
    const outputDir = dirname(plan.outputPath);

    mkdirSync(outputDir, { recursive: true });

    const { build } = await import('esbuild');
    const workspacePackagePlugin = createWorkspacePackagePlugin(cwd, {
        preferBuilt: true,
        preferredBuiltFormat: 'cjs',
    });
    const entrySource = createStandalonePreviewEntrySource(options.configPath, plan, options.previewConfig);

    await build({
        stdin: {
            contents: entrySource,
            loader: 'ts',
            resolveDir: cwd,
            sourcefile: 'elit-standalone-preview-entry.ts',
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

    writeStandalonePackageJson(plan.packageJsonPath, basename(plan.outputPath));

    if (options.logging !== false) {
        console.log(`  ✓ Standalone preview server → ${plan.outputPath}`);
    }

    return plan.outputPath;
}