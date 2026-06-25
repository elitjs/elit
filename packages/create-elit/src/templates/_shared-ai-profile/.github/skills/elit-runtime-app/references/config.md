# elit/config — `defineConfig` and the `ElitConfig` shape

`elit.config.ts` (or `.mts`, `.js`, `.mjs`, `.cjs`, `.json`) is the source of truth for dev, build, preview, test, mobile, desktop, wapk, pm, and alias resolution. Use `defineConfig()` for type-safe autocomplete.

## Config Files — Load Order

Elit looks for these files in the project root, first match wins:

1. `elit.config.ts`
2. `elit.config.mts`
3. `elit.config.js`
4. `elit.config.mjs`
5. `elit.config.cjs`
6. `elit.config.json`

## `defineConfig(config)`

A no-op type helper that returns its input. Use it for IDE autocomplete.

```ts
import { defineConfig } from 'elit/config';
import { server } from './src/server';
import { client } from './src/client';

export default defineConfig({
  dev: {
    port: 3003,
    clients: [{ root: '.', basePath: '', ssr: () => client, api: server }]
  },
  build: [{ entry: './src/main.ts', outDir: './dist' }],
  preview: { port: 3000, root: './dist' }
});
```

## Top-Level Shape

```ts
interface ElitConfig {
  dev?: DevServerOptions;
  build?: BuildOptions | BuildOptions[];
  preview?: PreviewOptions;
  test?: TestOptions;
  desktop?: DesktopConfig;
  mobile?: MobileConfig;
  pm?: PmConfig;
  wapk?: WapkConfig;
  resolve?: ResolveConfig;   // { alias?: Record<string, string> }
}
```

Top-level `resolve.alias` is inherited by `dev`, `preview`, and `build` as a default alias map. Per-target `resolve.alias` extends (and overrides) it.

## DevServerOptions

```ts
interface DevServerOptions {
  port?: number;             // default 3000
  host?: string;             // 'localhost', '0.0.0.0', etc.
  domain?: string;           // for https
  root?: string;             // static root, default '.'
  fallbackRoot?: string;     // for missing files in root
  basePath?: string;         // prefix all URLs
  index?: string;            // default 'index.html'
  https?: boolean;           // enable HTTPS
  open?: boolean;            // open browser on start
  watch?: string[];          // HMR watch patterns
  ignore?: string[];         // HMR ignore patterns
  serverWatch?: boolean | string[];   // server-side HMR (see below)
  logging?: boolean;
  blockFiles?: string[];     // SSRF protection patterns (see below)
  resolve?: ResolveConfig;
  env?: Record<string, string>;

  // Server-side handlers
  api?: Router;              // top-level ServerRouter
  ws?: WebSocketEndpointConfig[];
  smtp?: ElitSMTPServerConfig | ElitSMTPServerConfig[];
  proxy?: ProxyConfig[];
  worker?: WorkerConfig[];
  ssr?: () => Child | string;

  // Multi-client (one port, multiple apps)
  clients?: ClientConfig[];

  mode?: 'dev' | 'preview';
}
```

## ClientConfig (multi-client)

```ts
interface ClientConfig {
  root: string;
  fallbackRoot?: string;
  basePath: string;          // '' for default, '/admin' for sub-paths
  index?: string;
  ssr?: () => Child | string;
  watch?: string[];
  ignore?: string[];
  proxy?: ProxyConfig[];
  worker?: WorkerConfig[];
  api?: Router;              // routes auto-prefixed with basePath
  ws?: WebSocketEndpointConfig[];   // paths auto-prefixed with basePath
  smtp?: ElitSMTPServerConfig | ElitSMTPServerConfig[]; // NOT basePath-prefixed
  mode?: 'dev' | 'preview';
}
```

### Multi-client example

```ts
dev: {
  port: 3003,
  clients: [
    { root: '.', basePath: '', ssr: () => client, api: server },
    { root: './admin', basePath: '/admin', ssr: () => adminClient, api: adminServer }
  ]
}
```

## serverWatch — Server-Side HMR

Behavior modes:

```ts
dev: {
  serverWatch: true,                                  // default — dep-graph discovery
  serverWatch: ['src/server/**/*', 'shared/**/*'],   // explicit globs
  serverWatch: false,                                  // off
}
```

- `true` (default) — walks the dep graph from server entries discovered in `elit.config.ts`. Honors `resolve.alias`.
- `false` — no server HMR.
- `string[]` — skips graph discovery, watches exact patterns.

CLI override: `elit dev --no-server-watch`.

