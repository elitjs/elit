# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.6.9] - 2026-06-12

### Added
- **`blockFiles` config for dev and preview** - `dev.blockFiles` and `preview.blockFiles` accept glob patterns to block sensitive files from being served over HTTP
  - Default patterns block `.env`, `.env.*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `.git/**`, `.htaccess`, `docker-compose.yml`, `docker-compose.yaml`, and `Dockerfile`
  - Requests matching a blocked pattern receive a `403 Forbidden` response
  - Set to an empty array to disable blocking; override with custom patterns to change the default list
- **`elit/config` subpath export** - added missing `./config` entry to the package exports map so `import { defineConfig } from 'elit/config'` resolves correctly

### Changed
- **Version metadata refresh** - release-facing version references across `package.json`, `Cargo.toml`, docs, examples, and `create-elit` templates now track `v3.6.9`

### Fixed
- **SSRF protection for PM proxy controller** (#88) - the PM proxy now validates all upstream targets to prevent server-side request forgery attacks
  - Blocked IP ranges: loopback (`127.x`, `::1`), private (`10.x`, `172.16–31.x`, `192.168.x`), link-local (`169.254.x`), carrier-grade NAT (`100.64–127.x`), multicast, and reserved addresses
  - DNS resolution validation prevents rebinding attacks by verifying the resolved IP is not a blocked address
  - Only `http:` and `https:` protocols are permitted as proxy targets
  - Request URL paths are sanitized to prevent `@`-based host smuggling and credential injection
  - Target URLs are validated on both `setTarget`/`setTargets` calls and at request time for continuous enforcement

## [3.6.8] - 2026-06-12

### Added
- **Multi-instance process groups** - `elit pm start` now accepts `--instances <count>` to launch and manage multiple copies of the same app as a single group
  - `elit pm scale <name> <count>` dynamically adjusts the number of running instances
  - `elit pm reset <name|all>` and `elit pm send-signal <signal> <name|all>` operate across all instances in a group
- **Readiness checks** - `--wait-ready` keeps processes in a `starting` state until their health endpoint responds; `--listen-timeout <ms>` caps the startup window
- **Memory management** - `--max-memory <bytes|size>` monitors process RSS and triggers a configurable `--memory-action restart|stop` when the threshold is exceeded
- **Scheduled restarts** - `--cron-restart <expr>` supports 5-field cron expressions and `@every` syntax for periodic restarts
- **Exponential backoff for unstable restarts** - `--exp-backoff-restart-delay <ms>` doubles the restart delay on repeated crashes; `--exp-backoff-restart-max-delay <ms>` caps the ceiling
- **Restart window** - `--restart-window <ms>` resets stale restart counters before they accumulate toward `maxRestarts`
- **Kill timeout** - `--kill-timeout <ms>` gives managed processes a configurable grace period between `SIGTERM` and `SIGKILL`
- **Proxy management** - `--proxy-port`, `--proxy-strategy proxy|inherit`, `--proxy-host`, `--proxy-target-host`, and `--proxy-env` let PM own the public port and forward traffic to child processes
  - `proxy` strategy routes HTTP and WebSocket upgrades through an in-process proxy (supports multi-instance groups)
  - `inherit` strategy shares the public listener file descriptor directly with a single Node child via IPC bootstrap
- **PM JSON output and live metrics** - `elit pm list --json` and `elit pm describe <name> --json` return machine-readable records with live `cpu`, `memory`, and `uptime` fields for running processes
  - `elit pm list` now includes live CPU, memory, and uptime columns in the table output
- **Rolling reload** - `elit pm reload <name|all>` performs a stop/start cycle across instances, waiting for each replacement to become `online` before continuing
  - When proxy is enabled, reload can hand off a single-instance HTTP app without dropping the public endpoint
- **Agent skills and project documentation** - added `.agents/skills/` and `.github/skills/` directories with structured checklists, architecture references, and command cheatsheets for server/CLI, mobile/WAPK, and native-renderer workflows

### Changed
- **Version metadata refresh** - release-facing version references across `package.json`, `Cargo.toml`, docs, examples, and `create-elit` templates now track `v3.6.8`

### Tests
- **PM regression coverage** - expanded test suite with coverage for multi-instance scaling, readiness monitors, memory thresholds, cron restarts, exponential backoff, kill timeout, proxy configuration, shared listener inheritance, and JSON output format

## [3.6.7] - 2026-04-17

### Added
- **Standalone dev/preview server build flow** - production builds can now emit runnable Node server bundles for dev and preview workflows without depending on the source tree at runtime
  - Added `elit build-dev` and `elit build-preview` convenience commands
  - Added `--standalone-dev`, `--standalone-preview`, `--dev-out-file`, and `--preview-out-file` build flags
  - Added typed programmatic `elit/dev-build` and `elit/preview-build` subpath exports for standalone server generation
- **Public process-manager subpath** - `elit/pm` is now exposed as a first-class package entry for typed process-manager helpers and programmatic access

### Changed
- **Standalone build pipeline integration** - the normal build flow can now emit standalone dev/preview bundles from CLI flags or config-driven `dev.standalone` / `preview.standalone` settings
  - Standalone server generation reuses the regular build pipeline and emits runnable Node `index.js` outputs into the target build roots
  - Build, dev-build, preview-build, desktop, and shared type ownership is now split into dedicated modules while compatibility barrels remain in place for existing imports
- **Release metadata refresh** - release-facing Cargo, docs, and example version references now track `v3.6.7`

### Fixed
- **WAPK archive config-artifact filtering** - `elit wapk pack` no longer leaks transient `.elit-config-*` bundles created while loading TypeScript/MTS config files, and legacy `wapk.config.json` stays excluded from packaged archives
  - Prevents temporary config-loader output from being shipped when projects use `elit.config.ts` or `elit.config.mts`
  - Keeps package metadata resolution anchored to current `wapk` config fields and `package.json`, not legacy `wapk.config.json`

### Tests
- **WAPK regression coverage refresh** - updated WAPK coverage for temp config-bundle exclusion, legacy config ignore behavior, and online shared-session shutdown flows under the in-repo test runner
  - Simplified assertions to match the custom runner's spy and matcher API while preserving the same runtime expectations

## [3.6.6] - 2026-04-16

### Added
- **WAPK archive patch workflow** - `elit wapk patch` can now overlay selected files from one archive into another through a manifest-driven patch archive
  - Added `elit wapk patch <target.wapk> --from <patch.wapk>` plus `--use` as an alias for `--from`
  - Added `--from-password` so a locked patch archive can be applied to a target archive with different credentials
  - Patch selection now reads archive-relative rules from `.wapkpatch`, including ordered excludes like `!database/*`
  - Folder selectors like `src/*` now apply to the whole subtree so patch archives can target directories more naturally
- **`elit/smtp-server` subpath package** - new built-in SMTP server module for receiving inbound email inside an elit project
  - `createSmtpServer(options)` and `startSmtpServer(options)` provide a zero-dependency embedded SMTP listener
  - `dev.smtp` and `preview.smtp` config keys wire the server lifecycle to the elit dev/preview process automatically
  - `clients[].smtp` supports per-client SMTP configuration in multi-tenant setups
- **Webmail example** - new `examples/webmail-example/` showing a full in-browser webmail client built with elit
  - Includes `elit.config.ts` with SMTP sandbox wired to `dev.smtp` / `preview.smtp` on `127.0.0.1:2525`
  - REST API via `ServerRouter`: `GET/POST /api/accounts`, `GET /api/messages`, `GET /api/messages/:id`, `POST /api/messages/send`, `POST /api/messages/draft`, `POST /api/demo/inbound`
  - Browser UI renders inbox list, message preview, compose form, reply flow, and save-draft — all using reactive states + `bindValue` for form field binding
  - Register email account panel lets users add named accounts; the From field in compose reflects registered accounts
  - SSR shell (`client.ts`) delivers the initial HTML frame; styles live in a dedicated `styles.ts` module

### Documentation
- **WAPK patch guide refresh** - README, CLI docs, and the WAPK guide now document the `elit wapk patch` flow, the `.wapkpatch` manifest name, and patch archive password handling

### Tests
- **WAPK patch regression coverage** - added focused coverage for manifest-driven patching, subtree selector behavior, locked target archives, locked patch archives, and missing `.wapkpatch` validation

## [3.6.5] - 2026-04-13

### Changed
- **Release metadata and version reference refresh** - release-facing versioned inputs now track `v3.6.5` across the desktop runtime, docs UI, and example package references
  - Desktop Cargo metadata now tracks `v3.6.5`
  - Docs UI version badges and example release references now point at `v3.6.5`
  - Example package references and lockfiles now track `v3.6.5`

### Fixed
- **`.wapkignore` now supports ordered gitignore-style exceptions and glob rules** - WAPK packaging can now exclude and re-include paths more predictably when archives need to keep selected build artifacts while dropping generated noise
  - Added ordered negate support such as `!dist` to re-include a later match
  - Added directory-only rules like `dist/`, globstar patterns like `**/*.map`, and escaped leading `\!literal` / `\#literal` entries
  - WAPK archive collection now evaluates ignore rules in order so later matches can override earlier ones
