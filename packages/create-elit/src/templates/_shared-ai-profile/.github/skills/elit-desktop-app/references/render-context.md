# elit/desktop — Render Context + Auto-Render

The render-context subsystem decides which renderer runs (browser DOM vs native), captures the VNode tree, and (for desktop) drives the auto-render pipeline that creates the window. Most apps don't touch this directly — but knowing it exists helps when debugging or building custom flows.

## Runtime Target Detection

### `detectRenderRuntimeTarget()`
Returns the current runtime target — `'web'`, `'desktop'`, `'mobile'`, or `'unknown'`.

```ts
import { detectRenderRuntimeTarget } from 'elit/desktop';

const target = detectRenderRuntimeTarget();

if (target === 'desktop') {
  // enable custom title bar, system tray, etc.
}
```

**Detection order:**
1. `__ELIT_RUNTIME_TARGET__` global (set explicitly via `setRenderRuntimeTarget`)
2. `ELIT_RUNTIME_TARGET` env var (Node-side only)
3. Feature detection — `typeof createWindow === 'function'` → `'desktop'`
4. `process.argv` inspection for `'desktop'` flag
5. Fallback: `'unknown'`

### `setRenderRuntimeTarget(target)`
Force-set the target. Returns the previous target (or `undefined`). Affects subsequent `detectRenderRuntimeTarget()` calls.

```ts
import { setRenderRuntimeTarget, detectRenderRuntimeTarget } from 'elit/desktop';

const previous = setRenderRuntimeTarget('desktop');
// ... code that runs differently based on target
setRenderRuntimeTarget(previous);   // restore
```

Use only for testing or for explicit override scenarios. In production, let feature detection do its job.

### `restoreRenderRuntimeTarget(target?)`
Restores a previously saved target, or clears the override when called with `undefined`.

```ts
const previous = setRenderRuntimeTarget('desktop');
// ... tests ...
restoreRenderRuntimeTarget(previous);
```

## Captured Render

The auto-render pipeline captures the VNode tree that `dom.render()` produced, so the shell can render it as native UI.

### `captureRenderedVNode(rootElement, vNode, target?)`
Stores the rendered VNode + target in a global slot. Called by the framework — app code rarely needs this.

```ts
import { captureRenderedVNode } from 'elit/desktop';

captureRenderedVNode('#app', vNode, 'desktop');
```

- Stores in `globalThis.__ELIT_CAPTURED_RENDER__`
- Subsequent calls overwrite — only one capture at a time

### `getCapturedRenderedVNode()`
Returns the captured state, or `undefined`.

```ts
import { getCapturedRenderedVNode } from 'elit/desktop';

const captured = getCapturedRenderedVNode();
if (captured?.target === 'desktop') {
  // proceed with native rendering
}
```

**CapturedRenderState shape:**
```ts
interface CapturedRenderState {
  rootElement: string | unknown;
  target: RenderRuntimeTarget;   // 'web' | 'desktop' | 'mobile' | 'unknown'
  vNode: VNode;
}
```

### `clearCapturedRenderedVNode()`
Empties the slot. Called by the framework after native render completes; call manually if you need to abort.

## Desktop Render Options

Configure the window that auto-render will create.

### `setDesktopRenderOptions(options)`
Merges with existing options. Stored in `globalThis.__ELIT_DESKTOP_RENDER_OPTIONS__`.

```ts
import { setDesktopRenderOptions } from 'elit/desktop';

setDesktopRenderOptions({
  title: 'My App',
  width: 1080,
  height: 720,
  center: true,
  autoClose: false,
  icon: '/path/to/icon.png'
});
```

**DesktopRenderOptions:**
| Field | Type | Purpose |
|---|---|---|
| `title` | `string` | Window title |
| `width`, `height` | `number` | Dimensions |
| `center` | `boolean` | Center on screen |
| `icon` | `string` | Icon path |
| `autoClose` | `boolean` | Close window after render (debugging) |
| `interactionOutput` | `DesktopInteractionOutputOptions` | Where to send interaction events |

