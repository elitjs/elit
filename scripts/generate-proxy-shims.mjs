#!/usr/bin/env node
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const shimsDir = resolve(repoRoot, 'shims');

const SUBPATHS = [
    'config', 'core', 'el', 'dom', 'state', 'router', 'style',
    'render-context', 'universal', 'hmr', 'server', 'http', 'https',
    'ws', 'wss', 'database', 'smtp-server', 'native', 'desktop',
    'desktop-auto-render', 'wapk', 'build', 'dev-build', 'preview-build',
    'pm', 'devtools', 'chokidar', 'fs', 'path', 'mime-types',
    'runtime', 'workspace-package', 'cli',
];

const NESTED = {
    'test/contracts': '@elitjs/test/contracts',
};

const SINGLE = {
    test: '@elitjs/test',
};

async function generate() {
    await rm(shimsDir, { recursive: true, force: true });
    await mkdir(shimsDir, { recursive: true });

    const targets = [];

    // Main entry: elit -> @elitjs/core
    await writeFile(resolve(shimsDir, 'index.js'), `export * from '@elitjs/core';\n`);
    await writeFile(resolve(shimsDir, 'index.cjs'), `module.exports = require('@elitjs/core');\n`);
    await writeFile(resolve(shimsDir, 'index.d.ts'), `export * from '@elitjs/core';\n`);

    for (const sub of SUBPATHS) {
        const target = `@elitjs/${sub}`;
        await writeFile(resolve(shimsDir, `${sub}.js`), `export * from '${target}';\n`);
        await writeFile(resolve(shimsDir, `${sub}.cjs`), `module.exports = require('${target}');\n`);
        await writeFile(resolve(shimsDir, `${sub}.d.ts`), `export * from '${target}';\n`);
        targets.push(sub);
    }

    for (const [sub, target] of Object.entries(NESTED)) {
        const subDir = resolve(shimsDir, dirname(sub));
        await mkdir(subDir, { recursive: true });
        const base = sub.split('/').pop();
        await writeFile(resolve(subDir, `${base}.js`), `export * from '${target}';\n`);
        await writeFile(resolve(subDir, `${base}.cjs`), `module.exports = require('${target}');\n`);
        await writeFile(resolve(subDir, `${base}.d.ts`), `export * from '${target}';\n`);
        targets.push(sub);
    }

    for (const [sub, target] of Object.entries(SINGLE)) {
        await writeFile(resolve(shimsDir, `${sub}.js`), `export * from '${target}';\n`);
        await writeFile(resolve(shimsDir, `${sub}.cjs`), `module.exports = require('${target}');\n`);
        await writeFile(resolve(shimsDir, `${sub}.d.ts`), `export * from '${target}';\n`);
        targets.push(sub);
    }

    console.log(`Generated ${targets.length + 1} shim sets in ${shimsDir}`);
}

generate().catch((err) => {
    console.error(err);
    process.exit(1);
});
