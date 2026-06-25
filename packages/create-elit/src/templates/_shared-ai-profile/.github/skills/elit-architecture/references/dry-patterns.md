# DRY Patterns — Extracting Duplication

This reference lists the duplication patterns that show up in `auth-fullstack-example` (and most Elit apps), and how to extract them into shared helpers.

## Pattern: Bearer token parsing

**Duplicated form (auth-fullstack-example pattern):**

```ts
// In every protected route handler:
const authHeader = req.headers.authorization;
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  res.statusCode = 401;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Unauthorized' }));
  return;
}
const token = authHeader.slice(7);
const user = verifyToken(token);
if (!user) {
  res.statusCode = 401;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Invalid token' }));
  return;
}
// ...actual handler...
```

**Extracted form:**

```ts
// src/server/_shared/auth-middleware.ts
import { ElitRequest, ElitResponse } from 'elit/server';
import { parseBearerToken } from './bearer';
import { verifyToken } from '../auth/tokens';
import { sendUnauthorized } from './response-helpers';
import type { PublicUser } from '../../../shared/types/user';

export interface AuthContext {
  user: PublicUser;
}

export const requireAuth = (req: ElitRequest, res: ElitResponse): AuthContext | null => {
  const token = parseBearerToken(req);
  if (!token) {
    sendUnauthorized(res, 'Missing token');
    return null;
  }
  const user = verifyToken(token);
  if (!user) {
    sendUnauthorized(res, 'Invalid token');
    return null;
  }
  return { user };
};
```

```ts
// src/server/_shared/bearer.ts
import { ElitRequest } from 'elit/server';

export const parseBearerToken = (req: ElitRequest): string | null => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7);
};
```

**Used in a route:**

```ts
// src/server/profile/routes.ts
router.get('/api/profile', async (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) return;
  const profile = await profileRepo.getById(auth.user.id);
  ok(res, toPublicUser(profile));
});
```

## Pattern: DB result extraction

`Database.execute()` returns a result with `logs` — the actual rows are in `logs[0].args[0]`. This pattern repeats across every repository.

**Duplicated form:**

```ts
const result = await db.execute(`db.users.find({ email: ${JSON.stringify(email)} }).toArray()`);
const user = result.logs[0]?.args?.[0]?.[0];  // fragile, repeated everywhere
```

**Extracted form:**

```ts
// src/server/_shared/db-helpers.ts
export const extractRows = <T>(result: unknown): T[] => {
  const rows = (result as any)?.logs?.[0]?.args?.[0];
  return Array.isArray(rows) ? rows as T[] : [];
};

export const extractFirst = <T>(result: unknown): T | null => {
  const rows = extractRows<T>(result);
  return rows.length ? rows[0] : null;
};

export const extractCount = (result: unknown): number => {
  const value = (result as any)?.logs?.[0]?.args?.[0];
  return typeof value === 'number' ? value : 0;
};

// Safe wrapper for db.execute with logging
export const query = async <T>(
  db: Database, code: string, mapper: (rows: unknown[]) => T[] = (rows) => rows as T[]
): Promise<T[]> => {
  const result = await db.execute(code);
  return mapper(extractRows<unknown>(result));
};
```

**Used in a repository:**

```ts
// src/server/auth/repository.ts
import { db } from '../_shared/db';
import { extractFirst } from '../_shared/db-helpers';
import type { User } from '../../../shared/types/user';

export const findByEmail = async (email: string): Promise<User | null> => {
  const result = await db.execute(
    `db.users.find({ email: ${JSON.stringify(email)} }).toArray()`
  );
  return extractFirst<User>(result);
};
```

**CRITICAL:** Always interpolate values via `JSON.stringify()`. Never string-concatenate user input into `db.execute()` — the VM evaluates the code and string concatenation enables injection.

## Pattern: Password stripping

When returning user data, the password hash must never leak. The destructuring `{ password: _, ...public }` repeats across every handler that returns a user.

**Duplicated form:**

```ts
const { password: _, ...userWithoutPassword } = user;
res.end(JSON.stringify(userWithoutPassword));
```

**Extracted form:**

```ts
// src/server/_shared/serialization.ts
import type { User, PublicUser } from '../../../shared/types/user';

export const toPublicUser = (user: User): PublicUser => {
  const { password: _, ...public_ } = user;
  return public_;
};

export const toPublicUsers = (users: User[]): PublicUser[] =>
  users.map(toPublicUser);
```

**Used in a route:**

```ts
router.get('/api/users/:id', async (req, res) => {
  const user = await usersRepo.getById(req.params.id);
  if (!user) return error(res, 404, 'User not found');
  ok(res, toPublicUser(user));
});
```

## Pattern: Response envelopes

