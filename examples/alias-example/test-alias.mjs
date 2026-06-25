// Run with:
//   node test-alias.mjs          # test dev    (port 3057)
//   node test-alias.mjs preview  # test preview (port 3058)
//
// Starts the Elit server for this example and verifies that:
//   1. The page itself loads (200 from /).
//   2. /src/main.ts is served with '@/...' imports rewritten to relative
//      paths so the browser can actually resolve them.
//   3. The rewritten main.ts imports './components/Counter.js', not '@/components/Counter'.
//   4. /src/components/Counter.js (the alias-resolved file) is itself served.

import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const MODE = process.argv[2] === 'preview' ? 'preview' : 'dev';
const PORT = MODE === 'preview' ? 3058 : 3057;
const BASE = `http://localhost:${PORT}`;

const color = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

async function waitForServer(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.status === 200 || res.status === 404) return;
    } catch {
      // not up yet
    }
    await sleep(250);
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

async function fetchText(path) {
  const res = await fetch(BASE + path);
  const text = await res.text();
  return { status: res.status, text };
}

function summarize(results) {
  console.log('');
  console.log(color.bold(` resolve.alias runtime report — mode: ${MODE} `));
  console.log('='.repeat(64));
  let passed = 0;
  for (const r of results) {
    const tag = r.ok ? color.green('PASS') : color.red('FAIL');
    if (r.ok) passed++;
    console.log(` ${tag}  ${r.name.padEnd(48)} ${color.dim(r.detail || '')}`);
  }
  console.log('='.repeat(64));
  console.log(` ${passed}/${results.length} checks passed`);
  return passed === results.length;
}

async function run() {
  console.log(color.dim(`> starting elit ${MODE} on port ${PORT} ...`));
  const child = spawn('elit', [MODE], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });

  child.stdout.on('data', (chunk) => process.stdout.write(color.dim(chunk.toString())));
  child.stderr.on('data', (chunk) => process.stderr.write(color.dim(chunk.toString())));

  const kill = () => { try { child.kill('SIGTERM'); } catch {} };
  process.on('exit', kill);
  process.on('SIGINT', () => { kill(); process.exit(130); });

  try {
    await waitForServer(BASE);
    console.log(color.dim('> server ready, running alias checks ...'));

    const results = [];

    // 1. Index loads.
    const indexRes = await fetchText('/');
    results.push({
      name: 'GET / returns 200',
      ok: indexRes.status === 200,
      detail: `got ${indexRes.status}`,
    });

    // 2. main.ts is served.
    const mainRes = await fetchText('/src/main.ts');
    results.push({
      name: 'GET /src/main.ts returns 200',
      ok: mainRes.status === 200,
      detail: `got ${mainRes.status}`,
    });

    // 3. main.ts no longer contains the bare '@/...' import.
    const mainHasAlias = /(?:from|import)\s+['"]@\/components\/Counter['"]/.test(mainRes.text);
    results.push({
      name: "main.ts: '@/components/Counter' is rewritten",
      ok: !mainHasAlias,
      detail: mainHasAlias ? 'still contains bare @/ import' : 'alias rewritten',
    });

    // 4. main.ts contains a rewritten relative path to ./components/Counter.js
    const mainHasRelative = /\.\.\/components\/Counter\.js|\.\/components\/Counter\.js/.test(mainRes.text);
    results.push({
      name: "main.ts: rewritten to relative ./components/Counter.js",
      ok: mainHasRelative,
      detail: mainHasRelative ? 'relative path found' : 'no relative rewrite found',
    });

    // 5. The rewritten module is itself served via the .js → .ts fallback.
    const counterRes = await fetchText('/src/components/Counter.js');
    results.push({
      name: 'GET /src/components/Counter.js serves transpiled module',
      ok: counterRes.status === 200 && /Counter/.test(counterRes.text),
      detail: `got ${counterRes.status}`,
    });

    // 6. The Counter module's '@/utils/math' import is also rewritten.
    const counterHasAlias = /(?:from|import)\s+['"]@\/utils\/math['"]/.test(counterRes.text);
    results.push({
      name: "Counter.js: '@/utils/math' is rewritten",
      ok: !counterHasAlias,
      detail: counterHasAlias ? 'still contains bare @/ import' : 'alias rewritten',
    });

    const ok = summarize(results);
    if (!ok) {
      console.log(color.red('\nOne or more checks failed.'));
      process.exitCode = 1;
    } else {
      console.log(color.green('\nAll alias checks passed.'));
    }
  } finally {
    kill();
  }
}

run().catch((err) => {
  console.error(color.red('Fatal: ' + (err?.stack || err?.message || err)));
  process.exit(1);
});
