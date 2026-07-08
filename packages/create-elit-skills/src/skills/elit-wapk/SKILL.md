---
name: elit-wapk
description: 'Package, run, inspect, extract, and patch .wapk archives — Elit.js self-contained app packages with header + files + optional AES-256-GCM lock. Covers elit wapk CLI (run/pack/patch/inspect/extract with --runtime/--password/--online/--watcher/--google-drive-file-id flags), @elitjs/wapk JS API (packWapkDirectory, extractWapkArchive, patchWapkArchive, readWapkArchive, runWapkCommand, prepareWapkApp, runPreparedWapkApp), wapk.config.* shape, .wapkignore/.wapkpatch files, Google Drive mode, Elit Run online sessions, WapkHeader/WapkProjectConfig/DecodedWapk types. Use when distributing or running Elit apps as archives.'
argument-hint: 'Describe the WAPK task (pack dir, run archive, inspect contents, patch target, lock with password, run from Google Drive, host online) and the source/target.'
user-invocable: true
---

# Elit.js WAPK

`.wapk` is Elit.js's archive format for distributing apps as a single file. A WAPK contains a binary header (metadata + scripts) and the project files (including `node_modules` by default). Optionally encrypted with AES-256-GCM.

The runtime that runs a WAPK is one of `node | bun | deno` — no Elit CLI needs to be installed on the target machine, only the runtime.

## Two surfaces

- **CLI** — `elit wapk <command>` for terminal use, plus the standalone `wapk` binary in `@elitjs/wapk`.
- **JS API** — `@elitjs/wapk` exports for programmatic packing, extracting, patching, and running.

## CLI

```
wapk [file.wapk]                              Run packaged app (default subcommand)
wapk gdrive://<fileId>                        Run remote archive from Google Drive
wapk run [file.wapk]                          Explicit run alias
wapk pack [directory]                         Pack directory into .wapk
wapk patch <file.wapk> --from <patch.wapk>    Apply manifest-driven patch
wapk inspect <file.wapk>                      Show metadata + file list
wapk extract <file.wapk>                      Extract into ./<name>/

Options (run):
  -r, --runtime <name>                        Runtime override: node, bun, deno
  --sync-interval <ms>                        Live-sync polling interval (default 300)
  --archive-sync-interval <ms>                Polling interval for external archive changes
  --watcher, --use-watcher                    Event-driven file watcher (less CPU)
  --archive-watch / --no-archive-watch        Pull external archive changes back into workdir
  --online                                    Create Elit Run shared session (stays alive)
  --allow-sigterm-close                       Let SIGTERM close the online session
  --online-url <url>                          Elit Run URL override
  --google-drive-file-id <id>                 Run remote archive from Google Drive
  --google-drive-token-env <name>             Env var with OAuth token (default GOOGLE_DRIVE_ACCESS_TOKEN)
  --google-drive-access-token <value>         Inline OAuth token
  --google-drive-shared-drive                 Include supportsAllDrives=true

Options (pack / lock):
  --password <value>                          Lock the archive (AES-256-GCM + scrypt)
  --output <file.wapk>                        Override default output path

Options (patch):
  --from <patch.wapk> / --use <patch.wapk>    Patch source archive
  --from-password <value>                     Unlock the patch archive if it uses a different password

Options (inspect / extract):
  --password <value>                          Unlock encrypted archive

Notes:
  - Pack reads wapk.config.* (or elit.config.* wapk field); falls back to package.json.
  - appId/publisherId auto-generate from package metadata when not configured.
  - node_modules are packed by default — use .wapkignore to exclude.
  - Locked archives require the SAME password for run/extract/inspect.
  - Run never installs dependencies — archives must bundle what they need.
  - Run keeps files in RAM and syncs changes both directions (workdir ↔ archive source).
  - Browser-style archives run scripts.start automatically.
```

## JS API (`@elitjs/wapk`)

```ts
import {
  packWapkDirectory,            // (directory, options?) => Promise<string>
  extractWapkArchive,          // (wapkPath, outputDir?, options?) => string
  patchWapkArchive,            // (wapkPath, { from, fromPassword?, password? }) => Promise<WapkPatchResult>
  readWapkArchive,             // (wapkPath, options?) => DecodedWapk
  runWapkCommand,              // (argv: string[]) => Promise<void>  — programmatic CLI entry
  prepareWapkApp,              // (archivePath, options?) => Promise<PreparedWapkApp>
  runPreparedWapkApp,          // (prepared: PreparedWapkApp) => Promise<void>
  createWapkLiveSync,          // (prepared, options?) => Promise<WapkLiveSyncController>
  getWapkRuntimeArgs,          // (prepared) => string[]
  resolveWapkRuntimeExecutable,// (runtime) => string
  shouldUseShellExecution,     // (command) => boolean
  WAPK_RUNTIMES                // ['node', 'bun', 'deno']
} from '@elitjs/wapk';
```