- **Test runtime module loading no longer rewrites imports with whole-source regex passes** - `elit test` now handles fixtures that contain import-looking strings without corrupting the transformed source
  - Test files now transpile and execute as full CommonJS modules instead of stripping named imports before transform
  - Relative test dependencies now resolve recursively through the test loader, avoiding unterminated-string failures from string literals such as `import { value } from "linked-lib";`

### Documentation
- **WAPK ignore guide refresh** - CLI and WAPK docs now document negate rules, directory rules, globstar patterns, and escaped leading literals for `.wapkignore`

### Tests
- **WAPK ignore regression coverage** - added focused coverage for negate rules, directory rules, globstar rules, and escaped leading `!` literals, and validated the new matcher behavior through the rebuilt CLI test path

## [3.6.4] - 2026-04-13

### Changed
- **Release metadata and desktop packaging refresh** - versioned release collateral for `v3.6.4` has been synced across the desktop runtime and published package inputs
  - Desktop Cargo metadata now tracks `v3.6.4`
  - Published package files now include `Cargo.lock` alongside `Cargo.toml` so desktop runtime builds can reuse the pinned Rust dependency graph

### Documentation
- **Version reference refresh** - README, docs UI version badges, and example project release references now point at `v3.6.4`

## [3.6.3] - 2026-04-13

### Changed
- **MIT license notice refresh** - updated the bundled MIT license file to keep the project copyright notice current
  - Refreshed the copyright line to `2024-2026 Elit`
  - No runtime or API behavior changes were introduced in this release

## [3.6.2] - 2026-04-13

### Fixed
- **Packaged desktop bootstrap helper resolution** - `elit desktop run` and `elit desktop build` no longer bundle packaged `desktop-auto-render` / `render-context` helpers through ESM artifacts that inject `import { createRequire } from 'module'` into non-Node desktop bundle targets
  - Desktop bootstrap helper resolution now prefers source files when available and otherwise falls back to packaged CommonJS helpers for bundle-based desktop compilers
  - Desktop bundle self-reference resolution now prefers built CommonJS `elit/*` artifacts when the package source tree is not shipped with the installed package

### Tests
- **Desktop helper resolution coverage** - updated desktop CLI coverage to assert that packaged desktop bootstrap helpers can prefer CommonJS helper artifacts while still preserving the existing source-first / ESM fallback behavior

## [3.6.1] - 2026-04-13

