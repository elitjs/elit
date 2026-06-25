---
name: elit-runtime-app
description: 'Configure how this Elit app runs — `elit.config.ts`, multi-client setup, build matrix, preview, server-side HMR, resolve.alias, blockFiles, mobile, desktop, native, and WAPK wiring. Use when editing `elit.config.ts`, build/preview wiring, or targeting new runtimes.'
argument-hint: 'Describe the config, build target, or runtime wiring change.'
user-invocable: true
---

# Elit Runtime App

Use this skill when the task is about *how the app is built and run*, not about page/component code or route handlers. The source of truth is `elit.config.ts`.

## Route The Task First

1. Dev server options / multi-client → `dev` section
2. Production build output → `build` (single object or array)
3. Preview server options → `preview`
4. Test runner options → `test`
5. Mobile targets (Android/iOS) → `mobile`
6. Desktop targets (Windows/macOS/Linux) → `desktop`
7. WAPK archive packaging → `wapk`
8. Process manager apps → `pm`
9. Cross-target import aliasing → top-level `resolve.alias` (inherited by dev/preview/build)

## Public API Surface

- `elit/config` — `defineConfig(config)` for type-safe autocomplete
- `elit/build` — build-time helpers (rarely needed directly)
- `elit/test` — test runner entry

Config files are loaded in this order (first match wins): `elit.config.ts`, `.mts`, `.js`, `.mjs`, `.cjs`, `.json`.

## Config Shape

```ts
// elit.config.ts
import { defineConfig } from 'elit/config';
import { server } from './src/server';
import { client } from './src/client';

export default defineConfig({
  dev: { /* ... */ },
  build: [/* ... */],
  preview: { /* ... */ },
  test: { /* ... */ },
  mobile: { /* ... */ },
  desktop: { /* ... */ },
  wapk: { /* ... */ },
  resolve: { alias: { '@': './src' } },
});
```

`defineConfig` is optional but recommended — it gives autocomplete and protects against typos in section names.

## Dev / Preview (shared server-side options)

Both sections accept the same server-side options:

- `port`, `host`, `https`, `open`, `logging`
- `root`, `basePath`, `index`
- `clients[]` for multiple apps on one port
- `api` (a `ServerRouter`) and `ws[]` (WebSocket endpoints)
- `smtp` (SMTP listeners)
- `proxy` (backend forwarding)
- `worker` (worker script registration)
- `ssr` (string or VNode rendering for initial paint)
- `env` (environment injection)
- `blockFiles` (sensitive-file patterns blocked from being served)
- `serverWatch` (server-side HMR)
- `resolve.alias` (per-target override)

`preview` is **not** static-file-only — it supports `clients`, `api`, `ws`, `proxy`, `worker`, and `ssr` with the same shape as `dev`.

### Multi-Client (multiple apps on one dev port)

```ts
dev: {
  port: 3003,
  clients: [
    {
      root: '.',
      basePath: '',          // this client is served at /
      ssr: () => client,     // SSR shell function (returns VNode)
      api: server            // ServerRouter for this client's /api/... routes
    }
  ]
}
```

- Each client's routes are prefixed by its `basePath`.
- `clients[].ws[].path` is auto-prefixed by `basePath` too.
- `clients[].smtp` does NOT use `basePath` — SMTP listeners bind to their own host:port.
- Use multiple entries when you need two SSR shells or two routers on one server.

### Server-Side HMR (`serverWatch`)

Behavior modes:

- `true` (default): walk the dependency graph from server entries discovered in `elit.config.ts`. Watches every transitively-imported local `.ts/.tsx/.js/.jsx/.mjs/.cjs` file. Honors `resolve.alias`.
- `false`: disable server HMR entirely.
- `string[]`: explicit glob patterns — skips graph discovery.

```ts
dev: {
  serverWatch: true,                              // default
  // serverWatch: ['src/server/**/*', 'shared/**/*'],  // explicit
  // serverWatch: false,                               // off
}
```

Override per-run via CLI: `elit dev --no-server-watch`.

Graph behavior: static `import`/`require()` are followed; dynamic `import()` is not. CSS/JSON/assets are skipped. Capped at 5000 files to bound large projects.

### Block Files (SSRF / file-safety)

Default patterns block `.env`, `*.key`, `*.pem`, `.git/**`, etc. Override with your own list (replaces defaults):

