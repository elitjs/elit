---
name: elit-state
description: 'Manage reactive state in Elit.js apps with @elitjs/state. Use when wiring createState, computed, reactive, effect, subscribe, bindValue, bindChecked, or createSharedState.'
argument-hint: 'Describe the state shape, derivation, or sync flow to implement.'
user-invocable: true
---

# Elit.js Reactive State

Use this skill when the task involves reactive state, derived values, subscriptions, two-way bindings, or server-shared state in an app that consumes `@elitjs/*` packages.

## What Matters First

- `createState<T>(initial)` returns a `State<T>` with `.value`, `.subscribe(fn)`, and `.destroy()`.
- Pass `State<T>` instances directly as children to subscribe a text node reactively — no manual subscribe needed.
- Use `reactive(state, fn)` to subscribe a sub-tree; only `fn` re-runs when the state changes, not the whole component.
- `computed([s1, s2], (a, b) => ...)` derives new state; it recomputes only when inputs change.
- For shared state between client and server, use `createSharedState(name, initial)` from `@elitjs/state` — it talks to the dev server over WebSocket.

## Imports

- `@elitjs/state` — `createState`, `computed`, `reactive`, `effect`, `subscribe`, `bindValue`, `bindChecked`, `text`, `createSharedState`.

## Patterns

### Counter with derived value

```ts
import { createState, computed } from '@elitjs/state';

const count = createState(0);
const doubled = computed([count], (n) => n * 2);

count.subscribe((v) => console.log('count:', v));
count.value++;          // logs: count: 1
console.log(doubled.value); // 2
```

### Reactive subtree

```ts
import { el } from '@elitjs/el';
import { reactive } from '@elitjs/state';

const TodoList = reactive(todos, (items) =>
    el('ul', {}, ...items.map((t) => el('li', {}, t.text))),
);
```

### Two-way input binding

```ts
import { createState, bindValue } from '@elitjs/state';
import { el } from '@elitjs/el';

const name = createState('world');
const Input = el('input', { ...bindValue(name), placeholder: 'Name' });
const Heading = el('h1', {}, 'Hello, ', name);  // name subscribes a text node
```

`bindValue(state)` returns `{ value: state, onInput: (e) => state.value = e.target.value }`. For checkboxes, use `bindChecked(state)`.

### Side effects (effect)

```ts
import { effect } from '@elitjs/state';

effect([count], (n) => {
    document.title = `Count: ${n}`;
});
```

### Replace array state immutably

```ts
const todos = createState<Todo[]>([]);
todos.value = [...todos.value, { id: nextId(), text: 'New' }];     // replaces the array
todos.value = todos.value.map((t) => t.id === id ? { ...t, done: !t.done } : t);
```

### Shared client↔server state

Client:

```ts
import { createSharedState } from '@elitjs/state';
const counter = createSharedState('counter', 0);
counter.value++;
```

Server (dev server):

```ts
import { createDevServer } from '@elitjs/server';
const server = createDevServer({ root: '.', open: false });
const counter = server.state.create('counter', { initial: 0 });
counter.value = 10;
```

## Rules

- Replace array and object state immutably — `state.value = newArray` — so subscribers fire. Mutating `state.value.push(...)` will not notify.
- Subscribe at the smallest scope. Avoid wrapping the entire app in a single `reactive()`; wrap only the affected subtree.
- `computed` and `effect` re-run only when their declared dependencies change. Declare all dependencies in the deps array.
- For text content, pass the `State<T>` directly as a child rather than wrapping it in `reactive(state, (v) => text(v))`.
- `State<T>` instances live across renders. Create them at module scope or inside a factory function once, not inside `reactive` callbacks.

## Anti-Patterns

- Manually subscribing and rebuilding the tree. Use `reactive()` so the renderer can diff the affected subtree only.
- Mixing `subscribe` + DOM mutation. Prefer `reactive()` or `effect()` — both clean up automatically.
- Creating new `State<T>` inside `reactive(...)` — this resets state on every re-run.

## Validation

- Trigger the state change in the UI; only the affected text or subtree should update without a full page re-render.
- For shared state, run the server (`npx elit dev`) and the client — both sides should observe the change.
