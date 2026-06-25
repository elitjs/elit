# Elit CLI

Reference for the current `elit` command-line interface.

## Main Commands

```bash
elit dev
elit build --entry ./src/main.ts --out-dir dist
elit build-dev
elit build-preview
elit --version
elit preview
elit test
elit desktop ./src/main.ts
elit desktop run --mode native
elit desktop build ./src/main.ts --release
elit mobile init
elit mobile run android
elit native generate android ./src/native-screen.ts --name HomeScreen
elit pm start --script "npm start" --name my-app
elit wapk pack .
elit wapk run ./app.wapk
```

## Global Flags

- `--version`, `-v`: show the installed Elit CLI version

## Core Commands

### `elit dev`

Starts the development server.

Common flags:

- `--port`, `-p`
- `--host`, `-h`
- `--root`, `-r`
- `--no-open`
- `--silent`
- `--no-server-watch` — disable server-side HMR (auto-restart on server-source edits). Default is on; see `dev.serverWatch` in config for finer control.

- single-root apps
- `clients[]` multi-app setups
- `api`, `proxy`, `worker`, `ws`, and `ssr`

### `elit build`

Builds one entry or a config-driven build matrix.

Common flags:

- `--entry`, `-e`
- `--out-dir`, `-o`
- `--format`, `-f`
- `--no-minify`
- `--sourcemap`
- `--silent`

`build` compiles the client output. Use the standalone build commands when you also want a runnable Node server bundle.

### `elit build-dev`

Builds production output and emits a standalone development server bundle.

Common flags:

- `--entry`, `-e`
- `--out-dir`, `-o`
- `--format`, `-f`
- `--dev-out-file <file>`
- `--no-minify`
- `--sourcemap`
- `--silent`

`build-dev` reuses the normal `build` pipeline, then emits a standalone dev server bundle. The server bundle uses `dev.outDir` or defaults to `dev-dist`, and defaults to `index.js` so you can run it directly with `node index.js`.

### `elit build-preview`

Builds production output and emits a standalone preview server bundle.

Common flags:

- `--entry`, `-e`
- `--out-dir`, `-o`
- `--format`, `-f`
- `--preview-out-file <file>`
- `--no-minify`
- `--sourcemap`
- `--silent`

`build-preview` reuses the normal `build` pipeline, then emits a standalone preview server bundle into the preview output root. The preview server defaults to `index.js`, so you can run it directly with `node index.js` after the build completes.

### `elit preview`

Runs the built output through the same server model as `dev`.

Common flags:

- `--port`, `-p`
- `--host`, `-h`
- `--root`, `-r`
- `--base-path`, `-b`
- `--no-open`
- `--silent`

Unlike many preview servers, Elit preview supports:

- `clients[]`
- `api`
- `ws`
- `proxy`
- `worker`
- `ssr`

### `elit test`

Runs the built-in test runner.

Common flags:

- `--run`, `-r`
- `--watch`, `-w`
- `--file`, `-f`
- `--describe`, `-d`
- `--it`, `-t`
- `--coverage`, `-c`
- `--coverage-reporter`, `-cr`

### `elit desktop`

Desktop runtime and build workflow.

Forms:

- `elit desktop [entry]`
- `elit desktop run [entry]`
- `elit desktop build [entry]`
- `elit desktop wapk <file.wapk>`

Important options and behavior:

- `--mode native` uses `desktop.native.entry` unless an explicit entry is passed
- `--runtime quickjs|node|bun|deno`
- `--compiler auto|none|esbuild|tsx|tsup`
- `--release`
- omitted entry resolution follows `desktop.mode`, `desktop.entry`, and `desktop.native.entry`

### `elit mobile`

Native mobile project management.

Forms:

- `elit mobile init [dir]`
- `elit mobile doctor [--json]`
- `elit mobile sync`
- `elit mobile open android|ios`
- `elit mobile run android|ios`
- `elit mobile build android|ios`

Mobile config defaults come from `config.mobile`.

### `elit native generate`

Generates native outputs from an Elit entry.

Forms:

- `elit native generate android <entry>`
- `elit native generate ios <entry>`
- `elit native generate ir <entry>`

Useful options:

- `--out <file>`
- `--name <name>`
- `--package <name>` for Android
- `--export <name>` to read a specific module export

### `elit pm`

Detached process manager for shell commands, file targets, and WAPK apps.

Forms:

- `elit pm start --script "npm start" --name my-app`
- `elit pm start ./src/app.ts --name my-app`
- `elit pm start --file ./src/app.js --name my-app`
- `elit pm start --wapk ./app.wapk --name my-app`
- `elit pm start --wapk ./app.wapk --name my-app --online`
- `elit pm start --wapk gdrive://<fileId> --name my-app`
- `elit pm start --google-drive-file-id <fileId> --name my-app`
- `elit pm start`
- `elit pm start my-app`
- `elit pm list`
- `elit pm list --json`
- `elit pm show <name>`
- `elit pm describe <name> --json`
- `elit pm stop <name|all>`
- `elit pm restart <name|all>`
- `elit pm reload <name|all>`
- `elit pm scale <name> <count>`
- `elit pm reset <name|all>`
- `elit pm send-signal <signal> <name|all>`
- `elit pm delete <name|all>`
- `elit pm save`
- `elit pm resurrect`
- `elit pm logs <name>`

