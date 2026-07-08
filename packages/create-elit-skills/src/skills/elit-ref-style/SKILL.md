---
name: elit-ref-style
description: 'API reference for @elitjs/style: CreateStyle class with addVar/var/addTag/addClass/addId/addPseudoClass/addPseudoElement/addAttribute/attrEquals/descendant/child/keyframe/fontFace/import/media/mediaDark/mediaReducedMotion/container/supports/layer/add/important/resolveNativeStyles/resolveClassStyles/render/inject/clear. Plus the singleton styles. Use for exact method signatures when generating CSS in JS.'
argument-hint: 'Describe the CSS rule, selector, keyframe, media query, or native-style resolution to add.'
user-invocable: true
---

# @elitjs/style Reference

CSS-in-JS renderer and selector parser. Build rules imperatively, then `inject()` once into `<head>` or `render()` to a string for SSR. Also exposes `resolveNativeStyles()` for translating class-based styles to inline objects for native renderers.

## Exports

```ts
class CreateStyle { /* see below */ }
const styles: CreateStyle;                                  // singleton, default export
export default styles;

// All instance methods are also exported as top-level bound helpers:
export const {
  addVar, var: getVar,
  addTag, addClass, addId,
  addPseudoClass, addPseudoElement, addAttribute,
  attrEquals, attrContainsWord, attrStartsWith, attrEndsWith, attrContains,
  descendant, child: childStyle, adjacentSibling, generalSibling, multiple: multipleStyle,
  addName, nesting,
  keyframe, keyframeFromTo,
  fontFace,
  import: importStyle,
  media: mediaStyle, mediaScreen, mediaPrint, mediaMinWidth, mediaMaxWidth, mediaDark, mediaLight, mediaReducedMotion,
  container, addContainer,
  supports: supportsStyle,
  layerOrder, layer,
  add: addStyle, important,
  getVariables: getStyleVariables,
  resolveNativeStyles, resolveClassStyles,
  render: renderStyle, inject: injectStyle, clear: clearStyle
} = styles;
```

**Prefer the singleton** (`import styles from '@elitjs/style'`) over `new CreateStyle()`. The singleton uses a shared store, so calls across modules accumulate into one stylesheet.

## CreateStyle method reference

### Variables

```ts
addVar(name: string, value: string): CSSVariable;       // name auto-prefixed with -- if missing
var(variable: CSSVariable | string, fallback?: string): string;
getVariables(): Record<string, string>;                  // { '--name': 'value' }
```

### Simple rules

```ts
addTag(tag: string, styles: Record<string, string | number>): CSSRule;             // e.g. addTag('body', {...})
addClass(name: string, styles: Record<string, string | number>): CSSRule;          // .name
addId(name: string, styles: Record<string, string | number>): CSSRule;             // #name
add(rules: Record<string, Record<string, string | number>>): CSSRule[];            // bulk: { '.a': {...}, '.b': {...} }
```

### Pseudo & attribute selectors

```ts
addPseudoClass(pseudo: string, styles, baseSelector?: string): CSSRule;            // :hover, :focus
addPseudoElement(pseudo: string, styles, baseSelector?: string): CSSRule;          // ::before, ::after
addAttribute(attr: string, styles, baseSelector?: string): CSSRule;                // [disabled]
attrEquals(attr, value, styles, baseSelector?): CSSRule;                            // [attr="value"]
attrContainsWord(attr, value, styles, baseSelector?): CSSRule;                      // [attr~="value"]
attrStartsWith(attr, value, styles, baseSelector?): CSSRule;                        // [attr^="value"]
attrEndsWith(attr, value, styles, baseSelector?): CSSRule;                          // [attr$="value"]
attrContains(attr, value, styles, baseSelector?): CSSRule;                          // [attr*="value"]
```

### Combinators

```ts
descendant(ancestor: string, descendant: string, styles): CSSRule;                 // "A B"
child(parent: string, childSel: string, styles): CSSRule;                           // "A > B"
adjacentSibling(element: string, sibling: string, styles): CSSRule;                 // "A + B"
generalSibling(element: string, sibling: string, styles): CSSRule;                  // "A ~ B"
multiple(selectors: string[], styles): CSSRule;                                     // "A, B, C"
```

### Names, nesting, keyframes, fontFace

