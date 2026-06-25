# Elit App Guide

## Project Type

This repository is an **application built with Elit**. It is not the Elit framework source code. Treat Elit as an installed dependency; do not edit framework internals.

## Use Public Elit APIs

Use only the public package exports:

- Browser: `elit`, `elit/dom`, `elit/el`, `elit/state`, `elit/style`, `elit/router`
- Server: `elit/server`, `elit/database`
- Native: `elit/native`
- Desktop: `elit/desktop`
- Build/config helpers: `elit/config`, `elit/build`, `elit/test`

Never import from framework source paths such as `src/...` from the Elit repository, and never reintroduce the legacy `elit-server` package.

## Project Layout (typical)

```
.
├── elit.config.ts        # source of truth for dev, build, preview, mobile, desktop, wapk
├── src/
│   ├── main.ts           # browser entry — dom.render('#app', App())
│   ├── client.ts         # SSR shell (returns the root VNode used by dev.ssr / preview.ssr)
│   ├── router.ts         # createRouter + createRouterView + route table
│   ├── server.ts         # ServerRouter with /api/... handlers (auth, chat, etc.)
│   ├── styles.ts         # injectStyles() — CSS variables, classes, responsive rules
│   ├── native-screen.ts  # native entry for iOS/Android targets (optional)
│   ├── components/       # shared UI components (Header, Footer, etc.)
│   └── pages/            # one file per route
├── databases/            # elit/database schemas (*.ts files exporting collections)
├── public/               # static assets copied into build output
└── package.json
```

Treat `elit.config.ts` as the source of truth — dev server options, build entries, preview, mobile, desktop, and WAPK sections all live there.

## Runtime Boundaries

- **Browser UI** → `elit`, `elit/dom`, `elit/el`, `elit/state`, `elit/style`, `elit/router`. Lives under `src/`, especially `src/main.ts`, `src/router.ts`, `src/pages/`, `src/components/`, `src/styles.ts`.
- **Server routes, middleware, API logic** → `elit/server`. Lives in `src/server.ts` (or split under `src/server/`).
- **Persistence** → `elit/database`. Schemas in `databases/`. Never import server-only DB code from a browser entry.
- **Desktop-only code** → `elit/desktop`. These APIs are runtime-injected and are not normal browser globals — do not assume `window`-style access.
- **Native generation** → `elit/native`. Output is IR, not DOM; keep it serializable.

## Routing Pattern

The browser router uses hash-mode by default:

```ts
// src/router.ts
export const router = createRouter({ mode: 'hash', base: '/', routes: [] });

const routes = [
  { path: '/', component: () => HomePage(router) },
  { path: '/user/:id', component: (params: RouteParams) => UserPage(router, params.id as string) }
];

export const RouterView = createRouterView(router, { mode: 'hash', routes });
```

CRITICAL: `createRouterView(router, options)` returns a **function**. Render it from `reactive(router.currentRoute, () => RouterView())` so the view re-renders on navigation. Wrapping it in `reactive(...)` is required — rendering `RouterView()` directly will not react to route changes.

## Server Pattern

```ts
// src/server.ts
import { ElitRequest, ElitResponse, ServerRouter } from 'elit/server';
import { Database } from 'elit/database';

export const router = new ServerRouter();

router.get('/api/hello', async (req: ElitRequest, res: ElitResponse) => {
  res.setHeader('Content-Type', 'text/html; charset=UTF-8');
  res.send('Hello from Elit ServerRouter!');
});
```

Wire `router` into `elit.config.ts` via `dev.clients[].api` (multi-client) or `dev.api` (single-client). Multi-client requires `basePath`-prefixed routes — see `elit.config.ts` comments.

## Auth Patterns (auth-fullstack-example reference)

- Password hashing uses Node's `scrypt` with a per-user salt; compare with `timingSafeEqual` (see `src/server.ts`).
- Sessions are typically in-memory or DB-backed. `elit/server` does not prescribe a session store — pick one and wrap it in middleware.
- Sensitive files (`.env`, `*.key`) are blocked by `dev.blockFiles` / `preview.blockFiles` defaults. Override in `elit.config.ts` if needed.

## Important Elit Details

