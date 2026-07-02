# elit/router — Client Router

Hash-mode (default) or history-mode router with route params, guards, and reactive navigation.

## Creating a Router

### `createRouter(options)`

```ts
import { createRouter } from 'elit/router';

const router = createRouter({
  mode: 'hash',            // 'hash' | 'history'  (default: 'hash')
  base: '/',               // base path for history mode
  routes: [                // optional: declare upfront
    { path: '/', component: () => HomePage(router) },
    { path: '/user/:id', component: (params) => UserPage(router, params.id) }
  ],
  notFound: (params) => NotFoundPage(router)  // optional 404 handler
});
```

**Route shape:**
```ts
interface Route {
  path: string;                                          // '/user/:id' supports :params
  component: (params: RouteParams) => VNode | Child;     // called on each navigation
  beforeEnter?: (to, from) => boolean | string | void;   // optional per-route guard
}
```

`beforeEnter` returning `false` cancels navigation; returning a string redirects to that path; returning `void`/`true` continues.

## Router Interface

```ts
interface Router {
  currentRoute: State<RouteLocation>;    // reactive — subscribe via reactive(...)
  mode: 'hash' | 'history';
  base: string;
  routes: Route[];
  navigate(path: string, replace?: boolean): void;
  push(path: string): void;              // alias for navigate(path, false)
  replace(path: string): void;           // navigate(path, true)
  back(): void;
  forward(): void;
  go(delta: number): void;               // go(-1) === back()
  beforeEach(guard: (to, from) => boolean | string | void): () => void;
  destroy(): void;
}
```

### Navigation examples

```ts
router.push('/about');                   // add to history
router.replace('/login');                // replace current entry
router.back();
router.go(-2);

// programmatic redirect from a guard
router.beforeEach((to, from) => {
  if (to.path.startsWith('/admin') && !isAuthed()) return '/login';
});
```

## Rendering Current Route — CRITICAL

### `createRouterView(router, options)`
Returns a **function** that renders the matched route's component. The router does not push updates by itself — you MUST wrap the call in `reactive(router.currentRoute, ...)`.

```ts
import { createRouter, createRouterView } from 'elit/router';
import { reactive } from 'elit/state';
import { div, main } from 'elit/el';
import { dom } from 'elit/dom';

const router = createRouter({ mode: 'hash', routes });
const RouterView = createRouterView(router, { mode: 'hash', routes });

const App = () =>
  div(
    Header(router),
    main(reactive(router.currentRoute, () => RouterView())),
    Footer()
  );

dom.render('#app', App());
```

Forgetting `reactive(router.currentRoute, () => RouterView())` is the most common Elit bug — clicking a `routerLink` changes the URL but the page never re-renders.

## Navigation Links

### `routerLink(router, props, ...children)`
Creates an `<a>` that calls `router.push(props.to)` on click and prevents default. Auto-prefixes `#` in hash mode.

```ts
import { routerLink } from 'elit/router';
import { Header } from 'elit/el';

header(
  nav(
    routerLink(router, { to: '/' }, 'Home'),
    routerLink(router, { to: '/about' }, 'About'),
    routerLink(router, { to: `/user/${user.id}` }, user.name)
  )
);
```

**Props shape:**
```ts
interface RouterLinkProps {
  to: string;                              // destination path
  class?: string;                          // active class adds when currentRoute matches
  activeClass?: string;                    // override default 'active'
  replace?: boolean;                       // use router.replace instead of push
  onclick?: (e: MouseEvent) => void;       // additional click handler
  [key: string]: any;                      // any other <a> attribute
}
```

### Active class

The current path is matched exactly by default. To match a prefix (so `/users/123` highlights the `/users` link), pass `activeClass` and a class of your choice — Elit toggles it when `currentRoute.path === props.to`.

```ts
routerLink(router, { to: '/', class: 'nav-link', activeClass: 'nav-link--active' }, 'Home');
```

## Route Params

Routes with `:param` placeholders extract values into the component's first argument:

```ts
const routes = [
  { path: '/user/:id', component: (params) => UserPage(router, params.id as string) },
  { path: '/post/:category/:slug', component: (params) => PostPage(router, params) }
];

// navigating
router.push('/user/abc-123');
router.push('/post/tech/elit-3-7-released');

// inside UserPage
function UserPage(router, userId: string) {
  // userId === 'abc-123'
}
```

`RouteParams` is `Record<string, string | string[]>` — multi-value params (rare) come back as arrays.

## Guards

### Per-route `beforeEnter`

```ts
const routes = [
  {
    path: '/admin',
    component: () => AdminPage(router),
    beforeEnter: (to, from) => {
      if (!isAuthed()) return '/login';        // redirect
      if (!isAdmin()) return false;            // cancel
      // returning void/true continues
    }
  }
];
```

### Global `router.beforeEach`

```ts
const stopGuard = router.beforeEach((to, from) => {
  console.log(`navigating ${from.path} → ${to.path}`);
  // same return contract as beforeEnter
});

// later: stopGuard() removes the guard
```

## Hash Mode vs History Mode

- **`hash` (default)** — URLs look like `/#/about`. Works without server config. Use for static hosting.
- **`history`** — URLs look like `/about`. Cleaner, but the dev server (or production host) must serve `index.html` for all paths. Elit's dev server does this automatically for navigation requests (`GET` with `Accept: text/html`); set `historyApiFallback: false` in `createDevServer` if you need strict 404s. For production see the build `copy[].transform` examples in `elit-runtime-app/references/build.md`.

## 404 Handling

Pass a `notFound` component to render when no route matches:

```ts
const router = createRouter({
  mode: 'hash',
  routes,
  notFound: (params) => div({ class: 'not-found' },
    h1('404'),
    p(`No route for ${params.path}`)
  )
});
```

## Gotchas

- **Forgetting `reactive(router.currentRoute, ...)` around `RouterView()`** — silent navigation bug. Most common Elit mistake.
- **`createRouterView` returns a function, not a VNode** — you must call it: `RouterView()`, not `RouterView`.
- **Mutating `currentRoute.value` directly** — don't. Use `router.push/replace/navigate`.
- **History mode behind a static host** — without a fallback rule, deep links return 404. Use hash mode unless you control the server.
- **Guards running async work** — `beforeEnter`/`beforeEach` are synchronous. For async auth checks, do them on app startup before creating the router, or redirect to a `/loading` page while you await.
- **`routerLink` and `<a>` SEO** — `<a>` tags render normally in SSR; crawlers see real hrefs. In hash mode the hrefs include `#/...` which is fine for most crawlers.
