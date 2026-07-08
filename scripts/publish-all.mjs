#!/usr/bin/env node
/**
 * Build and publish every @elitjs/* (and create-elit*) package in topological
 * order, so each consumer is published only after all its @elitjs/* deps are
 * already on the npm registry.
 *
 * Usage: node publish-all.mjs <version> [npm-tag] [--dry-run]
 *
 * For each package:
 *   1. npm ci            (installs file: deps — symlinks point at siblings)
 *   2. npm run build     (tsup — emits dist/, requires sibling dist/ for types)
 *   3. normalize-deps    (rewrites "file:../x" → "^<version>" in package.json)
 *   4. npm publish       (--provenance --access public --tag <tag>)
 *
 * Stops on first failure. Already-published upstream packages remain valid.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const packagesDir = join(repoRoot, 'packages');

const rawVersion = process.argv[2];
const npmTag = process.argv[3] ?? 'latest';
const dryRun = process.argv.includes('--dry-run');

if (!rawVersion) {
    console.error('Usage: publish-all.mjs <version> [npm-tag] [--dry-run]');
    process.exit(1);
}
const version = rawVersion.replace(/^v/, '');

const npmrcEnv = process.env.NODE_AUTH_TOKEN
    ? { NODE_AUTH_TOKEN: process.env.NODE_AUTH_TOKEN }
    : {};

// --- 1. Discover packages --------------------------------------------------
const entries = await readdir(packagesDir, { withFileTypes: true });
const packages = [];
for (const e of entries) {
    if (!e.isDirectory()) continue;
    const pkgPath = join(packagesDir, e.name, 'package.json');
    if (!existsSync(pkgPath)) continue;
    const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
    if (!pkg.name) continue;
    if (!pkg.scripts?.build) continue;
    packages.push({ dir: e.name, name: pkg.name, pkgPath, pkg });
}

// --- 2. Build dependency graph (only @elitjs/* + create-elit* siblings) ----
const byName = new Map(packages.map((p) => [p.name, p]));
const isSibling = (name) => byName.has(name);

const deps = new Map();
const dependents = new Map();
for (const p of packages) {
    deps.set(p.dir, []);
    dependents.set(p.dir, []);
}
for (const p of packages) {
    const all = {
        ...(p.pkg.dependencies || {}),
        ...(p.pkg.peerDependencies || {}),
        ...(p.pkg.optionalDependencies || {}),
    };
    for (const depName of Object.keys(all)) {
        if (!isSibling(depName)) continue;
        const dep = byName.get(depName);
        if (dep.dir === p.dir) continue;
        deps.get(p.dir).push(dep.dir);
        dependents.get(dep.dir).push(p.dir);
    }
}

// --- 3. Topological sort (Kahn, alphabetical tie-break) --------------------
const inDegree = new Map();
for (const p of packages) inDegree.set(p.dir, deps.get(p.dir).length);
let queue = packages.filter((p) => inDegree.get(p.dir) === 0).map((p) => p.dir).sort();
const order = [];
while (queue.length) {
    const cur = queue.shift();
    order.push(cur);
    for (const next of dependents.get(cur).sort()) {
        inDegree.set(next, inDegree.get(next) - 1);
        if (inDegree.get(next) === 0) queue.push(next);
    }
    queue.sort();
}
if (order.length !== packages.length) {
    console.error('Cycle detected in dependency graph');
    process.exit(1);
}

console.log(`Publishing ${order.length} packages at v${version} (tag: ${npmTag})${dryRun ? ' [DRY RUN]' : ''}:`);
for (const dir of order) console.log(`  - ${byName.get(packages.find((p) => p.dir === dir).name).name}`);
console.log();

// --- 4. Helper: run a command with inherited stdio ------------------------
function run(cmd, args, cwd, env = {}) {
    return new Promise((resolvePromise, rejectPromise) => {
        const child = spawn(cmd, args, {
            cwd,
            stdio: 'inherit',
            env: { ...process.env, ...env },
            shell: process.platform === 'win32',
        });
        child.on('exit', (code) =>
            code === 0
                ? resolvePromise()
                : rejectPromise(new Error(`${[cmd, ...args].join(' ')} exited with ${code}`))
        );
    });
}

// --- 5. Walk the order, building + publishing each -------------------------
let published = 0;
let failedAt = null;

for (const dir of order) {
    const p = packages.find((x) => x.dir === dir);
    const cwd = join(packagesDir, dir);
    const pkgJsonPath = join(cwd, 'package.json');
    const pkgSnapshot = await readFile(pkgJsonPath, 'utf8');
    console.log(`\n=== ${p.name} (packages/${dir}) ===`);
    try {
        await run('npm', ['ci'], cwd);
        await run('npm', ['run', 'build'], cwd);
        await run('node', [join(scriptDir, 'normalize-deps.mjs'), `v${version}`, 'package.json'], cwd);
        if (dryRun) {
            console.log(`  [DRY RUN] skipping npm publish`);
        } else {
            await run(
                'npm',
                ['publish', '--provenance', '--access', 'public', '--tag', npmTag],
                cwd,
                npmrcEnv
            );
        }
        published++;
    } catch (err) {
        console.error(`✗ ${p.name} failed: ${err.message}`);
        failedAt = p.name;
        break;
    } finally {
        // Restore package.json so normalize-deps' rewrite doesn't leak into the
        // working tree (CI doesn't care, but local dry-runs do).
        await writeFile(pkgJsonPath, pkgSnapshot);
    }
}

console.log(`\n=== Summary ===`);
console.log(`${dryRun ? 'Built (no publish)' : 'Published'}: ${published}/${order.length}`);
if (failedAt) {
    console.error(`Stopped at: ${failedAt}`);
    process.exit(1);
}
