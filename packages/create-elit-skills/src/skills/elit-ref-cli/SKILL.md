---
name: elit-ref-cli
description: 'Reference for Elit.js CLI commands: elit (dev, build, build-dev, build-preview, preview, test, desktop, mobile, native, pm, wapk) with all flags and sub-commands, plus create-elit scaffolder with templates (basic-example, todo-fullstack-example, auth-fullstack-example) and -t/--template, -l/--list-templates flags. Use when generating commands, scaffolding apps, or wiring scripts.'
argument-hint: 'Describe the task (dev/build/preview/test/desktop/mobile/native/pm/wapk) or scaffolding need (template name, target dir) and any flags.'
user-invocable: true
---

# Elit CLI Reference

Two separate binaries:

- **`elit`** — main toolkit CLI (dev server, build, test, desktop, mobile, native, pm, wapk). Reads config from `elit.config.{ts,mts,js,mjs,cjs,json}` in project root.
- **`create-elit`** — scaffolds new projects from a template. Run as `npm create elit@latest`, `yarn create elit`, `pnpm create elit`, or `bun create elit`.

## `elit` — main CLI

```
Usage:
  elit <command> [options]
  elit --version | -v
  elit help
```

### Global flags

| Flag | Effect |
| --- | --- |
| `-v, --version` | Print version |
| `help` | Print full help (also printed on unknown command) |

### `elit dev` — development server

Start `@elitjs/server`'s `createDevServer` with HMR, transpilation, WebSocket-shared state, proxy, and workers.

```
elit dev [options]

  -p, --port <number>    Port (default: 3000)
  -h, --host <string>    Host (default: localhost)
  -r, --root <path>      Root directory to serve
  --no-open              Don't open browser automatically
  --silent               Disable logging
```

Reads `dev` block from config. Supports multi-client via `clients[]`.

### `elit build` — production bundle

```
elit build [options]

  -e, --entry <file>     Entry file (required when not in config)
  -o, --out-dir <dir>    Output directory (default: dist)
  -f, --format <format>  Output format: esm | cjs | iife (default: esm)
  --no-minify            Disable minification
  --sourcemap            Generate sourcemap
  --silent               Disable logging
```

Reads `build` block — single object `build: { ... }` or array `build: [{ ... }, { ... }]` (runs sequentially).

### `elit build-dev` / `elit build-preview` — standalone server bundles

```
elit build-dev [--dev-out-file server.js]
elit build-preview [--preview-out-file server.js]
```

Produces a self-contained server bundle that runs without `elit dev` / `elit preview`.

### `elit preview` — preview production build

```
elit preview [options]

  -p, --port <number>      Port (default: 4173)
  -h, --host <string>      Host (default: localhost)
  -r, --root <dir>         Root directory (default: dist or build.outDir)
  -b, --base-path <path>   Base path for the application
  --no-open                Don't open browser automatically
  --silent                 Disable logging
```

Has full feature parity with `dev`: single + multi-client, REST API, WebSocket, proxy, workers, HTTPS, middleware, SSR.

### `elit test` — test runner

```
elit test [options]

  -r, --run                              Run all tests once (default)
  -w, --watch                            Watch mode
  -f, --file <files>                     Specific files (comma-separated)
  -d, --describe <name>                  Filter by describe name
  -t, --it <name>                        Filter by test name
  -c, --coverage                         Enable coverage
  -cr, --coverage-reporter <reporters>   comma-separated: text, html, lcov, json, coverage-final.json, clover
```

Defaults run all tests in `**/*.test.ts` / `**/*.spec.ts` once. Uses `@elitjs/test` runner with Jest-compatible globals.

### `elit desktop` — desktop runtime

```
elit desktop [entry]                 Run with resolved desktop mode
elit desktop run [entry]             Explicit run alias
elit desktop build [entry]           Build standalone executable
elit desktop wapk <file.wapk>        Run packaged app in desktop shell

  --runtime node|bun|deno            Override backend runtime
  --mode native                      Use desktop.native.entry
  --release                          Build release executable
```

