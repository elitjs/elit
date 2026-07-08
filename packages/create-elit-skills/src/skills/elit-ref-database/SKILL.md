---
name: elit-ref-database
description: 'API reference for @elitjs/database: Database class (register, execute, create, read, remove, rename, save, update) and standalone operations (create, read, remove, rename, save, update). Use for exact signatures when reading/writing TypeScript database files via the in-process VM, and when consuming @db/<name> imports inside db.execute.'
argument-hint: 'Describe the database file, exported const, or VM execute code to read/write.'
user-invocable: true
---

# @elitjs/database Reference

File-backed TypeScript databases with an in-process VM. Each "database" is a `databases/<name>.ts` file exporting `const <name> = ...`. Reads parse the file; writes mutate the source AST. `execute(code)` runs TypeScript code in a sandboxed VM where `@db/<name>` resolves to the corresponding file's exports.

## Exports

```ts
class Database {
  constructor(options?: VMOptions);
  register(context: { [key: string]: any }): void;
  execute(code: string): Promise<any>;
  create(dbName: string, code: string | Function): void;
  read(dbName: string): string;
  remove(dbName: string, fnName?: string): string | boolean;
  rename(oldName: string, newName: string): string;
  save(dbName: string, code: unknown): void;
  update(dbName: string, fnName: string, code: unknown): string;
}

// Standalone operations (operate on the filesystem; no VM required)
function create(dbName: string, code: string | Function, options?: VMOptions): void;
function read(dbName: string, options?: VMOptions): string;
function remove(dbName: string, fnName: string, options?: VMOptions): string | boolean;
function rename(oldName: string, newName: string, options?: VMOptions): string;
function save(dbName: string, code: unknown, options?: VMOptions): void;
function update(dbName: string, fnName: string, code: unknown, options?: VMOptions): string;

interface VMOptions {
  dir?: string;                 // default process.cwd()/databases
  language?: 'ts' | 'js';       // default 'ts'
  registerModules?: Record<string, any>;
}
```

## File layout

```
my-app/
├── databases/
│   ├── todo.ts                 # exports const todo: TodoItem[] = [...]
│   ├── users.ts                # exports const users = []
│   └── settings.ts             # exports const settings = { theme: 'dark' }
└── src/
    └── server.ts               # uses Database
```

Files are auto-created on first write if missing.

## Patterns

### Construct the database client

```ts
import { Database } from '@elitjs/database';
import { resolve } from 'path';

const db = new Database({
  dir: resolve(process.cwd(), 'databases'),
  language: 'ts'
});
```

### Execute TypeScript that imports `@db/<name>`

```ts
const result = await db.execute(`
  import { todos } from '@db/todo';
  console.log(JSON.stringify(todos));
`);

const payload = result.logs.find((e: { type: string }) => e.type === 'log')?.args?.[0];
const todos = typeof payload === 'string' ? JSON.parse(payload) : payload;
```

`@db/todo` is the alias the VM injects — it resolves to `databases/todo.ts` and exposes whatever that file `export`s. Use `console.log(JSON.stringify(...))` to surface data through `result.logs`.

### Save (overwrite entire file)

```ts
import type { TodoItem } from './todo-types';

const todos: TodoItem[] = [
  { id: 't1', title: 'New', priority: 'medium', completed: false, createdAt: now, updatedAt: now }
];
db.save('todo', todos);    // writes: export const todos: TodoItem[] = [...]
// or with options:
save('todo', todos, { dir: resolve(process.cwd(), 'databases') });
```

`save()` rebuilds the entire module source — use when creating or replacing.

### Update a single export (keep others)

```ts
db.update('todo', 'todos', nextTodos);   // updates only the `todos` export
```

`update()` rewrites one exported const while preserving the rest of the file.

### Create / read / remove / rename

