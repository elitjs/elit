# elit/native — Styling, State, and Interactions

Native rendering uses a **CSS subset** with the same `style={...}` prop syntax and the same `createStyles()` instance you use in the browser. The renderer translates each property to native equivalents (Compose modifiers, SwiftUI view modifiers).

## Supported CSS Properties

### Layout (flexbox)

| Property | Values | Native equivalent |
|---|---|---|
| `display` | `flex`, `none` | `Row`/`Column` (Compose), `HStack`/`VStack` (SwiftUI); `none` → hidden |
| `flex-direction` | `row`, `column`, `row-reverse`, `column-reverse` | Layout container choice |
| `justify-content` | `flex-start`, `center`, `flex-end`, `space-between`, `space-around`, `space-evenly` | `Arrangement.Horizontal/Vertical` (Compose), alignment guides (SwiftUI) |
| `align-items` | `stretch`, `flex-start`, `center`, `flex-end`, `baseline` | Cross-axis alignment |
| `align-self` | (same values) | Per-item override |
| `flex-wrap` | `nowrap`, `wrap` | `FlowRow`/`FlowColumn` (Compose), `LazyVGrid` (SwiftUI) |
| `gap` / `row-gap` / `column-gap` | length | `Arrangement.spacedBy()` (Compose), spacing (SwiftUI) |
| `flex`, `flex-grow`, `flex-shrink`, `flex-basis` | number / length | Weight modifiers |

### Layout (grid)

| Property | Values | Native equivalent |
|---|---|---|
| `display: grid` | | `LazyVerticalGrid` (Compose), `LazyVGrid` (SwiftUI) |
| `grid-template-columns` | track list (`repeat(3, 1fr)`, `1fr 2fr`) | Column count/size |
| `grid-template-rows` | track list | Row count/size |
| `grid-gap` / `grid-column-gap` / `grid-row-gap` | length | Spacing |
| `grid-template-areas` | string template (partial support) | May degrade; test on device |
| `grid-column` / `grid-row` | `span N` | Span |

### Sizing

| Property | Values |
|---|---|
| `width`, `height` | length, `auto`, `100%`, `100vw`/`100vh` (scaled) |
| `max-width`, `max-height` | length |
| `min-width`, `min-height` | length |
| `aspect-ratio` | number (`16/9`, `1.5`) |

### Position

| Property | Values |
|---|---|
| `position` | `relative`, `absolute` |
| `top`, `right`, `bottom`, `left` | length |

`position: fixed` falls back to `absolute`.

### Spacing

| Property | Values |
|---|---|
| `margin` | length or shorthand (`8px 16px`) |
| `margin-top`, `-right`, `-bottom`, `-left` | length |
| `padding` | length or shorthand |
| `padding-top`, `-right`, `-bottom`, `-left` | length |

### Typography

| Property | Values |
|---|---|
| `font-family` | family name (substituted via `resolveNativeFontFamily`) |
| `font-size` | length |
| `font-weight` | `100`..`900`, `normal`, `bold` |
| `font-style` | `normal`, `italic` |
| `line-height` | number or length |
| `text-align` | `left`, `right`, `center`, `justify` |
| `text-transform` | `none`, `uppercase`, `lowercase`, `capitalize` |
| `text-decoration` | `none`, `underline`, `line-through` |
| `letter-spacing` | length |
| `color` | color value |
| `white-space` | `normal`, `nowrap` |

### Color + Background

| Property | Values |
|---|---|
| `color` | hex, `rgb()`, `rgba()`, named |
| `background` | shorthand — limited support |
| `background-color` | color value |
| `background-image` | `url(...)` (local file paths), `linear-gradient(...)` |
| `background-position` | keywords / length |
| `background-size` | `cover`, `contain`, length |
| `background-repeat` | `no-repeat` (other values have no native equivalent) |

**Color resolution:**
- Hex (`#fff`, `#ffffff`, `#ffffffff`) → `{ red, green, blue, alpha }` 0–1 floats
- `rgb(r, g, b)` / `rgba(r, g, b, a)` → same
- Named colors (`red`, `rebeccapurple`, …) → resolved via CSS color table
- `currentColor` → resolves against parent `color`

**Gradient resolution:**
- `linear-gradient(45deg, red, blue)` → `NativeGradientValue` with angle + stops

### Border

| Property | Values |
|---|---|
| `border` | shorthand — partial support |
| `border-width` / `border-top-width` etc. | length |
| `border-style` | `solid`, `dashed`, `dotted`, `none` |
| `border-color` | color |
| `border-radius` | length or shorthand (`8px 8px 0 0`) |
| `border-top-left-radius` etc. | length |

### Visual Effects

| Property | Values | Native equivalent |
|---|---|---|
| `opacity` | `0`–`1` | `Modifier.alpha` (Compose), `.opacity` (SwiftUI) |
| `box-shadow` | `0 2px 4px rgba(0,0,0,.2)` | Compose: elevation; SwiftUI: `.shadow` modifier |
| `overflow` | `hidden`, `visible`, `scroll` | Clip behavior |
| `z-index` | integer | Draw order (limited support) |
| `transform` | `translate()`, `rotate()`, `scale()` | Native transform modifiers |
| `transition` | (ignored) | Use native animation APIs |

