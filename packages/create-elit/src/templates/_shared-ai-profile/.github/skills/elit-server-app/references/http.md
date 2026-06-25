# elit/http & elit/https — HTTP Server / Client

Cross-runtime HTTP entrypoints. `elit/http` works on Node, Bun, and Deno; `elit/https` adds TLS.

These re-export Node-compatible types (`IncomingMessage`, `ServerResponse`) so they work as drop-in replacements for `node:http` when you need cross-runtime support.

## Server

### `createServer(requestListener?)`
Creates an HTTP server. Same shape as `http.createServer`.

```ts
import { createServer } from 'elit/http';

const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello');
});

server.listen(3000, 'localhost', () => {
  console.log('listening on http://localhost:3000');
});
```

For HTTPS:

```ts
import { createServer } from 'elit/https';
import { readFileSync } from 'node:fs';

const server = createServer(
  {
    key: readFileSync('./key.pem'),
    cert: readFileSync('./cert.pem')
  },
  (req, res) => res.end('secure')
);

server.listen(443);
```

### Server lifecycle

```ts
server.listen(port?, host?, callback?);   // start
server.close(callback?);                  // stop (waits for keep-alive)
server.address();                         // { address, family, port } | string | null
```

## IncomingMessage (Request)

Extends `EventEmitter` and `stream.Readable`.

```ts
interface IncomingMessage {
  method: string;                          // 'GET', 'POST', ...
  url: string;                             // full URL with query
  headers: IncomingHttpHeaders;            // lowercased keys
  httpVersion: string;                     // '1.1', '2.0'
  // ...extends Readable, so:
  body?: any;                              // Elit parses JSON/urlencoded automatically
  query?: Record<string, string>;
  params?: Record<string, string>;
}
```

### Reading the body manually

When you bypass `ServerRouter` (rare), read the body as a stream:

```ts
createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const body = Buffer.concat(chunks).toString('utf8');
  // ...
});
```

Or use the helper methods:

```ts
const text = await req.text();
const json = await req.json();
```

## ServerResponse (Response)

```ts
interface ServerResponse {
  setHeader(name, value): this;
  getHeader(name): string | string[] | undefined;
  removeHeader(name): this;
  writeHead(statusCode, headers?): this;
  write(chunk): boolean;
  end(data?): this;
  // Elit helpers:
  status(code): this;
  json(data, code?): this;
  send(data): this;
  redirect(url, code?): this;
}
```

```ts
res.setHeader('Content-Type', 'application/json');
res.status(200).json({ ok: true });
```

## HTTP Client

### `request(options, callback?)`
### `get(url, options?, callback?)`

```ts
import { get } from 'elit/http';

get('https://api.example.com/data', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log(JSON.parse(body)));
}).on('error', console.error);
```

For POST/PUT/DELETE use `request`:

```ts
import { request } from 'elit/http';

const req = request({
  hostname: 'api.example.com',
  port: 443,
  path: '/users',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  // ...
});

req.write(JSON.stringify({ name: 'Ada' }));
req.end();
```

## Common Patterns

### Cross-runtime check

```ts
const isBun = typeof Bun !== 'undefined';
const isDeno = typeof Deno !== 'undefined';
const isNode = !isBun && !isDeno && typeof process !== 'undefined';
```

### Graceful shutdown

```ts
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server');
  server.close(() => process.exit(0));
});
```

## When to use this directly

Most apps don't — `ServerRouter` (from `elit/server`) wraps this for you. Use `elit/http` directly when:
- You need a custom server (e.g. raw TCP, custom routing).
- You want full control over the request lifecycle.
- You're integrating with a framework that expects a vanilla Node server.

For 95% of routes, prefer `ServerRouter` + `elit.config.ts` → `dev.api` wiring.

## Gotchas

- **HTTPS requires cert+key** — without them, `createServer` throws.
- **`res.end()` MUST be called** — without it, the request hangs until socket timeout.
- **Headers must be set before `write`/`end`** — `setHeader` after writing is silently ignored.
- **`res.json()` is an Elit helper** — vanilla Node's `http` doesn't have it. If you mix vanilla code in, you'll need to `JSON.stringify` manually.
- **`get()` doesn't follow redirects by default** — handle `301/302` manually if needed.
- **HTTPS server on port 443 needs root/admin** — use ports ≥1024 for dev.
