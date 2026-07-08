---
name: elit-ref-server
description: 'API reference for @elitjs/server: createDevServer, ServerRouter, json/text/html/status responses, cors/logger/rateLimit/compress/security/bodyLimit/errorHandler middleware, createProxyHandler, StateManager, SharedState, import-map helpers, and all related types (ServerRouteContext, Middleware, DevServerOptions, ClientConfig, PreviewOptions, WebSocketEndpointConfig, ProxyConfig, HMRMessage). Use for exact signatures when building HTTP/WS/SMTP backends.'
argument-hint: 'Describe the route, middleware, WS endpoint, SMTP server, or dev-server option to wire up.'
user-invocable: true
---

# @elitjs/server Reference

HTTP router, dev/preview server, middleware, response helpers, WebSocket endpoints, SMTP, and shared state. Cross-runtime (Node/Bun/Deno) with built-in transpilation and HMR.

## Exports

```ts
// server factory
export function createDevServer(options?: DevServerOptions): DevServer;

// router
export class ServerRouter { /* see below */ }

// response helpers
export function json(res: ServerResponse, data: any, status?: number): void;
export function text(res: ServerResponse, data: string, status?: number): void;
export function html(res: ServerResponse, data: string, status?: number): void;
export function status(res: ServerResponse, code: number, message?: string): void;
export function sendError(res: ServerResponse, code: number, msg: string): void;
export function send404(res: ServerResponse, msg?: string): void;
export function send403(res: ServerResponse, msg?: string): void;
export function send500(res: ServerResponse, msg?: string): void;

// middleware
export function cors(options?: CorsOptions): Middleware;
export function logger(options?: { format?: 'simple' | 'detailed' }): Middleware;
export function errorHandler(): Middleware;
export function rateLimit(options?: RateLimitOptions): Middleware;
export function bodyLimit(options?: { limit?: number }): Middleware;
export function cacheControl(...): Middleware;
export function compress(...): Middleware;
export function security(...): Middleware;

// proxy
export function createProxyHandler(config: ProxyConfig): (req, res) => void;

// import map
export function createImportMap(rootDir: string, basePath?: string): Promise<string>;
export function clearImportMapCache(): void;

// shared state
export class StateManager { /* see below */ }
export class SharedState<T> { /* see below */ }
```

## Type reference

```ts
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD' | 'ALL';

interface ServerRouteContext {
  req: ElitRequest;            // IncomingMessage
  res: ElitResponse;           // ServerResponse
  params: Record<string, string>;
  query: Record<string, string>;
  body: any;                   // parsed JSON body (when content-type is JSON)
  headers: Record<string, string | string[] | undefined>;
  user?: any;
}

type ServerRouteHandler = (
  ctx: ServerRouteContext,
  next?: () => Promise<void>
) => void | Promise<void>;

type Middleware = (
  ctx: ServerRouteContext,
  next: () => Promise<void>
) => void | Promise<void>;
```

### ServerRouter methods

```ts
class ServerRouter {
  use(...args: Array<any>): this;                    // use(mw) or use('/prefix', mw)
  all(path: string, ...handlers: Array<Middleware | ServerRouteHandler>): this;
  get(path: string, ...handlers: Array<Middleware | ServerRouteHandler>): this;
  post(path: string, ...handlers: Array<Middleware | ServerRouteHandler>): this;
  put(path: string, ...handlers: Array<Middleware | ServerRouteHandler>): this;
  delete(path: string, ...handlers: Array<Middleware | ServerRouteHandler>): this;
  patch(path: string, ...handlers: Array<Middleware | ServerRouteHandler>): this;
  options(path: string, ...handlers: Array<Middleware | ServerRouteHandler>): this;
  head(path: string, ...handlers: Array<Middleware | ServerRouteHandler>): this;
  listRoutes(): Array<{ method: string; pattern: string; paramNames: string[]; handler: string }>;
  handle(req: IncomingMessage, res: ServerResponse): Promise<boolean>;
}
```

### Middleware option types

```ts
interface CorsOptions {
  origin?: string | string[];          // default '*'
  methods?: string[];                  // default GET/POST/PUT/DELETE/PATCH/OPTIONS
  credentials?: boolean;               // default true
  maxAge?: number;                     // default 86400
}

interface RateLimitOptions {
  windowMs?: number;                   // default 60000
  max?: number;                        // default 100
  message?: string;                    // default 'Too many requests'
}
```

