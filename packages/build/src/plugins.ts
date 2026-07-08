import { dirname } from '@elitjs/path';
import { resolveWorkspacePackageImport } from '@elitjs/workspace-package';
import type { BuildPlatform, WorkspacePackagePluginOptions } from './types';

export function createWorkspacePackagePlugin(entryDir: string, options: WorkspacePackagePluginOptions = {}) {
    return {
        name: 'workspace-package-self-reference',
        setup(build: any) {
            build.onResolve({ filter: /^elit(?:\/.*)?$/ }, (args: { path: string; resolveDir?: string }) => {
                const resolved = resolveWorkspacePackageImport(args.path, args.resolveDir || entryDir, options);
                return resolved ? { path: resolved } : undefined;
            });
        },
    };
}

export function createBrowserOnlyPlugin() {
    return {
        name: 'browser-only',
        setup(build: any) {
            build.onResolve({ filter: /^(node:.*|fs|path|http|https|url|os|child_process|net|tls|crypto|stream|util|events|buffer|zlib|readline|process|assert|constants|dns|domain|punycode|querystring|repl|string_decoder|sys|timers|tty|v8|vm)$/ }, () => {
                return { path: 'node-builtin', external: true, sideEffects: false };
            });

            build.onResolve({ filter: /^(chokidar|esbuild|mime-types|open|ws|fs\/promises)$/ }, () => {
                return { path: 'server-dep', external: true, sideEffects: false };
            });

            build.onLoad({ filter: /server|config|cli/ }, () => ({
                contents: 'export default {};',
            }));
        },
    };
}

export function createBuildPlugins(entryPath: string, platform: BuildPlatform): any[] {
    const workspacePackagePlugin = createWorkspacePackagePlugin(dirname(entryPath), {
        preferBuilt: platform === 'browser',
        preferredBuiltFormat: platform === 'browser' ? 'esm' : undefined,
    });

    return platform === 'browser'
        ? [workspacePackagePlugin, createBrowserOnlyPlugin()]
        : [workspacePackagePlugin];
}