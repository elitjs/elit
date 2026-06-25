# elit/server — ServerRouter, Request/Response, Middleware

`ServerRouter` is an Express-like HTTP router. Wire it into `elit.config.ts` via `dev.api` or `dev.clients[].api`.

## ServerRouter

```ts
import { ServerRouter } from 'elit/server';

export const router = new ServerRouter();
```

### HTTP method handlers

Every method has the same signature: `(path: string, handler: RouteHandler) => this`.

```ts
router.get('/api/health', (ctx) => {
  ctx.res.json({ ok: true });
});

router.post('/api/users', async (ctx) => {
  const { name } = ctx.req.body ?? {};
  // ...
  return ctx.res.status(201).json({ id: 1, name });
});

router.put('/api/users/:id', updateUser);
router.patch('/api/users/:id', patchUser);
router.delete('/api/users/:id', deleteUser);
router.options('/api/users', corsPreflight);
router.head('/api/users', headersOnly);

router.all('/api/echo', echoHandler);  // matches any method
```

**Methods:** `get`, `post`, `put`, `patch`, `delete`, `options`, `head`, `all`.

`this` is returned so calls chain (rarely useful — usually you `router.get(...); router.post(...);` as separate statements).

### Route patterns

Use `:param` for path segments. Values land in `ctx.req.params`.

```ts
router.get('/api/users/:userId/posts/:postId', (ctx) => {
  const { userId, postId } = ctx.req.params;
  // ...
});
```

Wildcards: `/api/*` matches everything below `/api/`.

### Handler context

```ts
type RouteHandler = (ctx: {
  req: ElitRequest;
  res: ElitResponse;
  params: Record<string, string>;
  query: Record<string, string>;
  body?: any;
}) => void | Promise<void>;
```

Returning a Promise makes the framework wait — always `return res...` in async handlers or the request hangs.

## ElitRequest

Extends Node's `IncomingMessage` (`http.IncomingMessage`).

```ts
interface ElitRequest extends IncomingMessage {
  body?: any;                              // auto-parsed: JSON, urlencoded, raw
  query?: Record<string, string>;          // from URL query string
  params?: Record<string, string>;         // from route pattern :params
  headers: IncomingHttpHeaders;            // standard Node headers
  method: string;                          // 'GET', 'POST', ...
  url: string;                             // full URL including query
  path: string;                            // path without query
}
```

### Reading the body

Elit auto-parses JSON and urlencoded bodies based on `Content-Type`:

```ts
router.post('/api/users', async (ctx) => {
  const body = ctx.req.body;              // already parsed
  // for application/json: object
  // for application/x-www-form-urlencoded: object
  // for other: Buffer or string
});
```

### Reading headers

```ts
router.get('/api/me', (ctx) => {
  const auth = ctx.req.headers.authorization;  // 'Bearer xyz...'
  const cookie = ctx.req.headers.cookie;        // 'sid=abc; theme=dark'
});
```

### Reading query

```ts
// GET /api/search?q=elit&page=2
router.get('/api/search', (ctx) => {
  const q = ctx.req.query.q;
  const page = Number(ctx.req.query.page ?? 1);
});
```

## ElitResponse

Extends Node's `ServerResponse`. Every helper returns `this` so calls chain.

```ts
interface ElitResponse extends ServerResponse {
  status(code: number): this;
  json(data: any, code?: number): this;
  send(data: string | Buffer): this;
  html(data: string): this;
  end(data?: any): this;
  setHeader(name: string, value: string | string[]): this;
  getHeader(name: string): string | string[] | undefined;
  removeHeader(name: string): this;
  redirect(url: string, code?: number): this;
}
```

### Examples

```ts
// chain
return ctx.res.status(201).json({ id: 1 });

// explicit header
router.get('/api/csv', (ctx) => {
  ctx.res.setHeader('Content-Type', 'text/csv');
  ctx.res.setHeader('Content-Disposition', 'attachment; filename="data.csv"');
  return ctx.res.send('a,b\n1,2\n');
});

// redirect
router.get('/old-path', (ctx) => ctx.res.redirect('/new-path', 301));

// SSE — see SSE section below
```

## Middleware

### `router.use(path?, handler)`
Mounts middleware. Matches `path` as a prefix (or all paths if omitted).

```ts
router.use((ctx, next) => {
  console.log(`${ctx.req.method} ${ctx.req.url}`);
  next();
});

router.use('/api', (ctx, next) => {
  if (!ctx.req.headers.authorization) {
    return ctx.res.status(401).json({ error: 'unauthorized' });
  }
  next();
});
```