### Fixed
- **Browser import maps now expose only browser-safe Elit entries** - dev/preview HTML and standalone `build-dev` / `build-preview` outputs no longer publish server-only or build-only `elit/*` specifiers to the browser runtime
  - Browser import maps are now limited to `elit`, `elit/dom`, `elit/el`, `elit/native`, `elit/universal`, `elit/router`, `elit/state`, `elit/style`, `elit/hmr`, and `elit/types`
  - Prevents browser clients from resolving non-browser subpaths such as `elit/server`, `elit/build`, and `elit/`
- **Standalone dev fallback asset resolution** - standalone `build-dev` servers no longer return `404 Not Found` for built assets like `/main.js` when SSR and public assets are still served from the primary source root
  - Dev server static file resolution now falls back to `fallbackRoot` before returning `404`
  - Keeps SSR output and primary-root public assets intact while serving built client bundles and sourcemaps from the generated output when needed

### Tests
- **Browser-safe import map regression coverage** - updated server import-map tests to assert that only the browser-safe Elit subset is emitted for both workspace and installed-package browser flows
- **Standalone dev mixed-root fallback coverage** - added regression coverage for the case where SSR/public assets come from the source root while built client assets are resolved from `fallbackRoot`

## [3.6.0] - 2026-04-13

### Fixed
- **Dev-mode workspace Elit import maps now use built ESM output** - the dev server no longer emits workspace-local `elit/*` browser imports that point at `/src/*.ts` or non-module IIFE browser files
  - Workspace-root Elit imports now resolve through `/dist/*.mjs` in both `dev` and `preview` modes
  - Keeps browser import maps aligned with the published package surface and preserves named ESM exports for browser module loading
- **Standalone preview/dev self-reference resolution now prefers built artifacts** - generated standalone server bundles now resolve `elit/*` self-references through built `dist/*` artifacts before falling back to the workspace source tree
  - Keeps standalone preview/dev package self-references aligned with the published runtime surface
  - Standalone Node/CJS bundles now prefer built CJS artifacts while browser/config ESM flows keep preferring built ESM artifacts
  - Avoids reintroducing `node_modules/elit/src/*.ts` references in standalone consumer-facing flows when built artifacts are available
  - Prevents `build-dev` standalone bundles from pulling in ESM artifacts that rely on `import.meta.url` and then crashing on startup under Node CJS

### Tests
- **Server import map regression coverage** - updated the server import map tests to assert that workspace-local Elit imports resolve to `/dist/*.mjs` and no longer include `/src/` or `.ts` entries in dev mode
- **Workspace self-reference regression coverage** - added resolver coverage for `preferBuilt` on both root and `elit/server` subpath imports used by standalone server bundles

## [3.5.9] - 2026-04-13

### Changed
- **Universal app desktop example defaults** - the universal app example now reflects the current desktop runtime path more closely for local testing and locked-down Windows workflows
  - The example desktop config now forwards `ELIT_DESKTOP_BINARY_PATH`, `ELIT_DESKTOP_NATIVE_BINARY_PATH`, and `ELIT_DESKTOP_CARGO_TARGET_DIR` into `desktop` config
  - The sample desktop flow now defaults to hybrid mode and sets `./public/favicon.svg` as the desktop window icon

### Fixed
- **Desktop Cargo target placement under Windows policy controls** - installed desktop runtime builds no longer place Cargo build-script executables under `node_modules/elit/target/*`, which can be blocked by Windows Application Control policy
  - On Windows, desktop runtime builds now default to `%LOCALAPPDATA%/elit/target/desktop/*` instead of the package-local target tree
  - `ELIT_DESKTOP_CARGO_TARGET_DIR` can override the cache location explicitly when a different policy-approved path is required
  - Non-Windows installed-package builds still fall back to the consuming app's `.elit/target/desktop/*` directory when Elit runs from `node_modules`
- **Desktop runtime override escape hatch** - desktop run/build commands can now bypass Cargo entirely by using a prebuilt runtime binary when Windows policy blocks Rust build-script executables
  - Added `desktop.binaryPath` / `desktop.nativeBinaryPath` config support plus `ELIT_DESKTOP_BINARY_PATH` / `ELIT_DESKTOP_NATIVE_BINARY_PATH` environment overrides
  - Added `desktop.cargoTargetDir` config support plus `ELIT_DESKTOP_CARGO_TARGET_DIR` environment overrides for policy-approved Cargo cache locations
  - Windows Cargo failure output now points at the prebuilt-runtime override and target-cache override options
- **TypeScript config loader compatibility** - `.ts` config files that import bundled local helpers now load cleanly even when those helpers still use CommonJS-style `require(...)`
  - The temporary ESM config bundle now injects `createRequire(import.meta.url)` so repo-local helper modules can access Node built-ins such as `fs` during config evaluation

### Documentation
- **Locked-down Windows example workflow** - documented how to prebuild the desktop runtime on an allowed Windows machine, copy the binaries to a policy-approved path, and run the universal app example with the desktop override env vars

### Tests
- **Desktop runtime override coverage** - added focused desktop CLI coverage for Cargo target overrides and prebuilt runtime binary override resolution
- **TypeScript config loader regression coverage** - added a focused config-loading test for local helper modules that call `require('fs')` inside a bundled `elit.config.ts`

## [3.5.8] - 2026-04-13

### Changed
- **Desktop bootstrap helper packaging** - desktop bootstrap support helpers now ship in the published package output so installed desktop workflows can resolve the same runtime support modules without relying on the source tree
  - Added built `dist/desktop-auto-render.*` and `dist/render-context.*` artifacts for desktop bootstrap/prelude generation
  - Package exports now expose `elit/desktop-auto-render` and `elit/render-context` for consumers that need the packaged helper surface

### Fixed
- **Desktop packaged-install bootstrap resolution** - `elit desktop run` and `elit desktop build` no longer generate imports into missing `node_modules/elit/src/*` files when Elit is consumed from a published install
  - Desktop bootstrap generation now prefers workspace `src/*` helpers during local development
  - Published installs now fall back to the shipped `dist/*` helper modules when `src/*` is not present

