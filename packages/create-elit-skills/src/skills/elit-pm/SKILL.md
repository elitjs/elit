---
name: elit-pm
description: 'Manage background processes with elit pm: three start modes (script, file, wapk), full CLI (start/list/show/stop/restart/reload/scale/send-signal/reset/delete/save/resurrect/logs), pm.apps[] config, autorestart/restart-policy/watch/healthCheck/proxy/cronRestart/maxMemory/expBackoff/instances, zero-downtime reload via proxy strategy (proxy|inherit), Google Drive + Elit Run online hosting for WAPK, PmConfig/PmAppConfig/PmStatus types, ./.elit/pm dump.json persistence. Use for long-running services, dev orchestration, and archive hosting.'
argument-hint: 'Describe the process (script/file/wapk), the start flags (name, runtime, instances, watch, health, proxy), or the operation (list/stop/restart/scale/logs) you need.'
user-invocable: true
---

# Elit.js PM (`elit pm`)

Lightweight built-in process manager. Three start modes cover every Elit workload: shell scripts, JS/TS files, and packaged `.wapk` archives. Reads `pm.apps[]` from config, persists state to `./.elit/pm/`, and survives restarts via `pm save` / `pm resurrect`.

## Three start modes

| Mode | Trigger | Use case |
| --- | --- | --- |
| **script** | `--script "npm start"` or `pm.apps[].script` | Shell commands, npm scripts, anything with args |
| **file** | `pm start ./app.ts` or `--file` / `pm.apps[].file` | Direct JS/TS entry — runtime inferred or set |
| **wapk** | `--wapk ./app.wapk` or `pm.apps[].wapk` | Packaged Elit app — runs via `elit wapk run` under the hood |

Runtime for `file` mode is inferred from extension (`.ts` needs tsx, `.js`/`.mjs`/`.cjs` run with node by default). Override with `--runtime node|bun|deno`.

## CLI

```
elit pm <command> [args]

Commands:
  start [target] [--options]      Start apps (positional can be script/file/wapk/name)
  list, ls                        Status table of all managed processes
  list --json                     Machine-readable status
  jlist                           Alias for list --json
  show <name>                     Full metadata for one process
  describe <name> --json          One process as JSON
  stop <name|all>                 Stop one or all
  restart <name|all>              Stop then start
  reload <name|all>               Zero-downtime reload if proxy enabled, else restart
  scale <name> <count>            Scale instances up or down (0 stops + deletes)
  send-signal <sig> <name|all>    Send any POSIX signal (SIGTERM, SIGHUP, SIGUSR1, ...)
  reset <name|all>                Reset restart count and clear error state
  delete <name|all>               Stop + remove metadata + remove logs
  save                            Persist running apps to dump.json
  resurrect                       Restart everything from dump.json
  logs <name> [--lines N] [--stderr]  Tail recent stdout/stderr
```

### `pm start` options

