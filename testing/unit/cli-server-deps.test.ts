/// <reference path="../../src/test-globals.d.ts" />

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';

import {
    buildServerDependencyGraph,
    discoverServerEntries,
    resolveLocalFile,
} from '../../src/cli/cli/server-deps';

interface Fixture {
    root: string;
    cleanup: () => void;
}

function createFixture(): Fixture {
    const root = mkdtempSync(join(tmpdir(), 'elit-server-deps-'));
    return {
        root,
        cleanup: () => {
            try {
                rmSync(root, { recursive: true, force: true });
            } catch {
                // Best-effort cleanup.
            }
        },
    };
}

function writeFile(fixture: Fixture, relativePath: string, content: string): string {
    const fullPath = join(fixture.root, relativePath);
    const dir = fullPath.substring(0, fullPath.lastIndexOf(sep));
    mkdirSync(dir, { recursive: true });
    writeFileSync(fullPath, content);
    return fullPath.replace(/\\/g, '/');
}

describe('server-deps resolveLocalFile', () => {
    let fixture: Fixture;

    beforeEach(() => {
        fixture = createFixture();
    });

    afterEach(() => {
        fixture.cleanup();
    });

    it('resolves relative .ts specifier with explicit extension', () => {
        writeFile(fixture, 'src/a.ts', '');
        const resolved = resolveLocalFile('./a.ts', join(fixture.root, 'src'), {
            clientRoot: fixture.root,
        });
        expect(resolved).toBe(join(fixture.root, 'src/a.ts').replace(/\\/g, '/'));
    });

    it('resolves relative specifier without extension by trying .ts', () => {
        writeFile(fixture, 'src/b.ts', '');
        const resolved = resolveLocalFile('./b', join(fixture.root, 'src'), {
            clientRoot: fixture.root,
        });
        expect(resolved).toBe(join(fixture.root, 'src/b.ts').replace(/\\/g, '/'));
    });

    it('resolves index file when specifier points at a directory', () => {
        writeFile(fixture, 'src/routes/index.ts', '');
        const resolved = resolveLocalFile('./routes', join(fixture.root, 'src'), {
            clientRoot: fixture.root,
        });
        expect(resolved).toBe(join(fixture.root, 'src/routes/index.ts').replace(/\\/g, '/'));
    });

    it('returns undefined for bare specifiers without alias', () => {
        expect(resolveLocalFile('react', join(fixture.root, 'src'), {
            clientRoot: fixture.root,
        })).toBeUndefined();
        expect(resolveLocalFile('elit/server', join(fixture.root, 'src'), {
            clientRoot: fixture.root,
        })).toBeUndefined();
    });

    it('returns undefined for external schemes', () => {
        expect(resolveLocalFile('https://example.com/x.ts', join(fixture.root, 'src'), {
            clientRoot: fixture.root,
        })).toBeUndefined();
        expect(resolveLocalFile('node:fs', join(fixture.root, 'src'), {
            clientRoot: fixture.root,
        })).toBeUndefined();
    });

    it('returns undefined for missing files', () => {
        expect(resolveLocalFile('./missing', join(fixture.root, 'src'), {
            clientRoot: fixture.root,
        })).toBeUndefined();
    });

    it('returns undefined for non-source extensions', () => {
        writeFile(fixture, 'src/style.css', '');
        expect(resolveLocalFile('./style.css', join(fixture.root, 'src'), {
            clientRoot: fixture.root,
        })).toBeUndefined();
    });

    it('resolves aliased specifier', () => {
        writeFile(fixture, 'src/lib/db.ts', '');
        const resolved = resolveLocalFile('@/lib/db', join(fixture.root, 'src/server.ts'), {
            clientRoot: fixture.root,
            alias: { '@': './src' },
        });
        expect(resolved).toBe(join(fixture.root, 'src/lib/db.ts').replace(/\\/g, '/'));
    });

    it('uses longest-key-first when multiple aliases match', () => {
        writeFile(fixture, 'src/app/foo.ts', '');
        const resolved = resolveLocalFile('@app/foo', join(fixture.root, 'config.ts'), {
            clientRoot: fixture.root,
            alias: { '@': './src', '@app': './src/app' },
        });
        expect(resolved).toBe(join(fixture.root, 'src/app/foo.ts').replace(/\\/g, '/'));
    });
});