### createDevServer options

```ts
interface DevServerOptions {
  port?: number;
  host?: string;
  domain?: string;
  root?: string;
  fallbackRoot?: string;
  basePath?: string;
  index?: string;
  clients?: ClientConfig[];            // per-root client configs
  https?: boolean;
  open?: boolean;
  watch?: string[];
  ignore?: string[];
  serverWatch?: boolean | string[];    // server-side HMR
  worker?: WorkerConfig[];
  logging?: boolean;
  blockFiles?: string[];               // glob patterns to never serve
  resolve?: { alias?: Record<string, string> };
  api?: Router;                        // global API router
  ws?: WebSocketEndpointConfig[];      // global WS endpoints
  smtp?: ElitSMTPServerConfig | ElitSMTPServerConfig[];
  ssr?: () => Child | string;
  proxy?: ProxyConfig[];
  mode?: 'dev' | 'preview';
  env?: Record<string, string>;
  standalone?: boolean;
  outDir?: string;
  outFile?: string;
  historyApiFallback?: boolean;        // default true
}

interface ClientConfig {
  root: string;
  fallbackRoot?: string;
  basePath: string;
  index?: string;
  historyApiFallback?: boolean;
  ssr?: () => Child | string;
  watch?: string[];
  ignore?: string[];
  proxy?: ProxyConfig[];
  worker?: WorkerConfig[];
  api?: Router;
  ws?: WebSocketEndpointConfig[];
  smtp?: ElitSMTPServerConfig | ElitSMTPServerConfig[];
  mode?: 'dev' | 'preview';
}

interface DevServer {
  server: Server;                      // node:http Server
  wss: WebSocketServer;                // from ws
  smtpServers: ElitSMTPServerHandle[];
  url: string;
  state: StateManager;                 // shared state manager
  close(): Promise<void>;
}

interface PreviewOptions { /* same shape as DevServerOptions minus serverWatch/open */ }

interface WebSocketEndpointConfig {
  path: string;
  handler: (ctx: WebSocketEndpointContext) => void | Promise<void>;
}

interface WebSocketEndpointContext {
  ws: WebSocketConnection;
  req: WebSocketRequest;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string | string[] | undefined>;
}

interface ProxyConfig {
  context: string;
  target: string;
  changeOrigin?: boolean;
  pathRewrite?: Record<string, string>;
  headers?: Record<string, string>;
  ws?: boolean;
}

interface WorkerConfig {
  path: string;
  name?: string;
  type?: 'module' | 'classic';
}

interface HMRMessage {
  type: 'update' | 'reload' | 'error' | 'connected';
  path?: string;
  timestamp?: number;
  error?: string;
}
```

## Patterns

### HTTP routes with `ServerRouter`

```ts
import { ServerRouter, json, cors, logger } from '@elitjs/server';

export const router = new ServerRouter();
router.use(cors());
router.use(logger());
router.use(logger({ format: 'detailed' }));

router.get('/api/health', async (ctx) => {
  json(ctx.res, { ok: true, ts: Date.now() });
});

router.post('/api/echo', async (ctx) => {
  json(ctx.res, { youSent: ctx.body }, 201);
});

router.get('/api/users/:id', async (ctx) => {
  json(ctx.res, { id: ctx.params.id, q: ctx.query.q });
});
```

### Middleware with prefix

```ts
router.use(authMiddleware);            // global
router.use('/api', rateLimit({ max: 200, windowMs: 60_000 }));
router.use('/api/admin', adminOnly);   // nested prefix
```

### Multiple handlers per route

```ts
router.post('/api/upload',
  bodyLimit({ limit: 5 * 1024 * 1024 }),
  async (ctx) => { /* ... */ }
);
```

### Response helpers

```ts
json(ctx.res, data);                   // 200, Content-Type: application/json
json(ctx.res, data, 201);
text(ctx.res, 'plain string');         // text/plain
html(ctx.res, '<h1>hi</h1>');          // text/html
status(ctx.res, 204);                  // { status: 204, message: '' }
send404(ctx.res);
send403(ctx.res, 'Forbidden here');
```

### Dev server with SSR + API + WS