```
Target selection (one of):
  --script <command>                       Shell command
  --file, -f <path>                        JS/TS entry
  --wapk <source>                          Local .wapk or gdrive://<fileId>
  --google-drive-file-id <id>              Run from Google Drive (no positional)

  [positional]                             Treated as script/file/wapk by shape, or app name from config

Identity & runtime:
  --name, -n <name>                        REQUIRED for script/file/wapk; positional when starting a configured app
  --runtime, -r <name>                     node | bun | deno (inferred from file ext if omitted)
  --cwd <dir>                              Working directory
  --env KEY=VALUE                          Add or override env var (repeatable)

Instances & proxy (single-instance zero-downtime):
  --instances <count>                      Run N instances (named <name>-1, <name>-2, ...)
  --proxy-port <port>                      Public HTTP port owned by the PM proxy
  --proxy-strategy <mode>                  proxy (default) | inherit (shared listener, Node only)
  --proxy-host <host>                      Public host (default 0.0.0.0)
  --proxy-target-host <host>               Internal upstream host (default 127.0.0.1)
  --proxy-env <name>                       Env var populated with the child private port (default PORT)

Restart & uptime:
  --restart-policy <mode>                  always (default) | on-failure | never
  --no-autorestart                         Shorthand for --restart-policy never
  --autorestart (default on)               Restart on unexpected exit
  --restart-delay <ms>                     Delay between attempts (default 1000)
  --kill-timeout <ms>                      Grace period before SIGKILL (default 5000)
  --max-restarts <count>                   Cap before marking errored (default 10)
  --min-uptime <ms>                        Reset crash counter after this uptime
  --restart-window <ms>                    Rolling window for restart counting
  --exp-backoff-restart-delay <ms>         Exponential backoff base for unstable restarts
  --exp-backoff-restart-max-delay <ms>     Cap (default 15000)

Memory & schedule:
  --max-memory <bytes|size>                Trigger action after this RSS (e.g. 268435456 or 256M)
  --memory-action <mode>                   restart (default) | stop
  --cron-restart <expr>                    Cron expression or @every <duration>

Watch mode:
  --watch                                  Restart on file change
  --watch-path <path>                      Add path (repeatable); defaults to cwd
  --watch-ignore <pattern>                 Ignore pattern (repeatable)
  --watch-debounce <ms>                    Debounce restart on burst (default 250)

Health checks:
  --wait-ready                             Stay 'starting' until health check passes
  --listen-timeout <ms>                    Startup wait limit (default 3000)
  --health-url <url>                       Poll this endpoint
  --health-grace-period <ms>               Delay before first check (default 5000)
  --health-interval <ms>                   Polling interval (default 10000)
  --health-timeout <ms>                    Per-request timeout (default 3000)
  --health-max-failures <n>                Failures before restart (default 3)

WAPK-specific (forwarded to elit wapk run):
  --password <value>                       Unlock a locked archive
  --online                                 Host on Elit Run instead of running locally
  --online-url <url>                       Elit Run base URL
  --sync-interval <ms>                     Live-sync write interval (>= 50ms)
  --watcher, --use-watcher                 Event-driven file watcher
  --archive-watch / --no-archive-watch     Pull external archive changes back into workdir
  --archive-sync-interval <ms>             Archive read-sync interval
  --google-drive-token-env <name>          Env var containing OAuth token
  --google-drive-access-token <value>      Inline OAuth token
  --google-drive-shared-drive             Include supportsAllDrives=true
```

## Config (`pm.apps[]`)

```ts
// elit.config.ts
import { defineConfig } from '@elitjs/config';

export default defineConfig({
  pm: {
    dataDir: './.elit/pm',           // default ./.elit/pm
    dumpFile: './.elit/pm/dump.json', // default <dataDir>/dump.json
    apps: [
      {
        name: 'api',
        script: 'npm start',
        cwd: './services/api',
        runtime: 'node',
        env: { NODE_ENV: 'production' },
        autorestart: true,
        maxRestarts: 10,
        restartDelay: 1000,
        minUptime: 10000,
        restartPolicy: 'always',
        healthCheck: {
          url: 'http://localhost:8080/health',
          gracePeriod: 5000,
          interval: 30000,
          timeout: 2000,
          maxFailures: 3
        },
        proxy: {
          port: 80,
          host: '0.0.0.0',
          strategy: 'proxy',
          targetHost: '127.0.0.1',
          envVar: 'PORT'
        }
      },
      {
        name: 'worker',
        file: './src/worker.ts',
        runtime: 'bun',
        watch: true,
        watchPaths: ['./src'],
        watchIgnore: ['*.test.ts'],
        watchDebounce: 500
      },
      {
        name: 'scheduled',
        script: 'npm run cleanup',
        cronRestart: '0 3 * * *'    // daily at 3am
      },
      {
        name: 'memory-capped',
        script: 'node ./heavy.js',
        maxMemory: '512M',
        memoryAction: 'restart'
      },
      {
        name: 'web-cluster',
        script: 'npm start',
        instances: 4
      },
      {
        name: 'packaged',
        wapk: './app.wapk',
        password: process.env.WAPK_PASSWORD,
        wapkRun: { runtime: 'node', useWatcher: true, watchArchive: true }
      },
      {
        name: 'drive-app',
        wapkRun: {
          googleDrive: { fileId: '1abc...', accessTokenEnv: 'GDRIVE_TOKEN' }
        }
      },
      {
        name: 'online-app',
        wapk: './app.wapk',
        wapkRun: { online: true, onlineUrl: 'https://wapk.d-osc.com' }
      }
    ]
  }
});
```