Every API response should have the same shape so the client can parse uniformly.

**Duplicated form:**

```ts
res.statusCode = 200;
res.setHeader('Content-Type', 'application/json');
res.end(JSON.stringify({ data: value }));

// Or:
res.statusCode = 400;
res.setHeader('Content-Type', 'application/json');
res.end(JSON.stringify({ error: 'Bad request' }));
```

**Extracted form:**

```ts
// src/server/_shared/response-helpers.ts
import { ElitResponse } from 'elit/server';

export const json = (res: ElitResponse, status: number, body: unknown): void => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};

export const ok = <T>(res: ElitResponse, data: T): void =>
  json(res, 200, { data });

export const created = <T>(res: ElitResponse, data: T): void =>
  json(res, 201, { data });

export const noContent = (res: ElitResponse): void => {
  res.statusCode = 204;
  res.end();
};

export const error = (res: ElitResponse, status: number, message: string): void =>
  json(res, status, { error: message });

export const sendUnauthorized = (res: ElitResponse, message = 'Unauthorized'): void =>
  error(res, 401, message);

export const sendNotFound = (res: ElitResponse, message = 'Not found'): void =>
  error(res, 404, message);

export const sendBadRequest = (res: ElitResponse, message = 'Bad request'): void =>
  error(res, 400, message);
```

## Pattern: Validation

Email format, password strength, username format — the same rules apply on client (form validation) and server (request validation).

**Duplicated form:**

```ts
// In a server handler:
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  return error(res, 400, 'Invalid email');
}
if (password.length < 8) {
  return error(res, 400, 'Password too short');
}

// In a client form (re-declared):
const isEmailValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
```

**Extracted form (shared):**

```ts
// src/shared/utils/validation.ts
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isEmail = (value: string): boolean => EMAIL_RE.test(value);

export const isStrongPassword = (password: string): boolean =>
  password.length >= 8 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /[0-9]/.test(password);

export const isUsername = (value: string): boolean =>
  /^[a-zA-Z0-9_]{3,20}$/.test(value);

export const validateEmail = (value: string): string | null =>
  isEmail(value) ? null : 'Invalid email format';

export const validatePassword = (value: string): string | null =>
  isStrongPassword(value)
    ? null
    : 'Password must be at least 8 characters with uppercase, lowercase, and a number';
```

**Used on both sides:**

```ts
// Client form:
import { validateEmail } from '../../shared/utils/validation';

const emailError = computed(() => validateEmail(email.value));

// Server handler:
import { isEmail } from '../../shared/utils/validation';

if (!isEmail(email)) return sendBadRequest(res, 'Invalid email');
```

## Pattern: CSS variables (theme tokens)

The same color/spacing/font gets hardcoded across style files.

**Duplicated form:**

```ts
// In multiple .styles.ts files:
addClass('button', { backgroundColor: '#2563eb', padding: '8px 16px' });
addClass('card', { backgroundColor: '#ffffff', padding: '16px', borderColor: '#e5e7eb' });
```

**Extracted form:**

```ts
// src/styles/tokens.ts
import { createStyles } from 'elit/style';

export const tokens = createStyles();
tokens.addVar('color-bg', '#ffffff');
tokens.addVar('color-surface', '#f9fafb');
tokens.addVar('color-border', '#e5e7eb');
tokens.addVar('color-primary', '#2563eb');
tokens.addVar('color-primary-hover', '#1d4ed8');
tokens.addVar('space-1', '4px');
tokens.addVar('space-2', '8px');
tokens.addVar('space-3', '12px');
tokens.addVar('space-4', '16px');
tokens.addVar('space-6', '24px');
tokens.addVar('radius-md', '8px');
```

```ts
// src/components/Button/Button.styles.ts
import { createStyles } from 'elit/style';
import { tokens } from '../../styles/tokens';

export const buttonStyles = createStyles(tokens);
buttonStyles.addClass('button', {
  backgroundColor: tokens.var('color-primary'),
  padding: `${tokens.var('space-2')} ${tokens.var('space-4')}`,
  borderRadius: tokens.var('radius-md'),
});
buttonStyles.addPseudoClass('button', 'hover', {
  backgroundColor: tokens.var('color-primary-hover'),
});
```

**Why instance-based, not the singleton:** `createStyles()` gives each file its own instance, so registration order is deterministic. The singleton `styles` from `elit/style` is module-scope state shared across every caller — ordering bugs are subtle and hard to track down.

## Pattern: Type definitions

The same `User` interface gets redeclared on client and server, drifting over time.

**Duplicated form:**

```ts
// src/server/auth/repository.ts
interface User { id: string; email: string; password: string; name: string; }

// src/pages/profile/ProfilePage.ts
interface User { id: string; email: string; name: string; }  // password missing — drift
```

