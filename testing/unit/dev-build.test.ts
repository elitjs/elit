/// <reference path="../../packages/test/src/globals.d.ts" />

import fs from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';

import { createStandaloneDevEntrySource, resolveStandaloneDevBuildPlan, standaloneDevNeedsEsbuildRuntime } from '../../packages/dev-build/src';
import type { DevServerOptions } from '@elitjs/server';

describe('standalone dev build planning', () => {
    it('emits index.js into dev-dist by default and points back to the dev root', () => {
        const devConfig: DevServerOptions = {
            root: './app',
        };

        const plan = resolveStandaloneDevBuildPlan({
            cwd: 'C:/demo',
            devConfig,
        });

        expect(plan.outputPath.replace(/\\/g, '/')).toBe('C:/demo/dev-dist/index.js');
        expect(plan.rootRelativePath).toBe('../app');
        expect(plan.usesClientArray).toBe(false);
    });

    it('creates an entry source that boots createDevServer in dev mode', () => {
        const plan = resolveStandaloneDevBuildPlan({
            cwd: 'C:/demo',
            devConfig: {
                root: './app',
                outDir: './dev-dist',
                outFile: 'index.js',
            },
        });

        const source = createStandaloneDevEntrySource(join('C:/demo', 'elit.config.ts'), plan, {
            root: './app',
            port: 3217,
        }, {
            cwd: 'C:/demo',
            buildConfig: { outDir: './dist' },
            allBuilds: [{ outDir: './dist' }],
        });

        expect(source).toContain("const runtimeConfig = (resolvedConfig as any).dev ?? {};");
        expect(source).toContain('const mergedConfig = { ...runtimeConfig, ...inlineDevConfig };');
        expect(source).toContain('port: mergedConfig.port || 3000,');
        expect(source).toContain('fallbackRoot: resolve(__dirname, "../dist"),');
        expect(source).toContain('root: resolve(__dirname, "../app"),');
        expect(source).toContain("watch: mergedConfig.watch ?? ['**/*.ts', '**/*.js', '**/*.html', '**/*.css'],");
        expect(source).toContain("mode: 'dev'");
    });

    it('does not require esbuild runtime for ts-only standalone dev roots', () => {
        const tempDirectory = fs.mkdtempSync(join(os.tmpdir(), 'elit-dev-build-ts-'));

        try {
            fs.mkdirSync(join(tempDirectory, 'src'), { recursive: true });
            fs.writeFileSync(join(tempDirectory, 'src', 'main.ts'), 'export const value: number = 1;\n');

            expect(standaloneDevNeedsEsbuildRuntime(tempDirectory, { root: './src' })).toBe(false);
        } finally {
            fs.rmSync(tempDirectory, { recursive: true, force: true });
        }
    });

    it('requires esbuild runtime when standalone dev roots contain tsx sources', () => {
        const tempDirectory = fs.mkdtempSync(join(os.tmpdir(), 'elit-dev-build-tsx-'));

        try {
            fs.mkdirSync(join(tempDirectory, 'src'), { recursive: true });
            fs.writeFileSync(join(tempDirectory, 'src', 'main.tsx'), 'export const view = <div>Hello</div>;\n');

            expect(standaloneDevNeedsEsbuildRuntime(tempDirectory, { root: './src' })).toBe(true);
        } finally {
            fs.rmSync(tempDirectory, { recursive: true, force: true });
        }
    });
});