```ts
addName(name: string, styles): CSSRule;                                              // BEM-like: &--name
nesting(parentRule: CSSRule, ...childRules: CSSRule[]): CSSRule;                     // attach nested rules

keyframe(name: string, steps: Record<string | number, Record<string, string | number>>): Keyframes;
keyframeFromTo(name: string, from: Record<...>, to: Record<...>): Keyframes;
fontFace(options: FontFace): FontFace;                                               // { family, src, weight?, ... }
```

### Imports & media queries

```ts
import(url: string, mediaQuery?: string): string;                                    // @import url("...") media?;
media(type: string, condition: string, rules: Record<string, Record<...>>): MediaRule;
mediaScreen(condition: string, rules): MediaRule;                                    // @media screen and (condition)
mediaPrint(rules): MediaRule;                                                         // @media print
mediaMinWidth(minWidth: string, rules): MediaRule;                                   // e.g. '768px'
mediaMaxWidth(maxWidth: string, rules): MediaRule;
mediaDark(rules): MediaRule;                                                          // prefers-color-scheme: dark
mediaLight(rules): MediaRule;
mediaReducedMotion(rules): MediaRule;
```

### Container queries, supports, layers

```ts
container(condition: string, rules, name?: string): ContainerRule;
addContainer(name: string, styles): CSSRule;                                         // also adds container-name: name;
supports(condition: string, rules): SupportsRule;                                    // @supports (condition)
layerOrder(...layers: string[]): void;                                                // @layer statement
layer(name: string, rules): LayerRule;                                                // @media inside @layer
```

### Native resolution (mobile / desktop)

```ts
resolveNativeStyles(
  target: StyleSelectorTarget,
  ancestors?: StyleSelectorTarget[],
  options?: NativeStyleResolveOptions
): Record<string, string | number>;

resolveClassStyles(classNames: string[]): Record<string, string | number>;
```

Used by `@elitjs/native` to translate class-based styles into the inline object form native renderers understand. You rarely call this directly.

### Rendering & injection

```ts
render(...additionalRules?: StyleRenderInput[]): string;     // returns full CSS string
inject(styleId?: string): HTMLStyleElement;                   // creates <style> in document.head
clear(): void;                                                 // wipe all state (singleton reset)
important(value: string | number): string;                    // `${value} !important`
```

## Patterns

### Singleton usage (recommended)

```ts
// src/styles.ts
import styles from '@elitjs/style';

styles.addTag('*', { margin: 0, padding: 0, boxSizing: 'border-box' });
styles.addTag('body', {
  minHeight: '100vh',
  fontFamily: "'Aptos', sans-serif",
  color: '#173447'
});

styles.addClass('app-shell', {
  maxWidth: '1120px',
  margin: '0 auto',
  padding: '32px 20px'
});

styles.addClass('btn-primary', {
  border: 'none',
  borderRadius: '999px',
  padding: '14px 18px',
  cursor: 'pointer'
});

styles.addPseudoClass('hover', {
  transform: 'translateY(-1px)'
}, '.btn-primary');

export function injectStyles() {
  styles.inject('my-app-styles');
}
```

Then in `main.ts`:

```ts
import { injectStyles } from './styles';
injectStyles();
```

### CSS variables + theme override

```ts
const bg = styles.addVar('color-bg', '#07080d');        // :root { --color-bg: #07080d }
const accent = styles.addVar('color-accent', '#a78bfa');

styles.addTag('body', { background: styles.var(bg), color: styles.var('color-text') });

// Override for [data-theme="light"]
styles.add({
  '[data-theme="light"]': {
    '--color-bg': '#fafafb',
    '--color-accent': '#6d28d9'
  }
});
```

### Class with hover and disabled

```ts
styles.addClass('btn', { /* base */ });
styles.addPseudoClass('hover', { transform: 'translateY(-1px)' }, '.btn');
styles.addClass('btn[disabled]', { opacity: 0.6, cursor: 'not-allowed' });
```

### Keyframes

```ts
styles.keyframe('orb1', {
  '0%, 100%': { transform: 'translate(0, 0)' },
  '50%':      { transform: 'translate(40px, -20px)' }
});

styles.addClass('orb', { animation: 'orb1 12s ease-in-out infinite' });
```

