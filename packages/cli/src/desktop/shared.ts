import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { NativeTree } from '@elitjs/native';
import type { DesktopMode } from '@elitjs/config';
import type { WapkRuntimeName } from '@elitjs/wapk';

declare const __dirname: string | undefined;

const here = typeof __dirname !== 'undefined'
    ? __dirname
    : dirname(fileURLToPath(import.meta.url));

export type DesktopRuntimeName = 'quickjs' | 'bun' | 'node' | 'deno';
export type DesktopCompilerName = 'auto' | 'none' | 'esbuild' | 'tsx' | 'tsup';
export type DesktopFormat = 'iife' | 'cjs' | 'esm';

export const PACKAGE_ROOT = resolve(here, '../../..');
export const DESKTOP_RUNTIMES: DesktopRuntimeName[] = ['quickjs', 'bun', 'node', 'deno'];
export const DESKTOP_COMPILERS: DesktopCompilerName[] = ['auto', 'none', 'esbuild', 'tsx', 'tsup'];
export const BUILD_FEATURES: Record<DesktopRuntimeName, string[]> = {
    quickjs: ['runtime-quickjs'],
    bun: ['runtime-external'],
    node: ['runtime-external'],
    deno: ['runtime-external'],
};
export const EMBED_MAGIC_V2 = Buffer.from([0x57, 0x41, 0x50, 0x4b, 0x52, 0x54, 0x00, 0x02]);
export const EMBED_NATIVE_MAGIC_V1 = Buffer.from([0x45, 0x4c, 0x49, 0x54, 0x4e, 0x55, 0x49, 0x31]);
export const EMBED_RUNTIME_CODE: Record<DesktopRuntimeName, number> = {
    quickjs: 1,
    bun: 2,
    node: 3,
    deno: 4,
};
export const PLATFORMS = {
    windows: 'x86_64-pc-windows-msvc',
    win: 'x86_64-pc-windows-msvc',
    'windows-arm': 'aarch64-pc-windows-msvc',
    'win-arm': 'aarch64-pc-windows-msvc',
    linux: 'x86_64-unknown-linux-gnu',
    'linux-musl': 'x86_64-unknown-linux-musl',
    'linux-arm': 'aarch64-unknown-linux-gnu',
    macos: 'x86_64-apple-darwin',
    mac: 'x86_64-apple-darwin',
    darwin: 'x86_64-apple-darwin',
    'macos-arm': 'aarch64-apple-darwin',
    'mac-arm': 'aarch64-apple-darwin',
} as const;
export const TS_LIKE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts', '.jsx']);

export type DesktopPlatform = keyof typeof PLATFORMS;
export type TsupModule = typeof import('tsup');
export type DesktopBootstrapSupportModuleName = 'desktop-auto-render' | 'render-context';

export interface DesktopRunOptions {
    mode: DesktopMode;
    runtime: DesktopRuntimeName;
    compiler: DesktopCompilerName;
    exportName?: string;
    binaryPath?: string;
    nativeBinaryPath?: string;
    cargoTargetDir?: string;
    release: boolean;
    entry?: string;
}

export interface DesktopBuildOptions extends DesktopRunOptions {
    outDir: string;
    platform?: DesktopPlatform;
}

export interface EnsureBinaryOptions {
    runtime: DesktopRuntimeName;
    release: boolean;
    triple?: string;
    entryPath?: string;
    binaryPath?: string;
    cargoTargetDir?: string;
}

export interface EnsureNativeBinaryOptions {
    release: boolean;
    triple?: string;
    entryPath?: string;
    binaryPath?: string;
    cargoTargetDir?: string;
}

export interface PreparedEntry {
    appName: string;
    entryPath: string;
    cleanupPath?: string;
}

export interface PreparedDesktopNativePayload {
    appName: string;
    payloadPath: string;
    cleanupPath?: string;
}

export interface DesktopNativeWindowOptions {
    title: string;
    width: number;
    height: number;
    center: boolean;
    icon?: string;
    autoClose?: boolean;
}

export interface DesktopNativeInteractionOutput {
    file?: string;
    stdout?: boolean;
    emitReady?: boolean;
}

export interface DesktopNativePayload {
    window: DesktopNativeWindowOptions;
    resourceBaseDir?: string;
    interactionOutput?: DesktopNativeInteractionOutput;
    tree: NativeTree;
}

export interface DesktopBootstrapEntry {
    bootstrapPath: string;
    cleanupPaths: string[];
}

export interface DesktopWapkRunOptions {
    runtime?: WapkRuntimeName;
    release: boolean;
    file: string;
    syncInterval?: number;
    useWatcher?: boolean;
    password?: string;
}