```ts
dev: {
  root: '.',
  blockFiles: ['.env', '.env.*', '*.key', 'secrets/**'],
}
```

Patterns support `*` (non-slash chars), `**` (any depth), `?` (single char). Matching requests get `403 Forbidden`. Set `blockFiles: []` to disable.

### Resolve Alias

```ts
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
});
```

- Top-level `resolve.alias` is inherited by `dev`, `preview`, and `build`.
- Per-target `resolve.alias` extends (and overrides) the inherited map.
- Longest key wins on conflicts (`@app` checked before `@`).
- Alias matches only at specifier start, followed by `/` or whole-specifier match.
- Bare `node_modules` imports pass through untouched.

### WebSocket Endpoints

```ts
dev: {
  ws: [{
    path: '/ws',
    handler: ({ ws, req, path, query, headers }) => {
      ws.on('message', msg => ws.send(msg.toString()));
    }
  }]
}
```

- Matching is exact on the pathname (query does not affect matching but is exposed via `query`).
- `clients[].ws[].path` is auto-prefixed by `basePath`.
- `/__elit_ws` is reserved for Elit's internal HMR/state socket — do not use it.

### SMTP Listeners

`dev.smtp`, `preview.smtp`, `clients[].smtp` accept one object or an array. Default `port: 2525`, `host: '127.0.0.1'`. Duplicate `host:port` bindings are rejected.

## Build

Single object or array (array runs sequential builds):

```ts
build: [{
  entry: './src/main.ts',
  outDir: './dist',
  outFile: 'main.js',
  format: 'esm',
  minify: true,
  sourcemap: true,
  target: 'es2020',
  copy: [
    {
      from: './public/index.html',
      to: './index.html',
      transform: (content, { basePath }) => {
        let html = content.replace('src="../src/main.ts"', 'src="main.js"');
        if (basePath) {
          html = html.replace(
            '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
            `<meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <base href="${basePath}/">`
          );
        }
        return html;
      }
    },
    { from: './public/favicon.svg', to: './favicon.svg' }
  ]
}]
```

Useful options: `entry`, `outDir`, `outFile`, `format`, `platform`, `target`, `globalName`, `minify`, `sourcemap`, `treeshake`, `logging`, `resolve.alias`, `external`, `env`, `copy`, `onBuildEnd(result)`.

The `copy[].transform(content, { basePath })` callback is how `index.html` script/src tags get rewritten at build time. Always inject `<base href="${basePath}/">` when `basePath` is set, or assets resolve against the wrong path.

## Mobile

```ts
mobile: {
  cwd: '.',
  appId: 'com.example.app',
  appName: 'Example App',
  webDir: 'dist',
  mode: 'native',            // 'native' | 'hybrid' | 'webview'
  icon: './icon.png',
  permissions: ['android.permission.INTERNET'],
  android: { target: 'emulator-5554' },
  ios: { target: 'iPhone 15' },
  native: {
    entry: './src/native-screen.ts',
    exportName: 'screen',
    android: {
      enabled: true,
      packageName: 'com.example.app',
      output: './android/app/src/main/java/com/example/app/GeneratedScreen.kt',
    },
    ios: {
      enabled: false,
    },
  },
}
```

- `mode` selects `native` (IR generation), `hybrid` (webview + native screens), or `webview` (pure webview).
- `native.entry` is the entry for code generation (typically `src/native-screen.ts`). It is a separate file from `src/main.ts` because native output is IR, not DOM.
- `native.exportName` selects which named export to render.
- Android and iOS branches can be enabled/disabled independently.

## Desktop

```ts
desktop: {
  compiler: 'auto',
  entry: './src/main.ts',
  mode: 'hybrid',           // 'native' | 'hybrid'
  outDir: './desktop-dist',
  runtime: 'quickjs',       // JS runtime inside native shell
}
```

- `mode: 'native'` builds a smaller self-contained app using native IR.
- `mode: 'hybrid'` bundles the web app + a Rust host shell (`desktop/` directory at repo root for framework maintainers).
- `desktop.native.entry` and `desktop.native.exportName` override the native-render entry separately from `desktop.entry`.
- `platform` accepts standard names (`windows`, `macos`, `linux`) plus aliases (`win`, `mac`) and architecture-specific targets.

