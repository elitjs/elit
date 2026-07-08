import type { BuildOptions, BuildResult } from './contracts';
import { defaultOptions } from './constants';
import { copyBuildFiles, createDefine, ensureDir, resolveBuildPaths } from './helpers';
import { logBuildInfo, logBuildSuccess, logMetafileSummary } from './logging';
import { createBuildPlugins } from './plugins';
import { runRuntimeBuild } from './runtime-builders';
import type { BuildPlatform, ResolvedBuildOptions } from './types';

function resolveBuildPlatform(config: ResolvedBuildOptions): BuildPlatform {
    return config.platform || (config.format === 'cjs' ? 'node' : 'browser');
}

export async function build(options: BuildOptions): Promise<BuildResult> {
    const config = { ...defaultOptions, ...options } as ResolvedBuildOptions;
    const startTime = Date.now();

    if (!config.entry) {
        throw new Error('Entry file is required');
    }

    const paths = resolveBuildPaths(config);
    ensureDir(paths.outDir);

    if (config.logging) {
        logBuildInfo(config, paths.outputPath);
    }

    try {
        const platform = resolveBuildPlatform(config);
        const plugins = createBuildPlugins(paths.entryPath, platform);
        const define = createDefine(config);
        const { result, buildTime, size } = await runRuntimeBuild({
            config,
            paths,
            platform,
            plugins,
            define,
            startTime,
        });

        if (config.logging) {
            logBuildSuccess(buildTime, size);
            logMetafileSummary(result);
        }

        const buildResult: BuildResult = {
            outputPath: paths.outputPath,
            buildTime,
            size,
        };

        copyBuildFiles(config, paths.outDir);

        if (config.onBuildEnd) {
            await config.onBuildEnd(buildResult);
        }

        if (config.logging) {
            console.log('');
        }

        return buildResult;
    } catch (error) {
        if (config.logging) {
            console.error('\n❌ Build failed:');
            console.error(error);
        }
        throw error;
    }
}