# elit/style — CSS-in-JS

`createStyles()` returns an instance that accumulates CSS rules and injects them into `<head>` once. This is the recommended way to define classes, theme tokens, and responsive rules.

## Creating an Instance

```ts
import { createStyles } from 'elit/style';

const styles = createStyles();
```

The package also exports a default singleton `styles` with the same methods — for app-wide tokens prefer your own `createStyles()` instance so styles stay scoped.

## CSS Variables (Theme Tokens)

### `styles.addVar(name, value)`
Registers a CSS custom property. Returns a `CSSVariable` handle you can pass to `styles.var(...)`.

```ts
const primary = styles.addVar('primary', '#6366f1');
const bgCard = styles.addVar('bg-card', '#ffffff');
const radius = styles.addVar('radius', '12px');
```

### `styles.var(variable, fallback?)`
Resolves a variable reference at build time. Always use this — passing the raw string bypasses theme switching.

```ts
styles.addClass('card', {
  background: styles.var(bgCard),
  border: `1px solid ${styles.var('border', '#e5e7eb')}`,
  borderRadius: styles.var(radius),
  color: styles.var(primary)
});
```

You can pass either a `CSSVariable` handle (returned by `addVar`) or a plain string name.

### `styles.getVariables()`
Returns `{ name: value }` map of all registered variables. Useful for exporting tokens to native or to JSON.

```ts
const tokens = styles.getVariables();
// { 'primary': '#6366f1', 'bg-card': '#ffffff', ... }
```

## Selectors

### `styles.addTag(tagName, styles)`
Adds a rule for a bare HTML tag.

```ts
styles.addTag('body', { margin: 0, fontFamily: 'system-ui', lineHeight: 1.5 });
styles.addTag('a', { color: 'inherit', textDecoration: 'none' });
```

### `styles.addClass(className, styles)`
Adds a `.className { ... }` rule. Returns a handle so you can reference the class name in TS.

```ts
const cardClass = styles.addClass('card', {
  background: '#fff',
  padding: '1.5rem',
  borderRadius: '12px'
});
// use as: div({ class: 'card' }, ...)
```

### `styles.addId(idName, styles)`
Adds an `#idName { ... }` rule.

### `styles.multiple(selectors[], styles)`
Same rule applied to multiple selectors.

```ts
styles.multiple(['h1', 'h2', 'h3'], { fontFamily: 'Inter, sans-serif' });
```

## Pseudo

### `styles.addPseudoClass(pseudo, styles, baseSelector?)`
Adds a `:pseudo` rule. The `baseSelector` scopes it (e.g. only for `.btn`).

```ts
styles.addPseudoClass('hover', { transform: 'translateY(-2px)' }, '.card');
styles.addPseudoClass('focus', { outline: '2px solid #6366f1' }, '.btn');
// → .card:hover { ... }   .btn:focus { ... }
```

### `styles.addPseudoElement(pseudo, styles, baseSelector?)`
Adds a `::pseudo-element` rule.

```ts
styles.addPseudoElement('before', { content: '"→"', marginRight: '0.5rem' }, '.arrow-link');
```

## Attribute Selectors

```ts
styles.addAttribute('disabled', { opacity: 0.5 }, '.btn');           // .btn[disabled]
styles.attrEquals('type', 'checkbox', { accentColor: 'blue' }, 'input'); // input[type="checkbox"]
styles.attrContainsWord('class', 'active', { fontWeight: 'bold' });   // [class~="active"]
styles.attrStartsWith('href', 'https', { color: 'blue' }, 'a');       // a[href^="https"]
styles.attrEndsWith('href', '.pdf', { color: 'red' }, 'a');           // a[href$=".pdf"]
styles.attrContains('href', 'example', { color: 'green' }, 'a');      // a[href*="example"]
```

## Combinators

### `styles.descendant(ancestor, descendant, styles)`
```ts
styles.descendant('.card', 'h3', { marginTop: 0 });
// → .card h3 { ... }
```

### `styles.child(parent, child, styles)`
```ts
styles.child('.list', 'li', { paddingBottom: '0.5rem' });
// → .list > li { ... }
```

### `styles.adjacentSibling(first, second, styles)`
```ts
styles.adjacentSibling('h2', 'p', { marginTop: 0 });
// → h2 + p { ... }
```

### `styles.generalSibling(first, second, styles)`
```ts
styles.generalSibling('h2', 'p', { color: '#666' });
// → h2 ~ p { ... }
```