## WAPK (Elit archive packaging)

```ts
wapk: {
  name: 'elit-example',
  version: '1.0.0',
  runtime: 'node',           // 'node' | 'bun'
  entry: './dist/index.js',
  script: { start: 'node ./dist/index.js' },
  env: { APP_NAME: 'Elit Example' },
  lock: { password: 'secret-123' },
  run: {
    runtime: 'node',
    useWatcher: true,
    watchArchive: true,
    syncInterval: 150,
    archiveSyncInterval: 150,
    // online: true,
    // onlineUrl: 'http://localhost:4179',
    // googleDrive: { fileId, accessTokenEnv, supportsAllDrives },
  },
}
```

- `lock.password` is plain-text — treat the config as sensitive.
- `run.online` + `run.onlineUrl` send the archive to an Elit Run host instead of starting locally.
- `run.googleDrive` lets the runtime pull the archive from Google Drive without a local file.
- `run.watchArchive` keeps the temp workdir in sync with external archive updates.
- Desktop metadata can be embedded under `wapk.desktop` when desktop shell behavior needs extra data.

## Process Manager (`pm`)

`pm.apps[]` entries can be `script` (npm/package), `file` (TS/JS), or `wapk` (archive) — mutually exclusive. Common fields:

- `name`, `runtime`, `restartPolicy` (`always` | `on-failure` | `never`)
- `instances` (multi-instance), `maxMemory` (`'256M'`), `memoryAction` (`restart` | `stop`)
- `cronRestart` (`'0 4 * * *'` or `@every 30s`), `restartWindow`, `expBackoffRestartDelay`, `expBackoffRestartMaxDelay`
- `watch`, `watchPaths`, `watchIgnore`, `watchDebounce`
- `healthCheck` (`{ url, gracePeriod, interval, timeout, maxFailures }`), `waitReady`, `listenTimeout`, `killTimeout`, `minUptime`
- `proxy` (PM owns the public port and routes to children)
- `wapkRun` (forwards runtime/sync/googleDrive/online settings into `elit wapk run`)

`pm.dataDir` and `pm.dumpFile` change where state lives for `elit pm save` / `elit pm resurrect`.

## Auth/Security Defaults (inherited by every app)

- `.env`, `.env.*`, `*.key`, `*.pem`, `*.p12`, `*.pfx`, `.git/**`, `.htaccess`, `docker-compose.{yml,yaml}`, `Dockerfile` are blocked from HTTP serving by default.
- Only `VITE_`-prefixed env vars are injected into client bundles.
- `elit/server` does not prescribe a session store — pick one (in-memory or DB-backed) and wrap it in middleware.

## High-Risk Areas

- **Forgetting `defineConfig`** — typos in section names silently ignored.
- **Wrong `basePath` semantics** — `clients[].ws[].path` is auto-prefixed; `clients[].smtp` is NOT.
- **`blockFiles: []` in production** — disables SSRF protection; only do this if you understand the exposure.
- **`serverWatch: ['wrong/**']`** — server changes won't HMR; verify the glob matches actual paths.
- **Forgetting `transform(content, { basePath })` on `index.html`** — assets fail to load when deployed under a sub-path.
- **`mobile.mode` mismatch with `native.entry`** — `webview` mode does not generate native code; `native` mode requires it.
- **`wapk.lock.password` checked into git** — sensitive; keep in env or gitignore.
- **`pm.apps[].script` + `file` + `wapk` together** — they are mutually exclusive; Elit will reject the config.
- **Per-target `resolve.alias` that drops a key** — extending overrides per-key, not merge-all; explicitly re-declare keys you want to keep.
- **Multiple SMTP listeners on same `host:port`** — Elit rejects with a duplicate-binding error.

## Validation

1. `npm run typecheck` — catches type errors in `elit.config.ts`.
2. `npm run dev` — verify dev server starts; check the port from config; exercise the multi-client `basePath` if set.
3. `npm run build` — confirm the build matrix produces all expected outputs.
4. `npm run preview` — exercise the production server bundle with the same `api`/`ws`/`ssr` shape as dev.
5. For mobile: `npx elit mobile doctor` verifies the local toolchain before trying to build.
6. For desktop: `npx elit desktop build` produces the platform binary; verify `outDir` is gitignored.
7. For WAPK: `npx elit wapk build` then `npx elit wapk run` locally before publishing.

