import { resolve } from 'node:path';

import { ELIT_CONFIG_FILES, loadConfig, loadEnv, mergeConfig, resolveConfigPath } from '../../shares/config';
import { createDevServer } from '../../server/server';
import type { DevServerOptions, PreviewOptions } from '../../server/types';
import type { ElitConfig } from '../../shares/config/types';
import type { ResolveConfig } from '../../build/contracts';

import { buildServerDependencyGraph, discoverServerEntries } from './server-deps';
import { createServerWatcher, type ServerWatcher } from './server-watcher';
import { parseArgs, setupShutdownHandlers, type ArgHandler } from './shared';

type PreviewCliOptions = {
    port: number;
    host: string;
    root: string;
    basePath: string;
    open: boolean;
    logging: boolean;
};

function mergeResolve(
    elitConfig: ElitConfig | null | undefined,
    targetResolve: ResolveConfig | undefined,
): ResolveConfig | undefined {
    const topAlias = elitConfig?.resolve?.alias;
    const targetAlias = targetResolve?.alias;
    if (!topAlias && !targetAlias) return undefined;
    return { alias: { ...(topAlias || {}), ...(targetAlias || {}) } };
}

export async function runDev(args: string[]): Promise<void> {
    const cliOptions = parseDevArgs(args);
    const cwd = process.cwd();

    let devServer: Awaited<ReturnType<typeof createDevServer>> | null = null;
    let serverWatcher: ServerWatcher | null = null;
    let restarting = false;
    let lastLoadedAlias: Record<string, string> | undefined = undefined;

    async function start(): Promise<void> {
        const config = await loadConfig();
        const devConfig = config?.dev
            ? mergeConfig(config.dev, cliOptions) as DevServerOptions
            : cliOptions as DevServerOptions;
        const options: DevServerOptions = { ...devConfig };
        const mergedResolve = mergeResolve(config, devConfig.resolve);
        if (mergedResolve) options.resolve = mergedResolve;
        lastLoadedAlias = mergedResolve?.alias;
        const mode = process.env.MODE || 'development';

        options.env = { ...options.env, ...loadEnv(mode) };

        if (!options.root && (!options.clients || options.clients.length === 0)) {
            options.root = cwd;
        }

        options.mode = 'dev';
        devServer = createDevServer(options);
    }

    async function restart(reason: 'config' | 'server' = 'config', changedPath?: string): Promise<void> {
        if (restarting) {
            return;
        }

        restarting = true;
        if (reason === 'server') {
            const detail = changedPath ? ` (${changedPath})` : '';
            console.log(`\n[Server HMR] Server source changed${detail}, restarting...`);
        } else {
            console.log('\n[Config] Config changed, restarting...');
        }

        try {
            if (serverWatcher) {
                await serverWatcher.close();
                serverWatcher = null;
            }
            if (devServer) {
                await devServer.close();
            }
            await start();
            await startServerWatcher();
        } finally {
            restarting = false;
        }
    }

    async function startServerWatcher(): Promise<void> {
        if (serverWatcher) return;

        const serverWatchOption = cliOptions.serverWatch;
        if (serverWatchOption === false) {
            return;
        }

        const configPath = resolveConfigPath(cwd);
        if (!configPath) {
            return;
        }

        let filesToWatch: string[];

        if (Array.isArray(serverWatchOption)) {
            filesToWatch = serverWatchOption.map((pattern) =>
                pattern.startsWith('.') || pattern.startsWith('/')
                    ? resolve(cwd, pattern)
                    : pattern
            );
        } else {
            const entries = discoverServerEntries(configPath, {
                clientRoot: cwd,
                alias: lastLoadedAlias,
            });
            if (entries.length === 0) {
                return;
            }
            const graph = buildServerDependencyGraph(entries, {
                clientRoot: cwd,
                alias: lastLoadedAlias,
                onParseError: (file) => {
                    console.warn(`[Server HMR] Could not parse ${file}, skipping its imports`);
                },
            });
            filesToWatch = Array.from(graph);
        }

        if (filesToWatch.length === 0) {
            return;
        }

        console.log(`[Server HMR] Watching ${filesToWatch.length} server source file${filesToWatch.length === 1 ? '' : 's'}`);

        serverWatcher = createServerWatcher({
            files: filesToWatch,
            onChange: (path) => {
                void restart('server', path).catch((error) => {
                    console.error('[Server HMR] Restart failed:', error);
                });
            },
        });
    }

    await start();
    await startServerWatcher();

    const { watch } = await import('node:fs');
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const configWatcher = watch(cwd, (_, filename) => {
        if (!filename || !ELIT_CONFIG_FILES.includes(filename as typeof ELIT_CONFIG_FILES[number])) {
            return;
        }

        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }

        debounceTimer = setTimeout(() => {
            void restart('config').catch((error) => {
                console.error('[Config] Restart failed:', error);
            });
        }, 300);
    });

    setupShutdownHandlers(async () => {
        configWatcher.close();
        if (serverWatcher) {
            await serverWatcher.close();
        }
        if (devServer) {
            await devServer.close();
        }
    });
}

