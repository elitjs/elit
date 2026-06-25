# elit/desktop — Window Control + IPC

All functions here are **runtime-injected globals**. The desktop shell injects them before your JS runs. The `elit/desktop` package re-exports them with TypeScript types — importing from `elit/desktop` gives you autocomplete, but the function reference is the same global.

**Detection:** `typeof globalThis.createWindow === 'function'` — true in desktop shell, false in browser/Node.

## Window Creation

### `createWindow(opts)`
Creates a new desktop window. Either `url` or `html` is required (mutually exclusive).

```ts
import { createWindow } from 'elit/desktop';

createWindow({
  title: 'My App',
  width: 1200,
  height: 800,
  center: true,
  html: '<h1>Hello</h1>'
});
```

For loading an external URL instead of inline HTML:

```ts
createWindow({
  url: 'https://example.com',
  title: 'Embedded'
});
```

**WindowOptions:**

| Field | Type | Purpose |
|---|---|---|
| `url` | `string` | URL to load (mutually exclusive with `html`) |
| `html` | `string` | HTML content to render |
| `title` | `string` | Window title |
| `width`, `height` | `number` | Window dimensions (px) |
| `x`, `y` | `number` | Window position (screen-relative) |
| `center` | `boolean` | Center on screen |
| `maximized` | `boolean` | Start maximized |
| `resizable` | `boolean` | Allow resizing |
| `decorations` | `boolean` | Show OS title bar / borders |
| `transparent` | `boolean` | Transparent background |
| `always_on_top` | `boolean` | Float above other windows |
| `minimizable`, `maximizable`, `closable` | `boolean` | OS chrome button visibility |
| `skip_taskbar` | `boolean` | Hide from taskbar |
| `icon` | `string` | Window icon path |
| `devtools` | `boolean` | Open devtools on start |
| `proxy_port` | `number` | IPC proxy port |
| `proxy_pipe` | `string` | Named pipe (Windows IPC) |
| `proxy_secret` | `string` | IPC auth secret |

### `createWindowServer(handler, opts?)`
Creates a window with an embedded HTTP server for IPC. Returns a handle with the bound port/pipe.

```ts
import { createWindowServer } from 'elit/desktop';

const result = await createWindowServer((req, res) => {
  if (req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ pong: true }));
  }
}, {
  port: 0,           // 0 = pick a free port
  exposePort: true,
  title: 'Worker'
});

console.log(result);
// networked: { port: 43211, host: '127.0.0.1', url: 'http://127.0.0.1:43211' }
// named pipe (Windows): { pipe: '\\\\.\\pipe\\elit-xyz' }
```

**ServeWindowOptions** extends `WindowOptions` (without `url`) with:
- `port?: number` — bind port (0 = auto)
- `exposePort?: boolean` — include in return value

## Window Control

### `windowMinimize()`
### `windowMaximize()`
### `windowUnmaximize()`
Minimize / maximize / restore the active window.

```ts
import { windowMinimize, windowMaximize, windowUnmaximize } from 'elit/desktop';

button({ onclick: () => windowMinimize() }, '_');
button({ onclick: () => windowMaximize() }, '[]');
button({ onclick: () => windowUnmaximize() }, '↘');
```

### `windowSetTitle(title)`
Updates the title bar text dynamically.

```ts
import { windowSetTitle } from 'elit/desktop';

windowSetTitle(`My App — ${document.title}`);
```

### `windowSetPosition(x, y)`
### `windowSetSize(w, h)`
Move/resize the window programmatically. Coordinates are screen-relative pixels.

```ts
windowSetPosition(100, 200);
windowSetSize(1024, 768);
```

### `windowSetAlwaysOnTop(value)`
Toggles "always on top" behavior.

```ts
windowSetAlwaysOnTop(true);   // pin
windowSetAlwaysOnTop(false);  // unpin
```

### `windowDrag()`
Initiates a window drag — call from `mousedown` on a custom title bar element. The OS takes over until `mouseup`.

```ts
div({
  class: 'titlebar',
  onmousedown: () => windowDrag()
}, '⠿ My App');
```

### `windowQuit()`
Closes all windows and terminates the app. Run cleanup BEFORE calling.

```ts
button({
  onclick: async () => {
    await saveState();
    windowQuit();
  }
}, 'Quit');
```

## IPC — Shell ↔ JS

### `onMessage(handler)`
Registers a single handler for messages from the native shell. Messages are STRINGS — JSON-encode structured data yourself.

```ts
import { onMessage } from 'elit/desktop';

onMessage((msg: string) => {
  try {
    const data = JSON.parse(msg);
    if (data.type === 'open-file') {
      openFile(data.path);
    }
  } catch (e) {
    console.error('bad message', e);
  }
});
```

Calling `onMessage` again replaces the previous handler — there's only one slot.

### `windowEval(code)`
Evaluates a JS string in the desktop window's main context. Use for debugging or injecting helpers from the shell side.

```ts
windowEval('document.body.classList.add("desktop")');
windowEval(`console.log("${Date.now()}")`);
```

**Don't interpolate user input** — code injection risk. JSON.stringify any dynamic values first.

## Common Patterns

### Custom title bar (frameless window)

```ts
// elit.config.ts → desktop
// desktop: { /* set decorations: false via createWindow */ }

// in app code
import { detectRenderRuntimeTarget, windowDrag, windowMinimize, windowMaximize, windowQuit } from 'elit/desktop';

const isDesktop = detectRenderRuntimeTarget() === 'desktop';

const TitleBar = () =>
  div({
    class: 'titlebar',
    onmousedown: isDesktop ? () => windowDrag() : undefined,
    style: 'display:flex; justify-content:space-between; padding:8px; -webkit-app-region:drag;'
  },
    span('My App'),
    div({ style: '-webkit-app-region:no-drag;' },
      button({ onclick: () => windowMinimize() }, '_'),
      button({ onclick: () => windowMaximize() }, '[]'),
      button({ onclick: () => windowQuit() }, 'X')
    )
  );
```

### Request/response IPC via createWindowServer

```ts
const { url } = await createWindowServer((req, res) => {
  if (req.url === '/open-file') {
    // shell requested we open a file
    openFilePicker().then(path => {
      res.writeHead(200);
      res.end(JSON.stringify({ path }));
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

// `url` is now the IPC endpoint — pass it to native code via bridge
```

### Detecting desktop at module scope (caution)

```ts
// SAFE — gate at call site
const isDesktop = typeof globalThis.createWindow === 'function';
button({ onclick: () => isDesktop && windowQuit() }, 'Quit');

// DANGEROUS — throws at import time in browser
if (typeof globalThis.createWindow === 'function') {
  // runs in desktop only
}
```

## Gotchas

- **All `window*` are synchronous** — they return immediately; the OS update is async. Don't `await` them.
- **`onMessage` has one slot** — re-calling replaces. For multiple subscribers, multiplex inside your handler.
- **`createWindow({ url, html })` together** — `html` wins silently (or vice versa, platform-dependent). Pick one.
- **`windowSetPosition`/`windowSetSize` on a maximized window** — no-op or inconsistent across platforms. Restore first.
- **`windowEval` with user-controlled strings** — code injection. JSON.stringify and embed via template literal carefully.
- **Calling `windowQuit()` without `await`-ing cleanup** — process exits before save completes.
- **`proxy_port` collisions** — if two windows share a port, the second fails silently. Use `port: 0` or unique ports.
