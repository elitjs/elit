---
name: elit-component
description: 'Build Elit.js UI components and pages with @elitjs/el element factories and @elitjs/dom renderer. Use when creating elements, wiring event handlers, composing VNode trees, or rendering into the DOM.'
argument-hint: 'Describe the UI component, element, or layout to build.'
user-invocable: true
---

# Elit.js Components

Use this skill when writing browser UI in an app that consumes `@elitjs/*` packages.

## What Matters First

- UI is built from VNode trees via hyperscript factories — `el(tag, props, ...children)` or named factories like `div`, `button`, `input`.
- Render into the DOM with `render(target, node)` from `@elitjs/dom`. `target` accepts a selector (`'#app'`), an element, or an id (`'app'`).
- For styles, prefer `@elitjs/style` (`CreateStyle` + `inject`) over inline `style` props for anything reusable.
- A `State<T>` instance can be passed directly as a child — the renderer subscribes and re-renders that text node in place.

## Imports

- `@elitjs/el` — `el`, `div`, `span`, `button`, `input`, `img`, `a`, `ul`, `li`, plus SVG and MathML factories.
- `@elitjs/dom` — `render`, `renderToString`, `mount`.
- `@elitjs/core` — types only (`VNode`, `Child`).

## Patterns

### Reactive counter

```ts
import { el } from '@elitjs/el';
import { createState } from '@elitjs/state';
import { render } from '@elitjs/dom';

const count = createState(0);

const App = el('main', { style: { padding: '24px' } },
    el('h1', {}, 'Counter'),
    el('button', {
        onClick: () => count.value++,
        style: { padding: '8px 16px' },
    }, 'Clicks: ', count),
);

render('#app', App);
```

### Composing components (factory functions)

```ts
const Button = (label: string, onClick: () => void) =>
    el('button', { onClick, class: 'btn' }, label);

const App = el('div', {},
    Button('Save', save),
    Button('Cancel', cancel),
);
```

### Refs (escape hatch to the DOM node)

```ts
let inputEl: HTMLInputElement | null = null;
const App = el('input', {
    ref: (node) => { inputEl = node as HTMLInputElement; },
    placeholder: 'Type something...',
});
```

### Two-way input binding

`@elitjs/state` exports `bindValue` and `bindChecked` that spread onto an input:

```ts
import { createState, bindValue } from '@elitjs/state';
const name = createState('');
const Input = el('input', { ...bindValue(name), placeholder: 'Name' });
```

## Rules

- Pass children as final args; they can be strings, numbers, VNodes, or `State<T>` instances.
- Event handlers go on `props` as `onClick`, `onInput`, `onChange`, `onSubmit`, etc. — DOM-style names, camelCased.
- Inline `style` accepts an object; camelCase keys are fine for nested styles.
- Don't call `render()` more than once per target unless you explicitly want to replace the tree.
- For conditional and list rendering, prefer `reactive(state, ...)` from `@elitjs/state` over manual subscribe + rebuild.

## Anti-Patterns

- Re-rendering the whole app on every state change. Subscribe at the smallest scope — `reactive(state, fn)` re-invokes only `fn`.
- Mutating the DOM directly inside a component factory. Use a `ref` callback or wrap the mutation in `effect()`.
- Importing from the meta-package `elit` — prefer scoped `@elitjs/*` imports in app code.

## Validation

- `npx elit dev` and open the page — VNode trees render without compiler step, so changes are immediate.
- `npx elit build` to confirm the tree bundles cleanly.
- For SSR, `renderToString(node)` from `@elitjs/dom` returns the static HTML.
