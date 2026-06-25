# elit CLI Reference

The `elit` command is the entry point for dev, build, preview, test, mobile, desktop, wapk, and pm workflows. Run `npx elit <command> --help` for full flag list.

## Common Commands

### `elit dev`
Start the dev server with HMR.

```bash
elit dev
elit dev --port 4000
elit dev --host 0.0.0.0
elit dev --no-open
elit dev --no-server-watch
elit dev --root ./src
elit dev --silent
```

**Flags:**
- `-p, --port <number>` — override `dev.port`
- `-h, --host <string>` — override `dev.host`
- `-r, --root <path>` — override `dev.root`
- `-b, --base-path <path>` — override `dev.basePath`
- `--no-open` — don't auto-open browser
- `--silent` — suppress logs
- `--no-server-watch` — disable server-side HMR (auto-restart on server edits)

### `elit build`
Run the production build.

```bash
elit build
```

Reads `build` from `elit.config.ts`. No public flags — configure via config file.

### `elit preview`
Preview the production build.

```bash
elit preview
elit preview --port 4000
elit preview --host 0.0.0.0
elit preview --root ./dist
elit preview --base-path /app
elit preview --no-open
elit preview --silent
```

Same flag set as `elit dev` minus HMR-related flags.

### `elit test`
Run the test suite.

```bash
elit test                                # run all
elit test --run                          # no watch, even if configured
elit test --watch                        # watch mode
elit test --coverage                     # with coverage
elit test --file ./src/foo.test.ts       # single file
elit test --pattern "user"               # filter by test name
elit test --bail 1                       # stop on first failure
elit test --mode production              # use production env
elit test --json                         # JSON reporter
```

**Test-scope flags:**
- `--mode <name>` — env mode (loads `.env.<name>`)
- `--web-dir <dir>` — mobile web dir for tests
- `--icon <path>` — mobile icon
- `--permission <perm>` — single mobile permission
- `--permissions <perm1,perm2>` — multiple mobile permissions
- `--json` — JSON output

## Mobile Commands

### `elit mobile init [directory]`
Initialize native projects from `mobile` config.

```bash
elit mobile init . --app-id com.example.app --app-name "My App" --web-dir dist
```

### `elit mobile doctor`
Check local mobile toolchain.

```bash
elit mobile doctor --cwd . --json
```

Use before `run` or `build` to verify Android SDK / Xcode are set up.

### `elit mobile devices <android|ios>`
List connected devices and emulators.

### `elit mobile sync`
Sync `mobile.webDir` into native projects without rebuilding.

```bash
elit mobile sync --cwd . --web-dir dist
```

### `elit mobile open <android|ios>`
Open the native project in Android Studio / Xcode.

### `elit mobile run <android|ios>`
Run on device/emulator.

```bash
elit mobile run android --cwd .
elit mobile run ios --target "iPhone 15"
```

### `elit mobile build <android|ios>`
Produce a build artifact (`.apk`/`.aab`/`.ipa`).

```bash
elit mobile build android --release
elit mobile build ios --archive
```

## Desktop Commands

### `elit desktop run [entry]`
Run the desktop app in hybrid or native mode.

```bash
elit desktop run
elit desktop run --mode hybrid
elit desktop run --platform windows
elit desktop run ./src/main.ts
```

### `elit desktop build [entry]`
Produce a platform binary.

```bash
elit desktop build
elit desktop build --release
elit desktop build --platform macos-arm
```

### `elit desktop wapk <file.wapk>`
Run a WAPK inside the desktop shell.

```bash
elit desktop wapk ./dist/app.wapk
```

## Process Manager Commands

### `elit pm start [name]`
Start all configured apps, or one by name.

```bash
elit pm start                  # all apps
elit pm start api              # just 'api'
elit pm start api --proxy-port 3000
```

### `elit pm list`
List managed apps.

```bash
elit pm list
elit pm list --json
```

### `elit pm show <name>`
Show one app's status, restart count, health.

### `elit pm stop <name|all>`
Stop a single app or everything.

### `elit pm restart <name|all>`
Restart apps.

```bash
elit pm restart api
elit pm reload api             # rolling reload for proxy mode
```

### `elit pm delete <name|all>`
Remove from PM (kills if running).

### `elit pm scale <name> <count>`
Change `instances` for an app.

```bash
elit pm scale api 4
```

### `elit pm logs <name>`
Tail an app's logs.

### `elit pm save` / `elit pm resurrect`
Persist current app list to `pm.dumpFile` and restore it later (e.g. after reboot).

```bash
elit pm save                   # write dump
elit pm resurrect              # restore from dump
```

## WAPK Commands

### `elit wapk build`
Package the app into a `.wapk` archive.

```bash
elit wapk build
```

### `elit wapk run <file.wapk>`
Run a WAPK archive locally.

```bash
elit wapk run ./dist/app.wapk
elit wapk run ./dist/app.wapk --watch
```

### `elit wapk online <file.wapk>`
Send the archive to Elit Run (remote hosting).

```bash
elit wapk online ./dist/app.wapk --url http://localhost:4179
```

### `elit wapk remote <file.wapk>`
Mount a remote WAPK and sync changes via Google Drive or watcher.

```bash
elit wapk remote ./dist/app.wapk --google-drive-file-id <id>
```

## Native Commands

### `elit native`
Generate native IR / code from `elit/native` calls. Used for desktop-native and mobile-native outputs.

```bash
elit native build
elit native build --target compose    # Kotlin Compose
elit native build --target swiftui    # SwiftUI
```

## Help + Version

```bash
elit --help                  # top-level command list
elit <command> --help        # command-specific flags
elit --version
```

## Environment Variables

Some flags accept env-var overrides:

```bash
ELIT_PORT=4000 elit dev      # same as --port 4000
ELIT_HOST=0.0.0.0 elit dev
NODE_ENV=production elit preview
```

## NPM Scripts (recommended)

Wire common commands into `package.json`:

```json
{
  "scripts": {
    "dev": "elit dev",
    "build": "elit build",
    "preview": "elit preview",
    "test": "elit test",
    "test:watch": "elit test --watch",
    "test:coverage": "elit test --coverage",
    "mobile:run:android": "elit mobile run android --cwd .",
    "mobile:build:android": "elit mobile build android --cwd .",
    "desktop:run": "elit desktop run",
    "desktop:build": "elit desktop build"
  }
}
```

Then `npm run dev`, `npm test`, etc.

## Gotchas

- **`elit dev` from a non-project directory** — uses `elit.config.ts` from cwd. Make sure scripts invoke `elit` from the project root.
- **`--no-server-watch` only affects `dev`** — `build` and `preview` don't have server HMR.
- **`elit pm save` requires running apps** — saves the live list. If nothing is running, the dump is empty.
- **`elit mobile build ios` requires macOS + Xcode** — can't build iOS on Linux/Windows.
- **`elit desktop build` for `macos-arm` requires Apple Silicon Mac** — cross-compilation needs extra setup.
- **`--port 0`** — picks any free port. Useful for parallel test runs.
- **`elit test --file <path>`** — path is relative to cwd, not project root.