```ts
import { createDevServer } from '@elitjs/server';
import { client } from './src/client';
import { router as api } from './src/server';

const server = createDevServer({
  port: 3000,
  host: '0.0.0.0',
  open: false,
  logging: true,
  root: '.',
  outDir: './dev-dist',
  outFile: 'index.js',
  clients: [{
    root: '.',
    basePath: '',
    ssr: () => client,
    api
  }],
  ws: [{
    path: '/ws',
    handler: ({ ws, query }) => {
      ws.send(JSON.stringify({ room: query.room || 'general' }));
      ws.on('message', (msg) => ws.send(msg.toString()));
    }
  }]
});

server.state.create('counter', { initial: 0 });
```

### Shared state — server side

```ts
const counter = server.state.create('counter', { initial: 0 });
counter.value = 10;
counter.onChange((newValue, oldValue) => console.log(`${oldValue} → ${newValue}`));

const players = server.state.create<Player[]>('players', {
  initial: [],
  validate: (val) => Array.isArray(val)
});
```

### Global API/WS/SMTP at server level (not per-client)

```ts
const server = createDevServer({
  api,
  ws: [{ path: '/events', handler: ({ ws }) => { /* ... */ } }],
  smtp: [{ port: 2525, hostname: '0.0.0.0' }],
  proxy: [{ context: '/legacy', target: 'http://legacy.internal:8080', changeOrigin: true }]
});
```

### Proxy handler standalone

```ts
import { createProxyHandler } from '@elitjs/server';
const handler = createProxyHandler({
  context: '/api/legacy',
  target: 'http://legacy.internal:8080',
  changeOrigin: true,
  pathRewrite: { '^/api/legacy': '' }
});
```

### List registered routes (debugging)

```ts
console.log(router.listRoutes());
// [{ method: 'GET', pattern: '/api/users/:id', paramNames: ['id'], handler: 'function' }]
```

## Config wiring (`elit.config.ts`)

The same shape is mirrored in `elit.config.ts`:

```ts
import { server } from './src/server';
import { client } from './src/client';

export default {
  dev: {
    port: 3000,
    clients: [{
      root: '.',
      basePath: '',
      ssr: () => client,
      api: server,
      ws: [{ path: '/ws', handler: ({ ws }) => { /* ... */ } }]
    }]
  },
  preview: { root: './dist', port: 4173 },
};
```

## Rules

- Use `@elitjs/server` (not `elit/server`) in app code.
- Don't reuse `/__elit_ws` for your own WS endpoints — Elit reserves it for HMR and shared-state traffic. Use any other path.
- `dev.ws` and `preview.ws` register global endpoints. Use `clients[].ws` when each client should expose its own endpoint under its `basePath`.
- For SSR, export a document shell (VNode tree from `@elitjs/el` factories like `html`, `head`, `body`, `title`, `meta`, `script`) and return it from `dev.clients[].ssr`.
- Only `VITE_`-prefixed env variables are injected into client bundles. Server code reads `process.env` directly.
- The `body` field on `ServerRouteContext` is auto-parsed only when `Content-Type: application/json`. Read `ctx.req` for raw streams otherwise.
- `cors()` handles `OPTIONS` preflight by ending the response — place it before route handlers.
- `rateLimit` is keyed on `req.socket.remoteAddress` — fine for single-instance deploys, not for distributed ones.

## Anti-Patterns

- Spawning a separate `node:http` server when `createDevServer` already provides one. Compose via `ServerRouter` and middleware instead.
- Polling for state sync. Use `createSharedState` (client) + `server.state.create` (server) over the built-in WS channel.
- Importing server-side modules into client bundles. Keep `@elitjs/server`, `@elitjs/database`, `@elitjs/fs`, `node:*` out of `src/main.ts`, `src/web.ts`, and anything under `src/pages/` or `src/components/`.
- Calling `next()` zero times in middleware — the request hangs. Always call `next()` (or end the response) exactly once.
- Mutating `ctx.body`. It's the parsed body — write changes to your database, not back to the request.

## Validation

- `npx elit dev` starts the dev server. Hit endpoints with `curl` or the browser.
- For WS, use `websocat ws://localhost:3000/ws` or the browser console.
- `router.listRoutes()` prints all registered routes — useful for debugging order/prefix issues.
- For production, `npx elit build && npx elit preview` exercises the preview server shape.
