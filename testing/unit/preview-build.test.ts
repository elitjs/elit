/// <reference path="../../packages/test/src/globals.d.ts" />

import fs from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';

import { createStandalonePreviewEntrySource, resolveStandalonePreviewBuildPlan, writeStandalonePackageJson } from '../../packages/preview-build/src';
import type { BuildOptions } from '@elitjs/build';
import type { PreviewOptions } from '@elitjs/server';

describe('standalone preview build planning', () => {
    it('emits index.js into the preview root and serves built assets from the same folder', () => {
        const buildConfig: BuildOptions = {
            entry: './src/main.ts',
            format: 'esm',
            outDir: './dist',
            outFile: 'main.js',
        };
        const previewConfig: PreviewOptions = {
            root: './dist',
            standalone: true,
            outFile: 'index.js',
        };

        const plan = resolveStandalonePreviewBuildPlan({
            buildConfig,
            allBuilds: [buildConfig],
            cwd: 'C:/demo',
            previewConfig,
        });

        expect(plan.outputPath.replace(/\\/g, '/')).toBe('C:/demo/dist/index.js');
        expect(plan.rootRelativePath).toBe('.');
        expect(plan.usesClientArray).toBe(false);
    });

    it('maps preview clients to built output directories by build order', () => {
        const builds: BuildOptions[] = [
            { entry: './src/app.ts', format: 'esm', outDir: './dist/app', outFile: 'main.js' },
            { entry: './src/admin.ts', format: 'esm', outDir: './dist/admin', outFile: 'main.js' },
        ];
        const previewConfig: PreviewOptions = {
            clients: [
                { root: './app', basePath: '/app' },
                { root: './admin', basePath: '/admin' },
            ],
            standalone: true,
        };

        const plan = resolveStandalonePreviewBuildPlan({
            buildConfig: builds[0],
            allBuilds: builds,
            cwd: 'C:/demo',
            previewConfig,
        });

        expect(plan.usesClientArray).toBe(true);
        expect(plan.clients?.map((client) => client.rootRelativePath)).toEqual(['.', '../admin']);
    });

    it('creates an entry source that boots createDevServer from the generated index.js', () => {
        const plan = resolveStandalonePreviewBuildPlan({
            buildConfig: { entry: './src/main.ts', format: 'esm', outDir: './dist', outFile: 'main.js' },
            allBuilds: [{ entry: './src/main.ts', format: 'esm', outDir: './dist', outFile: 'main.js' }],
            cwd: 'C:/demo',
            previewConfig: { root: './dist', standalone: true, outFile: 'index.js' },
        });

        const source = createStandalonePreviewEntrySource(join('C:/demo', 'elit.config.ts'), plan);

        expect(source).toContain("import { createDevServer } from 'elit/server';");
        expect(source).toContain('root: resolve(__dirname, "."),');
        expect(source).toContain("mode: 'preview'");
        expect(source).toContain('if (options.logging === false) {');
        expect(source).toContain('console.log(`[elit] Preview server running at ${previewUrl}`);');
    });

    it('writes standalone package metadata with merged runtime dependencies', () => {
        const tempDirectory = fs.mkdtempSync(join(os.tmpdir(), 'elit-standalone-package-'));
        const packageJsonPath = join(tempDirectory, 'package.json');

        try {
            fs.writeFileSync(packageJsonPath, JSON.stringify({ dependencies: { open: '^11.0.0' } }, null, 2));

            writeStandalonePackageJson(packageJsonPath, 'index.js', {
                dependencies: {
                    esbuild: '^0.27.3',
                },
            });

            expect(JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))).toMatchObject({
                private: true,
                type: 'commonjs',
                main: 'index.js',
                dependencies: {
                    open: '^11.0.0',
                    esbuild: '^0.27.3',
                },
            });
        } finally {
            fs.rmSync(tempDirectory, { recursive: true, force: true });
        }
    });

    it('replaces stale standalone runtime dependencies when requested', () => {
        const tempDirectory = fs.mkdtempSync(join(os.tmpdir(), 'elit-standalone-package-replace-'));
        const packageJsonPath = join(tempDirectory, 'package.json');

        try {
            fs.writeFileSync(packageJsonPath, JSON.stringify({ dependencies: { esbuild: '^0.27.3' }, name: 'demo-app' }, null, 2));

            writeStandalonePackageJson(packageJsonPath, 'index.js', {
                dependencies: {},
                replaceDependencies: true,
            });

            expect(JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))).toEqual({
                name: 'demo-app',
                private: true,
                type: 'commonjs',
                main: 'index.js',
            });
        } finally {
            fs.rmSync(tempDirectory, { recursive: true, force: true });
        }
    });
});