Reads `desktop.entry`, `desktop.native.entry`, `desktop.mode` from config when `[entry]` is omitted.

### `elit mobile` — native mobile workflow

```
elit mobile init [dir]               Initialize native mobile config
elit mobile doctor [--json]          Validate toolchain and setup
elit mobile sync                     Sync web assets to native projects
elit mobile open android|ios         Open platform project in IDE
elit mobile run android|ios          Run on device or emulator
elit mobile build android|ios        Build native app artifacts
```

Reads `mobile` config. `doctor --json` prints machine-readable status.

### `elit native` — native code generation

```
elit native generate android <entry>    Emit Jetpack Compose
elit native generate ios <entry>        Emit SwiftUI
elit native generate ir <entry>         Emit native IR JSON

  --out <file>                          Write output to file
  --name <name>                         Compose function or SwiftUI struct name
  --package <name>                      Kotlin package (android only)
  --export <name>                       Select specific module export
```

### `elit pm` — process manager

Manage background processes and packaged apps.

```
elit pm start --script "npm start" -n my-app            Start shell command in background
elit pm start ./app.ts -n my-app                        Start a file with inferred runtime
elit pm start --wapk ./app.wapk -n my-app               Start a WAPK app
elit pm start --wapk gdrive://<fileId> -n my-app        Start a Google Drive WAPK
elit pm start --google-drive-file-id <id> -n my-app     Same, without positional source
elit pm start my-app --watch                            Start one configured app with watch
elit pm start                                          Start all pm.apps[] entries
elit pm start my-app                                    Start one configured app by name

elit pm list                                            Status table
elit pm list --json                                     Status as JSON
elit pm show <name>                                     Full metadata
elit pm describe <name> --json                          One process as JSON
elit pm stop <name|all>                                 Stop one or all
elit pm restart <name|all>                              Restart one or all
elit pm delete <name|all>                               Remove metadata and logs
elit pm save                                            Persist running list to pm.dumpFile
elit pm resurrect                                       Restart last saved list
elit pm logs <name> --lines 100                         Recent stdout/stderr
```

`-n, --name` is required for `start` (except when starting a configured app by name). Reads `pm.apps[]`, `pm.dataDir`, `pm.dumpFile` from config.

### `elit wapk` — WAPK archive tooling

```
elit wapk [file.wapk]                                   Run packaged app
elit wapk gdrive://<fileId>                             Run from Google Drive
elit wapk gdrive://<fileId> --online                    Host on Elit Run
elit wapk run [file.wapk]                               Explicit run alias
elit wapk run --google-drive-file-id <id>               Run from Drive by ID
elit wapk pack [directory]                              Pack directory into .wapk
elit wapk patch <file.wapk> --from <patch.wapk>         Apply manifest-driven patch
elit wapk inspect <file.wapk>                           Inspect archive
elit wapk extract <file.wapk>                           Extract archive
elit wapk --runtime node|bun|deno [file]                Override packaged runtime
```

## Config file (`elit.config.*`)

Resolved from project root in this order: `.ts` → `.mts` → `.js` → `.mjs` → `.cjs` → `.json`. The `.ts` form is preferred — the loader transpiles it on the fly.

Key blocks:

```ts
export default {
  dev: { /* DevServerOptions */ },
  build: { /* single */ } | [ /* multi */ ],
  preview: { /* PreviewOptions */ },
  test: { /* TestConfig */ },
  mobile: { /* MobileConfig */ },
  desktop: { /* DesktopConfig */ },
  wapk: { /* WapkConfig */ },
  pm: { /* PmConfig */ }
};
```

For exact sub-shapes see [elit-ref-server](.claude/skills/elit-ref-server/SKILL.md), [elit-ref-build](.claude/skills/elit-ref-build/SKILL.md), and the project-structure skill.

### Notable config features

