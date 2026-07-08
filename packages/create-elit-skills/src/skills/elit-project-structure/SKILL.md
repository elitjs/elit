---
name: elit-project-structure
description: 'Scaffold and evolve multi-file Elit.js apps with the canonical project layout (entry, SSR shell, app factory, router, server, styles, pages, components, config). Use when bootstrapping a new app, splitting a single-file prototype into layers, or wiring elit.config.ts dev/build/preview/mobile/desktop/wapk blocks.'
argument-hint: 'Describe the app to scaffold or the layer to add (basic, fullstack with API, or multi-page with auth).'
user-invocable: true
---

# Elit.js Project Structure

Use this skill when the task involves creating, growing, or reorganizing an Elit.js app's file layout. The canonical structure is graduated — start minimal, add layers as the app needs them.

## What Matters First

- One entry file calls `dom.render('#app', App())` — that's `src/main.ts`.
- SSR is a separate file (`src/client.ts`) that exports a VNode document shell, returned from `dev.clients[].ssr` in `elit.config.ts`. The browser entry (`/src/main.js`) is loaded by a `<script>` inside that shell.
- App composition lives in `src/web.ts` as an `App` factory. Pages live under `src/pages/`, reusable components under `src/components/`. Routed apps also have `src/router.ts` wiring `createRouter` + `createRouterView`.
- Backend (when needed) is `src/server.ts` exporting a `ServerRouter` instance, attached via `dev.clients[].api`.
- Styles live in `src/styles.ts` using the `styles` singleton from `@elitjs/style`, with an `injectStyles()` exported function.
- Native preview is `src/mobile.ts` (or `src/native-screen.ts`) exporting a `screen` factory.
- `elit.config.ts` wires everything: `dev.clients[{ ssr, api, ws }]`, `build[]`, `preview`, `test`, `mobile`, `desktop`, `wapk`.

## Canonical file map

```
my-app/
├── elit.config.ts          # dev/build/preview/test/mobile/desktop/wapk
├── package.json
├── tsconfig.json
├── public/
│   ├── index.html          # static shell used by build.copy
│   └── favicon.svg
├── databases/              # @elitjs/database files (fullstack only)
│   └── todo.ts             # exports const todo = [...]
└── src/
    ├── main.ts             # entry: injectStyles(); dom.render('#app', App())
    ├── client.ts           # SSR document shell (html/head/body factories)
    ├── web.ts              # App factory (browser UI composition)
    ├── mobile.ts           # native preview screen factory
    ├── server.ts           # ServerRouter (fullstack only)
    ├── router.ts           # createRouter + createRouterView (multi-page only)
    ├── styles.ts           # styles singleton from @elitjs/style + injectStyles()
    ├── app-types.ts        # shared TS interfaces (when needed)
    ├── pages/              # route-level components
    │   ├── HomePage.ts
    │   └── TodoPage.ts
    ├── components/         # reusable UI
    │   ├── AppHeader.ts
    │   ├── AppFooter.ts
    │   └── index.ts        # optional barrel export
    └── native-screen.ts    # alternative name for mobile.ts
```

## Three complexity tiers

Match the tier to the task. Don't add layers the app doesn't need yet.

| Tier | Template | Files |
| --- | --- | --- |
| **Basic** | single-page, no backend | `main.ts`, `client.ts`, `mobile.ts`, `styles.ts`, `elit.config.ts` |
| **Fullstack** | CRUD with API + database | adds `web.ts`, `server.ts`, `pages/`, `components/`, `*-types.ts`, `databases/` |
| **Auth / multi-page** | routed app with multiple screens | adds `router.ts`, multiple `pages/`, route params |

## Patterns

### Entry — `src/main.ts`

```ts
import { dom } from '@elitjs/dom';
import { injectStyles } from './styles';
import { App } from './web';

injectStyles();
dom.render('#app', App());
```

For basic apps with no separate `web.ts`, inline `App` directly in `main.ts`.

### SSR shell — `src/client.ts`

```ts
import { div, html, head, body, title, link, script, meta } from '@elitjs/el';

export const client = html(
  head(
    title('My App'),
    link({ rel: 'icon', type: 'image/svg+xml', href: 'public/favicon.svg' }),
    meta({ charset: 'UTF-8' }),
    meta({ name: 'viewport', content: 'width=device-width, initial-scale=1.0' }),
    meta({ name: 'description', content: 'App description.' })
  ),
  body(
    div({ id: 'app' }),
    script({ type: 'module', src: '/src/main.js' })
  )
);
```

The empty `<div id="app">` is the mount point. The `<script>` must point to `/src/main.js` (dev server serves `src/main.ts` at that URL).

### App factory — `src/web.ts`

```ts
import { div, main } from '@elitjs/el';
import { reactive } from '@elitjs/state';
import { AppHeader } from './components/AppHeader';
import { AppFooter } from './components/AppFooter';
import { router, RouterView } from './router';

export const App = () =>
  div({ className: 'app-shell' },
    AppHeader(router),
    main({ className: 'app-main' },
      reactive(router.currentRoute, () => RouterView())
    ),
    AppFooter()
  );
```