### Tests
- **Desktop packaging regression coverage** - added focused desktop CLI coverage for bootstrap helper resolution in both workspace and packaged-install layouts

## [3.5.7] - 2026-04-12

### Changed
- **WAPK entry inference and browser-start execution** - WAPK packaging and runtime launch now handle CLI-driven web app archives more predictably
  - `elit wapk pack` can now fall back to `build.entry` from `elit.config.*` when `wapk.entry` is omitted
  - Browser-style archives now prefer `scripts.start` when the package exposes preview/dev-style startup flows, including local `node_modules/.bin` shims and packaged `bin` targets such as `elit preview`
  - Windows start-script execution now uses shell mode only for script launchers like `.cmd`, `.bat`, and `.ps1`, avoiding unnecessary shell wrapping for normal executables
- **Publish layout tightening** - npm package contents now ship the built `dist/*` artifacts plus the relocated `desktop/` Rust sources instead of publishing the full source tree
  - Keeps installed package payloads aligned with the exported runtime surface and native desktop build inputs

### Fixed
- **Database VM fallback import rewriting** - database execution in runtimes without `vm.SourceTextModule` now rewrites mixed ES module import forms more reliably
  - Fixed fallback handling for `default + named` and `default + namespace` imports from `@db/...` modules
  - Keeps module-local bindings isolated so imported database modules do not leak or collide with caller scope during CommonJS fallback execution

### Documentation
- **CLI-first docs/example scripts** - docs and example app scripts now invoke the installed `elit` CLI commands directly, and the docs package now consumes the published `elit` package instead of a workspace file link

### Tests
- **WAPK and database regression coverage** - added focused coverage for `build.entry` fallback, Windows shell-launch detection, browser-style start-script execution through local and packaged bin shims, and fallback database import rewriting for mixed import shapes

## [3.5.6] - 2026-04-11

### Added
- **Headless WAPK online share** - `elit wapk run <file.wapk> --online` can now create an Elit Run shared session without opening a browser and return the join key directly to the CLI
  - Added `--online` and `--online-url <url>` for WAPK run flows
  - The CLI now sends a decoded shared-session snapshot straight to the Elit Run server API and prints the returned share key and join URL
  - Elit Run now supports static server-created shared sessions so guests can join with the returned key even when no browser host was opened

### Changed
- **Persistent WAPK online host lifecycle** - `elit wapk run <file.wapk> --online` now stays alive so the host session remains visibly active and closes the server-side shared session when the CLI receives `Ctrl+C`
- **PM-managed WAPK online lifecycle** - `elit pm start --wapk <file.wapk> --online` now forwards Elit Run hosting flags and closes the shared session cleanly when PM stops, restarts, or deletes the managed app

### Fixed
- **Standalone WAPK preview/dev archive boot flow** - standalone packaged preview and dev builds now start from the expected built assets instead of leaking source-only paths into extracted WAPK runs
  - Preview root requests now prefer built `index.html` before SSR when built output is available, preventing stale `/src/main.js` script tags from breaking packaged preview sessions
  - Standalone dev bundles now fall back to built `dist/` assets when source roots are excluded from the archive, so packaged dev runs can serve `main.js` without shipping `dev-dist/node_modules`
  - The full-db example and the create-elit template now keep the `#app` mount point aligned across `public/index.html`, `src/main.ts`, and client bootstrapping
- **Packaged database VM module loading** - `@db/...` imports in standalone packaged runs now keep real module errors intact and avoid cross-module binding collisions during the CommonJS fallback execution path

### Tests
- **Standalone packaging regression coverage** - added focused coverage for preview root selection, dev fallback roots, HTML mount-point alignment, standalone package dependency replacement, and fallback database loading for `@db/...` modules

## [3.5.5] - 2026-04-11

### Added
- **Global CLI version flags** - `elit --version` and `elit -v` now work as shortcuts for `elit version`


## [3.5.4] - 2026-04-10

### Added
- **Process manager (`elit pm`)** - Added a detached process manager for shell commands, file entrypoints, and packaged WAPK apps
  - `elit pm start` now supports `--script`, `--file`, positional file targets, and `--wapk`
  - Added `elit pm list`, `stop`, `restart`, `delete`, and `logs` for lifecycle management
  - Added `elit pm save` / `elit pm resurrect` to persist and restore the managed app list
  - Added watch mode, HTTP health checks, `restartPolicy`, and `minUptime` for richer supervision behavior
  - Added `pm.apps[]`, `pm.dataDir`, and `pm.dumpFile` support in `elit.config.*`
  - **Direct Google Drive WAPK archives** - WAPK run flows can now read and write archives through the Google Drive API without a local `.wapk` file
  - Added `gdrive://<fileId>` archive sources and `--google-drive-file-id`, `--google-drive-token-env`, `--google-drive-access-token`, and `--google-drive-shared-drive` CLI support
  - Added `config.wapk.run.googleDrive` plus config-driven default archive startup for `elit wapk` and `elit wapk run`
  - Added two-way sync against remote archive sources so WAPK runtime changes can push back to Drive and pull remote archive updates into the extracted workdir
- **PM support for remote WAPK apps** - `elit pm` can now manage Google Drive-backed WAPK runtimes in addition to local `.wapk` files
  - Added `elit pm start --wapk gdrive://<fileId>` and `elit pm start --google-drive-file-id <fileId>` flows
  - Added `pm.apps[].wapkRun` so PM-managed WAPK apps can forward Google Drive auth hints and inner WAPK sync settings like `syncInterval`, `watcher`, `watchArchive`, and `archiveSyncInterval`
  - Added an example project under `examples/wapk-google-drive-example` covering direct PM startup and config-driven PM startup for Google Drive WAPK apps

