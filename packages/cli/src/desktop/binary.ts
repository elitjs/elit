import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
    BUILD_FEATURES,
    PACKAGE_ROOT,
    type DesktopRuntimeName,
    type EnsureBinaryOptions,
    type EnsureNativeBinaryOptions,
} from './shared';
import { resolveDesktopBinaryOverridePath, resolveDesktopCargoTargetBaseDir, resolveDesktopIcon } from './support';

export function ensureDesktopBinary(options: EnsureBinaryOptions): string {
    const overriddenBinary = resolveDesktopBinaryOverridePath(options.binaryPath, 'ELIT_DESKTOP_BINARY_PATH');
    if (overriddenBinary) {
        if (!existsSync(overriddenBinary)) {
            throw new Error(`Configured desktop runtime binary was not found: ${overriddenBinary}`);
        }

        return overriddenBinary;
    }

    let binary = findDesktopBinary(options.runtime, options.release, options.triple, options.cargoTargetDir);

    if (!binary || isDesktopRustBuildStale(binary)) {
        buildDesktopRuntime(options);
        binary = findDesktopBinary(options.runtime, options.release, options.triple, options.cargoTargetDir);
    }

    if (!binary) {
        throw new Error('Desktop runtime binary was not found after cargo build completed.');
    }

    return binary;
}

export function ensureDesktopNativeBinary(options: EnsureNativeBinaryOptions): string {
    const overriddenBinary = resolveDesktopBinaryOverridePath(options.binaryPath, 'ELIT_DESKTOP_NATIVE_BINARY_PATH');
    if (overriddenBinary) {
        if (!existsSync(overriddenBinary)) {
            throw new Error(`Configured desktop native runtime binary was not found: ${overriddenBinary}`);
        }

        return overriddenBinary;
    }

    let binary = findDesktopNativeBinary(options.release, options.triple, options.cargoTargetDir);

    if (!binary || isDesktopRustBuildStale(binary)) {
        buildDesktopNativeRuntime(options);
        binary = findDesktopNativeBinary(options.release, options.triple, options.cargoTargetDir);
    }

    if (!binary) {
        throw new Error('Desktop native runtime binary was not found after cargo build completed.');
    }

    return binary;
}

function buildDesktopRuntime(options: EnsureBinaryOptions): void {
    const args = [
        'build',
        '--manifest-path',
        resolve(PACKAGE_ROOT, 'Cargo.toml'),
        '--bin',
        'elit-desktop',
        '--no-default-features',
        '--features',
        BUILD_FEATURES[options.runtime].join(','),
    ];

    if (options.release) {
        args.push('--release');
    }

    if (options.triple) {
        args.push('--target', options.triple);
    }

    const env: NodeJS.ProcessEnv = {
        ...process.env,
        CARGO_TARGET_DIR: desktopCargoTargetDir(options.runtime, options.cargoTargetDir),
    };

    const iconPath = resolveDesktopIcon(options.entryPath);
    if (iconPath) {
        env.ELIT_DESKTOP_EXE_ICON = iconPath;
        env.WAPK_EXE_ICON = iconPath;
    }

    const result = spawnSync('cargo', args, {
        cwd: PACKAGE_ROOT,
        env,
        stdio: 'inherit',
        windowsHide: true,
    });

    if (result.error) {
        if ((result.error as NodeJS.ErrnoException).code === 'ENOENT') {
            throw new Error('Cargo is required for desktop mode but was not found in PATH.');
        }

        throw result.error;
    }

    if (result.status !== 0) {
        printDesktopCargoFailureHint('hybrid');
        process.exit(result.status ?? 1);
    }
}

function buildDesktopNativeRuntime(options: EnsureNativeBinaryOptions): void {
    const args = [
        'build',
        '--manifest-path',
        resolve(PACKAGE_ROOT, 'Cargo.toml'),
        '--bin',
        'elit-desktop-native',
    ];

    if (options.release) {
        args.push('--release');
    }

    if (options.triple) {
        args.push('--target', options.triple);
    }

    const env: NodeJS.ProcessEnv = {
        ...process.env,
        CARGO_TARGET_DIR: desktopNativeCargoTargetDir(options.cargoTargetDir),
    };

    const iconPath = resolveDesktopIcon(options.entryPath);
    if (iconPath) {
        env.ELIT_DESKTOP_EXE_ICON = iconPath;
        env.WAPK_EXE_ICON = iconPath;
    }

    const result = spawnSync('cargo', args, {
        cwd: PACKAGE_ROOT,
        env,
        stdio: 'inherit',
        windowsHide: true,
    });

    if (result.error) {
        if ((result.error as NodeJS.ErrnoException).code === 'ENOENT') {
            throw new Error('Cargo is required for desktop native mode but was not found in PATH.');
        }

        throw result.error;
    }

    if (result.status !== 0) {
        printDesktopCargoFailureHint('native');
        process.exit(result.status ?? 1);
    }
}