`elit pm start` with no positional starts every app in `pm.apps[]`. `elit pm start <name>` starts one.

## Zero-downtime reload via proxy

For single-instance HTTP services, configure a PM proxy:

```ts
{
  name: 'api',
  script: 'npm start',
  instances: 1,
  proxy: {
    port: 80,                    // public port
    strategy: 'proxy',           // proxy forwards (any runtime)
    host: '0.0.0.0',
    targetHost: '127.0.0.1',
    envVar: 'PORT'               // child reads its private port from here
  }
}
```

Then `elit pm reload api`:

1. Marks the current record as `restarting`.
2. Spawns a NEW child on a different private port.
3. Waits for the new child's health check to pass.
4. Atomically swaps the proxy's upstream to the new child.
5. Stops the old child.

The public port never drops a connection. `strategy: 'inherit'` is faster (shared listener handoff) but Node-only.

Reload requires `instances === 1`. Multi-instance apps fall back to plain restart.

## Health checks

```ts
{
  name: 'api',
  script: 'npm start',
  waitReady: true,                 // gate 'starting' → 'online' on health
  listenTimeout: 5000,             // startup wait limit
  healthCheck: {
    url: 'http://localhost:8080/health',
    gracePeriod: 5000,             // ignore failures right after boot
    interval: 10000,               // poll cadence
    timeout: 2000,                 // per-request timeout
    maxFailures: 3                 // restart after N consecutive fails
  }
}
```

`waitReady: true` keeps the process in `starting` status until the health URL returns 2xx. If `listenTimeout` elapses, the process is marked `errored` and restarted per policy.

## Watch mode

```ts
{
  name: 'worker',
  file: './src/worker.ts',
  watch: true,
  watchPaths: ['./src'],
  watchIgnore: ['**/*.test.ts', '**/.git/**', '**/node_modules/**'],
  watchDebounce: 250
}
```

Defaults ignore `.git/`, `node_modules/`, `.elit/`. On change, PM debounces (default 250ms) and restarts. Use `watchDebounce` higher (500-1000ms) when bundlers write many files at once.

## Restart policies

| Policy | Behavior |
| --- | --- |
| `always` (default) | Restart on ANY exit (including clean `process.exit(0)`) |
| `on-failure` | Restart only on non-zero exit code |
| `never` | Don't restart — equivalent to `--no-autorestart` |

Combined with `expBackoffRestartDelay`, unstable processes back off exponentially up to `expBackoffRestartMaxDelay` (default 15000ms).

`restartWindow` (default 0 = no window) sets a rolling window for counting `maxRestarts`. With `restartWindow: 60000` and `maxRestarts: 5`, only 5 restarts within any 60s window count toward the cap.

## Memory limits

```ts
{
  name: 'heavy',
  script: 'node ./heavy.js',
  maxMemory: '512M',           // bytes or size string (K|M|G|T)
  memoryAction: 'restart'      // 'restart' (default) | 'stop'
}
```

PM polls RSS every 500ms. When it exceeds `maxMemory`, the action fires — `restart` (default) cycles the process; `stop` marks it stopped.

## Cron restarts

```ts
{
  name: 'cleanup',
  script: 'npm run cleanup',
  cronRestart: '0 3 * * *'    // 5-field cron in LOCAL time
}

// Or duration-based:
{
  cronRestart: '@every 24h'
}
```

