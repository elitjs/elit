import { loadConfig, loadEnv, mergeConfig, resolveConfigPath } from '../../shares/config';
import type { BuildOptions, BuildResult } from '../../build/contracts';
import type { DevServerOptions, PreviewOptions } from '../../server/types';
import type { ElitConfig } from '../../shares/config/types';
import { build } from '../../build';
import { buildStandaloneDevServer } from '../../dev-build';
import { buildStandalonePreviewServer } from '../../preview-build';

import { parseArgs, type ArgHandler } from './shared';

type StandaloneBuildFlag = '--standalone-dev' | '--standalone-preview';

function withMergedResolve(elitConfig: ElitConfig | null | undefined, buildOptions: BuildOptions): BuildOptions {
    const topAlias = elitConfig?.resolve?.alias;
    if (!topAlias) return buildOptions;
    const mergedAlias = { ...topAlias, ...(buildOptions.resolve?.alias || {}) };
    return { ...buildOptions, resolve: { ...(buildOptions.resolve || {}), alias: mergedAlias } };
}

export async function runBuild(args: string[]): Promise<void> {
    const cliOptions = parseBuildArgs(args);
    const config = await loadConfig();
    const configPath = resolveConfigPath();
    const cwd = process.cwd();
    const mode = process.env.MODE || 'production';
    const env = loadEnv(mode);

    if (config?.build) {
        const builds = Array.isArray(config.build) ? config.build : [config.build];
        const primaryBuild = builds[0];

        if (!primaryBuild) {
            console.error('Error: Build configuration must include at least one entry');
            process.exit(1);
        }

        if (Object.keys(cliOptions).length > 0) {
            const options = withMergedResolve(config, mergeConfig(primaryBuild, cliOptions) as BuildOptions);

            ensureEnv(options, env);
            validateEntry(options.entry);

            await executeBuild(options);
            await emitStandalonePreviewIfNeeded({
                cliOptions,
                buildOptions: options,
                allBuilds: [options],
                configPath,
                cwd,
                previewConfig: config?.preview || null,
            });
            await emitStandaloneDevIfNeeded({
                allBuilds: [options],
                cliOptions,
                buildOptions: options,
                configPath,
                cwd,
                devConfig: config?.dev || null,
            });
            process.exit(0);
        }

        console.log(`Building ${builds.length} ${builds.length === 1 ? 'entry' : 'entries'}...\n`);

        for (let index = 0; index < builds.length; index++) {
            const buildConfig = withMergedResolve(config, builds[index]);

            ensureEnv(buildConfig, env);
            validateEntry(buildConfig.entry, index);

            console.log(`[${index + 1}/${builds.length}] Building ${buildConfig.entry}...`);

            try {
                await build(buildConfig);
            } catch {
                console.error(`Build #${index + 1} failed`);
                process.exit(1);
            }

            if (index < builds.length - 1) {
                console.log('');
            }
        }

        await emitStandalonePreviewIfNeeded({
            cliOptions,
            buildOptions: primaryBuild,
            allBuilds: builds,
            configPath,
            cwd,
            previewConfig: config?.preview || null,
        });
        await emitStandaloneDevIfNeeded({
            allBuilds: builds,
            cliOptions,
            buildOptions: primaryBuild,
            configPath,
            cwd,
            devConfig: config?.dev || null,
        });

        console.log(`\n✓ All ${builds.length} builds completed successfully`);
        process.exit(0);
    }

    const options = cliOptions as BuildOptions;

    ensureEnv(options, env);
    validateEntry(options.entry);

    await executeBuild(options);
    await emitStandalonePreviewIfNeeded({
        cliOptions,
        buildOptions: options,
        allBuilds: [options],
        configPath,
        cwd,
        previewConfig: config?.preview || null,
    });
    await emitStandaloneDevIfNeeded({
        allBuilds: [options],
        cliOptions,
        buildOptions: options,
        configPath,
        cwd,
        devConfig: config?.dev || null,
    });

    console.log('\n✓ Build completed successfully');
    process.exit(0);
}

export async function runBuildDev(args: string[]): Promise<void> {
    await runBuild(withStandaloneBuildFlag(args, '--standalone-dev'));
}

export async function runBuildPreview(args: string[]): Promise<void> {
    await runBuild(withStandaloneBuildFlag(args, '--standalone-preview'));
}