**Extracted form:**

```ts
// src/shared/types/user.ts
export interface User {
  id: string;
  email: string;
  password: string;  // hashed; server-only — strip before sending to client
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: PublicUser;
  token: string;
  expiresAt: string;
}
```

Both sides import from `shared/types/user`. The server uses `User` internally and converts to `PublicUser` at the boundary (see Password Stripping above).

## Pattern: Repository (DB access)

DB queries for an entity scatter across route handlers, making them hard to test and reuse.

**Duplicated form:**

```ts
// In multiple route handlers:
const result = await db.execute(`db.users.find({ id: ${JSON.stringify(req.params.id)} }).toArray()`);
const user = extractFirst<User>(result);
```

**Extracted form:**

```ts
// src/server/users/repository.ts
import { db } from '../_shared/db';
import { extractFirst, extractRows } from '../_shared/db-helpers';
import type { User } from '../../../shared/types/user';

export const usersRepo = {
  getById: async (id: string): Promise<User | null> => {
    const result = await db.execute(
      `db.users.find({ id: ${JSON.stringify(id)} }).toArray()`
    );
    return extractFirst<User>(result);
  },

  getByEmail: async (email: string): Promise<User | null> => {
    const result = await db.execute(
      `db.users.find({ email: ${JSON.stringify(email)} }).toArray()`
    );
    return extractFirst<User>(result);
  },

  create: async (user: User): Promise<void> => {
    await db.execute(`db.users.insertOne(${JSON.stringify(user)})`);
  },

  list: async (limit = 50): Promise<User[]> => {
    const result = await db.execute(`db.users.find({}).limit(${limit}).toArray()`);
    return extractRows<User>(result);
  },
};
```

Route handlers become thin:

```ts
router.get('/api/users/:id', async (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) return;
  const user = await usersRepo.getById(req.params.id);
  if (!user) return sendNotFound(res, 'User not found');
  ok(res, toPublicUser(user));
});
```

## Pattern: SSE channel management

SSE handlers need to track connected clients by room/channel and broadcast. This logic duplicates across any SSE endpoint.

**Duplicated form:**

```ts
// Inline in every SSE route:
const clients = new Map<string, ServerResponse>();
router.get('/api/chat/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  const clientId = randomUUID();
  clients.set(clientId, res);
  req.on('close', () => clients.delete(clientId));
});
```

**Extracted form:**

```ts
// src/server/_shared/sse-channels.ts
import { ElitRequest, ElitResponse } from 'elit/server';

type Client = ElitResponse & { _id?: string };

const channels = new Map<string, Map<string, Client>>();

export const addClient = (channel: string, req: ElitRequest, res: ElitResponse): string => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  const clientId = Math.random().toString(36).slice(2);
  if (!channels.has(channel)) channels.set(channel, new Map());
  const client = res as Client;
  client._id = clientId;
  channels.get(channel)!.set(clientId, client);
  req.on('close', () => channels.get(channel)?.delete(clientId));
  return clientId;
};

export const broadcast = (channel: string, event: string, data: unknown): void => {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  channels.get(channel)?.forEach(client => client.write(payload));
};

export const sendToClient = (channel: string, clientId: string, event: string, data: unknown): void => {
  const client = channels.get(channel)?.get(clientId);
  if (!client) return;
  client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
};
```

**Used in a route:**

```ts
router.get('/api/chat/events', (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) return;
  addClient(`user:${auth.user.id}`, req, res);
});
```

## When NOT to extract

- **Used once.** Don't pre-extract. Wait for the second use (Rule of Two).
- **Trivial logic.** A 3-line inline check is clearer than a helper.
- **Different in important ways.** Two similar-looking blocks with different intent should stay separate. Naming a misleading helper is worse than duplication.
- **Cross-domain.** If `auth/` and `chat/` both need a helper, hoist to `_shared/` — don't import across domains.
- **Premature abstraction.** If two pieces of code look similar today but you expect them to diverge, keep them separate. Extracting forces a shared interface that becomes a constraint later.

## PR checklist

When reviewing a PR, look for:

- [ ] Same regex/string literal appearing in 2+ files → move to `shared/utils/`.
- [ ] Same `{ password: _, ...rest }` pattern → use `toPublicUser()`.
- [ ] Same `res.writeHead + res.end(JSON.stringify(...))` → use `ok()`/`error()`.
- [ ] Same `result.logs[0]?.args?.[0]` → use `extractFirst()`/`extractRows()`.
- [ ] Same Bearer parsing block → use `requireAuth()`.
- [ ] Same `db.execute` query in 2+ handlers → move to the repository.
- [ ] Same color/spacing hardcoded → define as a token.
- [ ] Same interface on client and server → move to `shared/types/`.
