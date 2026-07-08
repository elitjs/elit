---
name: elit-ref-router
description: 'API reference for @elitjs/router: createRouter, createRouterView, routerLink, Route, RouteLocation, RouterOptions, Router, RouterLinkProps. Use when wiring client-side routing in history or hash mode, declaring routes with params, navigation guards, or building links that integrate with the router.'
argument-hint: 'Describe the route, link, or navigation flow to add (mode, paths, params, guards).'
user-invocable: true
---

# @elitjs/router Reference

Client-side router with `history` and `hash` modes, route params, navigation guards, and a `routerLink` factory. Designed to compose with `@elitjs/state` (the current location is exposed as a `State<RouteLocation>`).

## Exports

```ts
// from './router'
function createRouter(options: RouterOptions): Router;

// from './view'
function createRouterView(router: Router, options: RouterOptions): () => VNode;

// from './link'
function routerLink(router: Router, props: RouterLinkProps, ...children: Child[]): VNode;

// from './types'
type Route;
type RouteParams;
type RouteLocation;
interface RouterOptions;
interface Router;
interface RouterLinkProps;
```

## Type reference

```ts
interface RouterOptions {
  mode?: 'history' | 'hash';       // default 'history'
  base?: string;                    // base path stripped when matching
  routes: Route[];                  // can be [] and supplied later via createRouterView
  notFound?: (params: RouteParams) => VNode | Child;
}

interface Route {
  path: string;                     // e.g. '/', '/users/:id', '/chat/dm/:userId'
  component: (params: RouteParams) => VNode | Child;
  beforeEnter?: (
    to: RouteLocation,
    from: RouteLocation | null
  ) => boolean | string | void;     // return false to cancel, string to redirect, true/void to proceed
}

interface RouteParams {
  [key: string]: string;            // merged with query params at call time
}

interface RouteLocation {
  path: string;
  params: RouteParams;
  query: Record<string, string>;
  hash: string;
}

interface Router {
  currentRoute: State<RouteLocation>;   // reactive — subscribe or read .value
  mode: 'history' | 'hash';
  navigate(path: string, replace?: boolean): void;
  push(path: string): void;              // alias for navigate(path, false)
  replace(path: string): void;           // alias for navigate(path, true)
  back(): void;
  forward(): void;
  go(delta: number): void;
  beforeEach(
    guard: (to: RouteLocation, from: RouteLocation | null) => boolean | string | void
  ): void;
  destroy(): void;
}

type RouterLinkProps = Props & { to: string };
```

## Patterns

### Initialize router + view together

The canonical pattern: create the router with empty routes, then pass routes to `createRouterView`. This avoids circular imports with page modules.

```ts
// src/router.ts
import { createRouter, createRouterView } from '@elitjs/router';
import { HomePage } from './pages/HomePage';
import { UserPage } from './pages/UserPage';

export const router = createRouter({
  mode: 'hash',
  base: '/',
  routes: []
});

const routes = [
  { path: '/',              component: () => HomePage() },
  { path: '/users/:id',     component: (params) => UserPage(params.id) }
];

export const RouterView = createRouterView(router, { mode: 'hash', routes });
```

### Use in App factory with reactive guard

```ts
// src/web.ts
import { div, main } from '@elitjs/el';
import { reactive } from '@elitjs/state';
import { router, RouterView } from './router';

export const App = () =>
  div({ className: 'app-shell' },
    main({}, reactive(router.currentRoute, () => RouterView()))
  );
```

Wrapping `RouterView()` in `reactive(router.currentRoute, ...)` ensures the view re-renders on navigation.

### Page component receiving params

```ts
import { div, h1 } from '@elitjs/el';

export function UserPage(userId: string) {
  return div({}, h1(`User ${userId}`));
}
```

The route's `component` callback receives a `RouteParams` object (params + query merged). Extract values at the call site in `router.ts`:

```ts
{ path: '/users/:id', component: (params) => UserPage(params.id) }
```

### Links that respect the router

```ts
import { routerLink } from '@elitjs/router';
import { span } from '@elitjs/el';
import { router } from './router';

const NavLink = routerLink(
  router,
  { to: '/about', className: 'nav-link' },
  span('About')
);
```

`routerLink` returns an `<a>` VNode. The `href` is computed based on mode (prefixed with `#` in hash mode). The default `onclick` calls `event.preventDefault()` and `router.push(to)`.

### Navigation guards

Per-route:

```ts
const routes = [
  {
    path: '/admin',
    component: () => AdminPage(),
    beforeEnter: (to, from) => {
      if (!isLoggedIn()) return '/login';     // redirect
      // return false to cancel
      // return true / void to proceed
    }
  }
];
```

Global:

```ts
router.beforeEach((to, from) => {
  console.log(`navigating ${from?.path} → ${to.path}`);
  // same return contract as beforeEnter
});
```

### Programmatic navigation

```ts
router.push('/dashboard');              // add to history
router.replace('/login');               // replace current entry
router.back();
router.forward();
router.go(-2);
router.navigate('/x', true);            // same as replace
```

### 404 handling

```ts
const routes = [/* ... */];

export const RouterView = createRouterView(router, {
  mode: 'hash',
  routes,
  notFound: (params) => NotFoundPage(params)
});
```

Without `notFound`, unmatched routes render `<div>404 - Not Found</div>`.

## Rules

- Initialize `router` with `routes: []` and supply real routes to `createRouterView`. This breaks the circular import between router module and page modules.
- Pass the `router` instance into pages that need to navigate, rather than importing it — that's the pattern the templates follow and it keeps components testable.
- Route paths use `:name` for params. The router parses them and passes key→value pairs in `RouteParams`.
- `router.currentRoute` is a `State<RouteLocation>` from `@elitjs/state`. Subscribe with `reactive()` or read `.value`.
- `mode: 'hash'` uses `location.hash` (works without server config). `mode: 'history'` uses the History API and requires server-side fallback for deep links.
- `routerLink` builds `href` from mode — don't hardcode the `#` prefix.

## Anti-Patterns

- Calling `createRouter({ routes: [...] })` with real routes when those routes import page modules that also import the router. Circular. Use the empty-then-pass-to-view pattern.
- Reading `router.currentRoute.value` inside a non-reactive component. The view won't update on navigation. Wrap with `reactive()`.
- Returning `void` from a guard when you mean "cancel". `void` proceeds. Return `false` explicitly to cancel.
- Mutating `RouteLocation` directly. Treat it as immutable — navigate via `router.push()` instead.

## Validation

- `router.push('/users/42')` should update the URL and re-render the matched route.
- `router.currentRoute.value.path` reflects the latest navigation.
- `routerLink` `href` is correct for the mode (`#/path` in hash mode, `/path` in history mode).
- Back/forward buttons in the browser trigger re-rendering (the router subscribes to `popstate` / `hashchange`).