### Types

```ts
type WapkRuntimeName = 'node' | 'bun' | 'deno';

interface WapkHeader {
  name: string;
  version: string;
  runtime: WapkRuntimeName;
  entry: string;
  scripts: Record<string, string>;
  appId?: string;
  publisherId?: string;
  port?: number;
  env?: Record<string, string>;
  desktop?: Record<string, unknown>;
  createdAt: string;
  author?: string;
  license?: string;
  homepage?: string;
  bugs?: string | { url: string };
  repository?: string | { type?: string; url?: string };
}

interface WapkFileEntry {
  path: string;
  content: Buffer;
  mode: number;
}

interface DecodedWapk {
  version: 1 | 2;                  // 1 = unlocked, 2 = locked
  header: WapkHeader;
  files: WapkFileEntry[];
  lock?: { password: true };       // present when locked
}

interface WapkCredentialsOptions {
  password?: string;
}

interface WapkProjectConfig {
  name: string;
  version: string;
  runtime: WapkRuntimeName;
  entry: string;
  scripts: Record<string, string>;
  appId?: string;
  publisherId?: string;
  port?: number;
  env?: Record<string, string>;
  desktop?: Record<string, unknown>;
  lock?: { password: string };
}

interface WapkPatchResult {
  archiveLabel: string;
  patchedPaths: string[];
  addedPaths: string[];
  updatedPaths: string[];
  unchangedPaths: string[];
}

interface PreparedWapkApp {
  archivePath: string;
  workDir: string;
  entryPath: string;
  header: WapkHeader;
  runtime: WapkRuntimeName;
  syncInterval?: number;
  useWatcher?: boolean;
  watchArchive?: boolean;
  archiveSyncInterval?: number;
  lock?: { password: string };
  // ...internal fields
}

interface WapkLiveSyncController {
  flush(): Promise<void>;
  stop(): Promise<void>;
}
```

## Config (`wapk.config.*` or `elit.config.*` wapk field)

Resolution order: `wapk.config.{ts,mts,js,mjs,cjs,json}` first, then `elit.config.*`'s `wapk` block, then `package.json`. First match wins.

```ts
// wapk.config.ts
export default {
  name: 'my-app',
  version: '1.0.0',
  appId: 'com.example.myapp',
  publisherId: 'com.example',
  runtime: 'node',
  entry: './dist/main.js',
  port: 3000,
  scripts: {
    start: 'node ./dist/main.js',
    postinstall: 'node ./scripts/migrate.js'
  },
  env: { APP_NAME: 'My App', DEBUG: 'false' },
  desktop: { /* arbitrary desktop metadata */ },
  lock: { password: process.env.WAPK_PASSWORD },     // omit to leave unlocked
  run: {
    file: './app.wapk',
    runtime: 'node',
    password: process.env.WAPK_PASSWORD,
    online: false,
    onlineUrl: 'https://wapk.d-osc.com',
    syncInterval: 150,
    useWatcher: true,
    watchArchive: true,
    archiveSyncInterval: 150,
    googleDrive: {
      fileId: '1abc...',
      accessToken: '...',
      accessTokenEnv: 'GDRIVE_TOKEN',
      supportsAllDrives: true
    }
  }
};
```

When `appId` or `publisherId` are not set, pack derives stable defaults from `package.json` metadata (name, scope, author, repository, homepage).

## Ignore file (`.wapkignore`)

Same syntax as `.gitignore`. Defaults already exclude:

```
.elit-config-*
wapk.config.json
```

`node_modules` is INCLUDED by default. Patterns:

- `pattern` — exclude matches
- `!pattern` — re-include matches (later patterns win)

```
# .wapkignore
node_modules/**/*.test.ts
node_modules/**/*.md
!node_modules/important/keep-me.md
*.log
coverage/
```

## Patch file (`.wapkpatch`)

Manifest listing which archive-relative paths are eligible for patching. Lives inside a "patch archive" — when `wapk patch <target.wapk> --from <patch.wapk>` runs, only paths declared in the patch's `.wapkpatch` get applied to the target.

Target metadata (name, version, lock state) is preserved; only matched file contents change. Use `--from-password` when the patch archive is locked with a different password than the target.

## File format internals

```
[WAPK magic 4 bytes]
[version u32]                         1 = unlocked, 2 = locked
if version === 2:
  [lock metadata: cipher, kdf, salt, iv, tag, user?] (JSON)
  [encrypted payload]
else:
  [payload]

Payload = JSON header + concatenated file entries (path, mode, content)
```