PM schedules restarts at the cron tick. Use for memory-leak mitigation, cert rotation, or daily cleanup tasks.

## Multi-instance & scaling

```bash
# Start 4 instances at boot
elit pm start --script "npm start" -n web --instances 4
# Creates web-1, web-2, web-3, web-4

# Scale at runtime
elit pm scale web 8       # add 4 more
elit pm scale web 2       # stop + delete web-3..8
elit pm scale web 0       # stop + delete all
```

Instances share `baseName` ('web') and differ by `instanceIndex` (1-based). Each gets its own record, logs, and child PID.

For single-instance zero-downtime, use `instances: 1` + `proxy`. For load-balanced scale, put a real reverse proxy in front of `instances: N`.

## WAPK through PM

`pm.apps[].wapk` accepts a local archive or a remote source. `wapkRun` configures live-sync, Google Drive, and online hosting options — same shape as `WapkRunConfig` from `@elitjs/config`.

```ts
// Local archive
{ name: 'app', wapk: './app.wapk', password: process.env.WAPK_PASSWORD }

// Google Drive (no local file)
{
  name: 'drive-app',
  wapkRun: {
    googleDrive: {
      fileId: '1abc234def',
      accessTokenEnv: 'GDRIVE_TOKEN',
      supportsAllDrives: true
    },
    useWatcher: true,
    watchArchive: true,
    syncInterval: 150
  }
}

// Elit Run online hosting
{
  name: 'online-app',
  wapk: './app.wapk',
  wapkRun: { online: true, onlineUrl: 'https://wapk.d-osc.com' }
}
```

PM spawns `elit wapk run` with the forwarded options. The child process is the WAPK runtime; PM supervises it like any other child.

## Persistence (`save` / `resurrect`)

```
./.elit/pm/
├── dump.json                       ← pm save writes here
└── <id>.json                       ← per-process records (PmRecord)
└── logs/
    ├── <id>.out.log                ← stdout
    └── <id>.err.log                ← stderr
```

- `elit pm save` snapshots every currently-running app into `dump.json`.
- `elit pm resurrect` reads `dump.json` and restarts every app.
- Use together for surviving reboots: `save` before shutdown, `resurrect` after boot.
- `elit pm delete` removes both the record and the log files. `stop` keeps them.

## JS API (`@elitjs/pm`)

```ts
import { runPmCommand } from '@elitjs/pm';

await runPmCommand(['start', '--script', 'npm start', '-n', 'api']);
await runPmCommand(['list', '--json']);
await runPmCommand(['reload', 'api']);
await runPmCommand(['logs', 'api', '--lines', '100']);
```

`runPmCommand(args)` is the programmatic entry — same argv shape as the CLI. Other exports cover internals: `parsePmStartArgs`, `resolvePmAppDefinition`, `expandPmInstanceDefinitions`, `startManagedProcess`, `runPmRunner`, `stopPmMatches`, etc.

### Types

