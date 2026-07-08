---
name: elit-ref-fs-path
description: 'API reference for @elitjs/fs (cross-runtime fs: readFile/writeFile/mkdir/readdir/stat/exists/copyFile/realpath/rename/unlink/rmdir + promises API + getRuntime) and @elitjs/path (cross-runtime path: normalize/join/resolve/isAbsolute/relative/dirname/basename/extname/parse/format + posix/win32 + sep/delimiter). Use for exact signatures.'
argument-hint: 'Describe the file or path operation (read, write, list, stat, join, resolve).'
user-invocable: true
---

# @elitjs/fs and @elitjs/path Reference

Cross-runtime (`node | bun | deno`) filesystem and path operations. API mirrors Node's `fs` and `path` modules so existing code works without changes.

## @elitjs/fs — exports

### Top-level sync + async

```ts
// File ops
readFile(path: string, options?: ReadFileOptions): Promise<Buffer | string>;
readFileSync(path: string, options?: ReadFileOptions): Buffer | string;
writeFile(path: string, data: string | Buffer, options?: WriteFileOptions): Promise<void>;
writeFileSync(path: string, data: string | Buffer, options?: WriteFileOptions): void;
appendFile(path: string, data: string | Buffer, options?: WriteFileOptions): Promise<void>;
appendFileSync(path: string, data: string | Buffer, options?: WriteFileOptions): void;

// Existence & stat
exists(path: string): Promise<boolean>;
existsSync(path: string): boolean;
stat(path: string): Promise<Stats>;
statSync(path: string): Stats;

// Directory ops
mkdir(path: string, options?: MkdirOptions): Promise<void>;
mkdirSync(path: string, options?: MkdirOptions): void;
readdir(path: string, options?: ReaddirOptions): Promise<string[] | Dirent[]>;
readdirSync(path: string, options?: ReaddirOptions): string[] | Dirent[];
rmdir(path: string): Promise<void>;
rmdirSync(path: string): void;
unlink(path: string): Promise<void>;
unlinkSync(path: string): void;

// Path ops (file-level)
copyFile(src: string, dest: string): Promise<void>;
copyFileSync(src: string, dest: string): void;
realpath(path: string): Promise<string>;
realpathSync(path: string): string;
rename(oldPath: string, newPath: string): Promise<void>;
renameSync(oldPath: string, newPath: string): void;

// Runtime detection
getRuntime(): 'node' | 'bun' | 'deno';
```

### `promises` namespace

```ts
import { promises } from '@elitjs/fs';

await promises.readFile(path);
await promises.writeFile(path, data);
await promises.appendFile(path, data);
await promises.stat(path);
await promises.mkdir(path);
await promises.readdir(path);
await promises.unlink(path);
await promises.rmdir(path);
await promises.rename(old, new);
await promises.copyFile(src, dest);
await promises.realpath(path);
```

### Option types

```ts
interface ReadFileOptions {
  encoding?: BufferEncoding | null;     // null → Buffer; otherwise string
  flag?: string;                         // default 'r'
}

interface WriteFileOptions {
  encoding?: BufferEncoding;
  flag?: string;                         // default 'w'
  mode?: number;                         // default 0o666
}

interface MkdirOptions {
  recursive?: boolean;
  mode?: number;
}

interface ReaddirOptions {
  encoding?: BufferEncoding;
  withFileTypes?: boolean;               // true → Dirent[]
}

interface Stats {
  isFile(): boolean;
  isDirectory(): boolean;
  isSymbolicLink(): boolean;
  size: number;
  mtime: Date;
  ctime: Date;
  atime: Date;
  birthtime: Date;
  mode: number;
}

interface Dirent {
  name: string;
  isFile(): boolean;
  isDirectory(): boolean;
  isSymbolicLink(): boolean;
}
```

## @elitjs/path — exports

```ts
const sep: string;                       // '/' on POSIX, '\\' on Windows
const delimiter: string;                  // ':' on POSIX, ';' on Windows

const posix: PathOps;                     // POSIX variants (always /)
const win32: PathOps;                     // Windows variants (always \)

interface PathOps {
  normalize(p: string): string;
  join(...paths: string[]): string;
  resolve(...paths: string[]): string;
  isAbsolute(p: string): boolean;
  relative(from: string, to: string): string;
  dirname(p: string): string;
  basename(p: string, ext?: string): string;
  extname(p: string): string;
  parse(p: string): ParsedPath;
  format(p: FormatInputPathObject): string;
  toNamespacedPath(p: string): string;
  sep: string;
  delimiter: string;
}

// Default export mirrors the platform you're on (win32 on Windows, posix elsewhere)
export const {
  normalize, join, resolve, isAbsolute, relative,
  dirname, basename, extname, parse, format, toNamespacedPath
} from '@elitjs/path';

interface ParsedPath {
  root: string;
  dir: string;
  base: string;
  ext: string;
  name: string;
}

interface FormatInputPathObject {
  root?: string;
  dir?: string;
  base?: string;
  ext?: string;
  name?: string;
}

getRuntime(): 'node' | 'bun' | 'deno';
```

