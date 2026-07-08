/// <reference path="../../packages/test/src/globals.d.ts" />

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
    getDefaultDesktopMode,
    parseDesktopMode,
    resolveDesktopBinaryOverridePath,
    resolveDesktopCargoTargetBaseDir,
    resolveConfiguredDesktopEntry,
    resolveDesktopBootstrapSupportModulePath,
} from '../../packages/cli/src/desktop';

describe('desktop cli mode helpers', () => {
    it('defaults to hybrid when no native desktop entry is configured', () => {
        expect(getDefaultDesktopMode()).toBe('hybrid');
        expect(getDefaultDesktopMode({ entry: './src/main.ts' })).toBe('hybrid');
    });

    it('defaults to native when desktop.native.entry is configured', () => {
        expect(getDefaultDesktopMode({ native: { entry: './src/native-main.ts' } })).toBe('native');
    });

    it('prefers desktop.native.entry in native mode and falls back to desktop.entry for compatibility', () => {
        expect(resolveConfiguredDesktopEntry('native', {
            entry: './src/legacy.ts',
            native: { entry: './src/native.ts' },
        })).toBe('./src/native.ts');

        expect(resolveConfiguredDesktopEntry('native', {
            entry: './src/legacy.ts',
        })).toBe('./src/legacy.ts');
    });

    it('uses desktop.entry in hybrid mode', () => {
        expect(resolveConfiguredDesktopEntry('hybrid', {
            entry: './src/hybrid.ts',
            native: { entry: './src/native.ts' },
        })).toBe('./src/hybrid.ts');
    });

    it('rejects invalid desktop mode values', () => {
        expect(() => parseDesktopMode('web', '--mode')).toThrow('Expected "native" or "hybrid"');
    });
});

describe('desktop bootstrap support module resolution', () => {
    it('prefers source helpers when they are available', () => {
        const packageRoot = mkdtempSync(join(tmpdir(), 'elit-desktop-cli-'));

        try {
            mkdirSync(join(packageRoot, 'src'), { recursive: true });
            mkdirSync(join(packageRoot, 'dist'), { recursive: true });

            const sourcePath = join(packageRoot, 'src', 'render-context.ts');
            const distPath = join(packageRoot, 'dist', 'render-context.mjs');

            writeFileSync(sourcePath, 'export {}\n');
            writeFileSync(distPath, 'export {}\n');

            expect(resolveDesktopBootstrapSupportModulePath('render-context', packageRoot)).toBe(sourcePath);
        } finally {
            rmSync(packageRoot, { force: true, recursive: true });
        }
    });

    it('can prefer packaged CommonJS helpers when source files are not shipped', () => {
        const packageRoot = mkdtempSync(join(tmpdir(), 'elit-desktop-cli-'));

        try {
            mkdirSync(join(packageRoot, 'dist'), { recursive: true });

            const cjsPath = join(packageRoot, 'dist', 'desktop-auto-render.cjs');
            const esmPath = join(packageRoot, 'dist', 'desktop-auto-render.mjs');
            writeFileSync(cjsPath, 'exports.installDesktopRenderTracking = () => {}\n');
            writeFileSync(esmPath, 'export function installDesktopRenderTracking() {}\n');

            expect(resolveDesktopBootstrapSupportModulePath('desktop-auto-render', packageRoot, { preferredBuiltFormat: 'cjs' })).toBe(cjsPath);
        } finally {
            rmSync(packageRoot, { force: true, recursive: true });
        }
    });

    it('falls back to packaged ESM helpers when CommonJS is not requested', () => {
        const packageRoot = mkdtempSync(join(tmpdir(), 'elit-desktop-cli-'));

        try {
            mkdirSync(join(packageRoot, 'dist'), { recursive: true });

            const distPath = join(packageRoot, 'dist', 'desktop-auto-render.mjs');
            writeFileSync(distPath, 'export function installDesktopRenderTracking() {}\n');

            expect(resolveDesktopBootstrapSupportModulePath('desktop-auto-render', packageRoot)).toBe(distPath);
        } finally {
            rmSync(packageRoot, { force: true, recursive: true });
        }
    });
});

describe('desktop cargo target directory resolution', () => {
    it('uses LocalAppData on Windows when available', () => {
        const packageRoot = mkdtempSync(join(tmpdir(), 'elit-desktop-cli-'));
        const appDir = join(packageRoot, 'examples', 'app');

        try {
            mkdirSync(appDir, { recursive: true });

            expect(resolveDesktopCargoTargetBaseDir(packageRoot, appDir, {
                LOCALAPPDATA: 'C:\\Users\\tester\\AppData\\Local',
            }, 'win32')).toBe(join('C:\\Users\\tester\\AppData\\Local', 'elit', 'target', 'desktop'));
        } finally {
            rmSync(packageRoot, { force: true, recursive: true });
        }
    });

    it('moves installed-package builds outside node_modules when no Windows cache directory is available', () => {
        const consumerRoot = mkdtempSync(join(tmpdir(), 'elit-desktop-cli-'));
        const packageRoot = join(consumerRoot, 'node_modules', 'elit');

        try {
            mkdirSync(packageRoot, { recursive: true });

            expect(resolveDesktopCargoTargetBaseDir(packageRoot, consumerRoot, {}, 'linux')).toBe(
                join(consumerRoot, '.elit', 'target', 'desktop'),
            );
        } finally {
            rmSync(consumerRoot, { force: true, recursive: true });
        }
    });

    it('allows an explicit cargo target override', () => {
        expect(resolveDesktopCargoTargetBaseDir('C:/package', 'C:/app', {
            ELIT_DESKTOP_CARGO_TARGET_DIR: 'D:/elit-cache/desktop',
            LOCALAPPDATA: 'C:/Users/tester/AppData/Local',
        }, 'win32')).toBe('D:/elit-cache/desktop');
    });
});

describe('desktop runtime binary override resolution', () => {
    it('prefers env-configured desktop binary overrides', () => {
        expect(resolveDesktopBinaryOverridePath('./runtime/elit-desktop.exe', 'ELIT_DESKTOP_BINARY_PATH', 'C:/app', {
            ELIT_DESKTOP_BINARY_PATH: 'D:/approved/elit-desktop.exe',
        })).toBe('D:/approved/elit-desktop.exe');
    });

    it('falls back to config-configured desktop binary overrides', () => {
        expect(resolveDesktopBinaryOverridePath('./runtime/elit-desktop.exe', 'ELIT_DESKTOP_BINARY_PATH', 'C:/app', {})).toBe(
            'C:/app/runtime/elit-desktop.exe',
        );
    });

    it('supports native desktop binary overrides', () => {
        expect(resolveDesktopBinaryOverridePath('./runtime/elit-desktop-native.exe', 'ELIT_DESKTOP_NATIVE_BINARY_PATH', 'C:/app', {})).toBe(
            'C:/app/runtime/elit-desktop-native.exe',
        );
    });
});