## Media Queries

### `styles.media(condition, rules)`
Generic media query. `rules` is a `{ selector: { props } }` map.

```ts
styles.media('(prefers-color-scheme: dark)', {
  'body': { background: '#0a0a0a', color: '#eee' },
  '.card': { background: '#1a1a1a' }
});
```

### Width helpers

```ts
styles.mediaMinWidth('768px', { '.container': { maxWidth: '720px' } });
styles.mediaMaxWidth('768px', { '.container': { padding: '0 1rem' } });
```

### Preset media

```ts
styles.mediaDark({ 'body': { background: '#000' } });
styles.mediaLight({ 'body': { background: '#fff' } });
styles.mediaReducedMotion({ '*': { transition: 'none !important' } });
styles.mediaPrint({ '.no-print': { display: 'none' } });
styles.mediaScreen({ '.screen-only': { display: 'block' } });
```

## Container Queries, Supports, Layers

```ts
styles.container('(min-width: 400px)', { '.card': { padding: '2rem' } });
styles.supports('(display: grid)', { '.grid': { display: 'grid' } });
styles.layerOrder('reset, base, components');
styles.layer('base', { 'a': { color: 'inherit' } });
```

## Keyframes + font-face + import

### `styles.keyframe(name, steps)`
```ts
styles.keyframe('fade-in', {
  '0%': { opacity: 0 },
  '100%': { opacity: 1 }
});

styles.addClass('fade-in', { animation: 'fade-in 0.3s ease' });
```

### `styles.keyframeFromTo(name, from, to)`
Shorthand for two-step animations.

```ts
styles.keyframeFromTo('slide-up', { transform: 'translateY(20px)' }, { transform: 'translateY(0)' });
```

### `styles.fontFace(options)`
```ts
styles.fontFace({
  family: 'Inter',
  src: 'url("/fonts/Inter.woff2") format("woff2")',
  weight: 400,
  style: 'normal'
});
```

### `styles.import(url, mediaQuery?)`
```ts
styles.import('https://fonts.googleapis.com/css2?family=Inter');
```

## Utilities

### `styles.important(value)`
Wraps a value with `!important`.

```ts
styles.addClass('banner', { padding: styles.important('2rem') });
```

### `styles.add(rules)`
Bulk add — `{ selector: { props } }` map.

```ts
styles.add({
  '.btn': { padding: '0.5rem 1rem', border: 'none', borderRadius: '4px' },
  '.btn-primary': { background: '#6366f1', color: '#fff' }
});
```

## Injection + Lifecycle

### `styles.inject(styleId?)`
Generates the CSS string and injects it into `<head>` as a `<style>` tag. Returns the element.

```ts
const styleEl = styles.inject();
// or with explicit id (dedupes by id)
styles.inject('app-styles');
```

Call **once** at app entry, before `dom.render(...)`:

```ts
// src/styles.ts
export const injectStyles = () => styles.inject();

// src/main.ts
import { injectStyles } from './styles';
injectStyles();
dom.render('#app', App());
```

### `styles.render(...additional)`
Returns the CSS string without injecting. Use for SSR or writing to a `.css` file.

```ts
const css = styles.render();
fs.writeFileSync('dist/styles.css', css);
```

### `styles.clear()`
Removes all registered rules and variables. The injected `<style>` tag stays in the DOM.

## Native (mobile) Resolution

### `styles.resolveNativeStyles(target, ancestors?, options?)`
Resolves cascading rules into a flat style object for native rendering (Compose/SwiftUI).

### `styles.resolveClassStyles(target, ancestors?, options?)`
Same but scoped to class-based rules.

These power `elit/native` rendering. Most app code never calls them directly.

## Gotchas

- **Always use `styles.var(name)` to reference tokens** — `background: primary` (raw value) won't update on theme switch.
- **Call `inject()` exactly once per app** — multiple calls produce duplicate `<style>` tags.
- **Class names are global** — there's no automatic scoping. Use a prefix (`.app-`, `.my-feature-`) if you're worried about collisions.
- **`addPseudoClass('hover', ...)` without `baseSelector`** adds a global `:hover` rule — almost always wrong. Always pass the third arg.
- **`mediaMaxWidth('768px', {...})` is mobile-first-ish** — the rules inside apply at or below the breakpoint. Pair with `mediaMinWidth` for the desktop overrides.
