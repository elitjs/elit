/// <reference path="../../packages/test/src/globals.d.ts" />

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { loadConfig } from '../../packages/config/src';

describe('TypeScript config loading', () => {
    const tempDirs: string[] = [];

    function createTempWorkspace(): string {
        const tempDir = mkdtempSync(join(tmpdir(), 'elit-config-loader-'));
        tempDirs.push(tempDir);
        return tempDir;
    }

    afterEach(() => {
        while (tempDirs.length > 0) {
            rmSync(tempDirs.pop()!, { recursive: true, force: true });
        }
    });

    it('loads TypeScript config files that bundle local helpers using require', async () => {
        const workspaceRoot = createTempWorkspace();

        writeFileSync(join(workspaceRoot, 'helper.ts'), [
            `const fs = require('fs');`,
            '',
            'export function canReadFs(): boolean {',
            `    return typeof fs.readFileSync === 'function';`,
            '}',
            '',
        ].join('\n'));

        writeFileSync(join(workspaceRoot, 'elit.config.ts'), [
            `import { canReadFs } from './helper';`,
            '',
            'export default {',
            '    dev: {',
            '        port: canReadFs() ? 3010 : 0,',
            '    },',
            '};',
            '',
        ].join('\n'));

        const loadedConfig = await loadConfig(workspaceRoot);

        expect(loadedConfig?.dev?.port).toBe(3010);
    });
});