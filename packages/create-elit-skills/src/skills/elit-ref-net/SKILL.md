---
name: elit-ref-net
description: 'API reference for network packages: @elitjs/http (createServer, request, get, Server, IncomingMessage, ServerResponse, ClientRequest, Agent, METHODS, STATUS_CODES), @elitjs/https (same shape with TLS), @elitjs/ws (WebSocket, WebSocketServer, createWebSocketServer, ReadyState, CLOSE_CODES), @elitjs/wss (WSSClient, WSSServer, createWSSClient, createWSSServer), @elitjs/smtp-server (createSmtpServer, startSmtpServer, ElitSMTPServerConfig), @elitjs/mime-types (lookup, extension, contentType, charset, types, extensions). Use for exact signatures.'
argument-hint: 'Describe the HTTP/HTTPS server, client request, WebSocket endpoint, SMTP server, or MIME lookup.'
user-invocable: true
---

# Network Packages Reference

Cross-runtime (`node | bun | deno`) networking primitives. Same shape as Node built-ins so existing code works unchanged.

## @elitjs/http

```ts
function createServer(options?: ServerOptions): Server;
function request(options: RequestOptions): ClientRequest;
function get(url: string, options?: RequestOptions): ClientRequest;

class Server { /* node:http Server */ }
class IncomingMessage { /* Readable stream — the request */ }
class ServerResponse { /* Writable stream — the response */ }
class Agent { /* connection pooling */ }
class ClientRequest { /* Writable stream — the outgoing request */ }

const METHODS: string[];
const STATUS_CODES: Record<number, string>;

function getRuntime(): 'node' | 'bun' | 'deno';
```

### Patterns

```ts
import { createServer } from '@elitjs/http';

const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello');
});
server.listen(3000);
```

```ts
import { get } from '@elitjs/http';

get('http://example.com/api', { headers: { Accept: 'application/json' } })
  .on('response', (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => console.log(JSON.parse(body)));
  });
```

### Instance methods on `IncomingMessage`

- `method: string`
- `url: string`
- `headers: Record<string, string | string[] | undefined>`
- `socket: Socket`
- `on('data', (chunk) => {})`, `on('end', () => {})`, `on('error', (err) => {})`

### Instance methods on `ServerResponse`

- `writeHead(status: number, headers?: Record<string, string>): this`
- `setHeader(name: string, value: string | string[]): this`
- `getHeader(name: string): string | string[] | undefined`
- `removeHeader(name: string): this`
- `end(data?: string | Buffer): void`
- `write(data: string | Buffer): boolean`
- `statusCode: number`

## @elitjs/https

Same shape as `@elitjs/http` but with TLS:

```ts
function createServer(options: ServerOptions & { key: Buffer; cert: Buffer }): Server;
function request(options: RequestOptions): ClientRequest;
function get(url: string, options?: RequestOptions): ClientRequest;
```

The server requires `key` and `cert` options (TLS key/certificate in PEM format).

## @elitjs/ws

