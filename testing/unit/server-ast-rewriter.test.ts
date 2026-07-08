/// <reference path="../../packages/test/src/globals.d.ts" />

import { resolve as resolvePath, sep } from 'node:path';

import {
    resolveSpecifier,
    rewriteModuleSpecifiers,
} from '../../packages/server/src/ast-rewriter';

const IMPORTER_DIR = resolvePath('/root/src');
const CLIENT_ROOT = resolvePath('/root');
const ALIAS_ENTRIES: [string, string][] = [['@', './src']];

function rewrite(source: string, alias?: Record<string, string>, importerPath?: string) {
    return rewriteModuleSpecifiers(source, {
        importerPath: importerPath ?? resolvePath('/root/src/main.ts'),
        clientRoot: CLIENT_ROOT,
        alias,
    });
}

describe('ast-rewriter resolveSpecifier', () => {
    it('rewrites alias prefix to a relative path with .js extension', () => {
        const result = resolveSpecifier('@/components/Counter', IMPORTER_DIR, CLIENT_ROOT, ALIAS_ENTRIES);
        expect(result).toBe('./components/Counter.js');
    });

    it('resolves nested alias prefix paths', () => {
        const result = resolveSpecifier('@/utils/math', IMPORTER_DIR, CLIENT_ROOT, ALIAS_ENTRIES);
        expect(result).toBe('./utils/math.js');
    });

    it('uses longest-key-first when multiple aliases could match', () => {
        const entries: [string, string][] = [
            ['@', './src'],
            ['@app', './src/app'],
        ];
        const result = resolveSpecifier('@app/foo', IMPORTER_DIR, CLIENT_ROOT, entries);
        expect(result).toBe('./app/foo.js');
    });

    it('passes bare specifiers through unchanged', () => {
        expect(resolveSpecifier('react', IMPORTER_DIR, CLIENT_ROOT, ALIAS_ENTRIES)).toBeUndefined();
        expect(resolveSpecifier('react/jsx-runtime', IMPORTER_DIR, CLIENT_ROOT, ALIAS_ENTRIES)).toBeUndefined();
    });

    it('passes URL/data/node specifiers through unchanged', () => {
        expect(resolveSpecifier('https://example.com/x.ts', IMPORTER_DIR, CLIENT_ROOT, ALIAS_ENTRIES)).toBeUndefined();
        expect(resolveSpecifier('data:text/javascript,console.log(1)', IMPORTER_DIR, CLIENT_ROOT, ALIAS_ENTRIES)).toBeUndefined();
        expect(resolveSpecifier('node:fs', IMPORTER_DIR, CLIENT_ROOT, ALIAS_ENTRIES)).toBeUndefined();
    });

    it('rewrites .ts/.tsx/.css extensions on relative specifiers', () => {
        expect(resolveSpecifier('./a.ts', IMPORTER_DIR, CLIENT_ROOT, [])).toBe('./a.js');
        expect(resolveSpecifier('./a.tsx', IMPORTER_DIR, CLIENT_ROOT, [])).toBe('./a.jsx');
        expect(resolveSpecifier('./a.css', IMPORTER_DIR, CLIENT_ROOT, [])).toBe('./a.css?inline');
    });

    it('does not double-suffix .css when a query is already present', () => {
        expect(resolveSpecifier('./a.css?inline', IMPORTER_DIR, CLIENT_ROOT, [])).toBeUndefined();
        expect(resolveSpecifier('./a.css?v=1', IMPORTER_DIR, CLIENT_ROOT, [])).toBeUndefined();
    });

    it('normalizes backslashes to forward slashes on Windows-style relative output', () => {
        const importDirWin = `C:${sep}root${sep}src`;
        const clientRootWin = `C:${sep}root`;
        const result = resolveSpecifier('@/components/Counter', importDirWin, clientRootWin, [['@', './src']]);
        expect(result).toBe('./components/Counter.js');
        expect(result && !result.includes('\\')).toBe(true);
    });

    it('resolves absolute alias targets', () => {
        const absRoot = resolvePath('/abs/root');
        const result = resolveSpecifier('@/foo', IMPORTER_DIR, CLIENT_ROOT, [['@', absRoot]]);
        expect(result).toBeDefined();
        expect(result!.endsWith('/foo.js')).toBe(true);
    });
});

