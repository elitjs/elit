/**
 * Config loader for elit.config.{ts,mts,js,mjs,cjs,json}
 */

import { existsSync } from '@elitjs/fs';
import { dirname, join, resolve } from '@elitjs/path';
import { resolveWorkspacePackageImport } from '@elitjs/workspace-package';
import { ELIT_CONFIG_FILES } from './constants';
import type { ElitConfig } from './types';
import { importConfigModule, normalizeRelativeImportPath, readFileAsString, safeCleanup } from './utils';

export function resolveConfigPath(cwd: string = process.cwd()): string | null {
    for (const configFile of ELIT_CONFIG_FILES) {
        const configPath = resolve(cwd, configFile);

        if (existsSync(configPath)) {
            return configPath;
        }
    }

    return null;
}

/**
 * Load elit config from current directory
 */
export async function loadConfig(cwd: string = process.cwd()): Promise<ElitConfig | null> {
    const configPath = resolveConfigPath(cwd);

    if (configPath) {
        try {
            return await loadConfigFile(configPath);
        } catch (error) {
            console.error(`Error loading config file: ${configPath.split(/[/\\]/).pop()}`);
            console.error(error);
            throw error;
        }
    }

    return null;
}

async function loadConfigFile(configPath: string): Promise<ElitConfig> {
    const ext = configPath.split('.').pop();

    if (ext === 'json') {
        const content = readFileAsString(configPath);
        return JSON.parse(content);
    }

    if (ext === 'ts' || ext === 'mts') {
        try {
            const { build } = await import('esbuild');

            const configDir = dirname(configPath);
            const tempFile = join(configDir, `.elit-config-${Date.now()}.mjs`);

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

            return config;
        } catch (error) {
            console.error('Failed to load TypeScript config file.');
            console.error('You can use a .js, .mjs, or .json config file instead.');
            throw error;
        }
    }

    return await importConfigModule(configPath);
}