### Changed
- **WAPK live-sync architecture** - WAPK runtime sync now targets abstract archive sources instead of only local files
  - `prepareWapkApp(...)` and live-sync flush/stop flows are now async so local files and Google Drive archives share the same runtime path
  - Added separate archive read-sync tuning via `--archive-watch`, `--no-archive-watch`, and `--archive-sync-interval <ms>`
  - Desktop WAPK command paths and runtime docs were updated to match the source-agnostic live-sync flow

### Fixed
- **Code scanning shell-hardening fixes** - Tightened command construction in PM and mobile CLI flows to address shell-command injection findings
  - PM command previews now quote only safe segments while still preserving readable previews
  - Windows mobile command handling no longer builds shell execution from unsafe environment-derived values

### Documentation
- **CLI and config reference refresh** - Documented process-manager workflows in the README and docs command/config guides
- **Google Drive WAPK and PM guide refresh** - Updated README, CLI guide, config guide, WAPK guide, and example docs for direct Google Drive runtime flows and PM-managed WAPK workflows

### Tests
- **Google Drive WAPK coverage** - Added mocked Google Drive WAPK runtime coverage plus opt-in real Google Drive integration coverage
  - Added WAPK tests for remote pull sync, remote push sync, and config-driven Google Drive startup
  - Added PM helper coverage for remote WAPK source parsing and forwarded WAPK run options

### Validation
- **PM smoke validation** - Verified background start, list, logs, stop, and delete flow against the built CLI
- **Focused runtime validation** - Verified the recent WAPK and PM changes with typecheck, build, and targeted runtime checks
  - `npm run typecheck`
  - `bun run build`
  - Mocked Google Drive WAPK runtime validation for pull/push sync and config-driven execution
  - Bun-based PM smoke validation covering remote WAPK source parsing, config resolution, and forwarded command arguments

## [3.5.2] - 2026-04-10

### Changed
- **WAPK lock credential simplification** - WAPK locking now uses password-only credentials across config, CLI, and helper APIs
  - `wapk.lock` accepts only `password` in `elit.config.*`
  - `elit wapk` and `elit desktop wapk` now accept only `--password` for locked archives
  - `WapkCredentialsOptions` now accepts only `password`

### Documentation
- **README WAPK credential refresh** - Updated command examples, config notes, and release summary to match the password-only WAPK lock flow

### Tests
- **WAPK lock coverage refresh** - Updated config-driven unit coverage to lock archives with `wapk.lock.password`

## [3.5.1] - 2026-04-09

### Added
- **Configurable WebSocket endpoints for dev and preview** - `dev.ws`, `preview.ws`, and `clients[].ws` can now register custom WebSocket upgrade handlers
  - Endpoint handlers receive `{ ws, req, path, query, headers }`
  - Client-specific endpoints are automatically prefixed with that client's `basePath`
  - Works alongside the existing REST router, proxy, SSR, and shared-state flows

### Changed
- **Internal WebSocket routing split** - Elit now keeps HMR and built-in shared state traffic on a reserved internal path
  - Internal HMR and shared-state traffic now uses `/__elit_ws`
  - `createSharedState()` defaults to that internal path and rewrites bare host-only WebSocket URLs to it
  - Prevents custom WebSocket endpoints from colliding with HMR connections
- **Cross-runtime WebSocket path matching** - Upgrade matching now uses exact pathnames instead of treating `/` as a wildcard
  - Query strings are ignored for route matching while remaining available in endpoint context
  - Bun upgrade routing now matches the request pathname cleanly before handing the socket to the selected server

### Documentation
- **README WebSocket refresh** - Added config examples, server usage patterns, changelog summary, and reserved-path guidance for custom WebSocket endpoints

### Tests
- **WebSocket endpoint coverage** - Added unit coverage for query-aware path matching and shared-state internal WebSocket URL resolution

## [3.5.0] - 2026-04-08

### Added
- **Locked WAPK archives** - WAPK packaging can now encrypt archive payloads and require credentials to open them
  - Added `--password` and `--password-env` support to `elit wapk pack`
  - Added `wapk.lock.password` and `wapk.lock.passwordEnv` support in `elit.config.*`
  - Added locked archive support to `elit wapk inspect`, `elit wapk extract`, `elit wapk run`, and `elit desktop wapk run`

### Changed
- **WAPK archive handling** - Archive inspection and live-sync flows now understand password-protected WAPK files
  - `inspect` reports whether an archive is locked even when credentials are not provided
  - Live sync keeps locked archives encrypted when runtime changes are written back into the same `.wapk` file
  - Desktop WAPK commands now forward password credentials to the packaged runtime flow

### Documentation
- **README and WAPK guide refresh** - Documented password-protected WAPK packaging, unlock flags, and config-driven lock defaults

### Tests
- **WAPK lock coverage** - Added unit coverage for password-protected archives, config-driven `passwordEnv` locks, and encrypted live-sync updates

## [3.4.9] - 2026-04-06

### Changed
- **Desktop native renderer modularization** - Reorganized the Rust desktop-native renderer into focused modules without changing the native desktop payload, CLI surface, or shared `elit/native` foundation
  - Split widget rendering, content/media surfaces, form controls, interaction dispatch, container rendering, vector drawing, runtime support, and app runtime orchestration into dedicated modules
  - Keeps desktop-native parity fixes localized while preserving the existing `native_renderer::run(...)` entry flow and shared native tree contract

### Documentation
- **README native desktop foundation refresh** - Clarified that native desktop mode still runs on the same shared native tree and style/layout model as IR, Compose, and SwiftUI output while its desktop renderer internals are now modularized by concern

## [3.4.8] - 2026-04-06

### Changed
- **Native renderer modularization** - Split the shared native rendering pipeline into focused modules while keeping the public `elit/native` API unchanged
  - Compose, SwiftUI, IR generation, and native desktop mode still share the same native tree and resolved-style foundation
  - Native layout, typography, interaction, background, estimation, and render-support logic now live in smaller helper modules, making parity fixes safer to land across outputs