describe('ast-rewriter rewriteModuleSpecifiers', () => {
    it('rewrites alias imports', () => {
        const result = rewrite(`import { Counter } from '@/components/Counter';\n`, { '@': './src' });
        expect(result.changed).toBe(true);
        expect(result.code).toContain('./components/Counter.js');
        expect(result.code).not.toContain("@/components/Counter");
    });

    it('rewrites alias in from-clause of side-effect imports', () => {
        const result = rewrite(`export * from '@/utils/math';\n`, { '@': './src' });
        expect(result.changed).toBe(true);
        expect(result.code).toContain('./utils/math.js');
    });

    it('rewrites .ts/.tsx/.css imports', () => {
        const result = rewrite(
            `import { a } from "./a.ts";\nimport { b } from "./b.tsx";\nimport "./x.css";\n`,
        );
        expect(result.changed).toBe(true);
        expect(result.code).toContain('./a.js');
        expect(result.code).toContain('./b.jsx');
        expect(result.code).toContain('./x.css?inline');
    });

    it('rewrites dynamic import() specifiers', () => {
        const result = rewrite(`const mod = await import("./lazy.ts");\n`);
        expect(result.changed).toBe(true);
        expect(result.code).toContain('./lazy.js');
    });

    it('rewrites require() call specifiers defensively', () => {
        const result = rewrite(`const x = require("./lazy.ts");\n`);
        expect(result.changed).toBe(true);
        expect(result.code).toContain('./lazy.js');
    });

    it('does NOT rewrite specifiers inside strings or comments', () => {
        const source = `// from "./fake.ts"\nconst s = "from ./fake.ts";\nconst t = 'import "./fake.ts"';\n`;
        const result = rewrite(source);
        expect(result.changed).toBe(false);
        expect(result.code).toBe(source);
    });

    it('handles compact preview-mode output without whitespace between from and string', () => {
        const source = `import{x}from"./a.ts";import y from"@/b";\n`;
        const result = rewrite(source, { '@': './src' });
        expect(result.changed).toBe(true);
        expect(result.code).toContain('./a.js');
        expect(result.code).toContain('./b.js');
    });

    it('returns unchanged result when parse fails', () => {
        const broken = `import "./ok.ts";\n((((\n`;
        const result = rewrite(broken);
        expect(result.changed).toBe(false);
        expect(result.parseFailed).toBe(true);
        expect(result.code).toBe(broken);
    });

    it('returns unchanged result when alias is undefined and no extension triggers', () => {
        const source = `import { foo } from 'elit/el';\nconsole.log(foo);\n`;
        const result = rewrite(source);
        expect(result.changed).toBe(false);
        expect(result.code).toBe(source);
    });

    it('does not rewrite node_modules bare specifiers when an alias is present', () => {
        const source = `import React from 'react';\nimport { useState } from 'react/jsx-runtime';\nimport { Counter } from '@/components/Counter';\n`;
        const result = rewrite(source, { '@': './src' });
        expect(result.changed).toBe(true);
        expect(result.code).toContain('react');
        expect(result.code).toContain('react/jsx-runtime');
        expect(result.code).toContain('./components/Counter.js');
    });

    it('preserves the original quote character of rewritten specifiers', () => {
        const result = rewrite(`import x from "@/a";\n`, { '@': './src' });
        expect(result.changed).toBe(true);
        expect(result.code).toContain(`from "./a.js"`);
    });

    it('rewrites alias exact-match (no rest) by appending .js', () => {
        const result = rewrite(`import foo from "@/";\n`, { '@': './src' });
        expect(result.changed).toBe(true);
    });

    it('is idempotent when run twice on the same input', () => {
        const source = `import { x } from "@/a";\n`;
        const once = rewrite(source, { '@': './src' });
        const twice = rewrite(once.code, { '@': './src' });
        expect(twice.code).toBe(once.code);
    });
});
