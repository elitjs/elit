# create-elit-skills

Scaffolds [Elit.js](https://github.com/elitjs/elit) AI skills into a project so your AI coding assistant knows the idiomatic patterns and exact API surface for `@elitjs/*` packages.

## Usage

```bash
# Install skills into the current project
npm create elit-skills@latest ./

# Install into a specific project directory
npm create elit-skills@latest ./my-app

# Choose which target directories to scaffold
npm create elit-skills@latest ./ --target .claude/skills

# List the skills that would be installed
npm create elit-skills@latest --list
```

Other package managers: `yarn create elit-skills`, `pnpm create elit-skills`, `bun create elit-skills`.

## What it creates

By default, twenty-two skill folders are written into **all three** of:

- `.claude/skills/` — Claude Code
- `.agents/skills/` — generic agents
- `.github/skills/` — GitHub Copilot

Each skill is a folder with a `SKILL.md` file (YAML frontmatter + markdown). Re-runs are idempotent — existing `SKILL.md` files are skipped.

### Pattern skills (use-case oriented)

| Skill | Use for |
| --- | --- |
| `elit-component` | Building UI with `@elitjs/el` factories and `@elitjs/dom` renderer |
| `elit-state` | Reactive state (`createState`, `computed`, `reactive`, `bindValue`, `createSharedState`) |
| `elit-server` | HTTP routes, WebSocket endpoints, middleware, dev/preview server config |
| `elit-native-desktop` | Native Android/iOS generation and desktop / WAPK runtimes |
| `elit-project-structure` | Multi-file app layout (`main.ts`, `client.ts`, `web.ts`, `server.ts`, `router.ts`, `styles.ts`, `elit.config.ts`) |
| `elit-config` | Writing `elit.config.ts` — full `ElitConfig` shape (dev/build/preview/test/desktop/mobile/pm/wapk/resolve), `defineConfig`, multi-client dev, proxy, workers, WS endpoints, SSR, multi-build arrays, copy/transform, coverage, native mobile/desktop, PM apps, WAPK lock + Google Drive, env loading |
| `elit-wapk` | Packaging, running, inspecting, extracting, and patching `.wapk` archives — CLI flags, `@elitjs/wapk` JS API, `WapkHeader`/`WapkProjectConfig` types, `.wapkignore`/`.wapkpatch` files, AES-256-GCM lock, Google Drive mode, Elit Run online sessions |
| `elit-pm` | Process manager — three start modes (script/file/wapk), full `elit pm` CLI (start/list/show/restart/reload/scale/send-signal/save/resurrect/logs), `pm.apps[]` config, zero-downtime reload via proxy, watch mode, health checks, restart policies, memory limits, cron restarts, multi-instance scaling, WAPK + Google Drive + Elit Run integration, `PmConfig`/`PmAppConfig`/`PmRecord` types |

### Reference skills (exact API surface)

Each reference skill documents every exported function, class, and type for the named package(s), with verified signatures, patterns, rules, and anti-patterns.

| Skill | Packages covered |
| --- | --- |
| `elit-ref-el-dom` | `@elitjs/el` (element factories, VNode shape) + `@elitjs/dom` (`DomNode`, `render`, `renderToString`, virtual list, lazy) |
| `elit-ref-state` | `@elitjs/state` (`createState`, `computed`, `effect`, `reactive`, `bindValue`/`bindChecked`, `SharedState`, throttle/debounce) |
| `elit-ref-router` | `@elitjs/router` (`createRouter`, `createRouterView`, `routerLink`, route types) |
| `elit-ref-server` | `@elitjs/server` (`ServerRouter`, `createDevServer`, response helpers, middleware, proxy, shared state, full options types) |
| `elit-ref-style` | `@elitjs/style` (`CreateStyle` class — variables, classes, pseudo, keyframes, media, container, layer, native resolution) |
| `elit-ref-database` | `@elitjs/database` (`Database` class, standalone ops, `@db/<name>` VM flow) |
| `elit-ref-fs-path` | `@elitjs/fs` (sync/async/promises) + `@elitjs/path` (default + `posix`/`win32`) |
| `elit-ref-native-desktop` | `@elitjs/native` (`renderNativeTree`, `renderAndroidCompose`, `renderSwiftUI`, `materializeNativeTree`) + `@elitjs/desktop` (`createWindow`, `windowEval`, `onMessage`, window control) |
| `elit-ref-net` | `@elitjs/http`, `@elitjs/https`, `@elitjs/ws`, `@elitjs/wss`, `@elitjs/smtp-server`, `@elitjs/mime-types` |
| `elit-ref-build` | `@elitjs/build` (`build()` function, `BuildOptions`, `BuildResult`, `ResolveConfig`, externals, copy/transform, `onBuildEnd`) |
| `elit-ref-devtools` | `@elitjs/devtools` (`installDevTools`, `trackState`, `trackRouter`, `DevToolsBridge`, hotkey, auto-track) |
| `elit-ref-test` | `@elitjs/test` (`runTests`, `runJestTests`, `runWatchMode`, `globals`, `setupGlobals`/`clearGlobals`, `transpileFile`, reporters, coverage tracking, `TestMatchers`) |
| `elit-ref-cli` | `elit` CLI (`dev`, `build`, `build-dev`, `build-preview`, `preview`, `test`, `desktop`, `mobile`, `native`, `pm`, `wapk`) and `create-elit` scaffolder with templates |
| `elit-ref-utils` | `@elitjs/core` (types), `@elitjs/runtime`, `@elitjs/config`, `@elitjs/render-context`, `@elitjs/universal`, `@elitjs/hmr` |

## Why

`@elitjs/*` packages have idiomatic patterns (scoped imports, immutable state replacement, declarative WS endpoints, shared state over WS, `@db/<name>` VM alias, single-style-singleton) that AI tools don't always guess correctly. Bundling the patterns **and** the exact API signatures as skills keeps the AI aligned with how Elit.js apps are meant to be written.

## Options

```
Usage: npm create elit-skills@latest [target-dir] [options]

Arguments:
  target-dir              Destination directory (default: current dir)

Options:
  --target <dirs>         Comma-separated subset of:
                          .claude/skills,.agents/skills,.github/skills
  --list                  List available skills and exit
  --help, -h              Show help
```

## License

MIT
