---
name: elit-ref-state
description: 'API reference for @elitjs/state: createState, computed, effect, reactive, reactiveAs, text, bindValue, bindChecked, createSharedState, SharedState, sharedStateManager, throttle, debounce, batchRender, renderChunked, createVirtualList, lazy. Use for exact signatures when wiring reactive primitives, two-way bindings, or client-server shared state.'
argument-hint: 'Describe the state primitive, binding, or shared-state flow to wire up.'
user-invocable: true
---

# @elitjs/state Reference

Reactive primitives, two-way input bindings, derived state, and client↔server shared state. All exports re-export from `core`, `bindings`, `reactive`, `shared-state`, `timing`.

## Exports

### Core reactive primitives

```ts
function createState<T>(initial: T, options?: StateOptions): State<T>;
function computed<T extends any[], R>(
  states: { [K in keyof T]: State<T[K]> },
  fn: (...values: T) => R
): State<R>;
function effect(fn: () => void): void;

interface State<T> {
  value: T;
  subscribe(fn: (value: T) => void): () => void;   // returns unsubscribe
  destroy(): void;
}

interface StateOptions {
  throttle?: number;   // ms — coalesce rapid changes
  deep?: boolean;      // deep-watch object/array mutations (still prefer immutable replace)
}
```

### Subtree reactivity (re-export from `./reactive`)

```ts
function reactive<T>(
  state: State<T>,
  renderFn: (value: T) => VNode | Child | Child[]
): VNode;

function reactiveAs<T>(
  tagName: string,
  state: State<T>,
  renderFn: (value: T) => VNode | Child | Child[],
  props?: Props
): VNode;

function text(state: State<any> | any): VNode | string;
```

### Two-way bindings (re-export from `./bindings`)

```ts
function bindValue<T extends string | number | string[]>(state: State<T>): Props;
function bindChecked(state: State<boolean>): Props;

type NativeBindingKind = 'value' | 'checked';
interface NativeBindingMetadata<T = unknown> { kind: NativeBindingKind; state: State<T> }
const ELIT_NATIVE_BINDING: unique symbol;  // exposed on bound props for native renderers
```

### Shared state (re-export from `./shared-state`)

```ts
function createSharedState<T>(key: string, defaultValue: T, wsUrl?: string): SharedState<T>;

class SharedState<T = any> {
  constructor(key: string, defaultValue: T, wsUrl?: string);
  readonly key: string;
  get value(): T;
  set value(newValue: T);
  get state(): State<T>;
  onChange(callback: (value: T, oldValue: T) => void): () => void;
  update(updater: (current: T) => T): void;
  disconnect(): void;
  destroy(): void;
}

class SharedStateManager {
  create<T>(key: string, defaultValue: T, wsUrl?: string): SharedState<T>;
  get<T>(key: string): SharedState<T> | undefined;
  delete(key: string): boolean;
  clear(): void;
}
const sharedStateManager: SharedStateManager;
```

### Performance helpers (re-export from `./core`, originally from `@elitjs/dom`)

```ts
function batchRender(container: string | HTMLElement, vNodes: VNode[]): HTMLElement;
function renderChunked(
  container: string | HTMLElement,
  vNodes: VNode[],
  chunkSize?: number,
  onProgress?: (current: number, total: number) => void
): HTMLElement;
function createVirtualList<T>(
  container: HTMLElement,
  items: T[],
  renderItem: (item: T, index: number) => VNode,
  itemHeight?: number,
  bufferSize?: number
): VirtualListController;
function lazy<T extends any[], R>(
  loadFn: () => Promise<(...args: T) => R>
): (...args: T) => Promise<R | VNode>;
function cleanupUnused(root: HTMLElement): number;
```

### Timing helpers (re-export from `./timing`)

```ts
function throttle<T extends any[]>(fn: (...args: T) => void, delay: number): (...args: T) => void;
function debounce<T extends any[]>(fn: (...args: T) => void, delay: number): (...args: T) => void;
```

## Patterns

### Counter with derived value

```ts
import { createState, computed } from '@elitjs/state';

const count = createState(0);
const doubled = computed([count], (n) => n * 2);

count.subscribe((v) => console.log('count:', v));
count.value++;                 // logs: count: 1
console.log(doubled.value);    // 2
```

### Subscribe a subtree (preferred)

```ts
import { el } from '@elitjs/el';
import { reactive } from '@elitjs/state';

const items = createState<Todo[]>([]);

const TodoList = reactive(items, (list) =>
  el('ul', {}, ...list.map((t) => el('li', {}, t.text)))
);
```

Only the `<ul>` re-runs when `items` changes — the surrounding component does not re-render.

### Reactive text node

