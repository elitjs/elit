---
name: elit-server-app
description: 'Work on server behavior in this Elit app — API routes, middleware, ServerRouter handlers, auth, SSE/WebSocket endpoints, or `elit/database` schemas and queries. Use when editing `src/server.ts`, `src/server/`, `databases/`, or any `/api/...` route.'
argument-hint: 'Describe the endpoint, handler, middleware, or database change.'
user-invocable: true
---

# Elit Server App

Use this skill when the task belongs to the backend: HTTP route handlers, middleware, authentication, WebSocket / SSE endpoints, or database access.

## Route The Task First

1. Routes & middleware → `src/server.ts` (single-file) or `src/server/` (split)
2. Database schemas → `databases/<name>.ts`
3. Server config wiring → `elit.config.ts` (`dev.api`, `dev.clients[].api`, `preview.api`, `dev.ws`, `dev.smtp`)
4. Multi-client API → `dev.clients[].api` (each client's routes are prefixed by its `basePath`)

## Public API Surface

- `elit/server` — `ServerRouter`, `ElitRequest`, `ElitResponse`, plus `elit/http`, `elit/https`, `elit/ws`, `elit/wss`, `elit/smtp-server` for transport-specific entrypoints.
- `elit/database` — `Database` class for code-stored collections.

Do NOT import from `elit/el`, `elit/state`, or other browser surfaces in server files — they pull browser-only code into the server bundle.

## ServerRouter Pattern

```ts
// src/server.ts
import { ElitRequest, ElitResponse, ServerRouter } from 'elit/server';
import { Database } from 'elit/database';
import { resolve } from 'path';

export const router = new ServerRouter();

const db = new Database({
  dir: resolve(process.cwd(), 'databases'),
  language: 'ts'
});

// GET /api/hello
router.get('/api/hello', async (req: ElitRequest, res: ElitResponse) => {
  res.setHeader('Content-Type', 'text/html; charset=UTF-8');
  res.send('Hello from Elit ServerRouter!');
});

// POST /api/users
router.post('/api/users', async (req, res) => {
  const { name, email } = req.body ?? {};
  if (!name || !email) {
    return res.status(400).json({ error: 'name and email required' });
  }
  // ... persist
  res.status(201).json({ id: '...', name, email });
});
```

`router` is then wired into `elit.config.ts`:

```ts
// elit.config.ts
import { server } from './src/server';

export default {
  dev: { api: server, /* ... */ }
};
```

## Handler Conventions

- **Read body:** `req.body` (parsed JSON or raw depending on Content-Type).
- **Read query/params:** `req.query`, route params via the route pattern (`/api/users/:id`).
- **Set status + body:** `res.status(201).json({...})`, `res.send('text')`, `res.html('<h1>...</h1>')`.
- **Headers:** `res.setHeader(name, value)` before sending the body.
- **Streaming (SSE):** `res.setHeader('Content-Type', 'text/event-stream')`, then `res.write('data: ...\n\n')` per event. Keep a `Set<res>` to broadcast.
- **Cookies:** set via `res.setHeader('Set-Cookie', ...)`. Read via `req.headers.cookie`.
- **Always `return res...`** in async handlers — the framework waits on the returned promise.

## Auth Patterns

Password hashing — copy this pattern verbatim (Node `crypto`, no external deps):

```ts
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

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

- Use `scrypt` (not bcrypt/argon2) to avoid native module install issues on Windows/mobile targets.
- Always compare with `timingSafeEqual` — never `===` for hashes.
- Salt is per-user, stored alongside the hash.
- Sessions: pick in-memory (single-instance) or DB-backed (multi-instance). The framework does not prescribe a session store.

## Database (`elit/database`)

```ts
// databases/users.ts — schema lives here
// The Database class loads *.ts files under dir, each defining a collection.
```

```ts
// src/server.ts
const db = new Database({
  dir: resolve(process.cwd(), 'databases'),
  language: 'ts'
});

// Insert / query via db.execute(...)
// See elit/database docs for the full query syntax
```

- Schemas go under `databases/` — one `.ts` file per collection.
- Initialize `Database` once per process, not per request.
- Resolve `dir` against `process.cwd()` so dev and built server agree.

## SSE (Server-Sent Events)

```ts
const clients = new Map<string, Set<any>>();

router.get('/api/events/:room', async (req, res) => {
  const { room } = req.params;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  if (!clients.has(room)) clients.set(room, new Set());
  clients.get(room)!.add(res);

  req.on('close', () => clients.get(room)?.delete(res));
});

function broadcast(room: string, data: unknown) {
  clients.get(room)?.forEach(res => {
    try { res.write(`data: ${JSON.stringify(data)}\n\n`); }
    catch { clients.get(room)?.delete(res); }
  });
}
```

## WebSocket

WebSocket endpoints are configured in `elit.config.ts`, not in `ServerRouter`:

```ts
// elit.config.ts
export default {
  dev: {
    ws: [{
      path: '/ws',
      handler: ({ ws, req, query, headers }) => {
        ws.on('message', msg => { /* ... */ });
      }
    }]
  }
};
```

Multi-client setup auto-prefixes `ws[].path` with `basePath`.

## Middleware

```ts
router.use((req, res, next) => {
  // auth, logging, CORS, etc.
  if (!req.headers.authorization && !req.path.startsWith('/api/auth/')) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
});
```

`next()` continues the chain; returning a response short-circuits.

## High-Risk Areas

- **Forgetting `return res...` in async handlers** — request hangs.
- **`===` comparison for password hashes** — timing attack. Use `timingSafeEqual`.
- **Database initialized per-request** — connection leak / perf cliff.
- **SSE without `req.on('close')` cleanup** — client set grows forever.
- **Mutating `req.body` directly across handlers** — surprising downstream behavior. Clone if you need to alter.
- **Importing browser modules (`elit/el`, `elit/state`) in server files** — build fails or runtime crashes.
- **CORS preflight (`OPTIONS`) not handled** — browser requests fail silently. Add an `OPTIONS` handler or a CORS middleware.

## SSRF / File-Safety Defaults

`dev.blockFiles` / `preview.blockFiles` default to blocking `.env`, `*.key`, `*.pem`, `.git/**`, etc. Override in `elit.config.ts` only when you understand the exposure. Never serve `databases/` or server source over HTTP.

## Validation

1. `npm run typecheck` — server files included.
2. `npm run dev` — exercise endpoints with `curl` or Postman:
   ```bash
   curl -X POST http://localhost:3003/api/auth/register \
     -H 'Content-Type: application/json' \
     -d '{"name":"Test","email":"t@t.t","password":"123456"}'
   ```
3. Server-side HMR auto-restarts on `src/server*` edits — watch the dev console for `[Server HMR] ... restarting...`.
4. `npm run build` then `npm run preview` — confirm the production server bundle behaves the same as dev.

## Useful Anchors

- Route definitions: `src/server.ts` (search for `router.<method>`)
- DB initialization: top of `src/server.ts`
- Auth helpers: `src/server.ts` (search for `hashPassword` / `verifyPassword`)
- Wiring to config: `elit.config.ts` → `dev.api` / `dev.clients[].api`
- WS config: `elit.config.ts` → `dev.ws`

## References

**Detailed API references (next to this skill file):**
- `references/server.md` — `ServerRouter` (`get`/`post`/`put`/`patch`/`delete`/`use`/`all`), `ElitRequest`/`ElitResponse`, built-in middleware (`cors`, `logger`, `rateLimit`, `bodyLimit`, `compress`, `security`, `errorHandler`), SSE pattern, scrypt auth code
- `references/database.md` — `Database` class (`dir`, `language`, `registerModules`), `db.execute(code)`, `db.create/read/save/update/remove/rename/register`, collection file pattern, injection-safe JSON-encoded arguments
- `references/http.md` — `createServer`, `IncomingMessage`/`ServerResponse`, `get`/`request` client helpers, cross-runtime support
- `references/ws.md` — `WebSocket` client, `WebSocketServer`, `createWebSocketServer`, `ReadyState`, `CLOSE_CODES`, `dev.ws[]` integration, auto-reconnect pattern
- `references/smtp-server.md` — `createSmtpServer`, `startSmtpServer`, `ElitSMTPServerConfig`, auth handlers (`PLAIN`/`LOGIN`), `onData` body handler, `dev.smtp` integration

Read these before writing code in unfamiliar areas — they have signatures, examples, and gotchas for every public API.

**In this project (concrete examples to copy from):**
- `src/server.ts` — `new ServerRouter()`, route definitions, middleware order, `Database` init
- `databases/users.ts` — single-collection schema pattern (one `.ts` per collection under `databases/`)
- `elit.config.ts` — search `dev.api` / `dev.clients[].api` to see how the router is wired; search `dev.ws` for WebSocket endpoint config; search `dev.smtp` for SMTP listeners
- `.env` — only readable in server code via `process.env.X`; never in browser code

**Installed type definitions (ground-truth API when docs are ambiguous):**
- `node_modules/elit/dist/server.d.ts` — `ServerRouter`, `ElitRequest`, `ElitResponse`, middleware signatures
- `node_modules/elit/dist/database.d.ts` — `Database` constructor and query methods
- `node_modules/elit/dist/http.d.ts`, `https.d.ts`, `ws.d.ts`, `wss.d.ts`, `smtp-server.d.ts` — transport-specific entrypoints
- `node_modules/elit/dist/index.d.ts` — umbrella re-exports

**External docs:**
- Server docs (`ServerRouter`, middleware, shared state, WS): https://d-osc.github.io/elit/server.md
- Low-level transport docs (`http.md`, `ws.md`, `fs.md`, `path.md`, `mime-types.md`): https://d-osc.github.io/elit/API.md
- Config reference (`dev.api`, `dev.ws`, `dev.smtp`, `dev.blockFiles`, `preview.api`): https://d-osc.github.io/elit/CONFIG.md
- CLI reference (`elit dev --no-server-watch`): https://d-osc.github.io/elit/CLI.md
- GitHub repo (browse `src/server/` for framework source): https://github.com/d-osc/elit

**Related skills:**
- `elit-client-app` — when wiring the client side of an `/api/...` route (fetch calls, error handling, loading state)
- `elit-runtime-app` — when adding WebSocket endpoints (`dev.ws[].path`), SMTP listeners (`dev.smtp`), changing `blockFiles`, or running `preview` with the same `api` shape as `dev`
