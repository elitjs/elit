---
name: elit-ref-el-dom
description: 'API reference for @elitjs/el (element factories: div, span, html, head, body, svg, etc.) and @elitjs/dom (DomNode class: render, renderToString, renderToHead, batchRender, renderChunked, createVirtualList, lazy). Use when you need exact signatures, export names, or behavior details for VNode creation or DOM rendering.'
argument-hint: 'Describe the element factory, render method, or SSR helper you want to use.'
user-invocable: true
---

# @elitjs/el and @elitjs/dom Reference

`@elitjs/el` produces VNode trees. `@elitjs/dom` mounts them to the DOM, serializes them for SSR, and exposes a `DomNode` class with state, virtual list, and lazy helpers. Use this skill for exact signatures.

## @elitjs/el — element factories

### Signature of every factory

```ts
type ElementFactory = {
  (...children: Child[]): VNode;
  (props: Props | null, ...children: Child[]): VNode;
};
```

The first argument is **props** if it's a plain object, otherwise it's treated as a child. This is how `div('hello')` and `div({ className: 'x' }, 'hello')` both work.

```ts
import { div, span, button, input, h1, html, head, body, title, meta, link, script, frag } from '@elitjs/el';

div()                                  // { tagName: 'div', props: {}, children: [] }
div('hello')                           // child string
div({ className: 'card' }, 'hi')       // props + child
div(span('a'), span('b'))              // multiple children
button({ onclick: () => {}, disabled: true }, 'Save')
input({ type: 'text', value: 'x', onInput: (e) => {} })
frag('grouped', span('no wrapper'))    // fragment — children without a wrapper element
```

### Named exports

| Export | Purpose |
| --- | --- |
| `createElementFactory(tag: string): ElementFactory` | Build a custom factory for any tag |
| `frag: ElementFactory` | Fragment factory (no wrapper element) |
| `el(tagName: string): ElementFactory` | Factory by dynamic name (e.g. `el('my-tag')`) |

### HTML tag factories (all standard tags)

`a, abbr, address, area, article, aside, audio, b, base, bdi, bdo, blockquote, body, br, button, canvas, caption, cite, code, col, colgroup, data, datalist, dd, del, details, dfn, dialog, div, dl, dt, em, embed, fieldset, figcaption, figure, footer, form, h1, h2, h3, h4, h5, h6, head, header, hgroup, hr, html, i, iframe, img, input, ins, kbd, label, legend, li, link, main, map, mark, menu, meta, meter, nav, noscript, object, ol, optgroup, option, output, p, param, picture, pre, progress, q, rp, rt, ruby, s, samp, script, section, select, slot, small, source, span, strong, style, sub, summary, sup, table, tbody, td, template, textarea, tfoot, th, thead, time, title, tr, track, u, ul, var, video, wbr`

### SVG factories (prefixed `svg...`)

`svgSvg, svgCircle, svgRect, svgPath, svgLine, svgPolyline, svgPolygon, svgEllipse, svgG, svgDefs, svgUse, svgText, svgTspan, svgLinearGradient, svgRadialGradient, svgStop, svgPattern, svgImage, svgForeignObject, svgClipPath, svgMask, svgMarker, svgSymbol, svgTitle`

### MathML factories (prefixed `math...`)

`mathMath, mathMi, mathMn, mathMo, mathMs, mathMtext, mathMfrac, mathMsup, mathMsub, mathMroot, mathMsqrt, mathMtable, mathMtr, mathMtd`

### VNode shape

```ts
interface VNode {
  tagName?: string;
  props?: Props;
  children?: Children;
}

type Child = VNode | string | number | boolean | null | undefined | Child[];
type Children = Child[];

interface Props {
  className?: string | string[];
  class?: string | string[];
  style?: Partial<CSSStyleDeclaration> | string;
  dangerouslySetInnerHTML?: { __html: string };
  ref?: RefCallback | RefObject;
  onClick?: (event: MouseEvent) => void;
  onChange?: (event: Event) => void;
  onInput?: (event: Event) => void;
  onSubmit?: (event: Event) => void;
  value?: string | number | string[];
  checked?: boolean;
  [key: string]: any;
}
```