For non-routed apps, drop the `reactive(router.currentRoute, ...)` wrapper and render the page directly.

### Router — `src/router.ts` (multi-page only)

```ts
import { createRouter, createRouterView, type RouteParams, type Router } from '@elitjs/router';
import { HomePage } from './pages/HomePage';
import { ChatPage } from './pages/ChatPage';
import { PrivateChatPage } from './pages/PrivateChatPage';

export const router = createRouter({
  mode: 'hash',
  base: '/',
  routes: []
});

const routes = [
  { path: '/', component: () => HomePage(router) },
  { path: '/chat', component: () => ChatPage(router) },
  { path: '/chat/dm/:userId', component: (params: RouteParams) => PrivateChatPage(router, params.userId as string) }
];

export const RouterView = createRouterView(router, { mode: 'hash', routes });
```

Initialize `router` with empty `routes: []`, then define `routes` and pass them to `createRouterView`. This avoids circular imports between the router and the page modules it imports.

### Server — `src/server.ts` (fullstack only)

```ts
import { Database } from '@elitjs/database';
import { ServerRouter, json, type ServerRouteContext } from '@elitjs/server';
import { resolve } from 'path';

export const router = new ServerRouter();

const db = new Database({
  dir: resolve(process.cwd(), 'databases'),
  language: 'ts'
});

router.get('/api/health', async (ctx: ServerRouteContext) => {
  json(ctx.res, { ok: true });
});

router.get('/api/items', async (ctx: ServerRouteContext) => {
  const result = await db.execute(`
    import { items } from '@db/items';
    console.log(JSON.stringify(items));
  `);
  const payload = result.logs.find((e: { type: string }) => e.type === 'log')?.args?.[0];
  json(ctx.res, { items: typeof payload === 'string' ? JSON.parse(payload) : payload });
});

router.post('/api/items', async (ctx: ServerRouteContext) => {
  db.update('items', 'items', [...(await readItems()), ctx.body]);
  json(ctx.res, { ok: true }, 201);
});

export const server = router;
```

`@db/<name>` is the import alias the `Database` runtime injects for files under `databases/<name>.ts`. Use `console.log(JSON.stringify(...))` to surface data through `result.logs`.

### Styles — `src/styles.ts`

```ts
import styles from '@elitjs/style';

styles.addTag('*', { margin: 0, padding: 0, boxSizing: 'border-box' });
styles.addTag('body', {
  minHeight: '100vh',
  fontFamily: "'Aptos', 'Trebuchet MS', sans-serif",
  color: '#173447',
  background: 'linear-gradient(160deg, #f7f1e9 0%, #efe4d8 54%, #e6d8c9 100%)'
});
styles.addTag('button', { fontFamily: 'inherit' });

styles.addClass('app-shell', {
  maxWidth: '1120px',
  margin: '0 auto',
  padding: '32px 20px 48px'
});

styles.addClass('btn-primary', {
  border: 'none',
  borderRadius: '999px',
  padding: '14px 18px',
  fontWeight: 800,
  cursor: 'pointer'
});

styles.addPseudoClass('hover', {
  transform: 'translateY(-1px)'
}, '.btn-primary');

export function injectStyles() {
  styles.inject('my-app-styles');
}

export default styles;
```

Use the singleton, not `new CreateStyle()`. Each `addClass`/`addPseudoClass`/`addTag` call appends to the singleton's internal sheet. `styles.inject(id)` mounts once into `<head>`.

### Native preview — `src/mobile.ts`

```ts
import { button, div, h1, input, p } from '@elitjs/el';

export const screen = () => div(
  { style: { padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' } },
  h1('My App'),
  p('Native-friendly preview rendered from the same factory syntax.'),
  input({ type: 'checkbox', checked: true }),
  button({ onClick: () => undefined }, 'Tap')
);
```

Inline `style` objects (not className) — the native renderer understands inline styles but not external CSS.

### Config — `elit.config.ts`

