#!/usr/bin/env node
/**
 * Install dependencies in every @elitjs scoped package + the repo root.
 *
 * Usage:
 *   node scripts/install-all.mjs               # npm ci (strict, lockfile required)
 *   node scripts/install-all.mjs --install     # npm install (updates lockfiles)
 *   node scripts/install-all.mjs --no-root     # skip the repo root
 *   node scripts/install-all.mjs --filter core,dom   # only specific packages
 *   node scripts/install-all.mjs --filter core --include-root  # also do root
 *
 * Targets:
 *   - ./ (repo root, unless --no-root)
 *   - packages/(name)/ (every dir with a package.json)
 *
 * Falls back to `npm install` automatically for any package missing a
 * package-lock.json, since `npm ci` requires one.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const packagesDir = join(repoRoot, 'packages');

const useInstall = process.argv.includes('--install');
const filterIdx = process.argv.indexOf('--filter');
const filterRaw = filterIdx >= 0 ? process.argv[filterIdx + 1] : null;
const filter = filterRaw ? new Set(filterRaw.split(',').map((s) => s.trim()).filter(Boolean)) : null;
// Root is included by default, but --filter narrows to packages only unless
// --include-root is also passed. --no-root always excludes it.
const includeRoot =
    !process.argv.includes('--no-root') &&
    (filter === null || process.argv.includes('--include-root'));

// --- 1. Discover targets ----------------------------------------------------
const targets = [];
if (includeRoot && existsSync(join(repoRoot, 'package.json'))) {
    targets.push({ name: '(root)', cwd: repoRoot });
}
for (const entry of await readdir(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (filter && !filter.has(entry.name)) continue;
    const pkgPath = join(packagesDir, entry.name, 'package.json');
    if (!existsSync(pkgPath)) continue;
    targets.push({ name: entry.name, cwd: join(packagesDir, entry.name) });
}

if (targets.length === 0) {
    console.log('No packages found.');
    process.exit(0);
}

// --- 2. Install helper ------------------------------------------------------
function run(cmd, args, cwd) {
    return new Promise((res) => {
        const child = spawn(cmd, args, {
            cwd,
            stdio: 'inherit',
            shell: process.platform === 'win32',
        });
        child.on('exit', res);
    });
}

// --- 3. Walk and install ----------------------------------------------------
console.log(`Installing ${targets.length} target(s) with \`npm ${useInstall ? 'install' : 'ci'}\`...`);
const t0 = Date.now();
let failed = 0;
for (const t of targets) {
    const hasLockfile = existsSync(join(t.cwd, 'package-lock.json'));
    const cmd = useInstall || !hasLockfile ? 'install' : 'ci';
    if (!hasLockfile && !useInstall) {
        console.log(`\n→ ${t.name} (no lockfile, falling back to npm install)`);
    } else {
        console.log(`\n→ ${t.name}`);
    }
    const code = await run('npm', [cmd], t.cwd);
    if (code !== 0) {
        console.error(`  ✗ ${t.name} failed (exit ${code})`);
        failed++;
    }
}

const dt = ((Date.now() - t0) / 1000).toFixed(1);
const ok = targets.length - failed;
console.log(`\nDone in ${dt}s — ${ok}/${targets.length} succeeded${failed ? `, ${failed} failed` : ''}.`);
process.exit(failed ? 1 : 0);
