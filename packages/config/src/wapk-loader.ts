/**
 * Config loader for wapk.config.{ts,mts,js,mjs,cjs,json}
 *
 * Looks for wapk.config.* first, then falls back to elit.config.* and returns
 * its `wapk` field. This lets the @elitjs/wapk binary read a dedicated config
 * file when the user wants to keep wapk concerns separate.
 */

import { existsSync } from '@elitjs/fs';
import { resolve } from '@elitjs/path';
import { WAPK_CONFIG_FILES } from './constants';
import { loadConfig } from './loader';
import type { WapkConfig } from './types';
import { importConfigModule, normalizeRelativeImportPath, readFileAsString, safeCleanup } from './utils';
import { resolveWorkspacePackageImport } from '@elitjs/workspace-package';
import { dirname, join } from '@elitjs/path';

export function resolveWapkConfigPath(cwd: string = process.cwd()): string | null {
    for (const configFile of WAPK_CONFIG_FILES) {
        const configPath = resolve(cwd, configFile);
        if (existsSync(configPath)) {
            return configPath;
        }
    }
    return null;
}

export async function loadWapkConfig(cwd: string = process.cwd()): Promise<WapkConfig | null> {
    const configPath = resolveWapkConfigPath(cwd);

    if (configPath) {
        try {
            const loaded = await loadWapkConfigFile(configPath);
            // Accept either WapkConfig directly or an ElitConfig-shaped wrapper.
            const candidate = (loaded as { wapk?: WapkConfig })?.wapk;
            if (candidate && typeof candidate === 'object') {
                return candidate;
            }
            return loaded;
        } catch (error) {
            console.error(`Error loading config file: ${configPath.split(/[/\\]/).pop()}`);
            console.error(error);
            throw error;
        }
    }

    const elitConfig = await loadConfig(cwd);
    return elitConfig?.wapk ?? null;
}

async function loadWapkConfigFile(configPath: string): Promise<WapkConfig> {
    const ext = configPath.split('.').pop();

    if (ext === 'json') {
        const content = readFileAsString(configPath);
        return JSON.parse(content) as WapkConfig;
    }

    if (ext === 'ts' || ext === 'mts') {
        try {
            const { build } = await import('esbuild');

            const configDir = dirname(configPath);
            const tempFile = join(configDir, `.wapk-config-${Date.now()}.mjs`);

            const externalAllPlugin = {
                name: 'external-all',
                setup(buildContext: any) {
                    buildContext.onResolve({ filter: /.*/ }, (args: any) => {
                        const workspacePackageImport = resolveWorkspacePackageImport(args.path, args.resolveDir || configDir, {
                            preferBuilt: true,
                            preferredBuiltFormat: 'esm',
                        });
                        if (workspacePackageImport) {
                            return {
                                path: normalizeRelativeImportPath(configDir, workspacePackageImport),
                                external: true,
                            };
                        }

                        if (args.path.startsWith('./') || args.path.startsWith('../')) {
                            return undefined;
                        }

                        if (args.path.includes('node_modules') || args.resolveDir?.includes('node_modules')) {
                            return { path: args.path, external: true };
                        }

                        const knownPackages = ['esbuild', 'elit', 'fs', 'path', 'os', 'vm', 'crypto', 'http', 'https', 'url', 'bun'];
                        if (knownPackages.some((pkg) => args.path === pkg || args.path.startsWith(pkg + '/'))) {
                            return { path: args.path, external: true };
                        }

                        if (args.resolveDir?.includes('elit/dist') || args.path.includes('elit/dist')) {
                            return { path: args.path, external: true };
                        }

                        return undefined;
                    });
                }
            };

            await build({
                entryPoints: [configPath],
                bundle: true,
                banner: {
                    js: `import { createRequire as __createRequire } from 'module'; const require = __createRequire(import.meta.url);`,
                },
                format: 'esm',
                platform: 'node',
                outfile: tempFile,
                write: true,
                target: 'es2020',
                plugins: [externalAllPlugin],
                external: [
                    'node:*',
                    'fs', 'path', 'os', 'vm', 'crypto', 'http', 'https',
                    'bun', 'bun:*', 'deno', 'deno:*'
                ],
                absWorkingDir: configDir,
            });

            const config = await importConfigModule(tempFile);
            await safeCleanup(tempFile);

            return config as unknown as WapkConfig;
        } catch (error) {
            console.error('Failed to load TypeScript wapk config file.');
            console.error('You can use a .js, .mjs, or .json config file instead.');
            throw error;
        }
    }

    return await importConfigModule(configPath) as unknown as WapkConfig;
}