```ts
class WebSocket {
  readonly readyState: 0 | 1 | 2 | 3;       // CONNECTING | OPEN | CLOSING | CLOSED
  readonly binaryType: 'nodebuffer' | 'arraybuffer' | 'fragments';
  send(data: string | Buffer | ArrayBuffer, options?: SendOptions): void;
  ping(data?: any): void;
  pong(data?: any): void;
  close(code?: number, reason?: string | Buffer): void;
  terminate(): void;
  on(event: 'open' | 'message' | 'close' | 'error' | 'ping' | 'pong', listener: (...args) => void): this;
  addEventListener(type: string, listener: (...args) => void): void;
  removeEventListener(type: string, listener: (...args) => void): void;
}

class WebSocketServer {
  constructor(options?: ServerOptions);
  clients: Set<WebSocket>;
  on(event: 'connection' | 'close' | 'error' | 'listening', listener: (...args) => void): this;
  close(cb?: (err?: Error) => void): void;
  handleUpgrade(req, socket, head, cb): void;
  shouldHandle(req): boolean | Promise<boolean>;
}

function createWebSocketServer(options?: ServerOptions): WebSocketServer;

const ReadyState: { CONNECTING: 0; OPEN: 1; CLOSING: 2; CLOSED: 3 };
const CLOSE_CODES: Record<number, string>;

interface ServerOptions {
  port?: number;
  host?: string;
  server?: Server;                  // attach to existing HTTP server
  path?: string;
  noServer?: boolean;
  clientTracking?: boolean;
  verifyClient?: VerifyClientCallback;
}

interface SendOptions { compress?: boolean; binary?: boolean; mask?: boolean; fin?: boolean }
type Data = string | Buffer | ArrayBuffer | Buffer[];
type VerifyClientCallback = (info: { origin: string; secure: boolean; req: any }, cb: (res: boolean, code?: number, message?: string) => void) => void;

function getRuntime(): 'node' | 'bun' | 'deno';
```

### Patterns

```ts
import { createWebSocketServer, WebSocket } from '@elitjs/ws';

const wss = createWebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    ws.send(`echo: ${data.toString()}`);
  });
  ws.on('close', (code, reason) => {
    console.log('closed', code, reason?.toString());
  });
});
```

Client:

```ts
const ws = new WebSocket('ws://localhost:8080');
ws.on('open', () => ws.send('hello'));
ws.on('message', (data) => console.log(data.toString()));
ws.on('close', (code) => console.log('closed', code));
```

Attach to existing HTTP server:

```ts
import { createServer } from '@elitjs/http';
import { createWebSocketServer } from '@elitjs/ws';

const server = createServer((req, res) => { /* HTTP handling */ });
const wss = createWebSocketServer({ server, path: '/ws' });
server.listen(3000);
```

## @elitjs/wss

Same shape as `@elitjs/ws` but over TLS:

```ts
class WSSClient { /* same interface as WebSocket */ }
class WSSServer { /* same interface as WebSocketServer */ }

function createWSSClient(url: string): WSSClient;
function createWSSServer(options?: WSSServerOptions): WSSServer;

// ReadyState, CLOSE_CODES re-exported from @elitjs/ws

interface WSSServerOptions extends ServerOptions {
  /* TLS options: key, cert, ca, ... */
}
```

## @elitjs/smtp-server

```ts
const DEFAULT_SMTP_HOST: string;   // '127.0.0.1'
const DEFAULT_SMTP_PORT: number;   // 2525

function createSmtpServer(config?: ElitSMTPServerInput): ElitSMTPServerHandle;
function startSmtpServer(config?: ElitSMTPServerInput): ElitSMTPServerHandle;
function normalizeSmtpServerConfigs(config?: ElitSMTPServerInput): ResolvedElitSMTPServerConfig[];
function resolveSmtpServerConfig(config?: ElitSMTPServerInput): ResolvedElitSMTPServerConfig;

interface ElitSMTPServerConfig extends SMTPServerOptions {
  port?: number;
  host?: string;
  label?: string;
}

type ElitSMTPServerInput = ElitSMTPServerConfig | ElitSMTPServerConfig[] | undefined;

interface ResolvedElitSMTPServerConfig extends SMTPServerOptions {
  port: number;
  host: string;
  label?: string;
}

interface ElitSMTPServerHandle {
  server: SMTPServer;
  config: ResolvedElitSMTPServerConfig;
  listen(callback?: () => void): NetServer;
  address(): AddressInfo | string | null;
  close(): Promise<void>;
}

class SMTPServer { /* from 'smtp-server' */ }

// Re-exported types from 'smtp-server':
//   SMTPServerAddress, SMTPServerAuthentication, SMTPServerAuthenticationResponse,
//   SMTPServerDataStream, SMTPServerEnvelope, SMTPServerOptions, SMTPServerSession
```