- `createRouterView(router, options)` returns a function and must be rendered from `reactive(router.currentRoute, () => RouterView())`.
- `elit/desktop` APIs are runtime-injected and are not normal browser globals.
- Only `VITE_`-prefixed variables are injected into client bundles. `process.env.X` is **not** available in browser code.
- The dev server reuses the SSR function for the initial paint — `client.ts` must return the same VNode tree the client would render.
- Server-side HMR (`serverWatch`) auto-restarts the dev server on `src/server*` edits. Disable with `elit dev --no-server-watch` if needed.

## Generated Outputs

Treat these as build artifacts — do not edit directly:

- `dist/`, `dev-dist/`, `desktop-dist/`
- `coverage/`
- Generated mobile/native folders (`ios/`, `android/` when present)
- Generated WAPK archives

Change the owner source first (`src/`, `elit.config.ts`, `databases/`), then rebuild or regenerate.

## Validation

Prefer the app's own `package.json` scripts:

- `npm run dev` — start dev server with HMR (port from `elit.config.ts`)
- `npm run build` — production build
- `npm run preview` — preview production build
- `npm test` — run test suite (if configured)

Run the smallest useful validation for the changed surface:

1. `npm run typecheck` (if configured) — fast feedback
2. Focused test file — `npx elit test --run --file ./path/to/file.test.ts`
3. `npm run build` — confirms compile + bundle

## Skills

Six skills guide AI work in this project. Each skill is scoped to a runtime surface and lists the concrete files, patterns, and validation steps to use.

- `elit-client-app` — browser UI, reactive state, styles, routing, SSR shell, pages, and components.
- `elit-server-app` — server routes, middleware, auth, SSE/WebSocket endpoints, and `elit/database` handlers.
- `elit-runtime-app` — `elit.config.ts`, multi-client setup, build matrix, preview, mobile, desktop, native, and WAPK wiring.
- `elit-desktop-app` — desktop shell surface: window control (`createWindow`, `windowMinimize`, `windowQuit`, …), IPC (`onMessage`, `createWindowServer`), runtime-target detection, and auto-render pipeline.
- `elit-native-app` — native code generation: `renderNativeTree`, `renderAndroidCompose`, `renderSwiftUI`, CSS-subset styling, state bindings, and the screen entry (`src/native-screen.ts`).
- `elit-architecture` — project structure, file-size budgets, DRY principles, splitting `server.ts`/`styles.ts` by domain/feature, and `shared/` for cross-runtime types and utilities. Use before adding a new page/route/component or when a file gets long.

Use the matching skill before writing code — it routes the task to the right files and flags high-risk areas.

## References

When the skills don't cover a question in depth, these are the canonical sources.

**In this project:**
- `elit.config.ts` — single source of truth for dev/build/preview/mobile/desktop/wapk/pm
- `package.json` → `scripts` — the exact CLI invocations CI and local dev use
- `src/main.ts`, `src/client.ts`, `src/router.ts`, `src/server.ts`, `src/styles.ts` — the five files that define app shape
- `src/native-screen.ts` — native screen entry (referenced by `mobile.native.entry` / `desktop.native.entry`)
- `databases/*.ts` — one file per `elit/database` collection

**Installed type definitions (ground-truth API):**
- `node_modules/elit/dist/index.d.ts` — umbrella exports
- `node_modules/elit/dist/config.d.ts` — `defineConfig`, `ElitConfig`
- `node_modules/elit/dist/server.d.ts`, `database.d.ts`, `el.d.ts`, `state.d.ts`, `style.d.ts`, `router.d.ts`, `dom.d.ts`
- `node_modules/elit/dist/desktop.d.ts` — desktop shell API (window control, IPC, auto-render)
- `node_modules/elit/dist/native.d.ts` — native renderer + codegen API
- Type defs are the source of truth when docs and behavior disagree.

**External docs (published from the Elit repo):**
- API reference: https://d-osc.github.io/elit/#/api
- Config reference: https://d-osc.github.io/elit/CONFIG.md
- CLI reference: https://d-osc.github.io/elit/CLI.md
- Server deep-dive: https://d-osc.github.io/elit/server.md
- Native CSS support: https://d-osc.github.io/elit/native-css-support.md
- Native element support: https://d-osc.github.io/elit/native-element-support.md
- Cross-runtime subpath docs (`http`, `ws`, `fs`, `path`, `mime-types`, `chokidar`): https://d-osc.github.io/elit/API.md
- Framework source (when the type defs aren't enough): https://github.com/d-osc/elit
- Release notes / breaking changes: https://github.com/d-osc/elit/releases

**When the docs and the installed package disagree, the installed package wins** — pin to the version in `package.json` and consult the matching release notes.
