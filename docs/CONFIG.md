# Elit Config Reference

Elit loads project configuration from the project root and uses it to drive dev, preview, build, desktop, mobile, process-manager, and WAPK workflows.

## Config Files

Elit looks for these files in order:

1. `elit.config.ts`
2. `elit.config.mts`
3. `elit.config.js`
4. `elit.config.mjs`
5. `elit.config.cjs`
6. `elit.config.json`

Use `defineConfig()` when you want type-safe autocomplete in TypeScript.

```typescript
import { defineConfig } from 'elit/config';

export default defineConfig({
  dev: {
    port: 3000,
  },
});
```

## Environment Loading

`loadEnv(mode, cwd)` loads environment files in this order:

1. `.env.{mode}.local`
2. `.env.{mode}`
3. `.env.local`
4. `.env`

Only variables prefixed with `VITE_` are injected into client bundles.

## Top-Level Shape

```typescript
interface ElitConfig {
  dev?: DevServerOptions;
  build?: BuildOptions | BuildOptions[];
  preview?: PreviewOptions;
  test?: TestOptions;
  desktop?: DesktopConfig;
  mobile?: MobileConfig;
  pm?: PmConfig;
  wapk?: WapkConfig;
}
```

## Dev And Preview

`dev` and `preview` share the same important server-side options:

- `port`, `host`, `https`, `open`, `logging`
- `root`, `basePath`, `index`
- `clients[]` for multiple apps on one port
- `api` for `ServerRouter`
- `ws` for WebSocket endpoint config
- `smtp` for SMTP listeners powered by `smtp-server`
- `proxy` for backend forwarding
- `worker` for worker script registration
- `ssr` for string or VNode server rendering
- `env` for environment injection
- `blockFiles` for blocking sensitive files from being served

`preview` is not a static-file-only mode in Elit. It supports `clients`, `api`, `ws`, `proxy`, `worker`, and `ssr` in the same shape as `dev`.

### Block Files

`blockFiles` prevents sensitive files from being served over HTTP. When `root` points to the project root (e.g. `.`), dotfiles like `.env` would otherwise be accessible at `http://localhost:<port>/.env`.

Default patterns (applied when `blockFiles` is not explicitly set):

```text
.env, .env.*, *.pem, *.key, *.p12, *.pfx, .git/**, .htaccess, docker-compose.yml, docker-compose.yaml, Dockerfile
```

Override with your own list:

```typescript
export default defineConfig({
  dev: {
    root: '.',
    blockFiles: ['.env', '.env.*', '*.key', 'secrets/**'],
  },
  preview: {
    root: 'dist',
    blockFiles: ['.env', '.env.*'],
  },
});
```

Set to an empty array to disable blocking:

```typescript
blockFiles: [],
```

Patterns support `*` (any non-slash characters), `**` (any path depth), and `?` (single character). Requests matching a blocked pattern receive a `403 Forbidden` response.

### WebSocket Endpoint Shape

```typescript
interface WebSocketEndpointConfig {
  path: string;
  handler: ({ ws, req, path, query, headers }) => void | Promise<void>;
}
```

Important behavior:

- Matching is exact on the request pathname.
- Query strings do not affect matching, but are exposed in `query`.
- `clients[].ws` is automatically prefixed by the client's `basePath`.
- `/__elit_ws` is reserved for Elit's internal HMR and shared-state socket.

### SMTP Listener Shape

`dev.smtp`, `preview.smtp`, and `clients[].smtp` accept either one object or an array.

```typescript
interface ElitSMTPServerConfig extends SMTPServerOptions {
  port?: number;
  host?: string;
  label?: string;
}
```

Important behavior:

- `port` defaults to `2525`.
- `host` defaults to `127.0.0.1`.
- `clients[].smtp` does not use the client's `basePath`; SMTP listeners bind directly to their own socket host and port.
- Elit rejects duplicate SMTP bindings like two listeners on the same `host:port` pair.

