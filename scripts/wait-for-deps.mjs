#!/usr/bin/env node
/**
 * Poll npm registry until every @elitjs/* dep in package.json is available
 * at the requested version. Used in publish workflows to ensure topo order
 * without an explicit master workflow.
 *
 * Usage: node wait-for-deps.mjs <version> [package.json path]
 */
import { readFileSync } from 'node:fs';

const rawVersion = process.argv[2];
if (!rawVersion) {
    console.error('Usage: wait-for-deps.mjs <version> [package.json path]');
    process.exit(1);
}
const version = rawVersion.replace(/^v/, '');
const pkgPath = process.argv[3] ?? 'package.json';
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

const deps = [];
for (const depType of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
    const entry = pkg[depType];
    if (!entry) continue;
    for (const [name, spec] of Object.entries(entry)) {
        if (name.startsWith('@elitjs/') && typeof spec === 'string') {
            deps.push({ name, spec });
        }
    }
}

if (deps.length === 0) {
    console.log('No @elitjs/* deps to wait for');
    process.exit(0);
}

console.log(`Waiting for ${deps.length} @elitjs/* deps at version ${version}:`);
for (const { name, spec } of deps) {
    console.log(`  - ${name} (spec=${spec})`);
}

const MAX_WAIT_MS = 10 * 60 * 1000;
const POLL_INTERVAL_MS = 15 * 1000;
const startedAt = Date.now();

async function checkDep(name, targetVersion) {
    const url = `https://registry.npmjs.org/${encodeURIComponent(name).replace('%2F', '/')}`;
    try {
        const res = await fetch(url);
        if (!res.ok) return false;
        const data = await res.json();
        const versions = Object.keys(data.versions || {});
        return versions.includes(targetVersion);
    } catch {
        return false;
    }
}

async function poll() {
    while (true) {
        const results = await Promise.all(deps.map(async ({ name }) => ({
            name,
            ok: await checkDep(name, version),
        })));
        const missing = results.filter((r) => !r.ok);
        if (missing.length === 0) {
            console.log(`\nAll ${deps.length} deps available at ${version}`);
            return;
        }
        const elapsed = Date.now() - startedAt;
        if (elapsed > MAX_WAIT_MS) {
            console.error(`\nTimed out after ${MAX_WAIT_MS / 1000}s waiting for:`);
            for (const m of missing) console.error(`  - ${m.name}`);
            process.exit(1);
        }
        process.stdout.write('.');
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
}

await poll();