describe('server-deps discoverServerEntries', () => {
    let fixture: Fixture;

    beforeEach(() => {
        fixture = createFixture();
    });

    afterEach(() => {
        fixture.cleanup();
    });

    it('returns resolved paths for local imports in config', () => {
        writeFile(fixture, 'src/server.ts', "export const server = {};");
        const configPath = writeFile(fixture, 'elit.config.ts', `
import { server } from './src/server';
export default { api: server };
`);
        const entries = discoverServerEntries(configPath, { clientRoot: fixture.root });
        expect(entries.length).toBe(1);
        expect(entries[0]).toBe(join(fixture.root, 'src/server.ts').replace(/\\/g, '/'));
    });

    it('ignores bare package imports', () => {
        writeFile(fixture, 'src/server.ts', '');
        const configPath = writeFile(fixture, 'elit.config.ts', `
import { defineConfig } from 'elit';
import { server } from './src/server';
export default defineConfig({ api: server });
`);
        const entries = discoverServerEntries(configPath, { clientRoot: fixture.root });
        expect(entries.length).toBe(1);
    });

    it('returns empty array for unreadable config', () => {
        const entries = discoverServerEntries(join(fixture.root, 'nonexistent.config.ts'), {
            clientRoot: fixture.root,
        });
        expect(entries.length).toBe(0);
    });

    it('returns empty array for config with no local imports', () => {
        const configPath = writeFile(fixture, 'elit.config.ts', `
import { defineConfig } from 'elit';
export default defineConfig({});
`);
        const entries = discoverServerEntries(configPath, { clientRoot: fixture.root });
        expect(entries.length).toBe(0);
    });
});

