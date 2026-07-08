---
name: elit-config
description: 'Write elit.config.ts (or .mts/.js/.mjs/.cjs/.json): full ElitConfig shape (dev, build, preview, test, desktop, mobile, pm, wapk, resolve), defineConfig helper, multi-client dev, proxy, workers, WebSocket endpoints, SSR, multi-build arrays, copy/transform, coverage, native mobile/desktop, PM apps with autorestart/watch/healthcheck/proxy, WAPK lock + Google Drive + live sync, env loading via loadEnv. Use when scaffolding or editing the project config file.'
argument-hint: 'Describe what to configure (dev server, multi-client, proxy, build array, desktop native, mobile, pm apps, wapk, env) and the target scenario.'
user-invocable: true
---

# Elit.js Config (`elit.config.ts`)

Project-level manifest read by every `elit` CLI command. Configures dev server, build, preview, test, desktop, mobile, process manager, and WAPK packaging from one file.

## File resolution

The loader (`@elitjs/config`'s `loadConfig`) searches the project root in this order — the first match wins:

```
elit.config.ts    ← preferred (transpiled on the fly via esbuild)
elit.config.mts
elit.config.js
elit.config.mjs
elit.config.cjs
elit.config.json  ← JSON only — no TS, no imports
```

Use `.ts`. The transpiler handles TS, type-only imports, relative `./src/...` imports, and `@elitjs/*` workspace resolution automatically.

## Top-level shape

```ts
import { defineConfig } from '@elitjs/config';

export default defineConfig({
  dev?: DevServerOptions;
  build?: BuildOptions | BuildOptions[];   // single object OR array (runs sequentially)
  preview?: PreviewOptions;
  test?: TestOptions;
  desktop?: DesktopConfig;
  mobile?: MobileConfig;
  pm?: PmConfig;
  wapk?: WapkConfig;
  resolve?: ResolveConfig;                 // shared alias map — default for dev/build/preview
});
```

`defineConfig(config)` is a passthrough helper for type-safety and editor autocomplete. Optional but recommended.

## `resolve` — shared alias map

```ts
export default defineConfig({
  resolve: {
    alias: { '@': './src', '@components': './src/components' }
  }
});
```

Used as the default by `build`, `dev`, and `preview` when they don't declare their own `resolve.alias`. A block-level `resolve.alias` overrides this for that block only.

Aliases rewrite the **start** of import specifiers: `{ '@': './src' }` rewrites `@/x` but not `pkg/@/x`.

## `dev` — development server

Single-client:

```ts
dev: {
  port: 3000,
  host: 'localhost',
  open: true,
  logging: true,
  outDir: './dev-dist',
  outFile: 'index.js',
  root: '.',
  basePath: '',
  ssr: () => client,                  // VNode document shell from src/client.ts
  api: server,                        // ServerRouter instance from src/server.ts
  ws: [{ path: '/ws', handler: handleWs }],
  proxy: [{ context: '/api', target: 'http://localhost:8080', changeOrigin: true }],
  worker: [{ path: 'workers/data.js', name: 'data', type: 'module' }],
  middleware: [cors(), logger(), rateLimit({ windowMs: 60000, max: 100 })],
  https: { key: fs.readFileSync('./key.pem'), cert: fs.readFileSync('./cert.pem') }
}
```

Multi-client (`clients[]`): each client has its own `root`, `basePath`, `ssr`, `api`, `ws`, `proxy`, `worker`, `middleware`. Client-specific routes/endpoints are auto-prefixed with `basePath`.

```ts
dev: {
  port: 3000,
  clients: [
    {
      root: './app1',
      basePath: '/app1',
      ssr: () => app1Client,
      api: app1Router,                 // routes become /app1/api/...
      ws: [{ path: '/ws', handler: h }],  // endpoint becomes /app1/ws
      proxy: [{ context: '/api', target: 'http://localhost:8080' }]
    },
    {
      root: './app2',
      basePath: '/app2',
      ssr: () => app2Client
    }
  ],
  // Global proxy/workers apply to ALL clients
  proxy: [{ context: '/shared', target: 'http://localhost:9000' }],
  worker: [{ path: 'workers/shared.js', type: 'module' }]
}
```

Priority: client-specific proxy wins over global. Client-specific workers and global workers BOTH load.

## `build` — production bundle

Single:

```ts
build: {
  entry: './src/main.ts',
  outDir: './dist',
  outFile: 'main.js',
  format: 'esm',                      // 'esm' | 'cjs' | 'iife'
  minify: true,
  sourcemap: true,
  target: 'es2020',
  platform: 'browser',                // 'browser' | 'node' | 'neutral'
  globalName: 'MyApp',                // required for iife
  external: ['react', 'react-dom'],
  resolve: { alias: { '@': './src' } },
  env: { APP_VERSION: '1.2.3' },
  copy: [
    {
      from: './public/index.html',
      to: './index.html',
      transform: (content, config) => content.replace('src="../src/main.ts"', 'src="main.js"')
    },
    { from: './public/favicon.svg', to: './favicon.svg' }
  ],
  onBuildEnd: async (result) => { console.log(`Built ${result.size} bytes`); },
  treeshake: true,
  logging: false
}
```

Multiple builds (array — run sequentially):

```ts
build: [
  { entry: './src/main.ts', outDir: './dist', outFile: 'main.js', format: 'esm' },
  { entry: './src/worker.ts', outDir: './dist/workers', outFile: 'worker.js', platform: 'browser' },
  { entry: './src/ssr.ts', outDir: './dist/server', outFile: 'ssr.js', format: 'cjs', platform: 'node' }
]
```

Standalone bundles (no `elit dev` / `elit preview` needed at runtime):

```ts
build: {
  entry: './src/main.ts',
  standaloneDev: true,                // emits dev server bundle
  standaloneDevOutFile: 'server.js',
  standalonePreview: true,            // emits preview server bundle
  standalonePreviewOutFile: 'server.js'
}
```

## `preview` — preview server

Has full parity with `dev` (same shape: single + multi-client, proxy, workers, api, ws, https, middleware, ssr). Defaults: `port: 4173`, `root: 'dist'` or `build.outDir`.

```ts
preview: {
  port: 4173,
  host: 'localhost',
  open: false,
  root: './dist',
  basePath: '/',
  index: './index.html',
  api: previewRouter,
  middleware: [(req, res, next) => { console.log(req.url); next(); }],
  ssr: () => '<h1>Server-rendered</h1>',
  proxy: [{ context: '/api', target: 'http://localhost:8080' }],
  worker: [{ path: 'workers/cache.js', type: 'module' }]
}
```

## `test` — test runner

```ts
test: {
  environment: 'node',                // 'node' | 'jsdom' | 'happy-dom' | 'edge-runtime'
  globals: true,                      // inject describe/it/expect onto globalThis
  setupFiles: ['./test/setup.ts'],
  include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  exclude: ['node_modules', 'dist', 'coverage'],
  testTimeout: 5000,
  isolate: true,
  pool: 'threads',                    // or 'forks'
  poolOptions: {
    threads: { singleThread: false, minThreads: 1, maxThreads: 4, isolate: true },
    forks: { singleFork: false, minForks: 1, maxForks: 4 }
  },
  coverage: {
    provider: 'v8',                   // 'v8' | 'istanbul'
    reporter: ['text', 'html', 'lcov', 'clover'],
    dir: './coverage',
    include: ['src/**'],
    exclude: ['src/**/*.test.ts'],
    thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    all: true
  },
  watch: false,
  ui: false,
  reporter: 'verbose',                // 'verbose' | 'dot' | 'json' | 'tap'
  bail: false,                        // true, or a number to stop after N failures
  pattern: /Todo/,                    // regex or string — filter tests by name
  colors: true,
  retry: 0,
  env: { NODE_ENV: 'test' }
}
```

## `desktop` — desktop runtime

```ts
desktop: {
  mode: 'hybrid',                     // 'hybrid' | 'native'
  entry: './src/main.ts',             // used in hybrid mode
  runtime: 'quickjs',                 // 'quickjs' | 'bun' | 'node' | 'deno'
  compiler: 'auto',                   // 'auto' | 'none' | 'esbuild' | 'tsx' | 'tsup'
  release: false,                     // build release binary
  outDir: './desktop-dist',
  platform: 'windows',                // 'windows' | 'linux' | 'macos' | 'linux-musl' | etc.
  binaryPath: './binaries/hybrid.bin',// prebuilt hybrid binary
  cargoTargetDir: './target',         // Cargo target dir override
  native: {
    entry: './src/native-screen.ts',  // used in native mode
    exportName: 'screen'
  },
  nativeBinaryPath: './binaries/native.bin',
  wapk: {
    runtime: 'node',                  // 'node' | 'bun' | 'deno'
    syncInterval: 150,
    useWatcher: true,
    release: false
  }
}
```

Mode behavior:
- `hybrid` (default): runs `desktop.entry` inside a desktop window with a JS backend.
- `native`: generates native UI from `desktop.native.entry` via `@elitjs/native`.

## `mobile` — native mobile

```ts
mobile: {
  cwd: '.',
  appId: 'com.example.app',
  appName: 'MyApp',
  webDir: 'dist',                     // built web assets synced into native projects
  mode: 'hybrid',                     // 'hybrid' | 'native'
  icon: './icon.png',
  permissions: ['android.permission.INTERNET'],
  android: { target: 'emulator-5554' },
  ios: { target: 'iPhone 15' },
  native: {
    entry: './src/mobile.ts',
    exportName: 'screen',
    android: {
      enabled: true,
      packageName: 'com.example.app',
      output: './android/app/src/main/java/.../HomeScreen.kt'
    },
    ios: {
      enabled: true,
      output: './ios/HomeScreen.swift'
    }
  }
}
```

`mode: 'native'` generates native UI; `mode: 'hybrid'` keeps the WebView shell. Toggle `native.android.enabled` / `native.ios.enabled` to skip a platform.

## `pm` — process manager

```ts
pm: {
  dataDir: './.elit/pm',
  dumpFile: './.elit/pm/dump.json',
  apps: [
    {
      name: 'api',
      script: 'npm start',
      cwd: './services/api',
      env: { NODE_ENV: 'production' },
      instances: 1,
      autorestart: true,
      restartDelay: 1000,
      maxRestarts: 10,
      restartWindow: 60000,
      expBackoffRestartDelay: 100,
      expBackoffRestartMaxDelay: 30000,
      minUptime: 10000,
      killTimeout: 30000,
      watch: false,
      watchPaths: ['./src'],
      watchIgnore: ['*.test.ts'],
      watchDebounce: 500,
      restartPolicy: 'always',         // 'always' | 'on-failure' | 'never'
      maxMemory: '512M',               // bytes or size string
      memoryAction: 'restart',         // 'restart' | 'stop'
      cronRestart: '0 3 * * *',        // or '@every 24h'
      waitReady: false,
      listenTimeout: 30000,
      healthCheck: {
        url: 'http://localhost:8080/health',
        gracePeriod: 5000,
        interval: 30000,
        timeout: 2000,
        maxFailures: 3
      },
      proxy: {
        port: 80,
        host: '0.0.0.0',
        strategy: 'proxy',             // 'proxy' | 'inherit'
        targetHost: '127.0.0.1',
        envVar: 'PORT'
      }
    },
    {
      name: 'worker',
      file: './src/worker.ts',         // file mode — runtime is inferred or set
      runtime: 'node',                 // 'node' | 'bun' | 'deno'
      watch: true
    },
    {
      name: 'packaged',
      wapk: './app.wapk',
      password: 'archive-password',
      wapkRun: {
        runtime: 'node',
        useWatcher: true,
        watchArchive: true,
        syncInterval: 150,
        archiveSyncInterval: 150,
        online: false,
        onlineUrl: 'https://run.elitjs.com',
        googleDrive: { fileId: '...', accessTokenEnv: 'GDRIVE_TOKEN' }
      }
    }
  ]
}
```

Start modes:
- `script` — shell command (`npm start`, `node ./foo.js`).
- `file` — JS/TS entry, runtime picks the runner.
- `wapk` — packaged app via `elit wapk run`.

`elit pm start <name>` runs one app; `elit pm start` runs all. `proxy` enables zero-downtime reloads for single-instance HTTP services.

## `wapk` — packaging config

```ts
wapk: {
  name: 'my-app',
  version: '1.0.0',
  appId: 'com.example.myapp',         // stable logical id in archive header
  publisherId: 'com.example',
  runtime: 'node',                    // 'node' | 'bun' | 'deno'
  engine: 'elit',
  entry: './dist/main.js',
  port: 3000,
  scripts: {
    start: 'node ./dist/main.js',
    postinstall: 'node ./scripts/migrate.js'
  },
  env: { APP_NAME: 'My App', DEBUG: 'false' },
  desktop: { /* arbitrary desktop metadata */ },
  lock: { password: 'secret' },
  run: {
    file: './app.wapk',
    runtime: 'node',
    password: 'secret',
    online: false,
    onlineUrl: 'https://run.elitjs.com',
    syncInterval: 150,
    useWatcher: true,
    watchArchive: true,
    archiveSyncInterval: 150,
    googleDrive: {
      fileId: '1abc...',
      accessToken: '...',
      accessTokenEnv: 'GDRIVE_TOKEN',
      supportsAllDrives: true
    }
  }
}
```

`lock.password` encrypts the archive. `run.googleDrive` enables `elit wapk run gdrive://<fileId>`.

## Environment variables

`@elitjs/config` exports `loadEnv(mode, cwd)` to read `.env*` files in priority order:

```
.env.<mode>.local      ← highest priority
.env.<mode>
.env.local
.env                   ← lowest priority
```

First definition wins — earlier files override later ones on the same key. Always returns `{ MODE: mode, ...vars }`.

```ts
// elit.config.ts
import { defineConfig, loadEnv } from '@elitjs/config';

const env = loadEnv(process.env.NODE_ENV || 'development');

export default defineConfig({
  dev: { port: Number(env.PORT) || 3000 },
  build: { env: { API_URL: env.API_URL || 'http://localhost:3000' } }
});
```

## Patterns

### Type-safe config with imports

```ts
import { defineConfig } from '@elitjs/config';
import { ServerRouter, cors, logger } from '@elitjs/server';
import { client } from './src/client';
import { router as api } from './src/server';

const apiRouter = new ServerRouter();
apiRouter.use(cors(), logger());
apiRouter.get('/api/health', (ctx) => ctx.json({ ok: true }));

export default defineConfig({
  dev: { clients: [{ root: '.', basePath: '', ssr: () => client, api: apiRouter }] },
  build: [{ entry: './src/main.ts', outDir: './dist', outFile: 'main.js', format: 'esm' }]
});
```

### Conditional config by environment

```ts
import { defineConfig, loadEnv } from '@elitjs/config';

const env = loadEnv(process.env.NODE_ENV || 'development');
const isProd = process.env.NODE_ENV === 'production';

export default defineConfig({
  dev: { port: Number(env.PORT) || 3000, open: !isProd },
  build: [{
    entry: './src/main.ts',
    outDir: './dist',
    minify: isProd,
    sourcemap: !isProd,
    env: { API_URL: env.API_URL || '' }
  }]
});
```

### Multi-app monorepo via PM

```ts
pm: {
  apps: [
    { name: 'web', script: 'npm run dev:web', watch: true, watchPaths: ['./apps/web/src'] },
    { name: 'api', script: 'npm run dev:api', watch: true, watchPaths: ['./apps/api/src'] },
    { name: 'worker', file: './apps/worker/src/main.ts', runtime: 'bun' }
  ]
}
```

`elit pm start` runs all three; `elit pm start web` runs just one.

### Path aliases shared across dev/build/preview

```ts
export default defineConfig({
  resolve: { alias: { '@': './src', '@components': './src/components', '@utils': './src/utils' } },
  dev: { /* inherits @ alias */ },
  build: [{ entry: './src/main.ts' /* inherits @ alias */ }]
});
```

Override per-block:

```ts
build: [{
  entry: './src/main.ts',
  resolve: { alias: { '@': './src/web' } }    // overrides top-level @
}]
```

### Multi-platform desktop

```ts
desktop: {
  mode: 'hybrid',
  entry: './src/main.ts',
  runtime: 'node',
  platform: process.platform === 'win32' ? 'windows' : 'linux'
}
```

## Rules

- One config file per project. The first match in the resolution order wins.
- Use `.ts` for type-safety, imports, and conditional logic. Fall back to `.json` only for non-TS environments.
- `defineConfig()` is optional but recommended — gives editor autocomplete and TS errors on typos.
- `build` accepts a single object OR an array. Arrays run sequentially; each entry is a complete `BuildOptions`.
- `resolve.alias` at the top level is a default. Block-level `resolve.alias` overrides — does not merge.
- `dev.clients[].basePath` prefixes all client routes, WS endpoints, and proxied paths.
- `preview` mirrors `dev`'s shape. Don't expect preview to skip middleware/api/ws — they all run.
- `test.globals: true` injects `describe`/`it`/`expect`/etc onto `globalThis`. With `false`, import explicitly in each test file.
- `pm.apps[].name` must be unique — it's the key for `pm stop/restart/delete/logs`.
- `wapk.lock.password` encrypts the archive. Don't commit the password — load from env.
- Configs are loaded by transpiling to a temp `.mjs` then importing. Relative `./src/...` imports work; `node:*` imports work; arbitrary packages are externalized.
- `loadEnv()` does NOT mutate `process.env` — it returns a plain object. Spread into `process.env` yourself if needed.

## Anti-Patterns

- Multiple config files (e.g., `elit.config.ts` AND `elit.config.json`). The loader picks one — delete the other.
- Importing server-only code from `src/main.ts` because it's referenced in `dev.clients[].ssr`. The SSR module runs on the server; the entry runs in the browser.
- Putting secrets directly in config. Use `loadEnv()` and reference `env.KEY`.
- `build: { ... }` then expecting `preview` to know about it. Preview reads `preview.root` (default `dist`) — it doesn't auto-discover `build.outDir` unless they match.
- Setting `test.coverage.thresholds` too high on day one. Start without thresholds, add them once coverage is stable.
- `pm.apps[]` with two entries having the same `name`. The second silently shadows the first.
- `wapk.scripts.start` that doesn't actually start the app. The runtime executes this script when running the archive.
- Expecting `mergeConfig(a, b)` to deep-merge. It's a shallow spread — later configs override earlier at the top level only.
- Calling `loadConfig()` from app code running in the browser. It's a Node-side utility used by the CLI.

## Validation

- `elit dev` boots the dev server with the configured clients — `curl http://localhost:<port>/` should return the SSR shell.
- `elit build` produces output at `build.outDir` (or `build[].outDir` for arrays).
- `elit preview` serves `preview.root` at `preview.port`.
- `elit test` runs once; `elit test --coverage` writes reports under `test.coverage.dir`.
- `elit pm list` shows every app from `pm.apps[]` with its status.
- `elit wapk inspect ./app.wapk` shows the `wapk.name`, `wapk.version`, and `wapk.appId` from config.
- `elit mobile doctor` validates the mobile toolchain and reads `mobile.android.target` / `mobile.ios.target`.
