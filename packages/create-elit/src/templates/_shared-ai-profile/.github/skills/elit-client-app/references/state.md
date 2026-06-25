# elit/state — Reactive State

Reactive primitives that drive UI updates. A `State<T>` cell holds a value; UI subscribes via `reactive(...)` and re-renders when the value changes.

## Core API

### `createState<T>(initial, options?)`
Creates a reactive cell with `.value` and `.subscribe()`.

```ts
import { createState } from 'elit/state';

const count = createState(0);

// read
console.log(count.value);  // 0

// write — triggers subscribers and reactive views
count.value = 1;
count.value += 1;

// subscribe (returns unsubscribe fn)
const unsub = count.subscribe(v => console.log('count:', v));
unsub();
```

**Options:**
- `persistKey?: string` — persists value to `localStorage` under this key.

```ts
const theme = createState<'light' | 'dark'>('light', { persistKey: 'app.theme' });
```

### `computed<T>(states, fn)`
Derives a state from other states. Re-computates whenever any dependency changes.

```ts
import { createState, computed } from 'elit/state';

const first = createState('Ada');
const last = createState('Lovelace');
const full = computed({ first, last }, ({ first, last }) => `${first} ${last}`);

full.value;          // 'Ada Lovelace'
first.value = 'Grace';
full.value;          // 'Grace Lovelace'
```

The first argument is a record of states; the second receives the unwrapped values.

### `effect(fn)`
Runs `fn` whenever a state accessed inside it changes. Auto-tracks dependencies.

```ts
import { createState, effect } from 'elit/state';

const count = createState(0);
effect(() => console.log('count is', count.value));  // runs immediately
count.value = 1;                                       // logs "count is 1"
```

Returns a disposer: `const dispose = effect(...); dispose();`.

## UI Binding

### `reactive(state, renderFn)`
The most-used primitive for reactive UI. Returns a VNode that re-renders when `state` changes.

```ts
import { div, p, button } from 'elit/el';
import { createState, reactive } from 'elit/state';

const count = createState(0);

const Counter = () =>
  div(
    reactive(count, n => p(`Count: ${n}`)),
    button({ onclick: () => count.value++ }, 'Increment')
  );
```

Updates are batched via `requestAnimationFrame` — rapid bursts of writes coalesce into one render.

### `reactiveAs(tagName, state, renderFn, props?)`
Same as `reactive` but lets you choose the wrapper tag and pass props.

```ts
reactiveAs('div', count, n => `Count: ${n}`, { class: 'counter' });
reactiveAs('li', items, list => list.map(renderItem), { class: 'list-item' });
```

### `text(state | value)`
Reactive text node. Pass a `State` for live updates; pass anything else for a static string.

```ts
import { text, createState } from 'elit/state';
import { div } from 'elit/el';

const clock = createState(Date.now());
div(text(clock));                       // updates when clock changes
div(text('static'));                    // static string
```

### `bindValue<T>(state)`
Two-way binding for text inputs, textareas, and selects. Spreads onto the element's props.

```ts
import { input, form, label } from 'elit/el';
import { createState, bindValue } from 'elit/state';

const email = createState('');
const count = createState(0);

form(
  label('Email: ', input({ type: 'email', ...bindValue(email) })),
  label('Count: ', input({ type: 'number', ...bindValue(count) }))
);
```

Handles `number` coercion automatically (input value is string, state stays number).

### `bindChecked(state)`
Two-way binding for checkboxes.

```ts
import { input } from 'elit/el';
import { createState, bindChecked } from 'elit/state';

const agree = createState(false);
input({ type: 'checkbox', ...bindChecked(agree) });
```

## Timing Utilities

### `throttle(fn, delayMs)`
Invokes `fn` at most once per `delayMs` window (leading + trailing call).

```ts
import { throttle } from 'elit/state';

const onResize = throttle(() => console.log(window.innerWidth), 100);
window.addEventListener('resize', onResize);
```

### `debounce(fn, delayMs)`
Invokes `fn` only after `delayMs` has elapsed since the last call.

```ts
import { debounce } from 'elit/state';

const search = debounce((q: string) => fetch(`/api/search?q=${q}`), 250);
input({ oninput: e => search((e.target as HTMLInputElement).value) });
```

## Shared / Cross-Tab State

### `createSharedState<T>(key, defaultValue, wsUrl?)`
Cross-tab + cross-client state synced via WebSocket. Uses Elit's internal `/__elit_ws` socket by default.

```ts
import { createSharedState } from 'elit/state';

const presence = createSharedState<string[]>('presence', []);
presence.subscribe(list => console.log('online:', list));
presence.value = [...presence.value, 'user-123'];
```

- Auto-reconnects on disconnect; queues updates until open.
- Server-side `StateManager` (from `elit/server`) backs the same key namespace.

## State Interface

```ts
interface State<T> {
  value: T;                                      // getter + setter
  subscribe(fn: (value: T) => void): () => void; // returns unsubscribe
  update(updater: (prev: T) => T): void;
  teardown(): void;
}
```

## Gotchas

- **Don't mutate `state.value` in place** — replace it. `state.value.push(x)` won't trigger subscribers; do `state.value = [...state.value, x]`.
- **`reactive(...)` wraps in a `<span style="display:contents">`** — the wrapper is invisible to layout but exists in the DOM. Use `reactiveAs` if the tag matters.
- **Mutating state from inside a `reactive(...)` render function** causes infinite update loops.
- **`computed` is read-only** — never assign to `.value` on a computed.