Useful options:

- `--runtime node|bun|deno`
- `--instances <count>`
- `--cwd <dir>`
- `--env KEY=VALUE`
- `--password <value>` for locked WAPK apps
- `--online` for PM-managed Elit Run WAPK hosting
- `--online-url <url>` for a custom Elit Run origin
- `--google-drive-file-id <id>` for remote WAPK apps
- `--google-drive-token-env <env>` for remote WAPK apps
- `--google-drive-access-token <token>` for remote WAPK apps
- `--google-drive-shared-drive` for shared-drive WAPK files
- `--sync-interval <ms>` for WAPK run live sync
- `--watcher` for WAPK run event-driven sync
- `--archive-watch` and `--no-archive-watch` for WAPK archive pull sync
- `--archive-sync-interval <ms>` for WAPK archive polling
- `--restart-policy always|on-failure|never`
- `--proxy-port <port>`
- `--proxy-strategy <proxy|inherit>`
- `--proxy-host <host>`
- `--proxy-target-host <host>`
- `--proxy-env <name>`
- `--max-memory <bytes|size>`
- `--memory-action restart|stop`
- `--cron-restart <expr>`
- `--exp-backoff-restart-delay <ms>`
- `--exp-backoff-restart-max-delay <ms>`
- `--restart-window <ms>`
- `--wait-ready`
- `--listen-timeout <ms>`
- `--min-uptime <ms>`
- `--watch`
- `--watch-path <path>`
- `--watch-ignore <pattern>`
- `--watch-debounce <ms>`
- `--health-url <url>`
- `--health-grace-period <ms>`
- `--health-interval <ms>`
- `--health-timeout <ms>`
- `--health-max-failures <count>`
- `--no-autorestart`
- `--restart-delay <ms>`
- `--kill-timeout <ms>`
- `--max-restarts <count>`

Notes:

- `pm start` without a target starts every app from `pm.apps[]` in `elit.config.*`.
- `pm start <name>` resolves one configured app by name.
- `pm reload <name|all>` performs a rolling stop/start across each matched instance and waits for the replacement to return `online` before continuing.
- `pm reload <name|all>` can hand off a single-instance HTTP app without dropping the public endpoint when `--proxy-port` or `pm.apps[].proxy` is enabled. `proxy` mode keeps PM on the public port and routes to private child ports; `inherit` shares the public listener directly with a Node child.
- `--proxy-strategy proxy` is the default and now supports multi-instance groups plus websocket upgrades on the public port.
- `--proxy-strategy inherit` is currently limited to single-instance Node `.js`, `.mjs`, and `.cjs` file targets.
- `pm reload <name|all>` is still a stop/start cycle for single-instance apps that bind the public port directly.
- `pm scale <name> <count>` changes the number of managed instances for a process group.
- `pm reset <name|all>` clears restart counters plus saved exit/error metadata.
- `pm send-signal <signal> <name|all>` forwards a signal like `SIGUSR2` or `TERM` to the current managed child process.
- `maxMemory` accepts raw bytes or size strings like `256M`; `memoryAction` decides whether that threshold restarts or stops the process.
- `cronRestart` accepts a 5-field cron string or `@every 30s`, `expBackoffRestartDelay` doubles unstable restart delays, `expBackoffRestartMaxDelay` caps them, and `restartWindow` resets stale restart counters before they count toward `maxRestarts` again.
- `--proxy-strategy` defaults to `proxy`, `--proxy-host` defaults to `0.0.0.0`, `--proxy-target-host` defaults to `127.0.0.1`, and `--proxy-env` defaults to `PORT`.
- WAPK apps can use local `.wapk` files, `gdrive://<fileId>`, or `pm.apps[].wapkRun.googleDrive`.
- PM-managed WAPK online hosts can also forward `--online` and `--online-url <url>` into `elit wapk run`.
- `pm list` now includes live `cpu`, `memory`, and `uptime` columns for running processes.
- `pm list --json` and `pm jlist` return machine-readable process records for tooling and CI, including `liveMetrics` when the child process is running.
- `pm show <name>` prints the stored runtime metadata for one process, and `pm describe <name> --json` exposes the same record plus `liveMetrics` as JSON.
- `waitReady` keeps the process in `starting` until its health check succeeds; `listenTimeout` caps that startup window.
- `instances` creates named groups such as `api`, `api:2`, and `api:3`; inspect a specific instance name when a group has more than one child.
- `killTimeout` controls how long PM waits before escalating a stop or restart to forceful termination.
- PM `--watch` restarts the managed process; WAPK `--watcher` only changes the inner WAPK live-sync mode.
- `pm stop`, `pm restart`, and `pm delete` close PM-managed online WAPK share sessions before the process exits.
- Watch restarts are explicit supervisor restarts; health-check failures can also trigger managed restarts.
- `pm save` stores the current running app list in `pm.dumpFile` or `./.elit/pm/dump.json`, and `pm resurrect` replays that dump.
- State and logs are stored in `./.elit/pm` by default, or `pm.dataDir` when configured.
- TypeScript file targets with `runtime: 'node'` require `tsx`; `runtime: 'bun'` works without extra setup.

