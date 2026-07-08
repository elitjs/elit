#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(scriptDir, '..', 'packages');

const entries = await readdir(pkgDir, { withFileTypes: true });
const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

const targets = [];
for (const name of dirs) {
    let pkg;
    try {
        const raw = await readFile(resolve(pkgDir, name, 'package.json'), 'utf8');
        pkg = JSON.parse(raw);
    } catch {
        continue;
    }
    if (pkg?.scripts?.build) {
        targets.push({ name, cwd: resolve(pkgDir, name) });
    }
}

if (targets.length === 0) {
    console.log('No packages with a build script found.');
    process.exit(0);
}

console.log(`Building ${targets.length} packages...`);
const t0 = Date.now();
let failed = 0;
for (const t of targets) {
    console.log(`\n→ ${t.name}`);
    const code = await new Promise((res) => {
        const child = spawn('npm', ['run', 'build'], {
            cwd: t.cwd,
            stdio: 'inherit',
            shell: process.platform === 'win32',
        });
        child.on('exit', res);
    });
    if (code !== 0) {
        console.error(`  ✗ ${t.name} failed (exit ${code})`);
        failed++;
    }
}
const dt = ((Date.now() - t0) / 1000).toFixed(1);
const ok = targets.length - failed;
console.log(`\nDone in ${dt}s — ${ok}/${targets.length} succeeded${failed ? `, ${failed} failed` : ''}.`);
process.exit(failed ? 1 : 0);
