# elit/ws & elit/wss — WebSocket Client and Server

`elit/ws` provides WebSocket client + server classes. `elit/wss` adds TLS support. Both re-export the `ws` package's API.

For WebSocket **endpoints in dev/preview**, prefer configuring them in `elit.config.ts` via `dev.ws[]` — the framework binds them to the same HTTP server. Use `elit/ws` directly only for **standalone** servers or **outbound client** connections.

## WebSocket Client

### `new WebSocket(url, protocols?)`

```ts
import { WebSocket } from 'elit/ws';

const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
  ws.send('hello server');
});

ws.on('message', (data, isBinary) => {
  console.log('received:', isBinary ? data : data.toString());
});

ws.on('close', (code, reason) => {
  console.log(`closed ${code}: ${reason}`);
});

ws.on('error', (err) => console.error(err));
```

For secure WebSockets use `wss://`:

```ts
import { WebSocket } from 'elit/wss';
const ws = new WebSocket('wss://example.com/socket');
```

### Properties

```ts
ws.readyState      // ReadyState: CONNECTING=0, OPEN=1, CLOSING=2, CLOSED=3
ws.url             // string
ws.protocol        // selected subprotocol
ws.binaryType      // 'blob' | 'arraybuffer' | 'nodebuffer'
ws.bufferedAmount  // bytes queued for send
```

### Methods

```ts
ws.send(data: string | Buffer | ArrayBuffer, options?, callback?);
ws.close(code?: number, reason?: string | Buffer);
ws.terminate();    // immediate kill, no close frame
ws.ping(data?);
ws.pong(data?);
```

### Constants

```ts
import { ReadyState, CLOSE_CODES } from 'elit/ws';

// ReadyState: { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 }
// CLOSE_CODES: { NORMAL: 1000, GOING_AWAY: 1001, ... }
```

## WebSocket Server

### `new WebSocketServer(options)`

```ts
import { WebSocketServer } from 'elit/ws';

const wss = new WebSocketServer({
  port: 8080,
  path: '/ws',
  // OR attach to existing HTTP server:
  // server: existingHttpServer,
  // path: '/ws',
});

wss.on('connection', (ws, req) => {
  console.log('client connected from', req.socket.remoteAddress);

  ws.on('message', (data, isBinary) => {
    ws.send(`echo: ${data}`, { binary: isBinary });
  });

  ws.on('close', () => console.log('client gone'));
  ws.on('error', err => console.error(err));
});

wss.on('error', err => console.error(err));
wss.on('close', () => console.log('server closed'));
```

**Options:**
- `port?: number` — bind to a new port.
- `server?: Server` — attach to existing HTTP/HTTPS server (recommended — share the port with your routes).
- `path?: string` — only accept connections on this path.
- `clientTracking?: boolean` — populate `wss.clients` (default `true`).
- `maxPayload?: number` — max message size in bytes.

### Server properties

```ts
wss.clients      // Set<WebSocket> — all connected clients (if clientTracking: true)
wss.path         // configured path
wss.options      // normalized options
```

### Server methods

```ts
wss.close(callback?);                    // stop listening
wss.handleUpgrade(req, socket, head, cb); // manual upgrade (advanced)
wss.shouldHandle(req);                    // boolean — should we accept this request?
wss.broadcast(data);                      // send to all clients (helper, not standard)
```

### Broadcasting

```ts
wss.clients.forEach(client => {
  if (client.readyState === 1) {  // OPEN
    client.send('broadcast message');
  }
});
```

### `createWebSocketServer(options, callback?)`
Factory shortcut.

```ts
import { createWebSocketServer } from 'elit/ws';

const wss = createWebSocketServer({ port: 8080 }, () => {
  console.log('ws server ready');
});
```

## Integration with elit.config.ts

For most apps, **don't** instantiate `WebSocketServer` manually — use `dev.ws[]`:

```ts
// elit.config.ts
export default {
  dev: {
    port: 3003,
    ws: [{
      path: '/ws',
      handler: ({ ws, req, query, headers }) => {
        ws.on('message', msg => ws.send(msg.toString()));
      }
    }]
  }
};
```

The framework:
1. Attaches the WS endpoint to the same HTTP server as your routes.
2. Auto-prefixes `path` with each client's `basePath` in multi-client setup.
3. Reserves `/__elit_ws` for internal HMR/state socket — never use that path.

The handler context object:
- `ws: WebSocket` — the new connection
- `req: IncomingMessage` — the HTTP upgrade request
- `path: string` — the matched pathname
- `query: Record<string, string>` — parsed query string
- `headers: IncomingHttpHeaders` — request headers

## Client Pattern: Auto-Reconnect

```ts
function connect() {
  const ws = new WebSocket('ws://localhost:3003/ws');
  ws.on('open', () => console.log('connected'));
  ws.on('close', () => {
    console.log('reconnecting in 1s');
    setTimeout(connect, 1000);
  });
  ws.on('error', () => ws.terminate());
  return ws;
}
connect();
```

## Gotchas

- **`ws.send()` on a non-OPEN socket throws** — always check `ws.readyState === 1` first or wrap in try/catch.
- **`isBinary` flag on messages** — `ws.on('message', (data, isBinary) => ...)`. If false, `data` is a Buffer of UTF-8 text. If true, treat as opaque bytes.
- **Server without `clientTracking: true`** — `wss.clients` is undefined.
- **Multiple WS endpoints on same path** — silent conflict. Each path must be unique per HTTP server.
- **`/__elit_ws` is reserved** — Elit's internal HMR + shared-state socket. Don't configure it for app use.
- **Memory leaks in broadcast** — always filter by `readyState === 1` (OPEN). Closed sockets linger in `wss.clients` for a tick.
- **Multi-client `ws[].path`** — auto-prefixed with `basePath`. A client connects to `/<basePath>/<path>`.
