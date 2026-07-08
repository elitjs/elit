/// <reference path="../../packages/test/src/globals.d.ts" />

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { clearImportMapCache, createImportMap } from '../../packages/server/src';

function parseImportMap(html: string): Record<string, string> {
    const match = html.match(/^<script type="importmap">([\s\S]+)<\/script>$/);

    if (!match) {
        throw new Error(`Expected import map script tag, received: ${html}`);
    }

    return (JSON.parse(match[1]) as { imports: Record<string, string> }).imports;
}

describe('server import map generation', () => {
    const tempDirs: string[] = [];

    function createTempDir(prefix: string): string {
        const tempDir = mkdtempSync(join(tmpdir(), prefix));
        tempDirs.push(tempDir);
        return tempDir;
    }

    afterEach(() => {
        clearImportMapCache();

        while (tempDirs.length > 0) {
            rmSync(tempDirs.pop()!, { recursive: true, force: true });
        }
    });

    it('wraps the JSON import map in a script tag', async () => {
        const appRoot = createTempDir('elit-import-map-empty-');
        writeFileSync(join(appRoot, 'package.json'), JSON.stringify({ name: 'empty-app' }, null, 2));

        const html = await createImportMap(appRoot, '');

        expect(html.startsWith('<script type="importmap">')).toBe(true);
        expect(html.endsWith('</script>')).toBe(true);
    });

    it('maps browser-compatible scoped packages from their exports field', async () => {
        const appRoot = createTempDir('elit-import-map-scoped-');
        const pkgDir = join(appRoot, 'node_modules', '@elitjs', 'dom');

        mkdirSync(pkgDir, { recursive: true });
        mkdirSync(join(pkgDir, 'dist'), { recursive: true });
        writeFileSync(join(pkgDir, 'dist', 'index.mjs'), 'export {};\n');
        writeFileSync(
            join(pkgDir, 'package.json'),
            JSON.stringify({
                name: '@elitjs/dom',
                type: 'module',
                exports: {
                    '.': {
                        import: './dist/index.mjs',
                    },
                },
            }, null, 2),
        );

        const imports = parseImportMap(await createImportMap(appRoot, '/base'));

        expect(imports['@elitjs/dom']).toBe('/base/node_modules/@elitjs/dom/dist/index.mjs');
        expect(imports['@elitjs/dom/']).toBe('/base/node_modules/@elitjs/dom/');
    });

    it('walks subpath exports and exposes them under the package scope', async () => {
        const appRoot = createTempDir('elit-import-map-subpaths-');
        const pkgDir = join(appRoot, 'node_modules', '@elitjs', 'core');

        mkdirSync(join(pkgDir, 'dist'), { recursive: true });
        writeFileSync(join(pkgDir, 'dist', 'index.mjs'), 'export {};\n');
        writeFileSync(join(pkgDir, 'dist', 'utils.mjs'), 'export {};\n');
        writeFileSync(
            join(pkgDir, 'package.json'),
            JSON.stringify({
                name: '@elitjs/core',
                type: 'module',
                exports: {
                    '.': { import: './dist/index.mjs' },
                    './utils': { import: './dist/utils.mjs' },
                },
            }, null, 2),
        );

        const imports = parseImportMap(await createImportMap(appRoot, ''));

        expect(imports['@elitjs/core']).toBe('/node_modules/@elitjs/core/dist/index.mjs');
        expect(imports['@elitjs/core/utils']).toBe('/node_modules/@elitjs/core/dist/utils.mjs');
    });

    it('skips build tools, linters, and other Node-only packages', async () => {
        const appRoot = createTempDir('elit-import-map-skip-');
        const esbuildDir = join(appRoot, 'node_modules', 'esbuild');
        const typescriptDir = join(appRoot, 'node_modules', 'typescript');

        mkdirSync(join(esbuildDir, 'dist'), { recursive: true });
        mkdirSync(join(typescriptDir, 'dist'), { recursive: true });
        writeFileSync(join(esbuildDir, 'dist', 'index.mjs'), 'export {};\n');
        writeFileSync(join(typescriptDir, 'dist', 'index.mjs'), 'export {};\n');
        writeFileSync(
            join(esbuildDir, 'package.json'),
            JSON.stringify({ name: 'esbuild', version: '0.0.0', type: 'module' }, null, 2),
        );
        writeFileSync(
            join(typescriptDir, 'package.json'),
            JSON.stringify({ name: 'typescript', version: '0.0.0', type: 'module' }, null, 2),
        );

        const imports = parseImportMap(await createImportMap(appRoot, ''));

        expect(imports.esbuild).toBeUndefined();
        expect(imports.typescript).toBeUndefined();
    });

    it('caches repeated calls for the same root + basePath', async () => {
        const appRoot = createTempDir('elit-import-map-cache-');
        const pkgDir = join(appRoot, 'node_modules', '@elitjs', 'state');

        mkdirSync(join(pkgDir, 'dist'), { recursive: true });
        writeFileSync(join(pkgDir, 'dist', 'index.mjs'), 'export {};\n');
        writeFileSync(
            join(pkgDir, 'package.json'),
            JSON.stringify({
                name: '@elitjs/state',
                type: 'module',
                exports: { '.': { import: './dist/index.mjs' } },
            }, null, 2),
        );

        const first = await createImportMap(appRoot, '');
        const second = await createImportMap(appRoot, '');

        expect(first).toBe(second);
    });
});
