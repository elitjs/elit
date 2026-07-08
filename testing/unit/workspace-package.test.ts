/// <reference path="../../packages/test/src/globals.d.ts" />

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { resolveWorkspacePackageImport } from '../../packages/workspace-package/src';

describe('workspace package self-reference resolution', () => {
    const tempDirs: string[] = [];

    function createTempWorkspace(): string {
        const tempDir = mkdtempSync(join(tmpdir(), 'elit-workspace-'));
        tempDirs.push(tempDir);
        return tempDir;
    }

    afterEach(() => {
        while (tempDirs.length > 0) {
            rmSync(tempDirs.pop()!, { recursive: true, force: true });
        }
    });

    it('prefers source files when running inside the elit workspace', () => {
        const workspaceRoot = createTempWorkspace();
        const appDir = join(workspaceRoot, 'examples', 'app');

        mkdirSync(join(workspaceRoot, 'src'), { recursive: true });
        mkdirSync(join(workspaceRoot, 'dist'), { recursive: true });
        mkdirSync(appDir, { recursive: true });

        writeFileSync(join(workspaceRoot, 'package.json'), JSON.stringify({ name: 'elit' }, null, 2));
        writeFileSync(join(workspaceRoot, 'src', 'index.ts'), 'export const sourceValue = true;\n');
        writeFileSync(join(workspaceRoot, 'dist', 'index.mjs'), 'export const distValue = true;\n');

        expect(resolveWorkspacePackageImport('elit', appDir)).toBe(join(workspaceRoot, 'src', 'index.ts'));
    });

    it('can prefer built ESM artifacts inside the elit workspace when requested', () => {
        const workspaceRoot = createTempWorkspace();
        const appDir = join(workspaceRoot, 'examples', 'app');

        mkdirSync(join(workspaceRoot, 'src'), { recursive: true });
        mkdirSync(join(workspaceRoot, 'dist'), { recursive: true });
        mkdirSync(appDir, { recursive: true });

        writeFileSync(join(workspaceRoot, 'package.json'), JSON.stringify({ name: 'elit' }, null, 2));
        writeFileSync(join(workspaceRoot, 'src', 'index.ts'), 'export const sourceValue = true;\n');
        writeFileSync(join(workspaceRoot, 'dist', 'index.mjs'), 'export const distValue = true;\n');

        expect(resolveWorkspacePackageImport('elit', appDir, { preferBuilt: true, preferredBuiltFormat: 'esm' })).toBe(join(workspaceRoot, 'dist', 'index.mjs'));
    });

    it('can prefer built CJS artifacts for standalone server-style imports', () => {
        const workspaceRoot = createTempWorkspace();
        const appDir = join(workspaceRoot, 'examples', 'app');

        mkdirSync(join(workspaceRoot, 'src'), { recursive: true });
        mkdirSync(join(workspaceRoot, 'dist'), { recursive: true });
        mkdirSync(appDir, { recursive: true });

        writeFileSync(join(workspaceRoot, 'package.json'), JSON.stringify({ name: 'elit' }, null, 2));
        writeFileSync(join(workspaceRoot, 'src', 'server.ts'), 'export const sourceServer = true;\n');
        writeFileSync(join(workspaceRoot, 'dist', 'server.mjs'), 'export const distServer = true;\n');
        writeFileSync(join(workspaceRoot, 'dist', 'server.cjs'), 'module.exports = { distServer: true };\n');

        expect(resolveWorkspacePackageImport('elit/server', appDir, { preferBuilt: true, preferredBuiltFormat: 'cjs' })).toBe(join(workspaceRoot, 'dist', 'server.cjs'));
    });

    it('falls back to dist artifacts when src is unavailable', () => {
        const workspaceRoot = createTempWorkspace();
        const appDir = join(workspaceRoot, 'packages', 'example-app');

        mkdirSync(join(workspaceRoot, 'dist'), { recursive: true });
        mkdirSync(appDir, { recursive: true });

        writeFileSync(join(workspaceRoot, 'package.json'), JSON.stringify({ name: 'elit' }, null, 2));
        writeFileSync(join(workspaceRoot, 'dist', 'router.cjs'), 'module.exports = {};\n');

        expect(resolveWorkspacePackageImport('elit/router', appDir)).toBe(join(workspaceRoot, 'dist', 'router.cjs'));
    });
});