### `elit wapk`

Archive packaging and runtime commands.

Forms:

- `elit wapk <file.wapk>`
- `elit wapk gdrive://<fileId>`
- `elit wapk gdrive://<fileId> --online`
- `elit wapk run <file.wapk>`
- `elit wapk run --google-drive-file-id <fileId> --google-drive-token-env GOOGLE_DRIVE_ACCESS_TOKEN`
- `elit wapk run <file.wapk> --online`
- `elit wapk`
- `elit wapk run`
- `elit wapk pack [directory]`
- `elit wapk patch <file.wapk> --from <patch.wapk>`
- `elit wapk inspect <file.wapk>`
- `elit wapk extract <file.wapk>`

Useful options:

- `--runtime node|bun|deno`
- `--sync-interval <ms>`
- `--archive-sync-interval <ms>`
- `--watcher`
- `--archive-watch`
- `--no-archive-watch`
- `--online`
- `--allow-sigterm-close`
- `--online-url <url>`
- `--google-drive-file-id <id>`
- `--google-drive-token-env <env>`
- `--google-drive-access-token <token>`
- `--from <patch.wapk>` on `patch`
- `--use <patch.wapk>` on `patch` as an alias for `--from`
- `--from-password <value>` on `patch` when the patch archive is locked separately
- `--include-deps` on `pack` as a legacy compatibility flag

Notes:

- `elit wapk pack` includes `node_modules` by default; `.wapkignore` now supports ordered negate rules like `!dist`, directory rules like `dist/`, globstar patterns like `**/*.map`, and escaped leading `\!literal` / `\#literal` entries.
- `elit wapk patch` reads `.wapkpatch` from the patch archive and overlays only the matching archive-relative files into the target archive.
- `--online` creates a shared session on the Elit Run server directly, keeps the CLI alive, and closes the session when you press `Ctrl+C`.
- Online mode ignores `SIGTERM` by default; pass `--allow-sigterm-close` if an external supervisor should close the shared session with `SIGTERM`.
- Google Drive archives can use the same online handoff with `elit wapk gdrive://<fileId> --online` or `elit wapk run --google-drive-file-id <fileId> ... --online`.
- By default it looks for Elit Run at `http://localhost:4177`, then `http://localhost:4179`.
- Use `--online-url <url>` or `ELIT_WAPK_ONLINE_URL` if your Elit Run instance is running elsewhere.
- Locked archives in `--online` mode must provide `--password` because the CLI builds the shared snapshot itself.

## Config-First Workflow

The CLI gets more useful when you store defaults in `elit.config.*`.

- `dev` and `preview` read `api`, `proxy`, `worker`, `ws`, `ssr`, and `clients[]`.
- `desktop` reads `desktop.mode`, `desktop.entry`, and `desktop.native.entry`.
- `mobile` reads `config.mobile` defaults for cwd, app id, icon, permissions, and native generation.
- `pm` reads `config.pm.dataDir`, `config.pm.dumpFile`, and `config.pm.apps[]` for process manager defaults.
- `wapk` reads `config.wapk` for runtime, entry, scripts, env, and archive locking.
- `wapk` also reads `config.wapk.run` for a default archive source plus live-sync behavior, including direct Google Drive API access without a local archive file.

## Practical Examples

```bash
elit dev --port 8080 --host 0.0.0.0 --no-open
elit dev --no-server-watch          # disable server-side HMR
elit build --entry ./src/main.ts --out-dir dist --format esm --sourcemap
elit preview --root dist --base-path /app
elit test --coverage --coverage-reporter text,html
elit desktop run --mode native
elit desktop build ./src/main.ts --release
elit mobile doctor --cwd . --json
elit mobile run android --cwd . --target emulator-5554
elit native generate ios ./src/native-screen.ts --out ./ios/HomeScreen.swift --name HomeScreen
elit pm start --script "npm start" --name my-app --runtime node
elit pm start --script "npm start" --name my-app --watch --watch-path src --restart-policy on-failure
elit pm start ./src/worker.ts --name worker --runtime bun
elit pm start --wapk ./app.wapk --name packaged-app
elit pm list --json
elit pm show my-app
elit pm save
elit pm resurrect
elit pm logs my-app --lines 100
elit wapk pack .
elit wapk run ./app.wapk --runtime bun --sync-interval 100 --watcher
elit wapk run ./app.wapk --online
```

## Related Docs

- [CONFIG.md](./CONFIG.md)
- [server.md](./server.md)
- [wapk.md](./wapk.md)
- [API.md](./API.md)
