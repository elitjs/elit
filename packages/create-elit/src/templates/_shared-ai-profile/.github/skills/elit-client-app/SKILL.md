---
name: elit-client-app
description: 'Work on browser UI in this Elit app — pages, components, reactive state, styles, routing, or the SSR shell. Use when editing `src/main.ts`, `src/router.ts`, `src/client.ts`, `src/styles.ts`, `src/components/`, or `src/pages/`.'
argument-hint: 'Describe the page, component, route, or styling change.'
user-invocable: true
---

# Elit Client App

Use this skill when the task belongs to the browser side of the application: rendering, routing, reactive state, styles, or the SSR shell that the dev server uses for the initial paint.

## Route The Task First

1. Browser entry / app composition → `src/main.ts`
2. SSR shell → `src/client.ts` (must return the same VNode tree `main.ts` renders)
3. Routes → `src/router.ts` (route table + `createRouterView`)
4. Pages → `src/pages/<Name>Page.ts`
5. Shared UI → `src/components/`
6. Styles → `src/styles.ts` (CSS variables + `styles.addClass(...)`)

## Public API Surface

- `elit/el` — DOM primitives: `div, span, h1..h6, p, a, button, input, ul, li, ...`
- `elit/state` — `reactive(state, () => VNode)` for reactive views; `signal(...)` for cells
- `elit/dom` — `dom.render('#app', App())` mounts the tree
- `elit/style` — `createStyles()` instance with `addVar`, `addClass`, `descendant`, `addPseudoClass`, `mediaMaxWidth`, `mediaMinWidth`
- `elit/router` — `createRouter`, `createRouterView`, `routerLink`, `type Router`, `type RouteParams`
- `elit` (umbrella) — re-exports the above for convenience

Do NOT import from `elit/server`, `elit/database`, or other backend surfaces inside these files. The browser bundle will fail to build if server-only code leaks in.

## Page Pattern

```ts
// src/pages/HomePage.ts
import { section, div, h1, p, reactive } from 'elit';
import type { Router } from 'elit';
import { routerLink } from 'elit';
import { currentLang, t } from '../i18n';  // if the app has i18n

export const HomePage = (_router: Router) =>
  section({ className: 'container' },
    reactive(currentLang, () =>
      div(
        h1(t('home.title')),
        p(t('home.subtitle'))
      )
    )
  );
```

Pages are functions that take `router` and return a VNode. Use `reactive(state, () => ...)` to subscribe to language, theme, or any other signal.

## Component Pattern

```ts
// src/components/Header.ts
import { header, nav, div, a, button, reactive } from 'elit';
import type { Router } from 'elit';
import { routerLink } from 'elit';

export const Header = (router: Router) =>
  header({ className: 'header' },
    div({ className: 'container header-inner' },
      nav({ className: 'nav' },
        routerLink(router, { to: '/', className: 'active' }, 'Home'),
        routerLink(router, { to: '/about' }, 'About')
      )
    )
  );
```

Components are pure functions — no side effects at module scope. Subscribe to signals via `reactive(...)` inside the returned VNode.

## Routing — Critical Details

`createRouterView` returns a **function**. The router does not push updates by itself — you must wrap the call in `reactive(router.currentRoute, ...)`:

```ts
// src/main.ts
const App = () =>
  div(
    Header(router),
    main(reactive(router.currentRoute, () => RouterView())),
    Footer()
  );

dom.render('#app', App());
```

Forgetting the `reactive(...)` wrapper is the most common bug — navigation will appear to do nothing.

## Style Pattern

```ts
// src/styles.ts
import { createStyles } from 'elit/style';

const styles = createStyles();

// CSS variables (theme tokens)
export const primary = styles.addVar('primary', '#6366f1');
export const bgCard = styles.addVar('bg-card', '#ffffff');
export const border = styles.addVar('border', '#e5e7eb');

// Tag defaults
styles.addTag('body', { margin: 0, fontFamily: 'system-ui' });

// Classes
styles.addClass('card', {
  background: styles.var(bgCard),
  border: `1px solid ${styles.var(border)}`,
  borderRadius: '12px',
  padding: '1.5rem'
});

// Pseudo
styles.addPseudoClass('hover', { transform: 'translateY(-2px)' }, '.card');

// Descendant
styles.descendant('.card', 'h3', { marginTop: 0 });

// Responsive
styles.mediaMaxWidth('768px', {
  '.card': { padding: '1rem' }
});

export const injectStyles = () => styles.inject();
```

Call `injectStyles()` at the top of `main.ts` before `dom.render(...)`. Use `styles.var(name)` to reference a CSS variable — passing the raw string bypasses theme switching.

Available methods on `createStyles()`: `addVar`, `addTag`, `addClass`, `addPseudoClass`, `descendant`, `child`, `mediaMinWidth`, `mediaMaxWidth`, `var`, `inject`.