### Special prop behaviors

- `className` and `class` both work; arrays are joined with spaces.
- `style` accepts either a string or a `Partial<CSSStyleDeclaration>` object (camelCase keys).
- `dangerouslySetInnerHTML={{ __html: '...' }}` injects raw HTML. **Security:** only pass trusted content — Elit does not sanitize. Any user-controlled string here is an XSS vector (script injection, event handlers, data exfiltration). Sanitize with DOMPurify or similar before binding, or use text children instead.
- `ref` accepts a callback `(el) => void` or `{ current: HTMLElement }`.
- Event handlers: `onClick`, `onInput`, `onChange`, `onSubmit`, `onMouseOver`, etc. — lowercase `on` + event name. **Not** `onclick` (that's the DOM property name, but the convention in Elit is camelCase in code).

## @elitjs/dom — rendering

### `dom: DomNode` (singleton)

The default export instance. Most functions are also re-exported as bound helpers.

```ts
import { dom, render, renderToString, mount } from '@elitjs/dom';

render('#app', vnode);            // mount
mount('#app', vnode);             // alias for render
const html = renderToString(vnode, { pretty: true, indent: 2 });  // SSR
```

### `class DomNode`

Construct your own instance if you need isolated caches (rarely needed):

```ts
import { DomNode } from '@elitjs/dom';
const myDom = new DomNode();
```

### Instance methods (exact signatures)

```ts
class DomNode {
  createElement(tagName: string, props?: Props, children?: Children): VNode;
  renderToDOM(vNode: Child, parent: HTMLElement | SVGElement | DocumentFragment): void;
  render(rootElement: string | HTMLElement, vNode: VNode): HTMLElement;
  batchRender(rootElement: string | HTMLElement, vNodes: VNode[]): HTMLElement;
  renderChunked(
    rootElement: string | HTMLElement,
    vNodes: VNode[],
    chunkSize?: number,                // default 5000
    onProgress?: (current: number, total: number) => void
  ): HTMLElement;
  renderToHead(...vNodes: Array<VNode | VNode[]>): HTMLHeadElement | null;
  addStyle(cssText: string): HTMLStyleElement;
  addMeta(attrs: Record<string, string>): HTMLMetaElement;
  addLink(attrs: Record<string, string>): HTMLLinkElement;
  setTitle(text: string): string;

  createState<T>(initialValue: T, options?: StateOptions): State<T>;
  computed<T extends any[], R>(
    states: { [K in keyof T]: State<T[K]> },
    computeFn: (...values: T) => R
  ): State<R>;
  effect(stateFn: () => void): void;

  createVirtualList<T>(
    container: HTMLElement,
    items: T[],
    renderItem: (item: T, index: number) => VNode,
    itemHeight?: number,                // default 50
    bufferSize?: number                 // default 5
  ): VirtualListController;

  lazy<T extends any[], R>(
    loadFn: () => Promise<(...args: T) => R>
  ): (...args: T) => Promise<R | VNode>;

  cleanupUnusedElements(root: HTMLElement): number;

  renderToString(vNode: Child, options?: { pretty?: boolean; indent?: number }): string;

  jsonToVNode(json: JsonNode | string | number | boolean | null | undefined | State<any>): Child;
  vNodeJsonToVNode(json: VNodeJson | State<any>): Child;
  renderJson(rootElement: string | HTMLElement, json: JsonNode): HTMLElement;
  renderVNode(rootElement: string | HTMLElement, json: VNodeJson): HTMLElement;
  renderJsonToString(json: JsonNode, options?: { pretty?: boolean; indent?: number }): string;
  renderVNodeToString(json: VNodeJson, options?: { pretty?: boolean; indent?: number }): string;

  renderToHTMLDocument(vNode: Child, options?: {
    title?: string;
    meta?: Array<Record<string, string>>;
    links?: Array<Record<string, string>>;
    scripts?: Array<{ src?: string; content?: string; async?: boolean; defer?: boolean; type?: string }>;
    styles?: Array<{ href?: string; content?: string }>;
    lang?: string;
    head?: string;
    bodyAttrs?: Record<string, string>;
    pretty?: boolean;
  }): string;

  getElementCache(): WeakMap<Element, boolean>;
}
```

### Top-level named exports

| Export | Signature |
| --- | --- |
| `dom` | `DomNode` singleton |
| `render` | `(rootElement, vNode) => HTMLElement` (bound to singleton) |
| `renderToString` | `(vNode, options?) => string` (bound to singleton) |
| `mount` | Alias of `render` |
| `DomNode` | The class |
| `setStateCreatedHook` | Internal hook (rarely needed) |

## Patterns

### Mount an app

```ts
import { dom } from '@elitjs/dom';
import { div, h1 } from '@elitjs/el';

const app = div({ className: 'app' }, h1('Hello'));
dom.render('#app', app);
```

### SSR (server-side, no `document`)

```ts
import { renderToString } from '@elitjs/dom';
import { html, head, body, title, div, h1 } from '@elitjs/el';

const tree = html(
  head(title('My App')),
  body(div({ id: 'app' }, h1('Hello')))
);
const htmlString = renderToString(tree, { pretty: true });
```

### Inject styles/meta into `<head>` at runtime

```ts
import { dom } from '@elitjs/dom';

dom.addStyle(`.btn { color: red; }`);
dom.addMeta({ name: 'description', content: 'My app' });
dom.addLink({ rel: 'stylesheet', href: '/theme.css' });
dom.setTitle('My App — Dashboard');
dom.renderToHead({ tagName: 'style', props: {}, children: ['body { margin: 0 }'] });
```

### Render a large list in chunks

```ts
const rows = items.map((item) => div({ className: 'row' }, item.label));
dom.renderChunked('#list', rows, 1000, (current, total) => {
  console.log(`Rendered ${current}/${total}`);
});
```

### Virtual scrolling for huge lists

```ts
const container = document.getElementById('list')!;
const controller = dom.createVirtualList(
  container,
  items,
  (item, index) => div({ className: 'row' }, item.label),
  40,    // itemHeight px
  5      // bufferSize
);
// later:
controller.destroy();
```

### Lazy-loaded component

```ts
const HeavyChart = dom.lazy(async () => {
  const module = await import('./charts/HeavyChart.js');
  return module.HeavyChart;
});
// Usage: HeavyChart(props) returns a VNode once loaded
```

## Rules

- The first arg of any factory is **props only if it's a plain object**. `div(span('x'))` treats `span('x')` as a child.
- Factory children are flattened automatically — pass arrays, single nodes, strings, or numbers freely.
- `render(rootElement, vNode)` accepts either a CSS selector string (`'#app'`) or an `HTMLElement`.
- `renderToHTMLDocument()` wraps a body VNode in a full `<!doctype html>` document — useful when returning SSR output without a static `client.ts` shell.
- `renderToString` works without `document` (pure string concatenation). Use it on the server.
- `renderToDOM(vNode, parent)` is the lower-level primitive — `render` calls it after clearing the root.
- `dom.addStyle()` / `addMeta()` / `addLink()` mutate `<head>` imperatively — don't use them during SSR.

## Anti-Patterns

- Calling a factory with the wrong arg order: `button('Save', { onclick: fn })` — props must come first.
- Mixing string CSS with object CSS in the same `style` prop.
- Using `onclick` instead of `onClick` in code — works at runtime because props are forwarded, but the convention is camelCase.
- Calling `render()` repeatedly to update. Use reactive state (`@elitjs/state`) or `batchRender` for bulk updates — `render` clears the root each call.
- Importing `DomNode` and constructing it per-render. The `dom` singleton is the intended usage.

## Validation

- `dom.render('#app', App())` should mount the tree into `<div id="app">`.
- `renderToString(tree)` should produce a string starting with the root tag — no `<!doctype>` unless you use `renderToHTMLDocument`.
- For SSR via dev server, return a VNode from `dev.clients[].ssr` — the dev server calls `renderToString` internally.