export function parseBuildArgs(args: string[]): Partial<BuildOptions> {
    const options: Partial<BuildOptions> = {};
    const handlers: Record<string, ArgHandler<Partial<BuildOptions>>> = {
        '-e': (current, value, index) => {
            current.entry = value;
            index.current++;
        },
        '--entry': (current, value, index) => {
            current.entry = value;
            index.current++;
        },
        '-o': (current, value, index) => {
            current.outDir = value;
            index.current++;
        },
        '--out-dir': (current, value, index) => {
            current.outDir = value;
            index.current++;
        },
        '--no-minify': (current) => {
            current.minify = false;
        },
        '--sourcemap': (current) => {
            current.sourcemap = true;
        },
        '-f': (current, value, index) => {
            current.format = value as BuildOptions['format'] | undefined;
            index.current++;
        },
        '--format': (current, value, index) => {
            current.format = value as BuildOptions['format'] | undefined;
            index.current++;
        },
        '--standalone-dev': (current) => {
            current.standaloneDev = true;
        },
        '--dev-out-file': (current, value, index) => {
            current.standaloneDevOutFile = value;
            index.current++;
        },
        '--standalone-preview': (current) => {
            current.standalonePreview = true;
        },
        '--preview-out-file': (current, value, index) => {
            current.standalonePreviewOutFile = value;
            index.current++;
        },
        '--silent': (current) => {
            current.logging = false;
        },
    };

    return parseArgs(args, handlers, options);
}

export function parseBuildDevArgs(args: string[]): Partial<BuildOptions> {
    return parseBuildArgs(withStandaloneBuildFlag(args, '--standalone-dev'));
}

export function parseBuildPreviewArgs(args: string[]): Partial<BuildOptions> {
    return parseBuildArgs(withStandaloneBuildFlag(args, '--standalone-preview'));
}

async function executeBuild(options: BuildOptions): Promise<BuildResult> {
    try {
        return await build(options);
    } catch (error) {
        process.exit(1);
        throw error;
    }
}

function shouldEmitStandalonePreview(
    cliOptions: Partial<BuildOptions>,
    buildOptions: BuildOptions,
    previewConfig: PreviewOptions | null,
): boolean {
    return Boolean(buildOptions.standalonePreview ?? cliOptions.standalonePreview ?? previewConfig?.standalone);
}

function shouldEmitStandaloneDev(
    cliOptions: Partial<BuildOptions>,
    buildOptions: BuildOptions,
    devConfig: DevServerOptions | null,
): boolean {
    return Boolean(buildOptions.standaloneDev ?? cliOptions.standaloneDev ?? devConfig?.standalone);
}

function withStandaloneBuildFlag(args: string[], standaloneFlag: StandaloneBuildFlag): string[] {
    return args.includes(standaloneFlag) ? args : [standaloneFlag, ...args];
}

async function emitStandalonePreviewIfNeeded(params: {
    cliOptions: Partial<BuildOptions>;
    buildOptions: BuildOptions;
    allBuilds: BuildOptions[];
    configPath: string | null;
    cwd: string;
    previewConfig: PreviewOptions | null;
}): Promise<void> {
    if (!shouldEmitStandalonePreview(params.cliOptions, params.buildOptions, params.previewConfig)) {
        return;
    }

    await buildStandalonePreviewServer({
        allBuilds: params.allBuilds,
        buildConfig: params.buildOptions,
        configPath: params.configPath,
        cwd: params.cwd,
        logging: params.buildOptions.logging,
        outFile: params.cliOptions.standalonePreviewOutFile,
        previewConfig: params.previewConfig,
    });
}

async function emitStandaloneDevIfNeeded(params: {
    allBuilds: BuildOptions[];
    cliOptions: Partial<BuildOptions>;
    buildOptions: BuildOptions;
    configPath: string | null;
    cwd: string;
    devConfig: DevServerOptions | null;
}): Promise<void> {
    if (!shouldEmitStandaloneDev(params.cliOptions, params.buildOptions, params.devConfig)) {
        return;
    }

    const mode = process.env.MODE || 'development';
    const env = loadEnv(mode);
    const devOptions: DevServerOptions = {
        ...(params.devConfig || {}),
        env: { ...(params.devConfig?.env || {}), ...env },
    };

    if (!devOptions.root && (!devOptions.clients || devOptions.clients.length === 0)) {
        devOptions.root = params.cwd;
    }

    await buildStandaloneDevServer({
        allBuilds: params.allBuilds,
        buildConfig: params.buildOptions,
        configPath: params.configPath,
        cwd: params.cwd,
        devConfig: devOptions,
        logging: params.buildOptions.logging,
        outFile: params.cliOptions.standaloneDevOutFile || params.buildOptions.standaloneDevOutFile,
    });
}

function validateEntry(entry: string | undefined, buildIndex?: number): void {
    if (entry) {
        return;
    }

    if (buildIndex !== undefined) {
        console.error(`Error: Entry file is required for build #${buildIndex + 1}`);
    } else {
        console.error('Error: Entry file is required');
        console.error('Specify in config file or use --entry <file>');
    }

    process.exit(1);
}

function ensureEnv(options: BuildOptions, env: Record<string, string>): void {
    options.env = { ...options.env, ...env };
}