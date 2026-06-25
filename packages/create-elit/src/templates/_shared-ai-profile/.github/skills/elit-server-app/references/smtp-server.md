# elit/smtp-server — SMTP Email Listener

Listens for inbound SMTP email (e.g. for testing, or for "email-to-task" apps). Re-exports the `smtp-server` npm package with Elit-flavored config.

For most apps, configure via `elit.config.ts` → `dev.smtp` / `preview.smtp` / `clients[].smtp`. Use the direct API only for standalone SMTP servers.

## Quick Start via elit.config.ts

```ts
// elit.config.ts
export default {
  dev: {
    smtp: {
      port: 2525,
      host: '127.0.0.1',
      authMethod: 'PLAIN',
      onAuth(auth, session, callback) {
        if (auth.username === 'test' && auth.password === 'test') {
          callback(null, { user: 'test' });
        } else {
          callback(new Error('Invalid auth'));
        }
      },
      onData(stream, session, callback) {
        let body = '';
        stream.on('data', chunk => body += chunk);
        stream.on('end', () => {
          console.log('email received:', body);
          callback();
        });
      }
    }
  }
};
```

The framework binds the listener on dev server start; logs `SMTP listening on 127.0.0.1:2525`.

## Standalone API

### `createSmtpServer(config?)`
Creates an SMTP server instance without starting it.

```ts
import { createSmtpServer } from 'elit/smtp-server';

const smtp = createSmtpServer({
  port: 2525,
  host: '127.0.0.1',
  authMethod: 'PLAIN',
  onAuth(auth, session, callback) { /* ... */ },
  onData(stream, session, callback) { /* ... */ }
});

smtp.listen(() => console.log('SMTP ready'));
```

### `startSmtpServer(config?)`
Creates and immediately starts listening.

```ts
import { startSmtpServer } from 'elit/smtp-server';

const smtp = startSmtpServer({ port: 2525 });
```

### Server Handle

```ts
interface ElitSMTPServerHandle {
  server: SMTPServer;                                  // raw smtp-server instance
  config: ResolvedElitSMTPServerConfig;
  listen(callback?: () => void): void;
  address(): { address: string; family: string; port: number };
  close(): Promise<void>;
}
```

## Config Shape

```ts
interface ElitSMTPServerConfig extends SMTPServerOptions {
  port?: number;        // default 2525
  host?: string;        // default '127.0.0.1' (default is '0.0.0.0' for SMTPServer itself)
  label?: string;       // log prefix
}
```

`SMTPServerOptions` is the upstream `smtp-server` type. Common options:

| Option | Purpose |
|---|---|
| `authMethod` | `'PLAIN'`, `'LOGIN'`, `'CRAM-MD5'`, or false to disable |
| `onAuth(auth, session, callback)` | Authentication handler |
| `onConnect(session, callback)` | New connection hook |
| `onMailFrom(address, session, callback)` | MAIL FROM handler |
| `onRcptTo(address, session, callback)` | RCPT TO handler |
| `onData(stream, session, callback)` | Email body handler (RFC 822 stream) |
| `size` | Max message size in bytes |
| `hideSTARTTLS` | Don't advertise STARTTLS |
| `secure` | Expect immediate TLS (port 465 pattern) |

## Auth Handler

```ts
function onAuth(auth, session, callback) {
  if (auth.method === 'PLAIN') {
    const [user, pass] = Buffer.from(auth.response, 'base64').toString().split('\0').slice(1);
    if (validate(user, pass)) {
      callback(null, { user });
    } else {
      callback(new Error('Invalid username or password'));
    }
  } else if (auth.method === 'LOGIN') {
    // auth.username / auth.password already decoded
    if (validate(auth.username, auth.password)) {
      callback(null, { user: auth.username });
    } else {
      callback(new Error('Invalid'));
    }
  }
}
```

## Email Body Handler

```ts
function onData(stream, session, callback) {
  let raw = '';
  stream.on('data', chunk => raw += chunk.toString());
  stream.on('end', () => {
    // raw is the full RFC 822 message
    console.log('from:', session.envelope.mailFrom);
    console.log('to:', session.envelope.rcptTo);
    console.log('body:', raw);
    callback();
  });
  stream.on('error', callback);
}
```

`session.envelope` gives you `{ mailFrom: Address, rcptTo: Address[] }` already-parsed.

## Common Patterns

### Test mail server (no auth, accept anything)

```ts
const smtp = createSmtpServer({
  disabledCommands: ['AUTH'],
  onData(stream, session, callback) {
    simpleParser(stream, (err, parsed) => {
      if (err) return callback(err);
      console.log(parsed.subject, parsed.from.text);
      callback();
    });
  }
});
smtp.listen(() => console.log('test SMTP on 2525'));
```

### Multiple listeners

```ts
dev: {
  smtp: [
    { port: 2525, host: '127.0.0.1', label: 'app' },
    { port: 2526, host: '127.0.0.1', label: 'webhook' }
  ]
}
```

**Duplicate `host:port` pairs are rejected** — Elit will refuse to start.

### Multi-client SMTP

```ts
dev: {
  clients: [
    { basePath: '/app', smtp: { port: 2525 } },
    { basePath: '/admin', smtp: { port: 2526 } }
  ]
}
```

`clients[].smtp` does NOT use `basePath` — each listener binds to its own socket.

## Parsing Email

`smtp-server` gives you the raw RFC 822 stream. For parsing, install `mailparser`:

```ts
import { simpleParser } from 'mailparser';

onData(stream, session, callback) {
  simpleParser(stream).then(parsed => {
    console.log(parsed.subject, parsed.text, parsed.html);
    callback();
  }).catch(callback);
}
```

## Gotchas

- **`onData` MUST call `callback()`** — otherwise the connection hangs until timeout.
- **`stream.on('error', callback)`** — pass errors back through callback so the server can clean up.
- **Multiple listeners on same `host:port`** — Elit rejects with a duplicate-binding error.
- **`clients[].smtp` is NOT basePath-prefixed** — unlike `clients[].ws[]` and `clients[].api`. Each binds directly to its `host:port`.
- **`authMethod: false`** — disables AUTH advertisement; clients can't authenticate.
- **`secure: true` without TLS config** — server rejects all connections. Use `hideSTARTTLS: false` and provide TLS options, or stick with opportunistic STARTTLS.
- **`simpleParser` is not bundled** — `npm i mailparser` if you need structured parsing.
- **Port 25 requires root** — use 2525 (default) for dev.