### Patterns

```ts
import { startSmtpServer } from '@elitjs/smtp-server';

const handle = startSmtpServer({
  port: 2525,
  host: '0.0.0.0',
  authOptional: true,
  onAuth(auth, session, cb) {
    cb(null, { user: auth.username });
  },
  onData(stream, session, cb) {
    let raw = '';
    stream.on('data', (chunk) => raw += chunk);
    stream.on('end', () => {
      console.log('Got email:', raw);
      cb();
    });
  }
});

// Later
await handle.close();
```

### Wiring into dev server

```ts
// elit.config.ts
export default {
  dev: {
    smtp: [{ port: 2525, host: '0.0.0.0', onAuth: (auth, session, cb) => cb(null, { user: 'x' }) }]
  }
};
```

Or via `clients[].smtp` to scope per root.

## @elitjs/mime-types

```ts
function lookup(path: string): string;                         // extension → MIME type
function extension(type: string): string;                      // MIME type → first extension
function charset(type: string): string;                        // 'UTF-8' for text types, else ''
function contentType(type: string): string;                    // MIME + charset header value

const types: Record<string, string>;                           // extension → MIME
const extensions: Record<string, string[]>;                    // MIME → extensions[]

function getRuntime(): 'node' | 'bun' | 'deno';
```

### Patterns

```ts
import { lookup, contentType, extension } from '@elitjs/mime-types';

lookup('file.json');                    // 'application/json'
lookup('file.JS');                       // 'application/javascript' (case-insensitive)
extension('application/json');           // 'json'
contentType('application/json');         // 'application/json; charset=utf-8'
contentType('text/markdown');            // 'text/markdown; charset=utf-8'
charset('text/html');                    // 'UTF-8'
```

## Rules

- These packages mirror Node built-ins (`http`, `https`, `ws`) — same event names, same stream semantics.
- `WebSocket` from `@elitjs/ws` works in **both** Node and the browser (cross-runtime). In browser-only code, prefer the native `WebSocket` global.
- `IncomingMessage` is a Readable stream — read `data` events or pipe it. Don't try to call `JSON.parse(req)` directly.
- `ServerResponse.end()` **must** be called to finish the response. Forgetting it leaves the request hanging.
- For TLS (HTTPS / WSS), the `key` and `cert` options accept Buffers or strings in PEM format.
- SMTP servers built with `@elitjs/smtp-server` are real SMTP servers — they listen on real ports and accept real email. Use ports above 1024 in dev (`2525` is the package default).
- `mime-types.lookup` returns `false` (not `undefined`) when no match is found in some legacy code paths — coalesce with `|| 'application/octet-stream'` if you need a string.

## Anti-Patterns

- Spawning `node:http` directly when `@elitjs/http` would do — the latter works on Bun/Deno unchanged.
- Holding references to `req`/`res` after the response ends. They may be reused or destroyed by the runtime.
- Calling `ws.send()` before `readyState === WebSocket.OPEN`. Wait for the `open` event.
- Forgetting `server.close()` on shutdown — keeps the port bound.
- Mixing `@elitjs/ws` `WebSocket` with native browser `WebSocket` in the same code path. They behave similarly but are different objects.
- Storing TLS keys in the repo. Use env vars (`process.env.TLS_KEY`) and load via `fs.readFile`.
- Expecting `mime-types` to know every extension. Custom app extensions (`.wapk`, `.elit`) return false — define your own map.

## Validation

- `createServer` + `server.listen(port)` — `curl http://localhost:port/` should hit your handler.
- `new WebSocket(url)` + `ws.on('open', ...)` — connection should establish within ms on localhost.
- `startSmtpServer({ port: 2525 })` — `nc localhost 2525` should accept SMTP commands (`EHLO`, `MAIL FROM`, etc.).
- `lookup('file.png')` should return `'image/png'`.