describe('server-deps buildServerDependencyGraph', () => {
    let fixture: Fixture;

    beforeEach(() => {
        fixture = createFixture();
    });

    afterEach(() => {
        fixture.cleanup();
    });

    it('returns just the entry when it has no local imports', () => {
        const entry = writeFile(fixture, 'src/server.ts', `
import { ServerRouter } from 'elit/server';
export const server = new ServerRouter();
`);
        const graph = buildServerDependencyGraph([entry], { clientRoot: fixture.root });
        expect(graph.size).toBe(1);
        expect(graph.has(entry)).toBe(true);
    });

    it('walks a chain of local imports', () => {
        const entry = writeFile(fixture, 'src/server.ts', `
import { usersRouter } from './routes/users';
import { db } from './lib/db';
export const server = {};
`);
        writeFile(fixture, 'src/routes/users.ts', `
import { validate } from '../lib/validate';
export const usersRouter = {};
`);
        writeFile(fixture, 'src/lib/db.ts', 'export const db = {};');
        writeFile(fixture, 'src/lib/validate.ts', 'export const validate = {};');

        const graph = buildServerDependencyGraph([entry], { clientRoot: fixture.root });
        expect(graph.size).toBe(4);
        expect(graph.has(entry)).toBe(true);
        expect(graph.has(join(fixture.root, 'src/routes/users.ts').replace(/\\/g, '/'))).toBe(true);
        expect(graph.has(join(fixture.root, 'src/lib/db.ts').replace(/\\/g, '/'))).toBe(true);
        expect(graph.has(join(fixture.root, 'src/lib/validate.ts').replace(/\\/g, '/'))).toBe(true);
    });

    it('handles circular imports without infinite loop', () => {
        const a = writeFile(fixture, 'src/a.ts', "import { b } from './b'; export const a = b;");
        const b = writeFile(fixture, 'src/b.ts', "import { a } from './a'; export const b = a;");

        const graph = buildServerDependencyGraph([a], { clientRoot: fixture.root });
        expect(graph.size).toBe(2);
        expect(graph.has(a)).toBe(true);
        expect(graph.has(b)).toBe(true);
    });

    it('follows re-exports (export * from)', () => {
        const entry = writeFile(fixture, 'src/server.ts', `
export * from './routes';
export const server = {};
`);
        writeFile(fixture, 'src/routes/index.ts', "export { users } from './users';");
        writeFile(fixture, 'src/routes/users.ts', 'export const users = {};');

        const graph = buildServerDependencyGraph([entry], { clientRoot: fixture.root });
        expect(graph.size).toBe(3);
    });

    it('respects alias configuration', () => {
        const entry = writeFile(fixture, 'src/server.ts', `
import { db } from '@/lib/db';
export const server = {};
`);
        writeFile(fixture, 'src/lib/db.ts', 'export const db = {};');

        const graph = buildServerDependencyGraph([entry], {
            clientRoot: fixture.root,
            alias: { '@': './src' },
        });
        expect(graph.size).toBe(2);
        expect(graph.has(join(fixture.root, 'src/lib/db.ts').replace(/\\/g, '/'))).toBe(true);
    });

    it('does not follow dynamic imports in v1', () => {
        const entry = writeFile(fixture, 'src/server.ts', `
const mod = await import('./lazy');
export const server = {};
`);
        writeFile(fixture, 'src/lazy.ts', 'export const lazy = {};');

        const graph = buildServerDependencyGraph([entry], { clientRoot: fixture.root });
        expect(graph.size).toBe(1);
        expect(graph.has(join(fixture.root, 'src/lazy.ts').replace(/\\/g, '/'))).toBe(false);
    });

    it('skips files with unreadable imports without throwing', () => {
        const entry = writeFile(fixture, 'src/server.ts', `
import { broken } from './broken';
export const server = {};
`);
        writeFile(fixture, 'src/broken.ts', 'this is not valid javascript {{{{');

        const graph = buildServerDependencyGraph([entry], {
            clientRoot: fixture.root,
        });
        expect(graph.size).toBe(2);
        expect(graph.has(entry)).toBe(true);
    });

    it('handles TypeScript syntax (type annotations, generics) without failing', () => {
        const entry = writeFile(fixture, 'src/server.ts', `
import { Router, type Handler } from './router';
export const server: Router = createRouter<Config>();
`);
        writeFile(fixture, 'src/router.ts', `
import type { Config } from './types';
import { db } from './db';
export const Router = {};
export const createRouter = <T>() => ({});
`);
        writeFile(fixture, 'src/types.ts', 'export type Config = { port: number };');
        writeFile(fixture, 'src/db.ts', 'export const db = {};');

        const graph = buildServerDependencyGraph([entry], { clientRoot: fixture.root });
        expect(graph.size).toBe(4);
        expect(graph.has(join(fixture.root, 'src/router.ts').replace(/\\/g, '/'))).toBe(true);
        expect(graph.has(join(fixture.root, 'src/db.ts').replace(/\\/g, '/'))).toBe(true);
    });

    it('handles imports in comments safely', () => {
        const entry = writeFile(fixture, 'src/server.ts', `
// import { fake } from './fake';
/* import { alsoFake } from './also-fake'; */
import { real } from './real';
export const server = {};
`);
        writeFile(fixture, 'src/real.ts', 'export const real = {};');

        const graph = buildServerDependencyGraph([entry], { clientRoot: fixture.root });
        expect(graph.size).toBe(2);
        expect(graph.has(join(fixture.root, 'src/real.ts').replace(/\\/g, '/'))).toBe(true);
    });

    it('skips CSS imports', () => {
        const entry = writeFile(fixture, 'src/server.ts', `
import './style.css';
export const server = {};
`);
        writeFile(fixture, 'src/style.css', 'body { color: red; }');

        const graph = buildServerDependencyGraph([entry], { clientRoot: fixture.root });
        expect(graph.size).toBe(1);
    });

    it('normalizes backslash paths on windows', () => {
        const entry = writeFile(fixture, 'src/server.ts', `
import { helper } from './util/helper';
export const server = {};
`);
        writeFile(fixture, 'src/util/helper.ts', 'export const helper = {};');

        const graph = buildServerDependencyGraph([entry], { clientRoot: fixture.root });
        const helperPath = join(fixture.root, 'src/util/helper.ts').replace(/\\/g, '/');
        expect(graph.has(helperPath)).toBe(true);
        for (const path of graph) {
            expect(path.includes('\\')).toBe(false);
        }
    });

    it('caps visited set at maxFiles to bound work on huge graphs', () => {
        const entry = writeFile(fixture, 'src/server.ts', `
import { a } from './a';
export const server = {};
`);
        writeFile(fixture, 'src/a.ts', "import { b } from './b'; export const a = {};");
        writeFile(fixture, 'src/b.ts', "import { c } from './c'; export const b = {};");
        writeFile(fixture, 'src/c.ts', 'export const c = {};');

        const graph = buildServerDependencyGraph([entry], {
            clientRoot: fixture.root,
            maxFiles: 2,
        });
        expect(graph.size).toBeLessThanOrEqual(2);
    });

    it('handles require() calls in CJS modules', () => {
        const entry = writeFile(fixture, 'src/server.cjs', `
const db = require('./lib/db');
module.exports = { server: {} };
`);
        writeFile(fixture, 'src/lib/db.ts', 'export const db = {};');

        const graph = buildServerDependencyGraph([entry], { clientRoot: fixture.root });
        expect(graph.size).toBe(2);
    });
});