- Magic: ASCII `WAPK` (4 bytes).
- Cipher: `aes-256-gcm` with scrypt-derived key (N=16384, r=8, p=1, keylen=32).
- AAD: `WAPK` (or `WAPK:<user>` for legacy archives).

You don't normally need to know this — use the JS API or CLI.

## Patterns

### Pack the current project

```bash
# Reads wapk.config.ts or elit.config.ts → produces ./my-app.wapk
elit wapk pack .

# Pack with a password (locks the archive)
elit wapk pack . --password "$WAPK_PASSWORD"
```

### Run a local archive

```bash
elit wapk run ./my-app.wapk
elit wapk ./my-app.wapk --runtime bun   # override packaged runtime
```

### Inspect contents

```bash
elit wapk inspect ./my-app.wapk
# Output: name, version, runtime, entry, appId, port, createdAt, file list with sizes

elit wapk inspect ./my-app.wapk --password "$WAPK_PASSWORD"  # for locked archives
```

### Extract

```bash
elit wapk extract ./my-app.wapk
# Creates ./my-app/<files>

elit wapk extract ./my-app.wapk ./output/ --password "$WAPK_PASSWORD"
```

### Pack programmatically

```ts
import { packWapkDirectory } from '@elitjs/wapk';

const outputPath = await packWapkDirectory('./my-project', {
  password: process.env.WAPK_PASSWORD,        // omit for unlocked
  outputPath: './dist/my-app.wapk'
});
console.log('Packed to', outputPath);
```

### Read header without extracting

```ts
import { readWapkArchive } from '@elitjs/wapk';

const archive = readWapkArchive('./my-app.wapk', { password: process.env.WAPK_PASSWORD });
console.log(archive.header.name, archive.header.version);
console.log(archive.files.length, 'files');
const main = archive.files.find((f) => f.path === archive.header.entry);
if (main) console.log('Entry size:', main.content.length, 'bytes');
```

### Patch a target archive

```bash
# Apply updates from patch-v2.wapk to my-app.wapk
# Only paths listed in patch-v2.wapk's .wapkpatch are affected
elit wapk patch ./my-app.wapk --from ./patch-v2.wapk
```

```ts
import { patchWapkArchive } from '@elitjs/wapk';

const result = await patchWapkArchive('./my-app.wapk', {
  from: './patch-v2.wapk',
  fromPassword: process.env.PATCH_PASSWORD,    // if patch is locked
  password: process.env.TARGET_PASSWORD         // if target is locked
});

console.log(`Patched ${result.patchedPaths.length} files`);
console.log(`Added ${result.addedPaths.length}, updated ${result.updatedPaths.length}`);
```

### Prepare + run with live sync

```ts
import { prepareWapkApp, runPreparedWapkApp, createWapkLiveSync } from '@elitjs/wapk';

const prepared = await prepareWapkApp('./my-app.wapk', {
  password: process.env.WAPK_PASSWORD,
  syncInterval: 150,
  useWatcher: true,
  watchArchive: true
});

const sync = await createWapkLiveSync(prepared);
await runPreparedWapkApp(prepared);

// Later — flush pending writes, then stop sync
await sync.flush();
await sync.stop();
```

`prepareWapkApp` extracts to a temp workdir but keeps the archive as the source of truth — edits in the workdir write back, and external archive changes sync forward.

### Google Drive (no local archive)

```bash
# Default token env var: GOOGLE_DRIVE_ACCESS_TOKEN
export GOOGLE_DRIVE_ACCESS_TOKEN="ya29.…"
elit wapk run --google-drive-file-id 1abc234def

# Shared drive
elit wapk run --google-drive-file-id 1abc234def --google-drive-shared-drive
```

```ts
// wapk.config.ts
export default {
  // ...
  run: {
    googleDrive: {
      fileId: '1abc234def',
      accessTokenEnv: 'GDRIVE_TOKEN',     // custom env var name
      supportsAllDrives: true
    }
  }
};
```

### Elit Run online session

Hosts the archive on Elit Run and shares a URL — the CLI stays alive until Ctrl+C (default ignores SIGTERM).

```bash
elit wapk ./my-app.wapk --online
elit wapk ./my-app.wapk --online --online-url https://wapk.d-osc.com
elit wapk ./my-app.wapk --online --password "$WAPK_PASSWORD"   # locked + online needs password

# Let an external supervisor close the session with SIGTERM
elit wapk ./my-app.wapk --online --allow-sigterm-close
```

### PM integration

`pm.apps[]` entries can launch a WAPK directly:

```ts
// elit.config.ts
pm: {
  apps: [
    {
      name: 'packaged',
      wapk: './app.wapk',
      password: process.env.WAPK_PASSWORD,
      wapkRun: {
        runtime: 'node',
        useWatcher: true,
        watchArchive: true,
        syncInterval: 150
      }
    },
    {
      name: 'remote',
      wapk: 'gdrive://1abc234def',
      wapkRun: { googleDrive: { fileId: '1abc234def', accessTokenEnv: 'GDRIVE_TOKEN' } }
    }
  ]
}
```

### Desktop runtime

WAPK archives can run inside the desktop shell:

```bash
elit desktop wapk ./my-app.wapk
```

Config:

```ts
// elit.config.ts
desktop: {
  wapk: {
    runtime: 'node',          // 'node' | 'bun' | 'deno'
    syncInterval: 150,
    useWatcher: true,
    release: false
  }
}
```

## Rules

- A WAPK runs on any machine that has the runtime (`node`, `bun`, or `deno`) — no `npm install` required.
- `node_modules` is included by default. Use `.wapkignore` to trim. Test files, READMEs, sourcemaps — exclude explicitly if you care about size.
- `--password` on `pack` produces a version-2 (locked) archive. The same password unlocks it for run/inspect/extract.
- `appId` and `publisherId` are stable logical identifiers embedded in the header. Don't change them between versions of the same app.
- When `appId`/`publisherId` are omitted, they're derived from `package.json` (name, scope, author, repository, homepage) — keep those fields stable so derived IDs don't drift.
- The runtime named in the header is a default. `--runtime` on the CLI or `wapk.run.runtime` in config overrides it.
- `scripts.start` runs automatically when a browser-style archive is launched. If absent, the runtime executes the `entry` file directly.
- `prepareWapkApp` extracts to a temp dir but doesn't run anything. Call `runPreparedWapkApp` to spawn the runtime.
- `createWapkLiveSync` is optional — without it, changes in the temp workdir don't write back to the archive.
- Patch is content-addressed by archive-relative path. If the target layout changed since the patch was made, the patch is a no-op for moved files.
- Google Drive mode requires an OAuth token with Drive read access. `accessTokenEnv` names the env var; the default is `GOOGLE_DRIVE_ACCESS_TOKEN`.
- Online mode is for live sharing via Elit Run. It is NOT a production server — close the session when done.
- `--sync-interval` minimum is 50ms. Below that, polling starves the event loop.

## Anti-Patterns

- Committing `*.wapk` files to git. They're binaries that include `node_modules` — every change bloats the repo.
- Locking with a password committed to the repo. Always load from env: `lock: { password: process.env.WAPK_PASSWORD }`.
- Packing from `dist/` while `dist/` is gitignored and stale. Run `elit build` before `elit wapk pack` — pack captures the directory state at invocation.
- Forgetting to bump `version` in `wapk.config.*` between releases. Consumers can't tell which archive is newer.
- Excluding `node_modules` and expecting the archive to "just install on the target". Run mode never installs deps.
- Using `--password` on `inspect` of an unlocked archive. It's ignored — but on a locked archive, omitting it returns only envelope-level info.
- Patching a locked target without `--password`. The patch operation needs to read AND write, so it needs the credential.
- Expecting `--online` to keep running after SIGTERM by default and shipping it under a supervisor that sends SIGTERM. Either pass `--allow-sigterm-close` or wire up Ctrl+C-equivalent shutdown.
- Packing a browser-only entry as a server-runtime WAPK. Browser-style archives with `scripts.start` run that script automatically — pick the right shape.
- Reusing the same `appId` across two different apps. The header's `appId` is how registries dedupe — collisions overwrite.

## Validation

- `elit wapk inspect ./my-app.wapk` shows the header (name, version, runtime, entry, appId, publisherId, createdAt) and every file with its size.
- `elit wapk extract ./my-app.wapk ./smoke/` then `cd ./smoke/my-app && node ./dist/main.js` should execute the app standalone.
- After `packWapkDirectory(dir, { password })`, `readWapkArchive(path, { password })` should succeed; without the password it should fail.
- `decodeWapk(buffer).version === 2` confirms the archive is locked; `=== 1` confirms unlocked.
- `patchWapkArchive(target, { from: patch })` returns `WapkPatchResult` — `patchedPaths.length + addedPaths.length + updatedPaths.length` should match the patch's `.wapkpatch` manifest.
- A locked archive's size is slightly larger than the unlocked equivalent (adds salt, IV, auth tag — about 60 bytes overhead).
- `elit wapk run ./my-app.wapk --runtime deno` should work even if the archive header says `runtime: 'node'` — the CLI override wins.