### Documentation
- **Native foundation README refresh** - Updated the main README to clarify that `elit/native` and native desktop mode build on the same shared native rendering foundation

## [3.4.7] - 2026-04-05

### Added
- **Desktop mode split** - Desktop config and CLI now support `hybrid` and `native` modes similar to mobile
  - Added `desktop.mode` plus `desktop.native.entry` config support
  - Added `elit desktop run` as an explicit run alias beside the shorthand `elit desktop`
- **True native desktop backend** - Native desktop mode now builds and runs a dedicated desktop renderer instead of only resolving a different entry
  - Added a separate `elit-desktop-native` Rust binary for native desktop run/build
  - Native desktop mode now materializes Elit native IR and renders it through the dedicated native desktop runtime

### Changed
- **Desktop native entry resolution** - Desktop run/build now resolve entries from the active mode
  - Projects with `desktop.native.entry` default to native desktop mode
  - `--mode native|hybrid` now works for `elit desktop run` and `elit desktop build`
  - Native desktop mode falls back to legacy `desktop.entry` when needed for backward compatibility

### Fixed
- **Strict TypeScript typecheck compatibility** - The desktop/native toolchain now passes `tsc --noEmit` cleanly on the current TypeScript toolchain
  - Updated TypeScript module resolution config for modern ESM/bundler behavior
  - Cleaned up stale native desktop helper typings left behind by the renderer refactor
  - Aligned desktop auto-render `createWindow()` typing with the shared desktop `WindowOptions` contract

## [3.4.6] - 2026-04-04

### Added
- **Desktop entry config default** - Added `desktop.entry` support in `elit.config.*` for desktop run/build commands
  - `elit desktop` and `elit desktop build` can now omit the positional entry when `desktop.entry` is configured
  - CLI help and config docs now describe the optional entry behavior

### Changed
- **Shared render-based desktop/mobile entry flow** - Desktop mode and native generation can now reuse a normal `render(...)` entry instead of requiring separate platform-specific mains
  - `render()` now captures the rendered VNode when running in Elit desktop/mobile runtimes without a DOM
  - Native generation falls back to that captured `render(...)` output when the module does not export `default`, `screen`, `app`, `view`, or `root`
  - Desktop run/build auto-wrap shared entries and open a native window from the captured render output when the entry does not call `createWindow()` directly
- **Universal example consolidation** - `examples/universal-app-example` now runs web, desktop, and native mobile flows from the same `src/web-main.ts` entry
  - `desktop.entry` and `mobile.native.entry` both point at the shared entry file
  - Removed the example's legacy `desktop.ts`, `desktop-app.ts`, `desktop-html.ts`, and `native-screen.ts` split entry files

### Fixed
- **QuickJS shared-entry desktop startup** - Shared desktop entries now open correctly on the QuickJS runtime
  - Desktop bootstrap no longer depends on Promise microtasks before `createWindow()` runs
  - Fixes the no-window path for projects using `desktop.runtime: 'quickjs'`
- **Desktop config fallback with no CLI args** - `elit desktop` no longer prints help when `desktop.entry` is configured and no explicit entry path is passed

### Documentation
- **Desktop/shared-entry docs refresh** - Updated README and example docs to describe `desktop.entry`, shared `render(...)` desktop entries, and native generation from the same entry module

### Tests
- Validated the shared-entry flow with:
  - `bun ../../src/cli.ts build`
  - `bun src/cli.ts native generate android examples/universal-app-example/src/web-main.ts`
  - `bun run desktop:smoke`
  - `bun run desktop:build`

## [3.4.5] - 2026-04-02

### Added
- **Mobile mode (native shell workflow)** - Added first-class `elit mobile` command group for Android and iOS workflows
  - Added `elit mobile init [directory]` to scaffold native project structure, with mobile defaults sourced from `elit.config.*`
  - Added `elit mobile sync`, `elit mobile open android|ios`, `elit mobile run android|ios`, and `elit mobile build android|ios`
  - Added `elit mobile doctor` to verify native mobile toolchain readiness and project prerequisites
  - Added `elit mobile doctor --json` for machine-readable CI diagnostics
  - Added `mobile` config support in `elit.config.*` (`cwd`, `appId`, `appName`, `webDir`)
- **WAPK CLI workflows** - Added first-class WAPK command flows for package lifecycle and runtime execution
  - Added `elit wapk <file.wapk>` and `elit wapk run <file.wapk>` execution paths
  - Added `elit wapk pack [directory]`, `elit wapk inspect <file.wapk>`, and `elit wapk extract <file.wapk>`
  - Added runtime override support via `--runtime node|bun|deno` for WAPK run commands
  - Added desktop integration commands: `elit desktop wapk <file.wapk>` and `elit desktop wapk run <file.wapk>`
- **WAPK sync controls** - Added runtime sync tuning options for edit-heavy workflows
  - Added `--sync-interval <ms>` to configure archive sync frequency
  - Added `--watcher` / `--use-watcher` mode for event-driven file sync
- **Desktop config defaults** - Added `desktop` config support in `elit.config.*` for `elit desktop` commands
  - `elit desktop` and `elit desktop build` now read defaults from `desktop` config
  - `elit desktop wapk` now reads defaults from `desktop.wapk` config

### Changed
- **WAPK config source** - WAPK packaging now reads `wapk` options from `elit.config.*`
  - Supports `elit.config.ts`, `elit.config.mts`, `elit.config.js`, `elit.config.mjs`, `elit.config.cjs`, and `elit.config.json`
  - Removed metadata fallback behavior from legacy `wapk.config.json`
- **WAPK run architecture** - Reworked run flow from cache-based extraction to live archive sync
  - `.wapk` is loaded and prepared in a temporary working directory for runtime execution
  - File changes are synced back into the source `.wapk` archive directly during runtime
  - Desktop WAPK run now uses the same live sync model and lifecycle cleanup

