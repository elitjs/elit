# Elit.js

Elit.js is a TypeScript toolkit for building browser UIs, dev servers, SSR pages, tests, desktop WebView apps, and small file-backed backends. It ships as independently versioned `@elitjs/*` packages — install only what you import.

## Install

```bash
npm create elit@latest my-app
cd my-app
npm install
npm run dev
```

Other package managers: `yarn create elit`, `pnpm create elit`, `bun create elit`, `deno run -A npm:create-elit`.

Manual (pick only what you need):

```bash
npm install @elitjs/core @elitjs/el @elitjs/dom @elitjs/state
```

For native desktop mode, install Cargo.

## Module map

| Package | Use for |
| --- | --- |
| `@elitjs/core` | Core types (VNode, Child) |
| `@elitjs/dom` | DOM renderer, SSR string rendering (`render`, `renderToString`) |
| `@elitjs/el` | HTML / SVG / MathML element factories |
| `@elitjs/state` | `createState`, `computed`, `reactive`, `bindValue`, `createSharedState` |
| `@elitjs/style` | CSS generation (`CreateStyle`, `addClass`, `inject`) |
| `@elitjs/router` | `createRouter`, `createRouterView`, `routerLink` |
| `@elitjs/native` | `renderNativeTree`, `renderAndroidCompose`, `renderSwiftUI` |
| `@elitjs/server` | `ServerRouter`, `createDevServer`, `cors`, `logger`, `rateLimit`, `StateManager` |
| `@elitjs/build` | Programmatic bundling (`build`) |
| `@elitjs/desktop` | Native desktop window APIs |
| `@elitjs/database` | VM-backed file database |
| `@elitjs/test` | Test runner |

Lower-level adapters: `@elitjs/http`, `@elitjs/https`, `@elitjs/ws`, `@elitjs/wss`, `@elitjs/fs`, `@elitjs/path`, `@elitjs/mime-types`, `@elitjs/chokidar`, `@elitjs/runtime`.

## Browser app

```ts
import { div, h1, button } from '@elitjs/el';
import { createState, reactive } from '@elitjs/state';
import { render } from '@elitjs/dom';

const count = createState(0);

const app = div(
  { className: 'app' },
  h1('Hello Elit.js'),
  reactive(count, (value) =>
    button({ onclick: () => count.value++ }, `Count: ${value}`),
  ),
);

render('#app', app);
```

Run with `npx elit dev`. Build with `npx elit build --entry ./src/main.ts --out-dir dist`.

## Server

```ts
import { ServerRouter, cors, logger } from '@elitjs/server';

export const api = new ServerRouter();
api.use(cors());
api.use(logger());

api.get('/api/hello', async (ctx) => {
  ctx.res.json({ message: 'Hello from Elit.js' });
});
```

`ServerRouter` accepts `async (ctx) => ...` or `async (req, res) => ...` handlers and `use(middleware)` / `use('/prefix', middleware)`. For programmatic dev server, WebSocket endpoints, SSR, and shared server/client state, see the `examples/correct-config` reference.

## CLI

The CLI is published as the `elit` bin from `@elitjs/cli`:

```bash
npx elit dev                                 # dev server
npx elit build --entry ./src/main.ts         # production bundle
npx elit preview                             # preview built output
npx elit test                                # test runner

npx elit desktop ./src/main.ts               # desktop (hybrid or native)
npx elit mobile init && npx elit mobile run android
npx elit native generate android ./src/screen.ts --name HomeScreen

npx elit pm start --script "npm start" --name my-app
npx elit wapk pack . && npx elit wapk run ./app.wapk
```

Run `npx elit <command> --help` for the full flag list (desktop runtimes, mobile targets, WAPK locking, PM health checks, native CSS subset).

## Config

Elit loads `elit.config.{ts,mts,js,mjs,cjs,json}` from the project root. Keys: `dev`, `build` (single or array), `preview`, `test`, `pm`, `mobile`, `desktop`, `wapk`. See [examples/correct-config](examples/correct-config) for a minimal full-stack setup.

Only `VITE_`-prefixed env variables are injected into client bundles. Env load order: `.env.{mode}.local`, `.env.{mode}`, `.env.local`, `.env`.

## Boundaries

- Browser code imports `@elitjs/*` packages directly — environment boundaries are explicit in the import path.
- Desktop APIs only exist inside the `elit desktop` runtime, not in plain browsers.
- The internal HMR / shared-state socket uses `/__elit_ws`; don't reuse that path.
- When copying `index.html` into builds, point it at the built JS (e.g. `/main.js`), not the dev-only `/src/*.ts` path.

## More

- [CHANGELOG.md](CHANGELOG.md) — release notes
- [examples/](examples/) — runnable samples: `correct-config`, `universal-app-example`, `android-native-example`, `desktop-typescript-example/`, `wapk-example`