## Build

`build` may be a single object or an array.

```typescript
build: {
  entry: './src/main.ts',
  outDir: './dist',
  outFile: 'main.js',
  format: 'esm',
  sourcemap: true,
  copy: [
    { from: './public/index.html', to: './index.html' },
  ],
}
```

Use an array when you want sequential multi-build output:

```typescript
build: [
  { entry: './src/main.ts', outDir: './dist/web' },
  { entry: './src/worker.ts', outDir: './dist/workers' },
]
```

Useful build options include:

- `entry`, `outDir`, `outFile`
- `format`, `platform`, `target`, `globalName`
- `minify`, `sourcemap`, `treeshake`, `logging`
- `resolve.alias`
- `external`
- `env`
- `copy`
- `onBuildEnd(result)`

## Desktop

`desktop` config provides defaults for `elit desktop`, `elit desktop run`, `elit desktop build`, and `elit desktop wapk`.

```typescript
desktop: {
  mode: 'native',
  entry: './src/main.ts',
  native: {
    entry: './src/native-entry.ts',
    exportName: 'App',
  },
  runtime: 'quickjs',
  compiler: 'auto',
  release: false,
  outDir: 'dist',
  platform: 'windows',
  wapk: {
    runtime: 'bun',
    syncInterval: 100,
    useWatcher: true,
  },
}
```

Notes:

- `desktop.mode` selects `native` or `hybrid` defaults.
- `desktop.entry` is the hybrid default entry.
- `desktop.native.entry` is the native default entry.
- `desktop.native.exportName` lets the CLI read a specific export.
- `platform` accepts the standard names plus aliases such as `win`, `mac`, and architecture-specific desktop targets.

## PM

`pm` config stores named apps for `elit pm`.

```typescript
pm: {
  dataDir: './.elit/pm',
  dumpFile: './.elit/pm/dump.json',
  apps: [
    {
      name: 'api',
      script: 'npm start',
      instances: 2,
      runtime: 'node',
      restartPolicy: 'on-failure',
      maxMemory: '256M',
      memoryAction: 'restart',
      cronRestart: '0 4 * * *',
      expBackoffRestartDelay: 200,
      expBackoffRestartMaxDelay: 1500,
      restartWindow: 10000,
      waitReady: true,
      listenTimeout: 5000,
      killTimeout: 12000,
      minUptime: 5000,
      watch: true,
      watchPaths: ['./src', './package.json'],
      watchIgnore: ['**/*.log'],
      watchDebounce: 300,
      healthCheck: {
        url: 'http://127.0.0.1:3000/health',
        gracePeriod: 5000,
        interval: 10000,
        timeout: 3000,
        maxFailures: 3,
      },
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'worker',
      file: './src/worker.ts',
      runtime: 'bun',
      restartDelay: 500,
    },
    {
      name: 'edge-api',
      file: './src/edge-api.ts',
      runtime: 'node',
      proxy: {
        port: 3000,
        strategy: 'proxy',
        host: '0.0.0.0',
        targetHost: '127.0.0.1',
        envVar: 'PORT',
      },
      waitReady: true,
      listenTimeout: 5000,
      healthCheck: {
        url: 'http://127.0.0.1:3000/health',
        gracePeriod: 1000,
        interval: 1000,
        timeout: 500,
        maxFailures: 2,
      },
    },
    {
      name: 'archive-app',
      wapk: './dist/app.wapk',
      runtime: 'node',
      password: 'secret-123',
    },
    {
      name: 'drive-app',
      env: {
        GOOGLE_DRIVE_ACCESS_TOKEN: process.env.GOOGLE_DRIVE_ACCESS_TOKEN ?? '',
      },
      wapkRun: {
        googleDrive: {
          fileId: '1AbCdEfGhIjKlMnOp',
          accessTokenEnv: 'GOOGLE_DRIVE_ACCESS_TOKEN',
          supportsAllDrives: true,
        },
        runtime: 'bun',
        syncInterval: 150,
        useWatcher: true,
        watchArchive: true,
        archiveSyncInterval: 150,
      },
    },
    {
      name: 'online-app',
      wapk: './dist/app.wapk',
      wapkRun: {
        online: true,
        onlineUrl: 'http://localhost:4179',
      },
    },
  ],
}
```