function findDesktopBinary(
    runtime: DesktopRuntimeName,
    release: boolean,
    triple?: string,
    configuredTargetDir?: string,
    configuredBinaryPath?: string,
): string | null {
    const overriddenBinary = resolveDesktopBinaryOverridePath(configuredBinaryPath, 'ELIT_DESKTOP_BINARY_PATH');
    if (overriddenBinary) {
        return existsSync(overriddenBinary) ? overriddenBinary : null;
    }

    const targetDir = desktopCargoTargetDir(runtime, configuredTargetDir);
    const profile = release ? 'release' : 'debug';
    const binaryName = isWindowsTarget(triple) ? 'elit-desktop.exe' : 'elit-desktop';
    const candidates = triple
        ? [join(targetDir, triple, profile, binaryName)]
        : [join(targetDir, profile, binaryName)];

    for (const candidate of candidates) {
        if (existsSync(candidate)) {
            return candidate;
        }
    }

    return null;
}

function findDesktopNativeBinary(
    release: boolean,
    triple?: string,
    configuredTargetDir?: string,
    configuredBinaryPath?: string,
): string | null {
    const overriddenBinary = resolveDesktopBinaryOverridePath(configuredBinaryPath, 'ELIT_DESKTOP_NATIVE_BINARY_PATH');
    if (overriddenBinary) {
        return existsSync(overriddenBinary) ? overriddenBinary : null;
    }

    const targetDir = desktopNativeCargoTargetDir(configuredTargetDir);
    const profile = release ? 'release' : 'debug';
    const binaryName = isWindowsTarget(triple) ? 'elit-desktop-native.exe' : 'elit-desktop-native';
    const candidates = triple
        ? [join(targetDir, triple, profile, binaryName)]
        : [join(targetDir, profile, binaryName)];

    for (const candidate of candidates) {
        if (existsSync(candidate)) {
            return candidate;
        }
    }

    return null;
}

function desktopCargoTargetDir(runtime: DesktopRuntimeName, configuredTargetDir?: string): string {
    return resolve(resolveDesktopCargoTargetBaseDir(
        PACKAGE_ROOT,
        process.cwd(),
        {
            ...process.env,
            ...(configuredTargetDir ? { ELIT_DESKTOP_CARGO_TARGET_DIR: configuredTargetDir } : {}),
        },
    ), runtime);
}

function desktopNativeCargoTargetDir(configuredTargetDir?: string): string {
    return resolve(resolveDesktopCargoTargetBaseDir(
        PACKAGE_ROOT,
        process.cwd(),
        {
            ...process.env,
            ...(configuredTargetDir ? { ELIT_DESKTOP_CARGO_TARGET_DIR: configuredTargetDir } : {}),
        },
    ), 'native');
}

function printDesktopCargoFailureHint(mode: 'hybrid' | 'native'): void {
    if (process.platform !== 'win32') {
        return;
    }

    const binaryConfigLabel = mode === 'native'
        ? 'desktop.nativeBinaryPath or ELIT_DESKTOP_NATIVE_BINARY_PATH'
        : 'desktop.binaryPath or ELIT_DESKTOP_BINARY_PATH';

    console.error('[desktop] Cargo build failed. If Windows Application Control blocks Rust build scripts on this machine, configure a prebuilt runtime binary.');
    console.error(`[desktop] Use ${binaryConfigLabel} to bypass Cargo for desktop runs/builds.`);
    console.error('[desktop] Use desktop.cargoTargetDir or ELIT_DESKTOP_CARGO_TARGET_DIR if your environment only allows specific cache locations.');
}

function isDesktopRustBuildStale(binaryPath: string): boolean {
    if (!existsSync(binaryPath)) {
        return true;
    }

    return statSync(binaryPath).mtimeMs < getLatestDesktopRustInputMtime();
}

let latestDesktopRustInputMtime: number | undefined;

function getLatestDesktopRustInputMtime(): number {
    if (latestDesktopRustInputMtime !== undefined) {
        return latestDesktopRustInputMtime;
    }

    latestDesktopRustInputMtime = Math.max(
        getPathModifiedTime(resolve(PACKAGE_ROOT, 'Cargo.toml')),
        getPathModifiedTime(resolve(PACKAGE_ROOT, 'src', 'desktop')),
    );
    return latestDesktopRustInputMtime;
}

function getPathModifiedTime(path: string): number {
    if (!existsSync(path)) {
        return 0;
    }

    const stats = statSync(path);
    if (!stats.isDirectory()) {
        return stats.mtimeMs;
    }

    let latest = stats.mtimeMs;
    for (const entry of readdirSync(path, { withFileTypes: true })) {
        latest = Math.max(latest, getPathModifiedTime(join(path, entry.name)));
    }

    return latest;
}

export function isWindowsTarget(triple?: string): boolean {
    return triple ? triple.includes('windows') : process.platform === 'win32';
}

export function spawnDesktopProcess(binary: string, args: string[]): Promise<number> {
    return new Promise((resolvePromise, rejectPromise) => {
        const child = spawn(binary, args, {
            stdio: 'inherit',
            windowsHide: true,
        });

        child.once('error', rejectPromise);
        child.once('close', (code) => {
            resolvePromise(code ?? 1);
        });
    });
}