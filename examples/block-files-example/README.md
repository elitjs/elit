# blockFiles Example (3.7.1)

Demonstrates two things added in Elit `3.7.1`:

1. **`dev.blockFiles` / `preview.blockFiles`** — glob patterns for files that must never be served over HTTP. Default patterns block `.env`, `*.key`, `*.pem`, `.git/**`, etc. Requests matching a blocked pattern get `403 Forbidden`.
2. **`elit/config` subpath export** — `import { defineConfig } from '@elitjs/config'` now resolves via the package exports map.

## Files in this example

```
block-files-example/
├── elit.config.ts            # uses defineConfig from '@elitjs/config', sets blockFiles
├── index.html                # served at /         (200 OK)
├── src/main.ts               # client UI
├── public-notes.txt          # served at /public-notes.txt  (200 OK — not blocked)
├── .env                      # DEMO secret  -> /.env         (403 — default .env)
├── .env.local                # DEMO secret  -> /.env.local   (403 — default .env.*)
├── secrets/
│   ├── private.key           # DEMO secret  -> /secrets/private.key  (403 — *.key + secrets/**)
│   └── api-key.txt           # DEMO secret  -> /secrets/api-key.txt  (403 in dev, 200 in preview — see Known issue)
├── test-blocking.mjs         # automated runtime check (dev + preview)
└── package.json
```

> All "secret" files contain **obviously fake** demo values. They exist only so the runtime check can prove they are blocked.

## Config

```ts
// elit.config.ts
import { defineConfig } from '@elitjs/config';

const DEFAULT_BLOCK_FILES = [
  '.env', '.env.*', '*.pem', '*.key', '*.p12', '*.pfx',
  '.git/**', '.htaccess',
  'docker-compose.yml', 'docker-compose.yaml', 'Dockerfile',
];

export default defineConfig({
  dev:     { port: 3055, root: '.', blockFiles: [...DEFAULT_BLOCK_FILES, 'secrets/**'] },
  preview: { port: 3056, root: '.', blockFiles: [...DEFAULT_BLOCK_FILES, 'secrets/**'] },
});
```

Setting `blockFiles` **replaces** the defaults — it does not merge. To keep default protection while adding patterns, repeat the defaults and append your own (as shown).

## Run

```bash
npm install
npm run dev          # http://localhost:3055
npm run preview      # http://localhost:3056
```

Then try these URLs in a browser or with curl:

| URL                          | dev (3055) | preview (3056) |
| --- | --- | --- |
| `/.env`                      | `403` | `403` |
| `/.env.local`                | `403` | `403` |
| `/secrets/private.key`       | `403` | `403` |
| `/secrets/api-key.txt`       | `403` | `200` ⚠️ see Known issue |
| `/public-notes.txt`          | `200` | `200` |
| `/`                          | `200` | `200` |

## Automated check

```bash
npm run test:blocking           # tests dev server
npm run test:blocking:preview   # tests preview server
```

Each script starts the server, runs the probes above, prints a pass/fail report, and shuts the server down.

Verified output on this repo:

```
 blockFiles runtime report — mode: dev
================================================================
 PASS  /.env                      expect 403 got 403  default pattern .env
 PASS  /.env.local                expect 403 got 403  default pattern .env.*
 PASS  /secrets/private.key       expect 403 got 403  default *.key + custom secrets/**
 PASS  /secrets/api-key.txt       expect 403 got 403  custom pattern secrets/**
 PASS  /public-notes.txt          expect 200 got 200  not blocked
 PASS  /                          expect 200 got 200  index route still served
================================================================
 6/6 checks passed
```

```
 blockFiles runtime report — mode: preview
================================================================
 PASS  /.env                      expect 403 got 403  default pattern .env
 PASS  /.env.local                expect 403 got 403  default pattern .env.*
 PASS  /secrets/private.key       expect 403 got 403  default *.key + custom secrets/**
 KNOWN /secrets/api-key.txt       expect 403 got 200  preview.blockFiles not forwarded — see README
 PASS  /public-notes.txt          expect 200 got 200  not blocked
 PASS  /                          expect 200 got 200  index route still served
================================================================
 5/6 checks passed, 1 known preview bug(s)
```

## Known issue — `preview.blockFiles` is not forwarded (3.7.1)

In `src/cli/cli/dev-preview.ts`, `runPreview()` builds a fresh `DevServerOptions` object and copies fields out of `previewConfig` one by one. It forwards `proxy`, `worker`, `api`, `ws`, `https`, and `ssr`, but **never forwards `blockFiles`**:

```ts
// src/cli/cli/dev-preview.ts (excerpt)
const options: DevServerOptions = { port, host, open, logging, domain };
// ... clients/root/basePath/index ...
if (mergedOptions.proxy)   options.proxy   = mergedOptions.proxy;
if (mergedOptions.worker)  options.worker  = mergedOptions.worker;
if (mergedOptions.api)     options.api     = mergedOptions.api;
if (mergedOptions.ws)      options.ws      = mergedOptions.ws;
if (mergedOptions.https)   options.https   = mergedOptions.https;
if (mergedOptions.ssr)     options.ssr     = mergedOptions.ssr;
// ❌ no options.blockFiles = mergedOptions.blockFiles
options.mode = 'preview';
const devServer = createDevServer(options);
```

Effect: in preview mode, only the built-in `defaultOptions.blockFiles` patterns apply. Any custom patterns added under `preview.blockFiles` (like `secrets/**` here) are silently ignored. `/secrets/api-key.txt` proves this — it returns `200` in preview even though the config explicitly blocks it. `/secrets/private.key` still gets `403` only because `*.key` is in the defaults.

Fix is one line:

```ts
if (mergedOptions.blockFiles) options.blockFiles = mergedOptions.blockFiles;
```

The dev server is unaffected — `runDev()` merges `config.dev` directly via `mergeConfig`, so `dev.blockFiles` works correctly.

## Disabling blocking

Set `blockFiles: []` to turn blocking off entirely (not recommended):

```ts
dev: { blockFiles: [] }   // /.env would now be served
```

## Pattern syntax

`*` matches any non-slash characters, `**` matches any path depth, `?` matches a single character. Patterns are matched against the request path with leading slash trimmed.

## Notes

- See [`docs/CONFIG.md`](../../docs/CONFIG.md) for the full reference.
- This example lives under [`examples/`](../../examples/) and links `elit` via `file:../..`.