```ts
type PmStatus = 'starting' | 'online' | 'restarting' | 'stopping' | 'stopped' | 'exited' | 'errored';
type PmTargetType = 'script' | 'file' | 'wapk';
type PmRuntimeName = 'node' | 'bun' | 'deno';
type PmRestartPolicy = 'always' | 'on-failure' | 'never';
type PmMemoryAction = 'restart' | 'stop';
type PmProxyStrategy = 'proxy' | 'inherit';

interface PmConfig {
  dataDir?: string;
  dumpFile?: string;
  apps?: PmAppConfig[];
}

interface PmAppConfig {
  name: string;
  script?: string;
  file?: string;
  wapk?: string;
  runtime?: PmRuntimeName;
  cwd?: string;
  env?: Record<string, string | number | boolean>;
  instances?: number;
  autorestart?: boolean;
  restartDelay?: number;
  killTimeout?: number;
  maxRestarts?: number;
  restartPolicy?: PmRestartPolicy;
  restartWindow?: number;
  expBackoffRestartDelay?: number;
  expBackoffRestartMaxDelay?: number;
  minUptime?: number;
  waitReady?: boolean;
  listenTimeout?: number;
  proxy?: PmProxyConfig;
  maxMemory?: number | string;
  memoryAction?: PmMemoryAction;
  cronRestart?: string;
  watch?: boolean;
  watchPaths?: string[];
  watchIgnore?: string[];
  watchDebounce?: number;
  healthCheck?: PmHealthCheckConfig;
  password?: string;
  wapkRun?: WapkRunConfig;
}

interface PmProxyConfig {
  port: number;
  strategy?: PmProxyStrategy;
  host?: string;
  targetHost?: string;
  envVar?: string;
}

interface PmHealthCheckConfig {
  url?: string;
  gracePeriod?: number;
  interval?: number;
  timeout?: number;
  maxFailures?: number;
}

interface PmRecord {
  id: string;
  name: string;
  baseName: string;
  instanceIndex: number;
  instances: number;
  type: PmTargetType;
  source: 'cli' | 'config';
  status: PmStatus;
  desiredState: 'running' | 'stopped';
  cwd: string;
  runtime?: PmRuntimeName;
  env: Record<string, string>;
  script?: string;
  file?: string;
  wapk?: string;
  wapkRun?: WapkRunConfig;
  autorestart: boolean;
  restartDelay: number;
  killTimeout: number;
  maxRestarts: number;
  restartCount: number;
  restartPolicy: PmRestartPolicy;
  proxy?: PmProxyConfig;
  proxyTargetPort?: number;
  healthCheck?: PmResolvedHealthCheck;
  waitReady: boolean;
  listenTimeout: number;
  minUptime: number;
  watch: boolean;
  watchPaths: string[];
  watchIgnore: string[];
  watchDebounce: number;
  maxMemoryBytes?: number;
  memoryAction?: PmMemoryAction;
  cronRestart?: string;
  expBackoffRestartDelay?: number;
  expBackoffRestartMaxDelay?: number;
  restartWindow?: number;
  runnerPid?: number;
  childPid?: number;
  startedAt?: string;
  stoppedAt?: string;
  lastExitCode?: number;
  error?: string;
  proxyReadyAt?: string;
  logFiles: { out: string; err: string };
  createdAt: string;
  updatedAt: string;
}
```

## Patterns

### Dev orchestration

```ts
// elit.config.ts
pm: {
  apps: [
    { name: 'web',   script: 'npm run dev:web',   watch: true, watchPaths: ['./apps/web/src'] },
    { name: 'api',   script: 'npm run dev:api',   watch: true, watchPaths: ['./apps/api/src'] },
    { name: 'worker', file: './apps/worker/src/main.ts', runtime: 'bun' }
  ]
}
```

```bash
elit pm start                 # all three
elit pm logs api --lines 50   # tail api
elit pm restart web           # bounce web only
elit pm stop all              # shutdown
```

### Production single-instance with zero-downtime

```ts
pm: {
  apps: [{
    name: 'api',
    script: 'node ./dist/server.js',
    instances: 1,
    proxy: { port: 80, strategy: 'proxy', envVar: 'PORT' },
    healthCheck: { url: 'http://127.0.0.1:0/health', maxFailures: 3 },
    waitReady: true,
    listenTimeout: 5000,
    restartPolicy: 'always',
    maxRestarts: 10,
    restartWindow: 60000
  }]
}
```

Deploy: `elit pm reload api` — clients on port 80 never see a dropped connection.

### Survive reboot

```bash
# Before reboot
elit pm save                   # writes ./.elit/pm/dump.json

# After boot
elit pm resurrect              # restores everything that was running
```

Pair with systemd / launchd / Docker's restart policy for OS-level resurrection.

### Memory-leak mitigation