Or use the from/to shorthand:

```ts
styles.keyframeFromTo('fade', { opacity: 0 }, { opacity: 1 });
```

### Media queries

```ts
styles.mediaMaxWidth('768px', {
  '.nav-link': { display: 'none' },
  '.menu-toggle': { display: 'inline-flex' }
});

styles.mediaDark({
  ':root': {
    '--color-bg': '#0a0b12',
    '--color-text': '#e6e8ef'
  }
});

styles.mediaReducedMotion({
  '*': { animation: 'none !important', transition: 'none !important' }
});
```

### Container query

```ts
styles.addContainer('sidebar', { containerType: 'inline-size' });

styles.container('min-width: 400px', {
  '.sidebar .layout': { gridTemplateColumns: '1fr 2fr' }
}, 'sidebar');
```

### @font-face

```ts
styles.fontFace({
  family: 'Inter',
  src: [{ url: '/fonts/inter-var.woff2', format: 'woff2' }],
  weight: '100 900',
  display: 'swap'
});
```

### Import a stylesheet

```ts
styles.import('https://fonts.googleapis.com/css2?family=Inter');
styles.import('/theme.css', 'screen');
```

### Layer ordering

```ts
styles.layerOrder('reset', 'base', 'components', 'utilities');
styles.layer('reset', { '*': { margin: 0, padding: 0 } });
styles.layer('utilities', { '.text-center': { textAlign: 'center' } });
```

### Render to string (SSR / testing)

```ts
const css = styles.render();
// Use css in a <style> tag during SSR
```

### Inline-style resolution for native

```ts
// Resolve styles for an element with class="btn btn-primary"
const inline = styles.resolveClassStyles(['btn', 'btn-primary']);
// → { border: 'none', borderRadius: '999px', padding: '14px 18px', ... }
```

## Rules

- Use the singleton `import styles from '@elitjs/style'`. Calls accumulate into a shared store across modules.
- Call `inject(id)` **once** per app, typically inside `injectStyles()` exported from `src/styles.ts`. Multiple calls with different IDs duplicate the stylesheet.
- `addClass('foo', ...)` and `addClass('.foo', ...)` are equivalent — the `.` is optional. Same for `addId('#bar')`.
- `addPseudoClass('hover', { ... }, '.btn')` requires the base selector as the **third argument** (string with `.` prefix). Without the third arg, the pseudo applies globally.
- Keyframe step keys can be `'from'`, `'to'`, percentage strings (`'50%'`), or numbers (auto-converted to `%`).
- `media(type, condition, rules)` takes a `Record<string, Record<...>>` — selectors inside the media block. Use the helper variants (`mediaMinWidth('768px', {...})`) for terser calls.
- `mediaDark`/`mediaLight`/`mediaReducedMotion` use the user-preference media features (no type arg).
- For native rendering (Android/iOS/desktop native), prefer inline `style` objects on VNodes — native renderers understand inline styles directly. Use `resolveClassStyles()` only when bridging class-based styling.
- `styles.inject(id)` adds a `<style id="...">` to `document.head`. Calling it again with the same ID **will add another** `<style>` element — guard with a module-level boolean.

## Anti-Patterns

- `new CreateStyle()` per file. Use the singleton so styles accumulate into one sheet.
- Calling `inject()` repeatedly with different IDs — duplicates CSS in `<head>`.
- Mixing string CSS (`'color: red; padding: 4px'`) with object CSS. Pick one — the API only accepts objects.
- Forgetting the base selector in `addPseudoClass('hover', { ... })` — without a third arg, the rule becomes `:hover { ... }` which applies to every element.
- Using `addName`/`nesting` without understanding the BEM-like `&--` syntax. They emit `&--name` selectors, which only work inside a nesting-aware renderer. For most cases, use `addClass` with explicit selectors.
- Calling `clear()` in production code — it wipes the singleton's state. Reserve for tests.

## Validation

- `styles.render()` should produce a valid CSS string — check by logging or asserting in tests.
- After `styles.inject('my-app')`, `document.getElementById('my-app')` should return the `<style>` element.
- `styles.resolveClassStyles(['btn', 'btn-primary'])` should return an object with merged properties.
- For SSR, `styles.render()` works without `document` — but `inject()` requires a DOM.
