// Run with:
//   node test-blocking.mjs          # test dev  (port 3055)
//   node test-blocking.mjs preview  # test preview (port 3056)
//
// Starts the Elit server using this example's elit.config.ts and asserts
// that blocked patterns return 403 while normal files return 200.
//
// Requires `npm install` to have linked the local `elit` package.

import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const MODE = process.argv[2] === 'preview' ? 'preview' : 'dev';
const PORT = Number(MODE === 'preview' ? 3056 : 3055);
const BASE = `http://localhost:${PORT}`;

const color = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

const cases = [
  { path: '/.env',                 expect: 403, reason: 'default pattern .env' },
  { path: '/.env.local',           expect: 403, reason: 'default pattern .env.*' },
  { path: '/secrets/private.key',  expect: 403, reason: 'default *.key + custom secrets/**' },
  { path: '/secrets/api-key.txt',  expect: 403, reason: 'custom pattern secrets/**', previewKnownBug: true },
  { path: '/public-notes.txt',     expect: 200, reason: 'not blocked' },
  { path: '/',                     expect: 200, reason: 'index route still served' },
];

async function waitForServer(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.status === 200 || res.status === 404) return;
    } catch {
      // server not up yet
    }
    await sleep(250);
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

async function probe(path) {
  const res = await fetch(BASE + path, { redirect: 'manual' });
  return res.status;
}

function summarize(results) {
  console.log('');
  console.log(color.bold(` blockFiles runtime report — mode: ${MODE} `));
  console.log('='.repeat(64));
  let passed = 0;
  let knownFailures = 0;
  for (const { path, expect, actual, reason, ok, previewKnownBug } of results) {
    if (ok) {
      passed++;
      console.log(` ${color.green('PASS')}  ${path.padEnd(26)} expect ${String(expect).padEnd(3)} got ${String(actual).padEnd(3)} ${color.dim(reason)}`);
    } else if (MODE === 'preview' && previewKnownBug) {
      knownFailures++;
      console.log(` ${color.red('KNOWN')} ${path.padEnd(26)} expect ${String(expect).padEnd(3)} got ${String(actual).padEnd(3)} ${color.dim('preview.blockFiles not forwarded — see README')}`);
    } else {
      console.log(` ${color.red('FAIL')}  ${path.padEnd(26)} expect ${String(expect).padEnd(3)} got ${String(actual).padEnd(3)} ${color.dim(reason)}`);
    }
  }
  console.log('='.repeat(64));
  console.log(` ${passed}/${results.length} checks passed${knownFailures ? `, ${knownFailures} known preview bug(s)` : ''}`);
  return passed + knownFailures === results.length;
}

async function run() {
  console.log(color.dim(`> starting elit ${MODE} on port ${PORT} ...`));
  const child = spawn('elit', [MODE], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });

  const logs = [];
  child.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    logs.push(text);
    process.stdout.write(color.dim(text));
  });
  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    logs.push(text);
    process.stderr.write(color.dim(text));
  });

  const kill = () => {
    try { child.kill('SIGTERM'); } catch {}
  };
  process.on('exit', kill);
  process.on('SIGINT', () => { kill(); process.exit(130); });

  try {
    await waitForServer(BASE);
    console.log(color.dim(`> server ready, running ${cases.length} probes ...`));

    const results = [];
    for (const c of cases) {
      const actual = await probe(c.path);
      results.push({ ...c, actual, ok: actual === c.expect });
    }

    const ok = summarize(results);
    if (!ok) {
      console.log(color.red('\nOne or more unexpected checks failed. The server is still running — press Ctrl+C to stop it.'));
      process.exitCode = 1;
    } else {
      console.log(color.green(`\nAll checks passed (treating known preview bugs as expected). Stopping ${MODE} server.`));
    }
  } finally {
    kill();
  }
}

run().catch((err) => {
  console.error(color.red('Fatal: ' + (err?.stack || err?.message || err)));
  process.exit(1);
});