## SSR Shell

`src/client.ts` exports a function (often called `client`) that returns the root VNode. The dev server calls it via `dev.clients[].ssr` to produce the initial HTML. It MUST return the same tree shape that `main.ts` renders — otherwise hydration breaks and the page flickers.

```ts
// src/client.ts
import { div, main } from 'elit/el';
import { router, RouterView } from './router';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { injectStyles } from './styles';

injectStyles();

export const client = () =>
  div(
    Header(router),
    main(<any>null),  // SSR omits the live router view; client fills it
    Footer()
  );
```

## High-Risk Areas

- **Forgetting `reactive(router.currentRoute, ...)` around `RouterView()`** — silent navigation bug.
- **`client.ts` returning a different tree than `main.ts`** — hydration mismatch / flicker.
- **Importing `elit/server` or `elit/database` from a browser file** — build fails.
- **Using `process.env.X` in browser code** — undefined. Only `VITE_`-prefixed vars are injected.
- **Mutating reactive state from inside a `reactive(...)` callback** — infinite loop.
- **Calling `styles.inject()` more than once** — duplicate `<style>` tags.
- **Using non-existent `createStyles()` methods (e.g. `addChildRule`)** — verify method exists before use.

## Validation

1. `npm run typecheck` — fastest signal.
2. `npm run dev` — open the route in a browser, exercise the navigation, check the console.
3. Focused test: `npx elit test --run --file ./path/to/page.test.ts` (when one exists).
4. `npm run build` — confirms the browser bundle compiles cleanly.

## Useful Anchors

- Route table location: `src/router.ts`
- Style tokens: `src/styles.ts` (top of file — `addVar` declarations)
- Existing page to copy as a template: the simplest one in `src/pages/`
- `reactive` import: `elit/state` or `elit`

## References

**Detailed API references (next to this skill file):**
- `references/el.md` — element factories (`div`, `span`, `h1..h6`, `button`, `input`, SVG/MathML), `frag`, props shape, event handler naming
- `references/state.md` — `createState`, `computed`, `effect`, `reactive`, `reactiveAs`, `text`, `bindValue`, `bindChecked`, `throttle`/`debounce`, `createSharedState`
- `references/dom.md` — `dom.render`, `renderToString`, `renderToHTMLDocument` (SSR), head utilities (`addStyle`, `addMeta`, `addLink`, `setTitle`), `lazy`, virtual lists
- `references/style.md` — `createStyles()` instance: `addVar`/`var`, `addClass`, `addPseudoClass`, `descendant`, `child`, attribute selectors, media queries (`mediaMinWidth`, `mediaMaxWidth`, `mediaDark`, `mediaReducedMotion`), keyframes, font-face, `inject`, `render`
- `references/router.md` — `createRouter`, `createRouterView`, `routerLink`, route patterns (`:params`), guards (`beforeEnter`, `beforeEach`), 404 handling, hash vs history mode

Read these before writing code in unfamiliar areas — they have signatures, examples, and gotchas for every public API.

**In this project (concrete examples to copy from):**
- `src/main.ts` — browser entry: `dom.render('#app', App())` and the `reactive(router.currentRoute, () => RouterView())` wrapper
- `src/client.ts` — SSR shell contract; must mirror `main.ts`'s VNode tree
- `src/router.ts` — `createRouter({ mode: 'hash', routes })` + `createRouterView(router, options)`
- `src/styles.ts` — full `createStyles()` usage: `addVar`, `addClass`, `descendant`, `addPseudoClass`, `mediaMaxWidth`
- `src/components/Header.ts` — `routerLink(router, { to }, ...)` pattern
- `src/pages/HomePage.ts` — simplest page: `(_router) => section(...)`, no async, no side effects

**Installed type definitions (ground-truth API when docs are ambiguous):**
- `node_modules/elit/dist/el.d.ts` — element factories and prop types
- `node_modules/elit/dist/state.d.ts` — `reactive`, `signal`, `computed`
- `node_modules/elit/dist/style.d.ts` — `createStyles()` instance methods
- `node_modules/elit/dist/router.d.ts` — `Router`, `RouteParams`, `routerLink`
- `node_modules/elit/dist/dom.d.ts` — `dom.render`, `dom.renderToString`

**External docs:**
- API reference (elements, state, router, style, SSR): https://d-osc.github.io/elit/#/api
- Config reference (`dev.ssr`, `dev.clients[].ssr`): https://d-osc.github.io/elit/CONFIG.md
- GitHub repo (browse `src/client/` for framework source): https://github.com/d-osc/elit

**Related skills:**
- `elit-server-app` — when the page/component needs to call `/api/...` routes (the client side of those routes lives here; the handlers themselves do not)
- `elit-runtime-app` — when changing build entries (`build[].entry`), SSR wiring (`dev.clients[].ssr`), or basePath behavior
