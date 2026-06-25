import { runtime } from '../shares/runtime';
import { calculateBuildMetrics } from './helpers';
import type { RuntimeBuildContext, RuntimeBuildResult } from './types';

function getMinifyOptions(minify?: boolean): object {
    return minify ? {
        minifyWhitespace: true,
        minifyIdentifiers: true,
        minifySyntax: true,
        legalComments: 'none',
        mangleProps: /^_/,
        keepNames: false,
    } : {};
}

async function buildWithNode(context: RuntimeBuildContext): Promise<RuntimeBuildResult> {
    const { build: esbuild } = await import('esbuild');
    const { config, paths, platform, plugins, define, startTime } = context;

    const baseOptions = {
        entryPoints: [paths.entryPath],
        bundle: true,
        outfile: paths.outputPath,
        format: config.format,
        target: config.target,
        minify: config.minify,
        sourcemap: config.sourcemap,
        external: config.external,
        treeShaking: config.treeshake,
        globalName: config.globalName,
        platform,
        plugins,
        define,
        logLevel: config.logging ? 'info' : 'silent',
        metafile: true,
        mainFields: platform === 'browser' ? ['browser', 'module', 'main'] : ['module', 'main'],
    };

    const esbuildOptions: any = {
        ...baseOptions,
        ...getMinifyOptions(config.minify),
    };

    if (config.resolve?.alias) {
        esbuildOptions.alias = config.resolve.alias;
    }

    const result = await esbuild(esbuildOptions);
    const { buildTime, size } = calculateBuildMetrics(startTime, paths.outputPath);
    return { result, buildTime, size };
}

async function buildWithBun(context: RuntimeBuildContext): Promise<RuntimeBuildResult> {
    const { config, paths, plugins, define, startTime } = context;

    // @ts-ignore
    const result = await Bun.build({
        entrypoints: [paths.entryPath],
        outdir: paths.outDir,
        target: 'bun',
        format: config.format === 'cjs' ? 'cjs' : 'esm',
        minify: config.minify,
        sourcemap: config.sourcemap ? 'external' : 'none',
        external: config.external,
        naming: paths.outFile,
        define,
        plugins,
    });

    if (!result.success) {
        throw new Error('Bun build failed: ' + JSON.stringify(result.logs));
    }

    const { buildTime, size } = calculateBuildMetrics(startTime, paths.outputPath);
    return { result, buildTime, size };
}

async function buildWithDeno(context: RuntimeBuildContext): Promise<RuntimeBuildResult> {
    const { config, paths, startTime } = context;

    // @ts-ignore
    const result = await Deno.emit(paths.entryPath, {
        bundle: 'module',
        check: false,
        compilerOptions: {
            target: config.target,
            module: config.format === 'cjs' ? 'commonjs' : 'esnext',
            sourceMap: config.sourcemap,
        },
    });

    const bundledCode = result.files['deno:///bundle.js'];
    if (bundledCode) {
        // @ts-ignore
        await Deno.writeTextFile(paths.outputPath, bundledCode);
    }

    const { buildTime, size } = calculateBuildMetrics(startTime, paths.outputPath);
    return { result, buildTime, size };
}

export async function runRuntimeBuild(context: RuntimeBuildContext): Promise<RuntimeBuildResult> {
    if (runtime === 'node') {
        return buildWithNode(context);
    }

    if (runtime === 'bun') {
        return buildWithBun(context);
    }

    return buildWithDeno(context);
}