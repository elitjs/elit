---
name: elit-server
description: 'Build HTTP routes, WebSocket endpoints, middleware, and dev/preview servers with @elitjs/server. Use when adding ServerRouter routes, WS handlers, middleware like cors/logger/rateLimit, or wiring createDevServer/preview options.'
argument-hint: 'Describe the route, WS endpoint, middleware, or server config to add.'
user-invocable: true
---

# Elit.js Server

Use this skill when the task touches the backend: HTTP routes, WebSocket endpoints, middleware, dev/preview server config, or shared server state.

## What Matters First

- Routes live on `ServerRouter` from `@elitjs/server`. Use `api.get/post/put/patch/delete(path, handler)` and `api.use(middleware)`.
- Handlers may be `async (ctx) => { ... }` (Elit-style) or `async (req, res) => { ... }` (Express-style). Mixing inside one router is fine.
- The dev server is created with `createDevServer(options)` from `@elitjs/server`. The same options shape is mirrored in `elit.config.*` under `dev`.
- WebSocket endpoints are declared declaratively — no socket.io, no manual upgrade handling.

## Imports

- `@elitjs/server` — `ServerRouter`, `createDevServer`, `cors`, `logger`, `rateLimit`, `compress`, `security`, `StateManager`.

## Patterns

### HTTP routes

```ts
import { ServerRouter, cors, logger } from '@elitjs/server';

export const api = new ServerRouter();
api.use(cors());
api.use(logger());

api.get('/api/hello', async (ctx) => {
    ctx.res.json({ message: 'Hello from Elit.js' });
});

api.post('/api/echo', async (ctx) => {
    ctx.res.json({ body: ctx.body });
});
```

### Route params and query

```ts
api.get('/api/posts/:id', async (ctx) => {
    const id = ctx.params.id;
    const expand = ctx.query.expand;
    ctx.res.json({ id, expand });
});
```

### Middleware with prefix

```ts
api.use('/api', authMiddleware);
api.use('/api/admin', adminOnly);
```

### WebSocket endpoint

Server (`dev.ws` or `preview.ws` in `elit.config.*`):

```ts
import { createDevServer } from '@elitjs/server';

const server = createDevServer({
    root: '.',
    open: false,
    ws: [
        {
            path: '/ws',
            handler: ({ ws, query }) => {
                ws.send(JSON.stringify({ type: 'connected', room: query.room || 'general' }));
                ws.on('message', (message) => ws.send(message.toString()));
            },
        },
    ],
});
```

Client:

```ts
const socket = new WebSocket(`ws://${location.host}/ws?room=general`);
socket.addEventListener('message', (event) => console.log(event.data));
socket.send('hello');
```

### Shared state between client and server

Server:

```ts
const counter = server.state.create('counter', { initial: 0 });
counter.value = 10;
```

Client:

```ts
import { createSharedState } from '@elitjs/state';
const counter = createSharedState('counter', 0);
counter.value++;  // syncs to server
```

## Config wiring

`elit.config.ts` exposes the same knobs:

```ts
export default {
    dev: {
        port: 3000,
        host: '0.0.0.0',
        open: false,
        clients: [
            {
                root: '.',
                basePath: '',
                ssr: () => documentShell,
                api,                              // the ServerRouter instance
                ws: [{ path: '/ws', handler: ({ ws }) => { /* ... */ } }],
            },
        ],
    },
    preview: { root: './dist', port: 4173 },
};
```

## Rules

- Use `elit/server` (not `elit-server`) in app code.
- Don't reuse `/__elit_ws` for your own WS endpoints — Elit reserves it for HMR and shared-state traffic.
- `dev.ws` and `preview.ws` register global endpoints. Use `clients[].ws` when each client should expose its own endpoint under its `basePath`.
- For SSR, export a document shell (VNode tree from `@elitjs/el` factories like `html`, `head`, `body`, `title`, `meta`, `script`) and return it from `dev.clients[].ssr`.
- Only `VITE_`-prefixed env variables are injected into client bundles. Server code reads `process.env` directly.

## Anti-Patterns

- Spawning a separate HTTP server with `node:http` when `createDevServer` already provides one. Compose via `ServerRouter` and middleware instead.
- Polling for state sync. Use `createSharedState` over the built-in WS channel.
- Importing server-side modules into client bundles. Keep `@elitjs/server`, `@elitjs/database`, `@elitjs/fs` out of `src/main.ts` and friends.

## Validation

- `npx elit dev` starts the dev server. Hit endpoints with `curl` or the browser.
- For WS, use `websocat ws://localhost:3000/ws` or the browser console.
- For production, `npx elit build && npx elit preview` to test the preview server shape.