Notes:

- `script`, `file`, and `wapk` are mutually exclusive per app.
- `wapkRun` lets a PM-managed WAPK app forward Google Drive, online hosting, and live-sync settings into `elit wapk run`.
- `pm.apps[].wapkRun.file` or `pm.apps[].wapkRun.googleDrive.fileId` can define the WAPK archive source even when `wapk` is omitted.
- `pm.dataDir` changes where Elit stores process records and log files.
- `pm.dumpFile` changes where `elit pm save` and `elit pm resurrect` read and write the saved app list.
- `instances` starts multiple managed children for one app name, and `elit pm scale <name> <count>` updates that count later.
- `pm.apps[].proxy` lets PM own the public HTTP port. `strategy: 'proxy'` routes to private child ports, supports multi-instance groups, and forwards websocket upgrades. `strategy: 'inherit'` shares the public listener directly with a Node `.js`/`.mjs`/`.cjs` file target and currently stays single-instance.
- `maxMemory` accepts raw bytes or strings like `256M`, `memoryAction` decides whether that threshold restarts or stops the app, `cronRestart` accepts a cron string or `@every 30s`, `expBackoffRestartDelay` doubles unstable restart delays, `expBackoffRestartMaxDelay` caps them, and `restartWindow` resets stale restart counters before they keep counting toward `maxRestarts`.
- `waitReady` keeps the app in `starting` until its `healthCheck` succeeds, while `listenTimeout` caps how long startup may wait.
- `elit pm reload <name>` now waits for each replacement instance to become `online` before moving to the next one, so readiness-aware HTTP groups can roll with less disruption.
- Single-instance apps that bind the public port directly still restart in place unless they opt into `pm.apps[].proxy` or `elit pm start --proxy-port ...`.
- `killTimeout` sets the per-app grace window before Elit forcefully terminates a stop or restart.
- `restartPolicy` accepts `always`, `on-failure`, or `never`. `minUptime` resets restart counters after a healthy run.
- `watch`, `watchPaths`, `watchIgnore`, and `watchDebounce` control file-triggered restarts.
- `online` and `onlineUrl` inside `wapkRun` turn a PM-managed WAPK app into an Elit Run host instead of a local runtime.
- `watcher`, `watchArchive`, `syncInterval`, and `archiveSyncInterval` inside `wapkRun` control the inner WAPK live-sync behavior when the WAPK app is using a local runtime.
- `healthCheck` config polls an HTTP endpoint and restarts the process after repeated failures.
- `elit pm start` starts every configured app, while `elit pm start <name>` starts one app by name.
- TypeScript file targets with `runtime: 'node'` require `tsx`; use `runtime: 'bun'` when you want zero-config TypeScript execution.

## Mobile

`mobile` config stores defaults for `elit mobile init`, `doctor`, `sync`, `open`, `run`, and `build`.

```typescript
mobile: {
  cwd: '.',
  appId: 'com.example.app',
  appName: 'Example App',
  webDir: 'dist',
  mode: 'native',
  icon: './icon.png',
  permissions: ['android.permission.INTERNET'],
  android: {
    target: 'emulator-5554',
  },
  ios: {
    target: 'iPhone 15',
  },
  native: {
    entry: './src/main.ts',
    exportName: 'Screen',
    android: {
      enabled: true,
      packageName: 'com.example.app',
      output: './android/app/src/main/java/com/example/app/GeneratedScreen.kt',
    },
    ios: {
      enabled: true,
      output: './ios/App/GeneratedScreen.swift',
    },
  },
}
```

Notes:

- `mobile.mode` selects `native` or `hybrid` mobile workflow defaults.
- `mobile.native.entry` lets the CLI reuse the same Elit entry for native code generation.
- `mobile.native.exportName` selects a specific module export.
- Android and iOS native branches can be enabled or disabled independently.

## WAPK

`wapk` config controls archive packaging and runtime metadata.

```typescript
wapk: {
  name: '@acme/sample-app',
  version: '1.0.0',
  runtime: 'bun',
  engine: 'bun@1',
  entry: 'src/server.ts',
  scripts: {
    start: 'bun run src/server.ts',
  },
  port: 3000,
  env: {
    NODE_ENV: 'production',
  },
  lock: {
    password: 'secret-123',
  },
  run: {
    googleDrive: {
      fileId: '1AbCdEfGhIjKlMnOp',
      accessTokenEnv: 'GOOGLE_DRIVE_ACCESS_TOKEN',
      supportsAllDrives: true,
    },
    runtime: 'bun',
    syncInterval: 150,
    useWatcher: true,
    watchArchive: true,
    archiveSyncInterval: 150,
  },
}
```

Notes:

- `lock.password` stores a plain-text password.
- `wapk.run.file` lets `elit wapk` or `elit wapk run` start a default archive without passing a file path each time.
- `wapk.run.googleDrive` lets WAPK talk to the Google Drive API directly, so the archive does not need to exist as a local file.
- `wapk.run.online` sends the archive to Elit Run instead of starting the local runtime.
- `wapk.run.onlineUrl` overrides the default Elit Run origin when online mode targets a custom host.
- `wapk.run.watchArchive` keeps the temp workdir in sync with external archive updates from the archive source, including Google Drive.
- `wapk.run.googleDrive.accessTokenEnv` is the recommended way to provide the OAuth token; Elit also falls back to the `GOOGLE_DRIVE_ACCESS_TOKEN` environment variable.
- `wapk.run.password` can override the archive password used at runtime; when it is omitted, Elit falls back to `wapk.lock.password`.
- `desktop` metadata can also be embedded under `wapk.desktop` when desktop shell behavior needs extra data.

## Full Example

```typescript
import { defineConfig } from 'elit/config';
import { ServerRouter, cors, logger } from 'elit/server';

const api = new ServerRouter();

api.use(cors());
api.use(logger());

api.get('/api/health', (ctx) => {
  ctx.res.json({ ok: true });
});

export default defineConfig({
  dev: {
    port: 3000,
    root: '.',
    api,
    ws: [
      {
        path: '/ws',
        handler: ({ ws }) => {
          ws.on('message', (message) => ws.send(message.toString()));
        },
      },
    ],
  },
  build: [
    {
      entry: './src/main.ts',
      outDir: './dist',
      outFile: 'main.js',
      format: 'esm',
      sourcemap: true,
    },
  ],
  preview: {
    root: './dist',
    api,
    ws: [
      {
        path: '/ws',
        handler: ({ ws }) => {
          ws.send('preview ready');
        },
      },
    ],
  },
  desktop: {
    mode: 'native',
    native: {
      entry: './src/main.ts',
    },
  },
  pm: {
    dumpFile: './.elit/pm/dump.json',
    apps: [
      {
        name: 'api',
        script: 'npm start',
        runtime: 'node',
        restartPolicy: 'on-failure',
        watch: true,
      },
      {
        name: 'worker',
        file: './src/worker.ts',
        runtime: 'bun',
        healthCheck: {
          url: 'http://127.0.0.1:3001/health',
        },
      },
    ],
  },
  mobile: {
    cwd: '.',
    appId: 'com.example.app',
    appName: 'Example App',
    webDir: 'dist',
  },
  wapk: {
    name: '@acme/sample-app',
    version: '1.0.0',
    runtime: 'bun',
    entry: 'src/server.ts',
  },
});
```

## Related Docs

- [CLI.md](./CLI.md)
- [server.md](./server.md)
- [API.md](./API.md)
