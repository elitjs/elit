#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(scriptDir, '..', 'packages');

const entries = await readdir(pkgDir, { withFileTypes: true });
const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

const packages = new Map();
for (const name of dirs) {
    let pkg;
    try {
        const raw = await readFile(resolve(pkgDir, name, 'package.json'), 'utf8');
        pkg = JSON.parse(raw);
    } catch {
        continue;
    }
    if (!pkg?.scripts?.build) continue;

    const internalDeps = new Set();
    const collect = (field) => {
        if (!pkg[field]) return;
        for (const depName of Object.keys(pkg[field])) {
            if (!depName.startsWith('@elitjs/')) continue;
            const depPkg = depName.slice('@elitjs/'.length);
            internalDeps.add(depPkg);
        }
    };
    collect('dependencies');
    collect('devDependencies');
    collect('peerDependencies');

    packages.set(name, { name, cwd: resolve(pkgDir, name), deps: internalDeps });
}

if (packages.size === 0) {
    console.log('No packages with a build script found.');
    process.exit(0);
}

// Topological sort — Kahn's algorithm.
const ordered = [];
const remaining = new Map([...packages].map(([k, v]) => [k, { ...v, inDegree: 0 }]));
for (const pkg of remaining.values()) {
    for (const dep of pkg.deps) {
        if (packages.has(dep)) {
            remaining.get(pkg.name) && (remaining.get(pkg.name).inDegree = (remaining.get(pkg.name).inDegree || 0) + 1);
        }
    }
}

const ready = [...remaining.values()]
    .filter((p) => p.inDegree === 0)
    .sort((a, b) => a.name.localeCompare(b.name));
while (ready.length) {
    const next = ready.shift();
    ordered.push(packages.get(next.name));
    for (const pkg of remaining.values()) {
        if (pkg.deps.has(next.name)) {
            pkg.inDegree--;
            if (pkg.inDegree === 0) ready.push(pkg);
        }
    }
    ready.sort((a, b) => a.name.localeCompare(b.name));
}

const orphans = [...remaining.values()].filter((p) => p.inDegree > 0);
if (orphans.length) {
    console.warn('Cycles detected in:', orphans.map((p) => p.name).join(', '));
    for (const o of orphans) ordered.push(packages.get(o.name));
}

console.log(`Building ${ordered.length} packages (dependency order)...`);
const t0 = Date.now();
let failed = 0;
for (const t of ordered) {
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
const ok = ordered.length - failed;
console.log(`\nDone in ${dt}s — ${ok}/${ordered.length} succeeded${failed ? `, ${failed} failed` : ''}.`);
process.exit(failed ? 1 : 0);