- **Multi-client** (`clients[]` in dev/preview): each client has `root`, `basePath`, own `proxy`, `worker`, `api`, `ws`, `middleware`.
- **Proxy**: `{ context, target, changeOrigin?, pathRewrite?, headers?, ws? }`. Client-specific wins over global.
- **Workers**: `{ path, name?, type?: 'module' | 'classic' }`. Both global and client-specific are loaded.
- **API**: a `ServerRouter` instance. Client-specific routes are prefixed with `basePath`.
- **WebSocket**: `{ path, handler }`. Client-specific endpoints prefixed with `basePath`.

## `create-elit` — project scaffolder

```
npm create elit@latest [project-name] [options]
yarn create elit [project-name] [options]
pnpm create elit [project-name] [options]
bun create elit [project-name] [options]

Options:
  -t, --template <name>    Choose a template
  -l, --list-templates     Show available templates and exit
  -h, --help               Show help

Aliases:
  --list                   Same as -l
  --template=<name>        Inline form
  -t=<name>                Inline form
```

Default project name is `my-elit-app`. Default template is `basic-example`.

### Templates

| ID | Aliases | Description |
| --- | --- | --- |
| `basic-example` | `basic`, `basic-example` | Lightweight single-page starter (default) |
| `todo-fullstack-example` | `todo`, `todo-fullstack-example` | Database-backed todo workspace starter |
| `auth-fullstack-example` | `auth`, `auth-fullstack-example` | Authentication and chat starter |

### Patterns

```bash
# Default (basic-example) into ./my-app
npm create elit@latest my-app

# Todo starter
npm create elit@latest my-app -t todo

# Auth starter with explicit name
npm create elit@latest my-app --template auth-fullstack-example

# List templates
npm create elit@latest --list

# Scaffold into current dir (empty dir required)
npm create elit@latest .
```

The scaffolder also copies a shared AI profile template into `.claude/skills/` and `.agents/skills/` so newly-created projects have AI assistance configured from the start.

## Rules

- `elit` requires an `elit.config.*` file in the project root for most commands. The CLI loads it via `@elitjs/config`'s `loadConfig()`.
- `elit build --entry` is required when no `build.entry` is in config. With config, the flag overrides config.
- `elit dev` opens the browser unless `--no-open`. In scripts/CI, always pass `--no-open`.
- `elit test` exits non-zero on any failure — safe to chain `&&` in CI.
- `create-elit` refuses to overwrite an existing directory. Delete or pick a new name.
- Template names accept any alias (e.g. `todo` → `todo-fullstack-example`). Unknown names exit with code 1 and print the list.
- `elit pm start` without `-n` is an error (unless the positional is a configured app name).
- `elit wapk gdrive://` requires either network access to Google Drive or `--online` for Elit Run hosting.
- Mobile commands require platform toolchain (`android` needs Android Studio + JDK; `ios` needs Xcode). `elit mobile doctor` validates.

## Anti-Patterns

- Running `elit build` without `--entry` or `build.entry` in config. The CLI errors out — set it in config or pass `-e`.
- Forgetting `--no-open` on headless CI. Browser-open attempts can fail silently or hang.
- Editing `dist/` after `elit build` and expecting changes to persist. `elit build` overwrites `outDir`.
- Using `elit pm start` without `-n` for shell commands. Two unnamed processes collide.
- Expecting `elit preview` to skip WebSocket / proxy / workers. It has parity with `dev` — they all run.
- `npm create elit` (no `@latest`) — works today but can resolve to a cached older version. Always use `@latest`.
- Hardcoding absolute paths in config. Use relative paths; `@elitjs/config` resolves them to `process.cwd()`.

## Validation

- `elit --version` prints `elit v<x.y.z>`.
- `elit help` lists every command.
- In a fresh project: `elit dev` should bind to `http://localhost:3000` and serve the configured root.
- `elit build -e src/main.ts` should produce `dist/main.js` (or `outDir/outFile` from config).
- `elit test` should discover and run `*.test.ts` files; failures cause non-zero exit.
- `npm create elit@latest --list` should print the three template names.
- `npm create elit@latest smoke -t basic` should create `./smoke/` with `package.json`, `tsconfig.json`, and `src/main.ts`.
