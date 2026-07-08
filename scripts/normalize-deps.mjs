#!/usr/bin/env node
/**
 * Rewrite `file:` deps in a package.json to a version range.
 * Usage: node normalize-deps.mjs <version> [path/to/package.json]
 *
 * Used in CI publish workflows so the published package.json points at
 * npm registry versions instead of local file: paths.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const rawVersion = process.argv[2];
if (!rawVersion) {
    console.error('Usage: normalize-deps.mjs <version> [package.json path]');
    process.exit(1);
}
const version = rawVersion.replace(/^v/, '');
const pkgPath = process.argv[3] ?? 'package.json';
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

let rewritten = 0;
for (const depType of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    const deps = pkg[depType];
    if (!deps) continue;
    for (const [name, spec] of Object.entries(deps)) {
        if (typeof spec === 'string' && spec.startsWith('file:')) {
            deps[name] = `^${version}`;
            rewritten++;
        }
    }
}

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`Rewrote ${rewritten} file: dependency entries to ^${version} in ${pkgPath}`);