## Useful Anchors

- Config file: `elit.config.ts` (root)
- SSR shell import: `src/client.ts` → wired via `dev.clients[].ssr` or `dev.ssr`
- Router import: `src/server.ts` → wired via `dev.clients[].api` or `dev.api`
- Build copy transforms: search `copy:` and `transform:` in `elit.config.ts`
- WAPK metadata: search `wapk:` section, especially `run:` and `lock:`
- Mobile native entry: search `native:` inside `mobile:`
- Desktop modes: search `mode:` inside `desktop:`

## References

**Detailed API references (next to this skill file):**
- `references/config.md` — full `ElitConfig` shape, `defineConfig`, `DevServerOptions`, `ClientConfig` (multi-client), `serverWatch` modes, `blockFiles` SSRF defaults, `resolve.alias` inheritance, `WebSocketEndpointConfig`, `ProxyConfig`, `WorkerConfig`, env loading
- `references/build.md` — `BuildOptions` (entry/outDir/format/platform/target/external/env), multi-build arrays, `copy[].transform(content, { basePath })`, `onBuildEnd(result)`, standalone bundles, format/platform combinations table
- `references/test.md` — `TestOptions`, environments (`node`/`jsdom`/`happy-dom`/`edge-runtime`), pools, `coverage` config, watch mode, reporter options
- `references/cli.md` — every `elit` command (`dev`, `build`, `preview`, `test`, `mobile init/doctor/sync/run/build`, `desktop run/build/wapk`, `pm start/list/restart/logs/save/resurrect`, `wapk build/run/online/remote`), flags, env-var overrides

Read these before writing code in unfamiliar areas — they have signatures, examples, and gotchas for every public API.

**In this project (concrete examples to copy from):**
- `elit.config.ts` — single source of truth; shows `dev.clients[]`, `build[].copy.transform`, `preview`, `mobile`, `desktop`, `wapk` all in one file
- `src/main.ts` (browser entry referenced by `build[].entry` and `desktop.entry`)
- `src/client.ts` (SSR shell referenced by `dev.clients[].ssr`)
- `src/server.ts` (router referenced by `dev.clients[].api`)
- `src/native-screen.ts` (referenced by `mobile.native.entry` when `mode` includes native)
- `public/index.html` (input to `build[].copy[].transform`)
- `package.json` scripts (`dev`, `build`, `preview`, `mobile:*`, `desktop:*`) — invoke the CLI the same way CI does

**Installed type definitions (ground-truth API when docs are ambiguous):**
- `node_modules/elit/dist/config.d.ts` — `defineConfig`, `ElitConfig`, per-section option types
- `node_modules/elit/dist/build.d.ts` — `BuildOptions`, `copy.transform` signature
- `node_modules/elit/dist/cli.d.ts` — CLI flag surface

**External docs:**
- Config reference (every section, every option): https://d-osc.github.io/elit/CONFIG.md
- CLI reference (every command and flag): https://d-osc.github.io/elit/CLI.md
- Mobile workflow (`mobile init`, `doctor`, `sync`, `run`, `build`): https://d-osc.github.io/elit/CONFIG.md#mobile
- Desktop workflow (`desktop run`, `build`, `wapk`): https://d-osc.github.io/elit/CONFIG.md#desktop
- WAPK packaging (`wapk build`, `run`, online/Google Drive sync): https://d-osc.github.io/elit/CONFIG.md#wapk
- GitHub repo (browse `src/cli/`, `src/build/`): https://github.com/d-osc/elit
- Release notes (breaking changes between versions): https://github.com/d-osc/elit/releases

**Related skills:**
- `elit-client-app` — when config touches the browser side (`build[].entry`, `dev.ssr`, `dev.clients[].ssr`, `resolve.alias` for browser imports)
- `elit-server-app` — when config touches the server side (`dev.api`, `dev.clients[].api`, `dev.ws`, `dev.smtp`, `preview.api`, `blockFiles`)
- `elit-desktop-app` — when `desktop` config is in play and the task involves window control, IPC, or auto-render (the runtime API itself, not the build config)
- `elit-native-app` — when `mobile.native.*` or `desktop.native.*` is set and the task involves the screen entry (`src/native-screen.ts`) or native codegen output