```ts
// Append raw source to the file
db.create('todo', '\nexport const archived: TodoItem[] = [];');

// Read the raw source
const source: string = db.read('todo');

// Remove an export by name (creates a .bak)
db.remove('todo', 'archived');          // → 'Removed archived from database todo.'

// Remove the whole file (creates a .bak)
db.remove('todo');                       // → 'Removed successfully'

// Rename todo.ts → tasks.ts
db.rename('todo', 'tasks');              // → "Successfully renamed 'todo.ts' to 'tasks.ts'"
```

### Register VM globals

```ts
db.register({
  fetch,
  env: process.env,
  now: () => Date.now()
});

await db.execute(`
  import { todos } from '@db/todo';
  const t = now();
  console.log(JSON.stringify({ ts: t, count: todos.length }));
`);
```

### Server route using Database

```ts
import { Database } from '@elitjs/database';
import { ServerRouter, json, type ServerRouteContext } from '@elitjs/server';
import { resolve } from 'path';

const db = new Database({ dir: resolve(process.cwd(), 'databases'), language: 'ts' });
const router = new ServerRouter();

router.get('/api/todos', async (ctx: ServerRouteContext) => {
  const result = await db.execute(`
    import { todos } from '@db/todo';
    console.log(JSON.stringify(todos));
  `);
  const payload = result.logs.find((e) => e.type === 'log')?.args?.[0];
  const todos = typeof payload === 'string' ? JSON.parse(payload) : (payload ?? []);
  json(ctx.res, { todos });
});

router.post('/api/todos', async (ctx: ServerRouteContext) => {
  const current = await readTodos(db);
  const next = [{ id: 't_new', ...ctx.body }, ...current];
  db.update('todo', 'todos', next);
  json(ctx.res, { todos: next }, 201);
});
```

## Rules

- The database directory defaults to `process.cwd()/databases`. Pass `dir` explicitly when your server runs from a different cwd.
- The `@db/<name>` import inside `execute()` maps to `databases/<name>.ts`. The file must `export const <name> = ...` (or any exports — the alias exposes them by name).
- Use `console.log(JSON.stringify(...))` to surface data from `execute()`. Read it from `result.logs` filtered by `type === 'log'`.
- `save()` overwrites the entire file. `update(dbName, exportName, value)` rewrites a single export. `create()` **appends** to the file (raw source).
- `remove(dbName, fnName)` mutates the file to drop the named export. `remove(dbName)` deletes the entire file (after creating a `.bak`).
- `rename(oldName, newName)` only renames the file — it does **not** rewrite `import` statements in other files that referenced the old name.
- `language: 'js'` skips TypeScript handling — use only if the database file is plain JavaScript.
- `register()` adds globals available inside `execute()`. Built-ins like `Math`, `Date`, `JSON` are always available.
- All filesystem ops are synchronous. Don't call `save()`/`update()` on every request without debouncing — I/O can become a bottleneck under heavy load.

## Anti-Patterns

- Importing `@db/<name>` outside of `db.execute()`. The alias only exists inside the VM context.
- Writing to the `databases/*.ts` files from client code. The database is server-only — keep `@elitjs/database` out of client bundles.
- Using `save()` to update a single record — it rewrites the whole file. Use `update()` instead.
- Calling `remove(dbName, fnName)` and expecting other files that imported `<fnName>` to keep working. They won't — they'll fail to resolve.
- Treating `execute()` as sandboxed against malicious code. The VM is not a security boundary — it runs in the same process. Only execute code you control.
- Storing huge datasets (10k+ entries) in a single `.ts` file. The file is parsed on every read; switch to a real database for scale.

## Validation

- After `db.save('todo', todos)`, open `databases/todo.ts` — it should contain `export const todos = [...]`.
- After `db.update('todo', 'todos', nextTodos)`, only the `todos` export should change; other exports remain.
- `db.read('todo')` returns the raw TypeScript source as a string.
- `await db.execute(...)` returns `{ logs: Array<{ type, args }> }` — filter for `type === 'log'` to find your `console.log` output.