## Units

| Unit | Handling |
|---|---|
| `px` | Primary unit. Scaled via `getNativeStyleResolveOptions(platform)` — 1px ≈ 1dp on Android, ≈1pt on iOS |
| `dp` | Android-specific density-independent pixel |
| `sp` | Android-specific scaled pixel (for fonts) |
| `%` | Relative to parent dimension |
| `em`, `rem` | Scaled against parent/root font size — use `px` for predictable results |
| `vh`, `vw` | Viewport-relative — best-effort scaling |
| `pt` | Treated as 1.33× px (CSS standard) |

## State + Bindings

State works exactly like the browser surface — same `createState`, `computed`, `effect` from `elit/state`. The native renderer detects bindings via the `ELIT_NATIVE_BINDING` symbol that `bindValue`/`bindChecked` attach.

### Two-way bindings (recommended for forms)

```ts
import { createState, bindValue, bindChecked } from 'elit/state';
import { div, input, label } from 'elit/el';

export const screen = () => {
  const name = createState('');
  const agreed = createState(false);

  return div(
    input({ type: 'text', ...bindValue(name) }),
    label(
      input({ type: 'checkbox', ...bindChecked(agreed) }),
      'I agree'
    )
  );
};
```

**What gets generated:**
- `NativeStateDescriptor` entries for `name` (string) and `agreed` (boolean)
- Compose: `var name by remember { mutableStateOf("") }` / `var agreed by remember { mutableStateOf(false) }`
- SwiftUI: `@State private var name: String = ""` / `@State private var agreed: Bool = false`
- Binding: `TextField(value = name, onValueChange = { name = it })` (Compose), `TextField(text: $name)` (SwiftUI)

### One-way display

For showing a state value without binding back to user input, use `reactive(...)` just like the browser:

```ts
import { reactive } from 'elit/state';

const count = createState(0);

return div(
  reactive(count, n => h1(`Count: ${n}`)),
  button({ onClick: () => count.value++ }, 'Increment')
);
```

### Computed state

```ts
import { computed } from 'elit/state';

const count = createState(0);
const doubled = computed({ count }, ({ count }) => count * 2);

return div(
  reactive(doubled, d => p(`Doubled: ${d}`))
);
```

Computed values render but don't generate native `@State` — they're inlined at codegen time.

## Interactions + Events

Event handler props map to native events:

| Handler prop | Native event |
|---|---|
| `onClick` / `onclick` | `press` |
| `onChange` / `onchange` | `change` |
| `onInput` / `oninput` | `input` |
| `onSubmit` / `onsubmit` | `submit` |
| `onFocus` / `onfocus` | `focus` |
| `onBlur` / `onblur` | `blur` |

Use the camelCase `onClick` form — it matches the rest of the Elit API.

```ts
button({ onClick: () => counter.value++ }, 'Increment');
input({
  type: 'text',
  onInput: (e) => name.value = (e.target as any).value
});
```

### Accessibility

These props are honored by native codegen and produce platform accessibility modifiers:

| Prop | Native equivalent |
|---|---|
| `aria-label` | `Modifier.semantics { contentDescription = ... }` (Compose), `.accessibilityLabel(...)` (SwiftUI) |
| `aria-hint` | Hint text |
| `aria-role` | `button`, `link`, `image`, `header` mapping |
| `aria-disabled` | Disabled state |
| `alt` (on images) | Auto-promoted to accessibility label |

Auto-generated labels cover images without `alt` and inputs without `aria-label`.

## Limitations + Gotchas

- **No inline `<style>` or CSS files** — only `style={...}` props and `createStyles()`.
- **`@media` queries** — partially supported via `desktopStyleVariants` for desktop-native; on mobile, design separate layouts per screen size.
- **`@keyframes` animations** — ignored. Use native animation APIs (`animateFloatAsState`, `.animation`) in generated code or escape hatches.
- **`cursor`** — desktop-native only; ignored on mobile.
- **`backdrop-filter`** — not supported.
- **`mask-image`** — not supported.
- **`overflow: scroll`** — works, but list virtualization requires using `ul`/`ol` (maps to `LazyColumn`/`List`) rather than nested `div`s.
- **`:hover`, `:focus`, `:active` pseudo-classes** — desktop-native only; on mobile they're no-ops.
- **Multi-line text via `\n`** — render as separate `Text`/`p` nodes for predictable results.
- **Custom fonts** — declare them in native project (Android: `res/font/`, iOS: Info.plist), then reference by family name in `font-family`.
- **`box-shadow` values aren't 1:1** — Android uses elevation (single z-value); iOS uses `.shadow(color, radius, x, y)`. Tune per-platform if shadows matter.
- **Inline `style` vs `class` from `createStyles()`** — both work; `class` resolves via `styles.resolveClassStyles()` at codegen time.
- **State declared at module scope** — works but generates one global state. Usually wrong; declare inside the screen function.