### Fixed
- **Archive ignore behavior** - Packaging now excludes legacy and temporary config artifacts from WAPK contents
  - Prevents accidental inclusion of `.elit-config-*` temporary files
  - Prevents accidental inclusion of `wapk.config.json` in generated archives
- **Desktop/WAPK compatibility after run refactor** - Updated desktop command paths to use `workDir` after cache removal

### Tests
- Added and expanded WAPK unit/smoke coverage for:
  - `elit.config.json` and `elit.config.mts` metadata loading
  - Ignoring legacy `wapk.config.json` metadata and file inclusion
  - Configurable sync interval and watcher-enabled live sync behavior
  - Real-world example flow (`pack -> inspect -> run -> extract`) in `examples/wapk-example`

## [3.4.4] - 2026-04-01

### Added
- **Native desktop mode** - Added a first-class desktop runtime and CLI flow for WebView apps
  - New `elit desktop` command for running entries and building standalone executables
  - New `elit/desktop` subpath with `createWindow`, `createWindowServer`, IPC helpers, and window control APIs
  - Desktop runtime now supports QuickJS plus external Bun, Node.js, and Deno execution
  - Added desktop smoke example and bundled native runtime sources via Cargo

### Changed
- **Desktop build pipeline** - Expanded desktop entry preparation and package distribution for native apps
  - `elit desktop build --compiler` now supports `auto`, `none`, `esbuild`, `tsx`, and `tsup`
  - Desktop build can prebuild the native runtime even without an entry file
  - Published package now includes the `elit/desktop` export and Cargo files needed to build the native runtime
- **Documentation refresh** - Reworked the main README and docs content around current module boundaries and workflows
  - Updated examples to prefer subpath imports such as `elit/el`, `elit/state`, `elit/dom`, and `elit/server`
  - Added desktop mode guidance, compiler notes, config examples, and AI-oriented usage rules

### Fixed
- **Desktop icon handling** - Window icons and Windows executable icons now support SVG assets in addition to PNG and ICO
  - Added shared SVG rasterization for runtime window icons and EXE icon embedding
  - Desktop icon auto-detection now checks `icon.*` and `favicon.*` in entry, project, and sibling `public/` directories

## [3.4.3] - 2026-04-01

### Fixed
- **Database `save()` and `update()` preserve typed exports** - Saving structured data into existing database modules now keeps typed declarations intact
  - `save()` updates existing bindings like `export const users: User[] = ...` in place instead of overwriting the module structure
  - `update()` replaces the declaration body without appending duplicate fallback exports
  - Added unit tests covering typed `save()` and `update()` flows

## [3.4.2] - 2026-03-09

### Fixed
- **HMR WebSocket Error in Preview Mode** - Fixed `WebSocket connection failed` error when app imports `elit/hmr` in preview mode
  - `ElitHMR` constructor now checks `window.__ELIT_MODE__` before attempting to connect
  - Server injects `<script>window.__ELIT_MODE__='preview';</script>` into HTML head in preview mode
  - Applies to both static file responses (`serveFile`) and SSR responses (`serveSSR`)
  - No more `[Elit HMR] WebSocket error:` noise in browser console during preview

## [3.4.1] - 2026-03-09

### Security
- **Preview Mode Hardening** - Significant security improvements when running `elit preview`
  - Security response headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`) are now automatically set on all file and SSR responses
  - HMR WebSocket script is no longer injected into HTML pages in preview mode
  - WebSocket server is not created in preview mode, eliminating an unnecessary open endpoint
  - File watcher is not started in preview mode, reducing attack surface
  - Source maps are disabled in preview mode to avoid exposing source code structure
  - JavaScript files are obfuscated in preview mode using `javascript-obfuscator` (via `esbuild-obfuscator-plugin`)
- **Enhanced `security()` middleware** - Added `Referrer-Policy: strict-origin-when-cross-origin` and `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- **Safe `close()` cleanup** - `close()` now guards against null `wss`/`watcher` when called in preview mode

## [3.4.0] - 2026-02-24

### Added
- **Config Hot Reload** - Dev server now automatically restarts when config file changes
  - Watches for changes to `elit.config.ts`, `elit.config.js`, `elit.config.mjs`, and `elit.config.json`
  - Server restarts with reloaded config without needing to manually Ctrl+C
  - 300ms debounce to handle rapid file saves gracefully
  - Restart is guarded against concurrent triggers

### Fixed
- **API Route Handling with basePath** - Fixed client-specific API routes not matching when `basePath` is set
  - `matchedClient.api` now correctly strips `basePath` from the request URL before pattern matching
  - `config.api` (global) correctly matches against the original full URL
  - API routes no longer require a `/api` prefix — any path can be used as an API route
  - 405 Method Not Allowed response now fires when API routes are configured but no route matched (regardless of path prefix)
- **HMR File Add/Remove** - Browser now reloads when files are added or deleted
  - `add` event broadcasts `update` message to all connected HMR clients
  - `unlink` event broadcasts `reload` message to all connected HMR clients
  - Previously only `change` events triggered browser reload

### Fixed
- **Database Custom Directory** - Fixed Database class not saving to custom `dir` option
  - When creating a Database with `dir: 'databases/system'`, it now correctly saves to that directory
  - Previously fell back to default `databases` directory when called from within VM
  - SystemModuleResolver now properly passes customOptions to all database functions
- **Import Map 404 Error** - Fixed import map paths for dev server with basePath
  - Import map now correctly points to compiled `.mjs` files instead of source `.ts` files
  - Added special handling for `/basePath/dist/*` requests to serve from parent package
  - Fixes 404 errors when using `file:..` dependency references in development
- **Mobile Build Support** - Build native Android & iOS apps using Capacitor
  - `elit android init` - Initialize mobile project with auto-install of Capacitor dependencies
  - `elit android sync` - Sync web build to mobile platforms
  - `elit android open --platform <android|ios>` - Open project in Android Studio or Xcode
  - `elit android build --platform <android|ios>` - Build native APK/AAB or IPA
  - New `MobileConfig` interface in `elit/types.ts`
  - Mobile configuration option in `elit.config.ts`
  - Support for both Android and iOS platforms
  - Auto-detection of platform requirements (Java JDK, Android SDK, Xcode, CocoaPods)