### `getDesktopRenderOptions()`
Returns current options, or `undefined`.

```ts
const opts = getDesktopRenderOptions();
console.log(opts?.title);
```

### `clearDesktopRenderOptions()`
Clears the stored options. Use when re-initializing between sessions.

## Auto-Render Entry Points

### `completeDesktopAutoRender(options?)`
Final step of the auto-render pipeline. Generates HTML from the captured VNode, installs the message handler, and calls `createWindow()`.

```ts
import { completeDesktopAutoRender } from 'elit/desktop';

completeDesktopAutoRender({
  title: 'My App',
  width: 1200,
  height: 800
});
```

Called by the framework after `dom.render()` completes. You don't invoke this directly unless you're building a custom render flow.

### `installDesktopRenderTracking()`
Wraps `createWindow` to detect when a window is created. Sets `__ELIT_DESKTOP_WINDOW_CREATED__` flag. Useful in tests to assert a window was opened.

```ts
import { installDesktopRenderTracking } from 'elit/desktop';

installDesktopRenderTracking();
// ... trigger render ...
// globalThis.__ELIT_DESKTOP_WINDOW_CREATED__ === true
```

## Global Scope Keys

The desktop subsystem uses these globals on `globalThis`:

| Key | Set by | Purpose |
|---|---|---|
| `__ELIT_RUNTIME_TARGET__` | `setRenderRuntimeTarget` | Explicit target override |
| `__ELIT_CAPTURED_RENDER__` | `captureRenderedVNode` | VNode tree for native render |
| `__ELIT_DESKTOP_RENDER_OPTIONS__` | `setDesktopRenderOptions` | Window creation config |
| `__ELIT_DESKTOP_RENDER_TRACKED__` | `installDesktopRenderTracking` | Tracking installed |
| `__ELIT_DESKTOP_WINDOW_CREATED__` | `createWindow` (wrapped) | Window created flag |
| `__ELIT_DESKTOP_MESSAGE_HANDLER__` | `onMessage` | Message handler installed |

Read these for diagnostics — don't write to them directly.

## Common Patterns

### Conditional desktop features

```ts
import { detectRenderRuntimeTarget } from 'elit/desktop';

const isDesktop = detectRenderRuntimeTarget() === 'desktop';

const App = () =>
  div(
    isDesktop && CustomTitleBar(),
    main(PageContent())
  );
```

### Pre-configuring the window before render

```ts
// src/main.ts
import { setDesktopRenderOptions, detectRenderRuntimeTarget } from 'elit/desktop';
import { dom } from 'elit/dom';

if (detectRenderRuntimeTarget() === 'desktop') {
  setDesktopRenderOptions({
    title: `My App v${APP_VERSION}`,
    width: 1080,
    height: 720,
    center: true
  });
}

dom.render('#app', App());
```

### Testing the desktop flow

```ts
import {
  setRenderRuntimeTarget,
  installDesktopRenderTracking,
  detectRenderRuntimeTarget
} from 'elit/desktop';

test('creates window in desktop mode', () => {
  setRenderRuntimeTarget('desktop');
  installDesktopRenderTracking();

  renderApp();

  expect(globalThis.__ELIT_DESKTOP_WINDOW_CREATED__).toBe(true);
  expect(detectRenderRuntimeTarget()).toBe('desktop');
});
```

## Gotchas

- **Setting options AFTER `dom.render()`** — too late. Auto-render reads options during render.
- **Multiple `captureRenderedVNode` calls** — each overwrites. Don't try to queue multiple captures.
- **`setRenderRuntimeTarget` in production** — usually wrong. Feature detection handles real environments.
- **Forgetting to `clearCapturedRenderedVNode()` on error** — stale state persists; subsequent renders see the wrong tree.
- **`__ELIT_*` globals leaking across tests** — clear them in `afterEach` to avoid test pollution.
- **`autoClose: true` in production** — closes the window immediately after render. Use only for snapshot testing.