## Patterns

### Read and parse JSON

```ts
import { readFile } from '@elitjs/fs';

const raw = await readFile('./config.json', { encoding: 'utf8' });
const config = JSON.parse(raw);
```

### Write a file (creating parent dirs)

```ts
import { writeFile, mkdir, dirname } from '@elitjs/fs';
import { resolve } from '@elitjs/path';

const outPath = resolve('./dist/data/items.json');
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, JSON.stringify(items, null, 2), { encoding: 'utf8' });
```

### List directory entries with types

```ts
import { readdir } from '@elitjs/fs';

const entries = await readdir('./src', { withFileTypes: true });
for (const entry of entries) {
  if (entry.isDirectory()) {
    console.log(`dir:  ${entry.name}`);
  } else if (entry.isFile()) {
    console.log(`file: ${entry.name}`);
  }
}
```

### Stat a file

```ts
import { stat } from '@elitjs/fs';

const stats = await stat('./package.json');
if (stats.isFile()) {
  console.log(`size=${stats.size} mtime=${stats.mtime.toISOString()}`);
}
```

### Existence check

```ts
import { exists } from '@elitjs/fs';

if (await exists('./.env')) {
  // ...
}
```

### Build paths safely

```ts
import { join, resolve, relative, basename, extname } from '@elitjs/path';

const root = resolve('./src');
const file = join(root, 'pages', 'HomePage.ts');       // 'src/pages/HomePage.ts' (POSIX) or 'src\\pages\\HomePage.ts' (Windows)
const rel  = relative(root, file);                       // 'pages/HomePage.ts'
const name = basename(file);                              // 'HomePage.ts'
const ext  = extname(file);                               // '.ts'
```

### Parse a path into components

```ts
import { parse } from '@elitjs/path';

const { dir, base, name, ext, root } = parse('/app/src/pages/HomePage.ts');
// dir='/app/src/pages', base='HomePage.ts', name='HomePage', ext='.ts', root='/'
```

### Promise-chained pipeline

```ts
import { promises as fs } from '@elitjs/fs';
import { join } from '@elitjs/path';

const files = (await fs.readdir('./src'))
  .filter((f) => f.endsWith('.ts'))
  .map((f) => fs.readFile(join('./src', f), { encoding: 'utf8' }));

const sources = await Promise.all(files);
```

### Cross-runtime compatibility

```ts
import { getRuntime } from '@elitjs/fs';

const runtime = getRuntime();   // 'node' | 'bun' | 'deno'
```

Same code runs unchanged on all three runtimes — the package dispatches internally.

## Rules

- Default to async (Promise) APIs. Sync variants block the event loop — only use during startup or in CLI tools.
- `readFile` returns a `Buffer` unless `encoding` is set. Pass `{ encoding: 'utf8' }` for string output.
- `mkdir(p, { recursive: true })` is idempotent — won't throw if the directory exists.
- `readdir(p, { withFileTypes: true })` returns `Dirent[]` — call `entry.isFile()` / `isDirectory()` to filter.
- `exists()` (async) and `existsSync()` are convenient but racy — between the check and the next operation, the file may change. Prefer `try/catch` around the actual operation when correctness matters.
- `@elitjs/path` defaults to the host platform's behavior. Use `posix` or `win32` explicitly when normalizing paths for cross-platform output.
- `join()` does not resolve symlinks or `..` segments absolutely — use `resolve()` for absolute paths.
- `promises` namespace mirrors Node's `fs/promises` — same shape, same semantics.
- These packages are server-side. Don't import them into client bundles.

## Anti-Patterns

- Using sync I/O in a request handler — blocks the event loop.
- Hardcoding path separators (`'a\\b'`). Use `join()` or `sep` — works cross-platform.
- `readFile` without `encoding` and expecting a string — you'll get a `Buffer`.
- `await readdir(p)` then calling `statSync(p + '/' + name)` in a tight loop. Use `withFileTypes: true` to avoid extra syscalls.
- `mkdir(p)` without `{ recursive: true }` when the parent might not exist — throws `ENOENT`.
- Treating `exists()` as authoritative. Race conditions are real.

## Validation

- `await readFile('./package.json', { encoding: 'utf8' })` returns valid JSON string.
- `await exists('./node_modules')` returns true after install.
- `join('a', 'b', 'c.ts')` returns `'a/b/c.ts'` on POSIX.
- `getRuntime()` matches the actual runtime your process is in.