```ts
import { el } from '@elitjs/el';
import { createState } from '@elitjs/state';

const name = createState('world');
const Heading = el('h1', {}, 'Hello, ', name);   // State<T> as child subscribes a text node automatically
```

### Two-way input binding

```ts
import { el } from '@elitjs/el';
import { createState, bindValue, bindChecked } from '@elitjs/state';

const email = createState('');
const agree = createState(false);

const Form = el('form', {},
  el('input', { type: 'email', placeholder: 'Email', ...bindValue(email) }),
  el('label', {},
    el('input', { type: 'checkbox', ...bindChecked(agree) }),
    ' I agree'
  )
);

// `bindValue` returns { value, onInput } and a symbol marker used by native renderers.
// For numeric state, it coerces with Number() and rejects NaN.
```

### `bindValue` with multi-select

When bound to a `<select multiple>`, `bindValue` reads `selectedOptions` and stores an array of string values:

```ts
const tags = createState<string[]>([]);
el('select', { multiple: true, ...bindValue(tags) },
  el('option', { value: 'a' }, 'A'),
  el('option', { value: 'b' }, 'B')
);
```

### `effect` for side effects

```ts
import { effect } from '@elitjs/state';
import { count } from './state';

effect(() => {
  document.title = `Count: ${count.value}`;
});
// Re-runs whenever any state read inside the function changes.
```

### Immutable array replace

```ts
const todos = createState<Todo[]>([]);
todos.value = [...todos.value, { id: nextId(), text: 'New' }];          // ✅ notifies
todos.value.push(...);                                                    // ❌ does not notify
todos.value = todos.value.map((t) => t.id === id ? { ...t, done: true } : t);
```

### `reactiveAs` — reactive wrapper with a chosen tag

```ts
import { reactiveAs } from '@elitjs/state';

const Li = reactiveAs('li', items, (list) =>
  list.map((t) => el('span', {}, t.text))
);
```

When `renderFn` returns null/false, `reactiveAs` hides the element via `display: none` (rather than removing like `reactive` does).

### Shared state (client ↔ server)

```ts
// Client
import { createSharedState } from '@elitjs/state';

const counter = createSharedState('counter', 0);
counter.value++;        // syncs to server over /__elit_ws
counter.onChange((v, old) => console.log(`${old} → ${v}`));

// Server (in dev server setup)
import { createDevServer } from '@elitjs/server';
const server = createDevServer({ root: '.', open: false });
const counter = server.state.create('counter', { initial: 0 });
counter.value = 10;     // syncs to all clients
```

The shared-state WS endpoint is reserved at `/__elit_ws` — don't define your own endpoint there.

### Throttle / debounce

```ts
import { throttle, debounce } from '@elitjs/state';

const onScroll = throttle(() => saveScroll(), 100);   // fires at most once per 100ms
const onType   = debounce((q) => search(q), 250);     // fires 250ms after last call
```

## Rules

- Replace arrays and objects immutably (`state.value = newArr`) so subscribers fire. Mutation via `push`/`splice` does not notify.
- Subscribe at the smallest scope. Wrap only the affected subtree with `reactive()` — not the whole component.
- For text content, pass `State<T>` directly as a child rather than wrapping with `reactive()` — `text(state)` is the helper for that case.
- Create state at module scope or inside a factory function once. **Never create `State<T>` inside a `reactive(...)` callback** — it resets on every re-run.
- `effect(fn)` re-runs when any state read inside `fn` changes. Read the state inside the function, not before.
- `computed([s1, s2], fn)` re-computes only when one of the declared deps changes. Declare all deps — it does not auto-track.
- `SharedState` talks over `/__elit_ws`. The dev server must be running. Reconnect happens automatically with 1s backoff.
- The first `createSharedState(key, ...)` for a given key constructs a new client; subsequent calls to `sharedStateManager.create(key, ...)` return the cached instance.

## Anti-Patterns

- Wrapping entire app in one giant `reactive()` — defeats the renderer's diffing.
- Mixing `subscribe()` + manual DOM mutation. Use `reactive()` or `effect()` — both clean up automatically.
- Calling `state.destroy()` while subscribers still hold references — they will silently stop firing.
- Using `bindValue` on a state whose initial value is `''` for a number field. Cast explicitly: `createState<number>(0)` and the binding will use `Number()`.
- Multiple `createSharedState('counter', ...)` calls — they share the same key and would each open their own WebSocket. Use `sharedStateManager.create(key, ...)` if you want a cached instance.

## Validation

- After `state.value = newValue`, only the affected text node or `reactive()` subtree should re-render — no full-page repaint.
- For shared state: run the dev server, open two browser tabs, mutate in one — the other should reflect within the WS round-trip (~instant on localhost).
- `state.subscribe(fn)` returns an unsubscribe function; call it to detach handlers in component teardown.