**Graph rules:** static `import`/`require()` followed; dynamic `import()` is NOT. CSS/JSON/assets skipped. Capped at 5000 files.

## blockFiles — SSRF Protection

Default patterns (applied when not explicitly set):

```
.env, .env.*, *.pem, *.key, *.p12, *.pfx, .git/**, .htaccess,
docker-compose.yml, docker-compose.yaml, Dockerfile
```

Override (replaces defaults):

```ts
dev: {
  root: '.',
  blockFiles: ['.env', '.env.*', '*.key', 'secrets/**'],
}

// disable entirely (NOT recommended in production)
dev: { blockFiles: [] }
```

Patterns support `*` (non-slash chars), `**` (any depth), `?` (single char). Matching requests get `403 Forbidden`.

## Resolve Alias

```ts
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  // per-target extensions
  build: {
    resolve: { alias: { '@shared': './shared' } }   // adds @shared for build only
  }
});
```

- Top-level alias inherited by dev/preview/build.
- Per-target alias extends it (target wins on conflicts).
- Longest key wins (`@app` checked before `@`).
- Alias matches only at specifier start, followed by `/` or whole-specifier match.
- Bare `node_modules` imports pass through untouched.

## WebSocketEndpointConfig

```ts
interface WebSocketEndpointConfig {
  path: string;
  handler: (ctx: {
    ws: WebSocket;
    req: IncomingMessage;
    path: string;
    query: Record<string, string>;
    headers: IncomingHttpHeaders;
  }) => void | Promise<void>;
}
```

- Matching is exact on the pathname (query doesn't affect matching).
- `clients[].ws[].path` is auto-prefixed with `basePath`.
- `/__elit_ws` is reserved — never use it.

```ts
dev: {
  ws: [{
    path: '/ws',
    handler: ({ ws, req, query }) => {
      ws.on('message', msg => ws.send(msg.toString()));
    }
  }]
}
```

## ElitSMTPServerConfig

See `smtp-server.md` for full shape. In `dev.smtp` / `preview.smtp` / `clients[].smtp`:

```ts
dev: {
  smtp: {
    port: 2525,
    host: '127.0.0.1',
    authMethod: 'PLAIN',
    onAuth(auth, session, callback) { /* ... */ },
    onData(stream, session, callback) { /* ... */ }
  }
}
```

Defaults: `port: 2525`, `host: '127.0.0.1'`. Duplicate `host:port` bindings are rejected.

## ProxyConfig

Forward requests to a backend.

```ts
dev: {
  proxy: [{
    path: '/api',                          // match prefix
    target: 'http://localhost:8080',       // backend URL
    changeOrigin?: boolean,
    rewrite?: (path: string) => string,
    headers?: Record<string, string>
  }]
}
```

## WorkerConfig

Register a worker script.

```ts
dev: {
  worker: [{
    path: '/worker.js',
    script: './src/worker.ts'
  }]
}
```

## PreviewOptions

Same shape as `DevServerOptions` except:
- No `watch`, `ignore`, `serverWatch` (no HMR in preview).
- Adds `standalone?: boolean`, `outFile?: string` for self-contained preview bundles.

Preview is **not** static-file-only — it supports `clients`, `api`, `ws`, `proxy`, `worker`, and `ssr` with the same shape as dev. Run the production server with the same handlers as dev.

## ResolveConfig

```ts
interface ResolveConfig {
  alias?: Record<string, string>;
}
```

## Environment Loading

`loadEnv(mode, cwd)` loads environment files in this order:

1. `.env.{mode}.local`
2. `.env.{mode}`
3. `.env.local`
4. `.env`

Only `VITE_`-prefixed variables are injected into client bundles. Everything else is server-only.

```ts
// browser code
import.meta.env.VITE_API_URL;

// server code (elit.config.ts, src/server.ts)
process.env.DATABASE_URL;
```

## Gotchas

- **Forgetting `defineConfig`** — typos in section names silently ignored. Always wrap.
- **`clients[].smtp` is NOT basePath-prefixed** — unlike `clients[].api` and `clients[].ws[]`.
- **`serverWatch: ['wrong/**']`** — server changes won't HMR; verify the glob matches actual paths.
- **`blockFiles: []` in production** — disables SSRF protection. Don't.
- **Per-target `resolve.alias` drops keys** — extending overrides per-key, not merge-all. Re-declare keys you want to keep.
- **Multiple SMTP listeners on same `host:port`** — Elit rejects with a duplicate-binding error.
- **HTTPS without `domain`** — some browsers reject the cert.
- **`process.env.X` in browser code** — undefined. Use `VITE_X` and `import.meta.env.VITE_X`.