**Calling `next()`** continues the chain. **Returning a response** short-circuits.

### Built-in middleware

Import directly from `elit/server`:

```ts
import { ServerRouter, cors, logger, errorHandler, rateLimit, bodyLimit, cacheControl, compress, security } from 'elit/server';

const router = new ServerRouter();
router.use(cors({ origin: 'https://example.com', credentials: true }));
router.use(logger({ format: 'tiny' }));
router.use(compress());
router.use(security());
router.use(rateLimit({ windowMs: 60000, max: 100 }));
router.use(bodyLimit({ max: '1mb' }));
router.use(cacheControl({ maxAge: 3600 }));
router.use(errorHandler());
```

| Middleware | Purpose |
|---|---|
| `cors(options?)` | CORS handling, auto-responds to preflight OPTIONS |
| `logger(options?)` | Request logging |
| `errorHandler()` | Catches thrown errors, returns 500 JSON |
| `rateLimit(options?)` | Per-IP request rate limiting |
| `bodyLimit(options?)` | Rejects oversized bodies |
| `cacheControl(options?)` | Sets `Cache-Control` header |
| `compress()` | gzip/deflate response compression |
| `security()` | Common security headers (CSP, X-Frame-Options, etc.) |

### Standalone response helpers

```ts
import { json, text, html, status } from 'elit/server';

// Use directly when you only have the raw res
json(ctx.res, { ok: true }, 201);
text(ctx.res, 'not found', 404);
html(ctx.res, '<h1>Hi</h1>');
```

## SSE (Server-Sent Events)

No special API — use `res.setHeader` + `res.write` directly.

```ts
const clients = new Map<string, Set<any>>();

router.get('/api/events/:room', (ctx) => {
  const { room } = ctx.params;
  ctx.res.setHeader('Content-Type', 'text/event-stream');
  ctx.res.setHeader('Cache-Control', 'no-cache');
  ctx.res.setHeader('Connection', 'keep-alive');

  if (!clients.has(room)) clients.set(room, new Set());
  clients.get(room)!.add(ctx.res);

  ctx.req.on('close', () => clients.get(room)?.delete(ctx.res));
});

function broadcast(room: string, data: unknown) {
  clients.get(room)?.forEach(res => {
    try { res.write(`data: ${JSON.stringify(data)}\n\n`); }
    catch { clients.get(room)?.delete(res); }
  });
}
```

**Always register `req.on('close', ...)`** to clean up — otherwise the Set grows forever.

## Auth Pattern (scrypt + timingSafeEqual)

Elit ships no auth helper — use Node's `crypto` directly. This pattern avoids native module install issues:

```ts
import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
  return `${salt}.${derivedKey.toString('hex')}`;
}

async function verifyPassword(storedHash: string, suppliedPassword: string): Promise<boolean> {
  const [salt, key] = storedHash.split('.');
  const derivedKey = await scryptAsync(suppliedPassword, salt, 64) as Buffer;
  const keyBuffer = Buffer.from(key, 'hex');
  return timingSafeEqual(derivedKey, keyBuffer);
}
```

**Never compare hashes with `===`** — timing attack. Always `timingSafeEqual`.

## Wiring into elit.config.ts

Single-client:
```ts
// elit.config.ts
import { server } from './src/server';
export default {
  dev: { port: 3003, api: server }
};
```

Multi-client (each client's routes auto-prefixed with `basePath`):
```ts
export default {
  dev: {
    port: 3003,
    clients: [
      { root: '.', basePath: '/app', api: server }
    ]
  }
};
```

Preview mode uses the same shape — `preview.api` runs the production server.

## Gotchas

- **Forgetting `return res...`** in async handlers — request hangs. Make it a habit: every async handler returns `res`.
- **`===` for password hashes** — timing attack.
- **Mutating `ctx.req.body` across handlers** — downstream middleware sees the modified body. Clone if you need to alter.
- **CORS preflight (`OPTIONS`) unhandled** — browser requests fail silently. Either add `router.options(...)` handlers or use the `cors()` middleware.
- **`router.use('/api', handler)` is prefix-match** — a path `/api-v2/foo` would also match. Use exact paths or trailing slashes carefully.
- **WebSocket endpoints don't go in ServerRouter** — configure them via `dev.ws[]` in `elit.config.ts` (see `elit-runtime-app/references/config.md`).