export async function runPreview(args: string[]): Promise<void> {
    const cliOptions = parsePreviewArgs(args);
    const config = await loadConfig();
    const previewConfig = config?.preview || {};
    const mergedOptions: PreviewOptions = {
        ...previewConfig,
        ...Object.fromEntries(Object.entries(cliOptions).filter(([, value]) => value !== undefined)),
    };
    const options: DevServerOptions = {
        port: mergedOptions.port || 4173,
        host: mergedOptions.host || 'localhost',
        open: mergedOptions.open ?? true,
        logging: mergedOptions.logging ?? true,
        domain: mergedOptions.domain,
    };

    if (mergedOptions.clients && mergedOptions.clients.length > 0) {
        options.clients = mergedOptions.clients;
        console.log('Starting preview server with multiple clients...');
        console.log(`  Clients: ${mergedOptions.clients.length}`);
        mergedOptions.clients.forEach((client, index) => {
            console.log(`    ${index + 1}. ${client.basePath} -> ${client.root}`);
        });
    } else {
        const buildConfig = config?.build;
        const defaultOutDir = Array.isArray(buildConfig) ? buildConfig[0]?.outDir : buildConfig?.outDir;

        options.root = mergedOptions.root || defaultOutDir || 'dist';
        options.basePath = mergedOptions.basePath;
        options.index = mergedOptions.index;

        console.log('Starting preview server...');
        console.log(`  Root:  ${options.root}`);
    }

    if (mergedOptions.proxy && mergedOptions.proxy.length > 0) {
        options.proxy = mergedOptions.proxy;
    }

    if (mergedOptions.worker && mergedOptions.worker.length > 0) {
        options.worker = mergedOptions.worker;
    }

    if (mergedOptions.api) {
        options.api = mergedOptions.api;
    }

    if (mergedOptions.ws && mergedOptions.ws.length > 0) {
        options.ws = mergedOptions.ws;
    }

    if (mergedOptions.https) {
        options.https = mergedOptions.https;
    }

    if (mergedOptions.ssr) {
        options.ssr = mergedOptions.ssr;
    }

    if (mergedOptions.blockFiles) {
        options.blockFiles = mergedOptions.blockFiles;
    }

    const mergedResolve = mergeResolve(config, mergedOptions.resolve);
    if (mergedResolve) options.resolve = mergedResolve;

    const mode = process.env.MODE || 'production';
    options.env = { ...mergedOptions.env, ...loadEnv(mode) };
    options.mode = 'preview';

    const devServer = createDevServer(options);
    setupShutdownHandlers(() => devServer.close());
}

function parseDevArgs(args: string[]): Partial<DevServerOptions> {
    const options: Partial<DevServerOptions> = {};
    const handlers: Record<string, ArgHandler<Partial<DevServerOptions>>> = {
        '-p': (current, value, index) => {
            current.port = Number.parseInt(value ?? '', 10);
            index.current++;
        },
        '--port': (current, value, index) => {
            current.port = Number.parseInt(value ?? '', 10);
            index.current++;
        },
        '-h': (current, value, index) => {
            current.host = value;
            index.current++;
        },
        '--host': (current, value, index) => {
            current.host = value;
            index.current++;
        },
        '-r': (current, value, index) => {
            current.root = value;
            index.current++;
        },
        '--root': (current, value, index) => {
            current.root = value;
            index.current++;
        },
        '--no-open': (current) => {
            current.open = false;
        },
        '--silent': (current) => {
            current.logging = false;
        },
        '--no-server-watch': (current) => {
            current.serverWatch = false;
        },
    };

    return parseArgs(args, handlers, options);
}

function parsePreviewArgs(args: string[]): Partial<PreviewCliOptions> {
    const options: Partial<PreviewCliOptions> = {};
    const handlers: Record<string, ArgHandler<Partial<PreviewCliOptions>>> = {
        '-p': (current, value, index) => {
            current.port = Number.parseInt(value ?? '', 10);
            index.current++;
        },
        '--port': (current, value, index) => {
            current.port = Number.parseInt(value ?? '', 10);
            index.current++;
        },
        '-h': (current, value, index) => {
            current.host = value;
            index.current++;
        },
        '--host': (current, value, index) => {
            current.host = value;
            index.current++;
        },
        '-r': (current, value, index) => {
            current.root = value;
            index.current++;
        },
        '--root': (current, value, index) => {
            current.root = value;
            index.current++;
        },
        '-b': (current, value, index) => {
            current.basePath = value;
            index.current++;
        },
        '--base-path': (current, value, index) => {
            current.basePath = value;
            index.current++;
        },
        '--no-open': (current) => {
            current.open = false;
        },
        '--silent': (current) => {
            current.logging = false;
        },
    };

    return parseArgs(args, handlers, options);
}