```ts
import { server } from './src/server';
import { client } from './src/client';

export default {
  dev: {
    port: 3003,
    host: 'localhost',
    open: true,
    logging: true,
    outDir: './dev-dist',
    outFile: 'index.js',
    clients: [{
      root: '.',
      basePath: '',
      ssr: () => client,
      api: server            // omit for basic apps
    }]
  },
  build: [{
    entry: './src/main.ts',
    outDir: './dist',
    outFile: 'main.js',
    format: 'esm',
    minify: true,
    sourcemap: true,
    target: 'es2020',
    copy: [
      {
        from: './public/index.html', to: './index.html',
        transform: (content: string, config: { basePath: string }) => {
          let html = content.replace('src="../src/main.ts"', 'src="main.js"');
          if (config.basePath) {
            const baseTag = `<base href="${config.basePath}/">`;
            html = html.replace(
              '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
              `<meta name="viewport" content="width=device-width, initial-scale=1.0">\n  ${baseTag}`
            );
          }
          return html;
        }
      },
      { from: './public/favicon.svg', to: './favicon.svg' }
    ]
  }],
  preview: {
    port: 3000,
    host: 'localhost',
    open: false,
    root: './dist',
    basePath: '',
    index: './index.html'
  },
  test: {
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', 'benchmark', 'docs', 'coverage'],
    testTimeout: 5000,
    globals: true,
    watch: false,
    reporter: 'verbose'
  },
  mobile: {
    cwd: '.',
    appId: 'com.example.app',
    appName: 'MyApp',
    webDir: 'dist',
    mode: 'hybrid',          // 'hybrid' | 'native' | 'webview'
    permissions: ['android.permission.INTERNET'],
    native: {
      entry: './src/mobile.ts',
      exportName: 'screen',
      ios: { enabled: false }
    }
  },
  desktop: {
    compiler: 'auto',
    entry: './src/main.ts',
    mode: 'hybrid',
    outDir: './desktop-dist',
    runtime: 'quickjs'      // 'quickjs' | 'node' | 'bun' | 'deno'
  },
  wapk: {
    name: 'my-app',
    version: '1.0.0',
    runtime: 'node',
    entry: './dist/main.js',
    script: { start: 'node ./dist/main.js' },
    env: { APP_NAME: 'My App' },
    run: {
      runtime: 'node',
      useWatcher: true,
      watchArchive: true,
      syncInterval: 150,
      archiveSyncInterval: 150
    }
  }
};
```

For a basic app with no backend, omit the `api: server` line (and the `import { server }`).

## Shared types — `src/*-types.ts`

When the client and server both need a TypeScript shape, hoist it to a `*-types.ts` file:

```ts
// src/todo-types.ts
export type TodoPriority = 'low' | 'medium' | 'high';

export interface TodoItem {
  id: string;
  title: string;
  notes: string;
  priority: TodoPriority;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}
```

Import via relative path on both sides — the build handles bundling for client and server independently.

## Pages and components

Pages are route-level components (one per route). Components are reusable UI (Header, Footer, Button). Both are plain factory functions returning VNodes:

```ts
// src/pages/TodoPage.ts
import { div, h1 } from '@elitjs/el';
import { createState, reactive, bindValue } from '@elitjs/state';
import type { TodoItem } from '../todo-types';

export function TodoPage() {
  const todos = createState<TodoItem[]>([]);
  // ...fetch, render
  return div({ className: 'todo-page' }, h1('Tasks'));
}
```

```ts
// src/components/AppHeader.ts
import { div, h1, header } from '@elitjs/el';
import { routerLink, type Router } from '@elitjs/router';

export function AppHeader(router: Router) {
  return header({ className: 'app-header' },
    div({ className: 'brand' },
      routerLink(router, { to: '/', className: 'brand-link' },
        h1({ className: 'brand-title' }, 'My App')
      )
    )
  );
}
```

A `components/index.ts` barrel is optional — use it when many components get re-exported from multiple places.

## Rules

- Keep `main.ts` thin. It should call `injectStyles()` and `dom.render('#app', App())` — nothing else.
- SSR shell (`client.ts`) is server-side. Don't import `@elitjs/state` reactive primitives or `window`/`document` here — it's just a static document tree.
- The router imports pages, so pages must not import the router module at the top level (or you get a cycle). Pass `router` as a function argument instead: `() => HomePage(router)`.
- Server code (`server.ts`, `databases/*`) must never be imported into client bundles. The build splits them; respect the boundary.
- One styles singleton per app. Don't `new CreateStyle()` — use `import styles from '@elitjs/style'` everywhere.
- `databases/<name>.ts` files `export const <name> = [...]`. The `Database` runtime exposes them via `@db/<name>` inside `db.execute(...)` only.
- The `<script src="/src/main.js">` URL in `client.ts` is intentional — the dev server serves the TS source transpiled at that path. Don't change it to `main.ts`.

## Anti-Patterns

- Putting business logic in `main.ts`. Move it into `web.ts` (App factory) or a page component.
- Defining routes inline in `createRouter({ routes: [...] })`. The router is created with empty routes and `createRouterView` receives them — this avoids circular imports with page modules.
- Calling `styles.inject()` more than once with different IDs in the same app. Pick one ID and call it from `injectStyles()` only.
- Mixing `createState` calls inside `reactive(...)` — they reset on every re-run. Hoist state creation to the page-factory scope.
- Importing `@elitjs/server`, `@elitjs/database`, or `node:fs` from `src/web.ts`, `src/main.ts`, or any file under `src/pages/` or `src/components/`.

## Validation

- `npx elit dev` boots the dev server. The page should mount at the configured port with HMR.
- `npx elit build` produces `dist/main.js` and `dist/index.html`. Inspect the HTML to confirm `<script src="main.js">` (not `main.ts`).
- `npx elit preview` serves the production build at `preview.port`.
- For fullstack: hit API routes (`curl http://localhost:3003/api/health`) and inspect `databases/<name>.ts` after mutations.
- For mobile: `npx elit mobile doctor` validates the toolchain, then `npx elit mobile sync` regenerates native source from `src/mobile.ts`.
- For desktop: `npx elit desktop ./src/main.ts` boots the desktop shell.
