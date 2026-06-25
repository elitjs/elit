# elit/database — Code-Stored Collections

`Database` loads `.ts` (or `.js`) files from a directory; each file defines a collection by exporting query functions. The class executes the file's code in a VM context.

## Creating an Instance

```ts
import { Database } from 'elit/database';
import { resolve } from 'node:path';

const db = new Database({
  dir: resolve(process.cwd(), 'databases'),
  language: 'ts'                          // 'ts' | 'js'
});
```

**Constructor options:**
- `dir?: string` — directory holding collection files. Defaults to `./databases`.
- `language?: 'ts' | 'js'` — file extension to load.
- `registerModules?: object` — globals exposed to collection code (see below).

Initialize **once per process**, not per request:

```ts
// src/server.ts
const db = new Database({ dir: resolve(process.cwd(), 'databases'), language: 'ts' });
```

## Defining a Collection

Each `.ts` file under `dir/` is one collection. Export query/insert/update functions.

```ts
// databases/users.ts
interface User { id: string; name: string; email: string; }

const users: User[] = [];

export function findAll(): User[] {
  return users;
}

export function findById(id: string): User | undefined {
  return users.find(u => u.id === id);
}

export function insert(user: User): User {
  users.push(user);
  return user;
}

export function remove(id: string): boolean {
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return false;
  users.splice(idx, 1);
  return true;
}
```

The in-memory array `users` is the persistent store; the file itself is the schema + query API.

## Calling from a Route

```ts
// src/server.ts
import { Database } from 'elit/database';
import { ServerRouter } from 'elit/server';
import { randomUUID } from 'node:crypto';

const db = new Database({ dir: resolve(process.cwd(), 'databases'), language: 'ts' });

const router = new ServerRouter();

router.get('/api/users', async (ctx) => {
  const users = await db.execute('users.findAll()');
  ctx.res.json(users);
});

router.post('/api/users', async (ctx) => {
  const { name, email } = ctx.req.body ?? {};
  const user = { id: randomUUID(), name, email };
  await db.execute(`users.insert(${JSON.stringify(user)})`);
  return ctx.res.status(201).json(user);
});
```

## API

### `db.execute(code: string): Promise<any>`
Runs code in the collection file's VM context. The exported functions are available as `<fileName>.<exportName>(...)`.

```ts
await db.execute('users.findAll()');
await db.execute(`users.findById("abc-123")`);
```

**String interpolation warning** — `db.execute` evaluates code, so user input MUST be JSON-encoded:

```ts
// SAFE — JSON.stringify escapes quotes/backslashes
await db.execute(`users.findById(${JSON.stringify(userId)})`);

// UNSAFE — user can inject arbitrary code
await db.execute(`users.findById("${userId}")`);
```

### `db.create(dbName, code)`
Creates a new collection file on disk.

```ts
await db.create('posts', `
  const posts = [];
  export function findAll() { return posts; }
  export function insert(p) { posts.push(p); return p; }
`);
```

### `db.read(dbName)`
Returns the source code of a collection file as a string.

### `db.save(dbName, code)`
Overwrites the entire collection file. Existing in-memory state is reset.

### `db.update(dbName, fnName, newFnCode)`
Replaces a single exported function inside a collection file. Other exports stay intact.

### `db.remove(dbName, fnName?)`
Without `fnName`: deletes the whole collection file.
With `fnName`: removes only that export from the file.

### `db.rename(oldName, newName)`
Renames a collection file.

### `db.register(context)`
Adds globals to the VM context. Useful for exposing `crypto`, `fetch`, etc.

```ts
import { randomUUID } from 'node:crypto';
db.register({ randomUUID, fetch, console });

// now collection code can use them
// databases/users.ts
export function insert(name) {
  return { id: randomUUID(), name };
}
```

`registerModules` in the constructor does the same at creation time:

```ts
const db = new Database({
  dir: './databases',
  language: 'ts',
  registerModules: { randomUUID, fetch, console }
});
```

## Persistence

Collection state lives **in memory**, keyed by file. Elit does not auto-write mutations back to disk — the array you mutate is the runtime state.

To persist changes to disk:

```ts
// call db.save to rewrite the file with current state
// (you'd serialize the in-memory array back into source)
```

For most apps, treat the file as a schema definition and persist via a separate mechanism (write to JSON, an external DB, etc.) if needed.

## Multi-Tenant / Multi-Database

Create multiple `Database` instances with different `dir`s:

```ts
const tenantA = new Database({ dir: './databases/tenant-a' });
const tenantB = new Database({ dir: './databases/tenant-b' });
```

Each instance has its own VM context.

## Gotchas

- **`db.execute(string)` evaluates code** — never interpolate raw user input. Always `JSON.stringify(...)` first.
- **`Database` per-request** — connection-leak / perf cliff. Initialize once per process.
- **`dir` resolution** — use `resolve(process.cwd(), 'databases')` so dev and built server agree on the path.
- **`db.save()` resets in-memory state** — existing route handlers expecting the old state see the new file's exports.
- **TypeScript types are not enforced at runtime** — `db.execute` runs compiled JS; type errors at the file level won't surface until `execute` runs.
- **Async collection functions** — `db.execute` always returns a Promise. `await` it even for sync functions.
- **Circular imports in collection files** — avoid; the VM context can deadlock.