```ts
{
  name: 'leaky',
  script: 'node ./server.js',
  maxMemory: '1G',              // cycle when RSS hits 1 GB
  memoryAction: 'restart',
  cronRestart: '@every 12h'    // belt-and-suspenders
}
```

## Rules

- `--name` is required for `script` / `file` / `wapk` start modes. Without it PM errors out.
- One of `--script`, `--file`, `--wapk`, or `--google-drive-file-id` per app. Combining them is an error.
- Config-based apps are matched by `name` from `pm.apps[]`. Pass the name as positional to start one: `pm start api`.
- `pm start` (no args) starts every app in `pm.apps[]`.
- `pm reload` requires `instances === 1` AND `proxy` configured for true zero-downtime. Without proxy, it falls back to plain restart.
- `proxy.strategy: 'inherit'` is Node-only (uses shared listener handoff). Use `proxy` (default) for Bun/Deno.
- `--watch` debounces by `watchDebounce` ms (default 250). Set higher for noisy build outputs.
- `maxRestarts` counts against a rolling `restartWindow`. With `restartWindow: 0` (default), all restarts ever count — set a window for sensible crash-loop detection.
- `cronRestart` uses LOCAL time, not UTC. 5-field cron or `@every <duration>`.
- `maxMemory` accepts bytes (number) or size string like `256M`, `1G`. Case-insensitive unit.
- `waitReady` gates status on the first successful health check — combined with `listenTimeout`, this is how PM knows "the server is ready" vs "the process started but isn't listening yet".
- `pm scale <name> 0` stops AND deletes — different from `pm stop <name>` which keeps metadata.
- `pm save` only writes currently-running apps. Stopped apps are not in the dump.
- WAPK password is forwarded via `password` (top-level PmAppConfig field) — same as `wapk.lock.password` for run mode.
- `pm.logs` reads the on-disk log files. If you want live `tail -f`, pipe through a shell.

## Anti-Patterns

- Two apps with the same `name`. The second shadows the first — names must be unique.
- `watch: true` without `watchPaths` for a service in a huge monorepo. Defaults to cwd — every file change triggers a restart. Scope with `watchPaths`.
- `--no-autorestart` on a production service. One crash and it stays down.
- Setting `maxRestarts: 0` with `restartPolicy: 'always'`. The policy wins; `maxRestarts: 0` means "never restart" effectively — pick one.
- `proxy: { strategy: 'inherit' }` on Bun or Deno. Handoff is Node-only — fall back to `proxy`.
- Forgetting to `--wait-ready` when the service has a slow startup. PM thinks it's online immediately and routes traffic to a not-yet-listening child.
- `cronRestart: '@every 30s'` on a slow service. Restart takes longer than the interval — they stack.
- `elit pm resurrect` on a fresh checkout (no dump.json). Throws — check existence first.
- Mixing `pm scale web 0` and `pm stop web`. Scale deletes metadata; stop preserves it. Pick one workflow.
- Holding secrets in `env: { PASSWORD: 'literal' }`. Use `env: { PASSWORD: process.env.PASSWORD }` so they don't land in version control.
- Expecting `pm list` CPU/memory to be real-time. It samples on each invocation — for continuous monitoring, scrape externally.

## Validation

- `elit pm list` shows every managed app with `status`, `pid`, `cpu`, `memory`, `uptime`, `restarts`.
- `elit pm show <name>` prints every config field plus live metrics and log file paths.
- `elit pm describe <name> --json` returns the full `PmRecord` for scripting.
- After `elit pm start`, the named record exists under `./.elit/pm/<id>.json`.
- `elit pm logs <name>` shows the last N lines of stdout AND stderr.
- `elit pm reload <name>` on a proxied single-instance service keeps the public port accepting connections throughout.
- `elit pm save && elit pm stop all && elit pm resurrect` should restore the same set of running apps.
- A crashing service should hit `maxRestarts` then transition to `errored` — verify with `elit pm show <name>`.
