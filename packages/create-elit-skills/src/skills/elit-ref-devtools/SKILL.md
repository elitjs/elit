---
name: elit-ref-devtools
description: 'API reference for @elitjs/devtools: installDevTools, uninstallDevTools, show, hide, toggle, trackState, trackRouter, untrackState, untrackRouter, DEVTOOLS_VERSION + DevToolsBridge, DevToolsInstallOptions, DevToolsSnapshot, PerfEvent, RouterLike types. Use when wiring an in-page browser DevTools panel for state/router/perf inspection.'
argument-hint: 'Describe the DevTools install (router, hotkey, autotrack) or which state/router to track.'
user-invocable: true
---

# @elitjs/devtools Reference

Browser-side DevTools panel for inspecting Elit.js state, router, components, and perf events. Also available as a separate Chrome extension (`@elitjs/devtools-extension`).

## Exports

```ts
function installDevTools(options?: DevToolsInstallOptions): DevToolsBridge;
function uninstallDevTools(): void;
function show(): void;
function hide(): void;
function toggle(): void;
function trackState<T>(name: string, state: State<T>): void;
function trackRouter(name: string, router: RouterLike): void;
function untrackState(name: string): void;
function untrackRouter(name: string): void;

const DEVTOOLS_VERSION: string;

interface DevToolsInstallOptions {
  router?: RouterLike;
  routerName?: string;           // default 'default'
  hotkey?: string | false;       // default 'Ctrl+Shift+E'
  showPanel?: boolean;           // default true
  maxPerfEvents?: number;        // default 500
  autoTrack?: boolean;           // default false — auto-tracks every State<T> created
}

interface DevToolsBridge {
  routers: Map<string, RouterEntry>;
  states: Map<string, StateEntry>;
  pushPerfEvent(event: PerfEvent): void;
  // ...internal state inspection surface
}

interface RouterLike {
  currentRoute: State<RouteSnapshot>;
  mode?: string;
  navigate?(path: string, replace?: boolean): void;
  push?(path: string): void;
  replace?(path: string): void;
  destroy?(): void;
}

interface RouteSnapshot {
  name?: string;
  path: string;
  params?: Record<string, string>;
  query?: Record<string, string>;
  hash?: string;
}

interface RouterEntry {
  name: string;
  current: RouteSnapshot;
  history: RouteSnapshot[];
  navigationCount: number;
  lastNavigatedAt: number;
  destroy(): void;
}

interface StateEntry<T = unknown> {
  name: string;
  state: State<T>;
  subscriberCount: number;
  updateCount: number;
  lastUpdatedAt: number;
  createdAt: number;
  initialValue: T;
  peek(): T;
}

interface PerfEvent {
  type: 'state-update' | 'router-nav' | 'render';
  name: string;
  timestamp: number;
  duration?: number;
}

interface DevToolsSnapshot {
  // captured state of all tracked entries — read by panel UI
}

interface ComponentNode {
  tag: string;
  id?: string;
  classList?: string[];
  attributes?: Array<{ name: string; value: string }>;
  textPreview?: string;
  childElementCount: number;
  descendantCount: number;
  depth: number;
  path: number[];
  box?: { width: number; height: number; top: number; left: number };
  visible: boolean;
  children?: ComponentNode[];
}
```

## Patterns

### Minimal install (auto-show panel)

```ts
import { installDevTools } from '@elitjs/devtools';
import { router } from './router';

installDevTools({ router });

// Press Ctrl+Shift+E to toggle the panel
```

### Track specific states by name

```ts
import { installDevTools, trackState } from '@elitjs/devtools';
import { createState } from '@elitjs/state';

const todos = createState<Todo[]>([]);
const filter = createState<'all' | 'active' | 'completed'>('all');

installDevTools();

trackState('todos', todos);
trackState('filter', filter);
```

Names appear in the panel's State tab — useful for grouping related state.

### Auto-track every state created

```ts
installDevTools({ autoTrack: true });
// Every createState() after this is auto-tracked as 'state#1', 'state#2', ...
```

Auto-track hooks into `@elitjs/dom`'s `setStateCreatedHook`. Convenient for exploration; gives noisy names in production.

### Disable the hotkey

```ts
installDevTools({ hotkey: false, showPanel: false });
// Use show()/hide()/toggle() to control the panel programmatically
```

### Programmatic control

```ts
import { show, hide, toggle, uninstallDevTools } from '@elitjs/devtools';

if (import.meta.env.DEV) {
  show();
} else {
  hide();
}

// On full teardown:
uninstallDevTools();
```

### Track multiple routers

```ts
installDevTools();

trackRouter('primary', primaryRouter);
trackRouter('modal', modalRouter);

// Both show up in the Router tab
untrackRouter('modal');  // when modal stack unmounts
```

### Conditional install (dev only)

```ts
// src/main.ts
if (process.env.NODE_ENV !== 'production') {
  import('@elitjs/devtools').then(({ installDevTools }) => {
    installDevTools({ router });
  });
}
```

Tree-shaking removes the entire import in production builds.

## Rules

- `installDevTools()` throws if called outside a browser (no `window`). Guard with `typeof window !== 'undefined'` or only call from `src/main.ts` which runs in the browser.
- Install once at app startup (typically in `main.ts`). Calling twice is idempotent but wasteful.
- `trackState(name, state)` lets you give a meaningful name. `autoTrack: true` gives generic names — fine for debugging, bad for screenshots.
- `uninstallDevTools()` removes the panel, hotkey, and all tracked entries. Call on full teardown (HMR, micro-frontends).
- The hotkey `Ctrl+Shift+E` is the default — change via `hotkey: 'Ctrl+Shift+D'` or disable with `false`.
- The panel renders inside your page (it's not a separate window). It can interfere with layout-sensitive code — pass `showPanel: false` and toggle manually if needed.
- `RouterLike` is a structural type — your router doesn't need to extend anything, just expose `currentRoute: State<RouteSnapshot>` plus optional navigation methods.
- The Chrome extension (`@elitjs/devtools-extension`) uses the same bridge — install either the in-page panel or the extension, not both.

## Anti-Patterns

- Installing in production without tree-shaking. Always wrap in `process.env.NODE_ENV !== 'production'` and let the bundler drop it.
- Tracking tens of thousands of states with `autoTrack: true` — the panel UI chokes. Track only what you're debugging.
- Forgetting to `untrackState` / `untrackRouter` when components unmount. The entry stays in the panel forever (memory leak in the bridge).
- Calling `trackState` before `installDevTools()`. The bridge must exist first.
- Relying on perf events for benchmarking. They're coarse-grained for human inspection, not high-resolution profiling.

## Validation

- After `installDevTools({ showPanel: true })`, the panel should be visible in the browser.
- Pressing `Ctrl+Shift+E` should toggle the panel.
- `trackState('counter', count)` should make `counter` appear in the State tab with `initialValue` matching `count.value`.
- Mutating `count.value++` should increment `updateCount` in the State tab.
- `installDevTools({ router })` should populate the Router tab with the current route; navigating should add entries to `history`.
