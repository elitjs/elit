import { randomUUID } from 'node:crypto';
import { unlinkSync } from 'node:fs';
import { basename, dirname, extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { build as esbuild } from 'esbuild';

import {
    clearCapturedRenderedVNode,
    clearDesktopRenderOptions,
    getDesktopRenderOptions,
    getCapturedRenderedVNode,
    restoreRenderRuntimeTarget,
    setRenderRuntimeTarget,
} from '@elitjs/render-context';
import type { Child } from '@elitjs/core';
import { resolveWorkspacePackageImport } from '@elitjs/workspace-package';
import { DEFAULT_ENTRY_EXPORTS, type LoadedNativeEntryResult, type NativeEntryRuntimeTarget } from './shared';

export async function loadNativeEntryValue(entryPath: string, exportName?: string): Promise<Child> {
    const result = await loadNativeEntryResult(entryPath, exportName);
    return result.entry;
}

export async function loadNativeEntryResult(
    entryPath: string,
    exportName?: string,
    runtimeTarget: NativeEntryRuntimeTarget = 'mobile',
): Promise<LoadedNativeEntryResult> {
    const tempFile = await compileNativeEntry(entryPath);
    const previousTarget = setRenderRuntimeTarget(runtimeTarget);
    clearCapturedRenderedVNode();
    clearDesktopRenderOptions();

    try {
        const moduleRecord = await import(pathToFileURL(tempFile).href) as Record<string, unknown>;
        const entry = await resolveNativeEntryExport(moduleRecord, exportName);
        return {
            entry,
            ...(runtimeTarget === 'desktop' ? { desktopRenderOptions: getDesktopRenderOptions() } : {}),
        };
    } finally {
        restoreRenderRuntimeTarget(previousTarget);
        clearDesktopRenderOptions();
        safeCleanup(tempFile);
    }
}

async function compileNativeEntry(entryPath: string): Promise<string> {
    const entryDir = dirname(entryPath);
    const tempFile = resolve(
        entryDir,
        `.elit-native-${basename(entryPath, extname(entryPath))}-${randomUUID()}.mjs`,
    );

    const externalPackagesPlugin = {
        name: 'external-packages',
        setup(build: any) {
            build.onResolve({ filter: /.*/ }, (args: { path: string; resolveDir?: string }) => {
                const localWorkspaceImport = resolveWorkspacePackageImport(args.path, args.resolveDir || entryDir);
                if (localWorkspaceImport) {
                    return { path: localWorkspaceImport };
                }

                if (isBareSpecifier(args.path)) {
                    return { path: args.path, external: true };
                }
                return undefined;
            });
        },
    };

    await esbuild({
        absWorkingDir: entryDir,
        bundle: true,
        entryPoints: [entryPath],
        external: ['node:*', 'bun', 'bun:*', 'deno', 'deno:*'],
        format: 'esm',
        logLevel: 'silent',
        outfile: tempFile,
        platform: 'node',
        plugins: [externalPackagesPlugin],
        sourcemap: false,
        target: 'es2022',
        write: true,
    });

    return tempFile;
}

function isBareSpecifier(specifier: string): boolean {
    if (specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/')) {
        return false;
    }

    return !/^[A-Za-z]:[\\/]/.test(specifier);
}

export async function resolveNativeEntryExport(moduleRecord: Record<string, unknown>, exportName?: string): Promise<Child> {
    if (exportName) {
        if (!(exportName in moduleRecord)) {
            throw new Error(`Export "${exportName}" was not found in the native entry module.`);
        }
        return resolveNativeExportValue(moduleRecord[exportName], exportName);
    }

    for (const candidate of DEFAULT_ENTRY_EXPORTS) {
        if (candidate in moduleRecord && moduleRecord[candidate] !== undefined) {
            return resolveNativeExportValue(moduleRecord[candidate], candidate);
        }
    }

    const capturedRender = getCapturedRenderedVNode();
    if (capturedRender?.vNode) {
        return capturedRender.vNode;
    }

    const remainingExports = Object.keys(moduleRecord).filter((key) => key !== '__esModule');
    if (remainingExports.length === 1) {
        const [candidate] = remainingExports;
        return resolveNativeExportValue(moduleRecord[candidate], candidate);
    }

    throw new Error(
        'Native entry must export a value or zero-argument function as default, screen, app, or another named export via --export, or call render(...) so the CLI can capture the VNode.',
    );
}

export async function resolveNativeExportValue(value: unknown, exportName: string): Promise<Child> {
    let resolved = value;

    if (typeof resolved === 'function') {
        if (resolved.length > 0) {
            throw new Error(`Export "${exportName}" must be a native tree value or a zero-argument function.`);
        }
        resolved = (resolved as () => unknown)();
    }

    if (isPromiseLike(resolved)) {
        resolved = await resolved;
    }

    if (resolved == null) {
        throw new Error(`Export "${exportName}" returned no value.`);
    }

    return resolved as Child;
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
    return Boolean(
        value &&
        (typeof value === 'object' || typeof value === 'function') &&
        'then' in value,
    );
}

function safeCleanup(filePath: string): void {
    try {
        unlinkSync(filePath);
    } catch {
        // Ignore cleanup errors for generated temp files.
    }
}