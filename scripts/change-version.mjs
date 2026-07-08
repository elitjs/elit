#!/usr/bin/env node
/**
 * Bump version across every publishable @elitjs scoped package + the repo
 * root, in place. Preserves each file's existing line endings (CRLF/LF).
 *
 * Usage:
 *   node scripts/change-version.mjs <version>   # explicit, e.g. 4.1.0
 *   node scripts/change-version.mjs <bump>      # major | minor | patch | prerelease
 *   node scripts/change-version.mjs <bump> --tag beta    # prerelease tag
 *   node scripts/change-version.mjs 4.1.0 --dry-run      # preview only
 *
 * Targets:
 *   - ./package.json (repo root)
 *   - packages/(name)/package.json
 *   - packages/(name)/src/package.json (nested private sub-manifests, e.g. dom/src)
 *
 * Skipped (these have their own independent versions):
 *   - examples/(name)/package.json
 *   - packages/create-elit/src/templates/(name)/package.json
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');

const arg = process.argv[2];
const dryRun = process.argv.includes('--dry-run');
const tagIdx = process.argv.indexOf('--tag');
const preTag = tagIdx >= 0 ? process.argv[tagIdx + 1] : null;

if (!arg) {
    console.error('Usage: change-version.mjs <version|bump> [--dry-run] [--tag <prerelease-tag>]');
    console.error('  bump: major | minor | patch | prerelease');
    process.exit(1);
}

const BUMPS = new Set(['major', 'minor', 'patch', 'prerelease']);

// --- 1. Discover target files ------------------------------------------------
const targets = [join(repoRoot, 'package.json')];
const packagesDir = join(repoRoot, 'packages');
for (const entry of await readdir(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const pkgPath = join(packagesDir, entry.name, 'package.json');
    if (!existsSync(pkgPath)) continue;
    targets.push(pkgPath);
    const nestedSrc = join(packagesDir, entry.name, 'src', 'package.json');
    if (existsSync(nestedSrc)) targets.push(nestedSrc);
}

// --- 2. Resolve the new version ----------------------------------------------
const firstRaw = await readFile(targets[0], 'utf8');
const firstPkg = JSON.parse(firstRaw);
const current = firstPkg.version;

let next;
if (BUMPS.has(arg)) {
    next = incVersion(current, arg, preTag);
} else {
    next = arg.replace(/^v/, '');
    if (!/^\d+\.\d+\.\d+(?:-[\w.]+)?$/.test(next)) {
        console.error(`Invalid version: ${next} (expected x.y.z or x.y.z-tag)`);
        process.exit(1);
    }
}

console.log(`Bumping ${targets.length} package.json files: ${current} → ${next}${dryRun ? ' [DRY RUN]' : ''}`);

// --- 3. Apply, preserving line endings ---------------------------------------
let changed = 0;
let skipped = 0;
for (const absPath of targets) {
    const raw = await readFile(absPath, 'utf8');
    const pkg = JSON.parse(raw);
    if (pkg.version === next) {
        skipped++;
        continue;
    }
    const before = pkg.version;
    pkg.version = next;
    const eol = raw.includes('\r\n') ? '\r\n' : '\n';
    const out = JSON.stringify(pkg, null, 2).split('\n').join(eol) + eol;
    if (!dryRun) await writeFile(absPath, out);
    changed++;
    const rel = absPath.slice(repoRoot.length + 1).split('\\').join('/');
    console.log(`  ${rel}: ${pkg.name || '(root)'} ${before} → ${next}`);
}

console.log(`\n${dryRun ? 'Would update' : 'Updated'}: ${changed}, already-at-version: ${skipped}`);

// --- 4. Bump helpers ---------------------------------------------------------
function incVersion(v, kind, preTag) {
    const m = v.match(/^(\d+)\.(\d+)\.(\d+)(?:-([\w.]+))?$/);
    if (!m) throw new Error(`Cannot parse current version: ${v}`);
    let major = +m[1];
    let minor = +m[2];
    let patch = +m[3];
    const pre = m[4];

    if (kind === 'major') return `${major + 1}.0.0`;
    if (kind === 'minor') return `${major}.${minor + 1}.0`;
    if (kind === 'patch') return `${major}.${minor}.${patch + 1}`;
    if (kind === 'prerelease') {
        if (pre) {
            const parts = pre.split('.');
            const last = parts[parts.length - 1];
            const n = parseInt(last, 10);
            if (!Number.isNaN(n)) {
                parts[parts.length - 1] = String(n + 1);
                return `${major}.${minor}.${patch}-${parts.join('.')}`;
            }
            return `${major}.${minor}.${patch}-${pre}.1`;
        }
        return preTag
            ? `${major}.${minor}.${patch}-${preTag}.0`
            : `${major}.${minor}.${patch}-0`;
    }
    throw new Error(`Unknown bump kind: ${kind}`);
}
