# elit/el — Element Factories

Element factories are functions that produce VNodes. Each HTML tag has a matching factory (`div`, `span`, `h1`, `button`, …). SVG factories are prefixed `svg*` and MathML factories `math*`.

## Factory Signature

```ts
type ElementFactory = (
  props?: Props | Child | null,
  ...rest: Child[]
) => VNode
```

The first argument is **props** if it's a plain object; otherwise it's treated as the first child. This is why `div('hello')` and `div({ class: 'box' }, 'hello')` both work.

```ts
import { div, p, h1, button, input, ul, li, a, section, header, nav, main, footer } from 'elit/el';

// props + children
div({ class: 'container', style: 'padding: 1rem' },
  h1('Welcome'),
  p({ class: 'lead' }, 'Lorem ipsum'),
  button({ onclick: () => alert('hi') }, 'Click me')
);

// children only
ul(
  li('Item 1'),
  li('Item 2'),
  li('Item 3')
);

// nested arrays are flattened
div(
  [1, 2, 3].map(n => li(`Item ${n}`))
);
```

## Props Shape

```ts
type Props = {
  class?: string;                          // CSS class (string)
  style?: string | Record<string, string>; // inline style
  onclick?: (e: MouseEvent) => void;       // any on* event handler
  [key: string]: any;                      // any other HTML attribute
};
```

Event handlers use the DOM-cased name: `onclick`, `oninput`, `onmouseover`, `onsubmit`.

```ts
input({
  type: 'email',
  placeholder: 'you@example.com',
  class: 'form-control',
  oninput: (e) => console.log((e.target as HTMLInputElement).value)
});
```

## Special Exports

### `frag(...children)`
Fragment — renders children without a wrapper element.

```ts
import { frag, h1, p } from 'elit/el';
const header = frag(h1('Title'), p('Subtitle'));
```

### `createElementFactory(tag)`
Lower-level helper. Use only when you need a tag Elit doesn't ship.

```ts
import { createElementFactory } from 'elit/el';
const customEl = createElementFactory('my-widget');
customEl({ someProp: 'x' }, 'content');
```

### `varElement(...)`
Factory for `<var>` element (the `var` keyword is reserved in JS, hence the renamed export).

## Tag Coverage (partial list)

| Category | Factories |
|---|---|
| Layout | `div`, `section`, `header`, `footer`, `main`, `nav`, `aside`, `article` |
| Headings | `h1`, `h2`, `h3`, `h4`, `h5`, `h6` |
| Text | `p`, `span`, `a`, `strong`, `em`, `b`, `i`, `u`, `small`, `mark`, `code`, `pre`, `blockquote`, `q`, `cite`, `br`, `hr` |
| Lists | `ul`, `ol`, `li`, `dl`, `dt`, `dd` |
| Forms | `form`, `input`, `textarea`, `button`, `select`, `option`, `optgroup`, `label`, `fieldset`, `legend`, `datalist` |
| Tables | `table`, `thead`, `tbody`, `tfoot`, `tr`, `td`, `th`, `caption`, `colgroup`, `col` |
| Media | `img`, `video`, `audio`, `source`, `picture`, `iframe`, `canvas`, `embed` |
| Meta (in SSR) | `html`, `head`, `body`, `title`, `meta`, `link`, `base`, `style`, `script` |
| SVG | `svgSvg`, `svgCircle`, `svgRect`, `svgPath`, `svgLine`, `svgG`, `svgText`, `svgDefs`, `svgLinearGradient`, `svgStop`, `svgUse`, `svgMask`, `svgFilter`, … |
| MathML | `mathMath`, `mathMi`, `mathMn`, `mathMo`, `mathFrac`, `mathSqrt`, … |

For the full SVG/MathML list, grep `src/client/el/` in the installed package source.

## Common Patterns

### Conditional children

```ts
div(
  showHeader && h1('Title'),
  items.map(item => li(item.name))
);
```

`false`, `null`, and `undefined` children render nothing.

### Spread props

```ts
const commonProps = { class: 'btn', tabindex: 0 };
button({ ...commonProps, onclick: handleClick }, 'Save');
```

### Style as string vs object

```ts
// both work
div({ style: 'padding: 1rem; background: #fff' }, '...');
div({ style: { padding: '1rem', background: '#fff' } }, '...');
```

## Gotchas

- **`class` not `className`** — Elit mirrors HTML attribute names, not React's DOM property names.
- **`onclick` not `onClick`** — same reason.
- **Self-closing tags** — `br()`, `hr()`, `img({ src })` are factories like any other; you don't need a special syntax.
- **`for` attribute on `<label>`** — works as-is; Elit passes through attribute names.
