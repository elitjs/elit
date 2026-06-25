# elit/dom — Mounting, SSR, and Head

`dom` is both a singleton export and a namespace. Most methods can be imported as named exports OR accessed as `dom.method(...)`.

## Mounting

### `dom.render(rootElement, vNode)`
Mounts a VNode tree to a CSS selector or HTMLElement. Clears existing children first.

```ts
import { dom, div, h1 } from 'elit/dom';
import { el } from 'elit/el';

// by selector
dom.render('#app', div(h1('Hello')));

// by element reference
const root = document.getElementById('app')!;
dom.render(root, div(h1('Hello')));
```

For arrays of >500 children, internally uses a fragment to avoid blocking the main thread.

### `dom.batchRender(rootElement, vNodes[])`
Renders multiple top-level VNodes in one pass.

```ts
dom.batchRender('#app', [div('a'), p('b'), span('c')]);
```

### `dom.renderChunked(rootElement, vNodes[], chunkSize?, onProgress?)`
Progressive rendering for very large lists. Calls `onProgress(current, total)` per chunk.

```ts
dom.renderChunked(
  '#app',
  items.map(item => li(item.name)),
  1000,
  (i, n) => console.log(`rendered ${i}/${n}`)
);
```

## SSR (Server-Side Rendering)

These work in Node/Bun/Deno too — that's how `dev.clients[].ssr` produces initial HTML.

### `dom.renderToString(vNode, options?)`
Serializes a VNode to an HTML string.

```ts
import { dom } from 'elit/dom';
import { div, h1 } from 'elit/el';

const html = dom.renderToString(div(h1('Hello')));
// "<div><h1>Hello</h1></div>"

const pretty = dom.renderToString(div(h1('Hello')), { pretty: true, indent: 2 });
```

- Auto-escapes text content.
- Renders self-closing tags correctly (`<img />`, `<br />`).
- Boolean attributes (`disabled`, `checked`) render only when true.

### `dom.renderToHTMLDocument(vNode, options?)`
Returns a complete HTML document string (with `<!DOCTYPE html>`, `<head>`, `<body>`). Use for SSR entry points.

```ts
const doc = dom.renderToHTMLDocument(app, {
  title: 'My App',
  lang: 'en',
  meta: [
    { name: 'description', content: 'An Elit app' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  links: [
    { rel: 'stylesheet', href: '/styles.css' }
  ],
  scripts: [
    { src: '/main.js', defer: true }
  ],
  styles: [
    { content: 'body { margin: 0; }' }
  ],
  bodyAttrs: { class: 'landing' },
  pretty: false
});
```

This is the function `dev.clients[].ssr` should call when returning a full page (return the string, not the VNode).

## Head Management (browser-only)

These mutate `document.head` at runtime. Useful for setting meta tags, title, and stylesheets from a page component.

### `dom.addStyle(cssText)`
Injects a `<style>` element into `<head>`.

```ts
dom.addStyle('.banner { background: gold; }');
```

### `dom.addMeta(attrs)`
Injects a `<meta>` element.

```ts
dom.addMeta({ name: 'theme-color', content: '#2563eb' });
```

### `dom.addLink(attrs)`
Injects a `<link>` element.

```ts
dom.addLink({ rel: 'preconnect', href: 'https://api.example.com' });
dom.addLink({ rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' });
```

### `dom.setTitle(text)`
Sets `document.title`. Returns the new title.

```ts
dom.setTitle('Dashboard — MyApp');
```

### `dom.renderToHead(...vNodes)`
Injects arbitrary VNodes into `<head>`. Returns the resulting `<head>` element.

```ts
import { meta } from 'elit/el';
dom.renderToHead(meta({ name: 'robots', content: 'noindex' }));
```

## Lazy + Virtual List

### `dom.lazy(loadFn)`
Lazy component loader. The returned function returns a Promise that resolves to the rendered component.

```ts
import { dom } from 'elit/dom';

const AdminPanel = dom.lazy(async () => {
  const { AdminPanel } = await import('./AdminPanel');
  return AdminPanel();
});
```

### `dom.createVirtualList(container, items, renderItem, itemHeight?, bufferSize?)`
Virtual scrolling helper for long lists. Returns a controller with `update(items)`, `scrollTo(index)`, `destroy()`.

```ts
const list = dom.createVirtualList(
  document.getElementById('list')!,
  rows,
  (row, i) => tr(td(row.name)),
  32,            // estimated row height
  5              // buffer rows above/below viewport
);

// later
list.update(newRows);
list.scrollTo(1000);
list.destroy();
```

### `dom.cleanupUnusedElements(root)`
Removes reactive elements that are no longer tracked. Returns the count removed.

```ts
const removed = dom.cleanupUnusedElements(document.getElementById('app')!);
```

## JSON Rendering

For data-driven rendering (e.g. hydrating from server JSON).

### `dom.jsonToVNode(json)` / `dom.renderJson(container, json)` / `dom.renderJsonToString(json)`
### `dom.vNodeJsonToVNode(json)` / `dom.renderVNode(container, json)` / `dom.renderVNodeToString(json)`

```ts
const json = { tag: 'div', props: { class: 'box' }, children: ['Hi'] };
dom.renderJson('#app', json);
```

## Gotchas

- **`dom.render()` clears the container** — don't call it twice on the same root expecting append behavior; use `batchRender` or compose into one VNode.
- **`dom.addStyle()` is idempotent on content** — calling it twice with the same CSS string does not duplicate the tag.
- **SSR with reactive views** — `renderToString` captures the current state; the client takes over after hydration. Wrap live regions in `reactive(...)` on the client side.
- **`renderToHead` only works in browser** — for SSR head injection, use `renderToHTMLDocument({ meta, links, scripts })`.