### Changed
- **HMR Configuration** - Added `hmr` option to disable Hot Module Replacement
  - Set `hmr: false` in `elit.config.ts` dev section to disable auto-reload
  - When disabled, WebSocket server and file watcher are not created
  - Useful for debugging or when auto-reload is not desired

## [3.3.6] - 2025-01-28

### Added
- **Express-like Request Interface** - Added `query` and `params` properties to `ElitRequest` for better Express compatibility
  - `req.query` now provides direct access to parsed query parameters
  - `req.params` now provides direct access to route parameters (e.g., `/users/:id`)
  - Works alongside `req.body` for complete request data access
  - Compatible with both context-based handlers and direct (req, res) handlers
  - Query and params are automatically parsed and attached to every request

## [3.3.5] - 2025-01-25

### Fixed
- **WebSocket HMR Error Handling** - Fixed ECONNABORTED errors during Hot Module Replacement
  - Added graceful error handling for connection interruptions (ECONNABORTED, ECONNRESET, EPIPE)
  - WebSocket send method now checks if socket is writable before sending
  - HMR broadcast properly handles client disconnections without crashing the server
  - Connection errors are now silently ignored instead of crashing the dev server
  - Fixes issue where closing browser tab or network issues would crash the development server

## [3.3.4] - 2025-01-25

### Added
- **RegisterPage Unit Tests** - Added 59 comprehensive unit tests for RegisterPage component
  - Tests cover authentication redirect, page structure, form elements, validation
  - Social login buttons, error handling, loading states
  - Form validation for name, email, password, and confirm password
- **Client Unit Tests** - Added 24 comprehensive unit tests for client HTML document
  - Tests cover HTML structure, head section, meta tags, body section
  - Validates favicon, title, charset, viewport, and description meta tags
  - Tests DOM rendering and HTML document structure
- **Main Application Unit Tests** - Added 40 comprehensive unit tests for main entry point
  - Tests cover module structure, injectStyles, router integration
  - App component structure, reactive routing, component layout
  - DOM rendering, app initialization, and execution order
- **Test Suite Growth** - Total test suite now has 431 passing tests
  - Footer: 18 tests
  - Header: 18 tests
  - ChatListPage: 24 tests
  - ChatPage: 23 tests
  - ForgotPasswordPage: 46 tests
  - HomePage: 46 tests
  - LoginPage: 50 tests
  - PrivateChatPage: 33 tests
  - ProfilePage: 50 tests
  - RegisterPage: 59 tests
  - Client: 24 tests
  - Main: 40 tests

### Changed
- **Test Pattern Improvements** - Simplified tests for async/reactive components
  - Tests now check structure capability rather than specific async content
  - Avoids waiting for async operations like loadProfile()
  - More reliable and faster test execution

## [3.3.3] - 2025-01-21

### Fixed
- **Build Process Exit** - Build command now properly exits after completion
  - Added `process.exit(0)` after all build paths complete
  - Prevents build process from hanging after successful builds
  - Works for both config-based and CLI-only builds

## [3.3.2] - 2025-01-21

### Changed
- **Router Mode Detection** - Router now automatically exposes mode property
  - `router.mode` now returns `'history'` or `'hash'` for mode detection
  - `routerLink` component automatically uses router mode for href generation
  - No need to manually detect URL format for hash vs history mode

### Fixed
- **URL Path Joining** - Fixed duplicate slash issue when base and path both contain slashes
  - Properly handles `/` + `/login` → `/login` instead of `//login`
  - Prevents `SecurityError` when using history mode with invalid URLs
- **Template Header** - Updated to use `routerLink` from `'elit/router'`
  - Replaced `<a href="#/">` with `routerLink(router, { to: '/', ... })`
  - Ensures proper routing in both hash and history modes

## [3.3.1] - 2025-01-21

### Added
- **Reactive Array Support** - `reactive` function now supports returning arrays of children
  - Can return `VNode[]` directly from reactive callbacks without wrapping
  - Arrays are wrapped in `<span style="display: contents">` for invisible container
  - `Child` type now supports recursive arrays via `Child[]`
  - `reactiveAs` also supports array return values
  - Fragment rendering support in `dom.ts` for empty tagName elements

## [3.3.0] - 2025-01-21

### Added
- **create-elit Template System** - Refactored to use template files with placeholder replacement
  - Templates now stored in `packages/create-elit/src/templates/`
  - Placeholders `ELIT_PROJECT_NAME` and `ELIT_VERSION` replaced during project creation
  - Version dynamically read from `create-elit` package.json
  - Templates automatically copied to `dist/templates` during build
  - Easier to maintain and update templates independently

### Changed
- **create-elit** - Simplified scaffolding logic
  - Removed inline template generation (2500+ lines)
  - Now copies from templates directory with placeholder replacement
  - Templates include: full-stack app with authentication, routing, and chat features
  - Build process copies templates to `dist/templates` for distribution
  - Updated `package.json` files array to only include `dist` folder
  - Template `gitignore` file automatically renamed to `.gitignore` in generated projects

## [3.1.7] - 2025-01-21

### Added
- Domain mapping support for dev and preview servers
- Database VM runner with plugin system
- Environment variable injection with `.env` file support

### Changed
- Improved dev server configuration handling
- Enhanced proxy configuration with better path rewriting

## [3.1.6] - 2025-01-21

### Added
- Multi-client support for dev server
- Client-specific API routes and proxy configuration
- Web Worker support for background processing

## [3.1.5] - 2025-01-21

### Added
- SSR (Server-Side Rendering) support
- REST API with ServerRouter
- HMR (Hot Module Replacement)
- TypeScript transpilation in dev server
