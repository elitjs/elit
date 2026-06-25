---
name: elit-desktop-app
description: 'Work on desktop shell behavior in this Elit app — window control, IPC messages, runtime-target detection, and the auto-render pipeline. Use when editing window lifecycle code, custom title bars, desktop-only features gated on `isDesktop()`, or `elit/desktop` imports.'
argument-hint: 'Describe the window, IPC, or desktop-detection change.'
user-invocable: true
---

# Elit Desktop App

Use this skill when the task belongs to the desktop shell surface: window control (create/minimize/maximize/drag/quit), IPC between JS and the native shell, runtime-target detection, and the auto-render pipeline that turns a VNode tree into a native desktop window.

## Route The Task First

1. Window control (`createWindow`, `windowMinimize`, `windowSetTitle`, `windowDrag`, `windowQuit`, …) → runtime-injected globals, see `references/window-api.md`
2. JS ↔ shell messaging (`onMessage`, `windowEval`) → see `references/window-api.md`
3. Runtime-target detection (`detectRenderRuntimeTarget`, `isDesktop`) → see `references/render-context.md`
4. Auto-render flow (`captureRenderedVNode`, `completeDesktopAutoRender`, `setDesktopRenderOptions`) → see `references/render-context.md`
5. Desktop build config (`desktop` section in `elit.config.ts`) → `elit-runtime-app` skill

## Public API Surface

`elit/desktop` re-exports the runtime-injected globals with TypeScript declarations. The desktop shell injects them before your JS runs — they are NOT available in pure-browser or pure-server contexts.

```ts
import {
  createWindow, createWindowServer, windowEval, onMessage,
  windowMinimize, windowMaximize, windowUnmaximize,
  windowSetTitle, windowDrag, windowSetPosition, windowSetSize,
  windowSetAlwaysOnTop, windowQuit,
  detectRenderRuntimeTarget, setRenderRuntimeTarget,
  captureRenderedVNode, completeDesktopAutoRender,
  setDesktopRenderOptions, getDesktopRenderOptions
} from 'elit/desktop';
```

## Detecting the Desktop Runtime

Three equivalent checks:

```ts
import { detectRenderRuntimeTarget } from 'elit/desktop';

// Method 1 — explicit API
const target = detectRenderRuntimeTarget();   // 'web' | 'desktop' | 'mobile' | 'unknown'
const isDesktop = target === 'desktop';

// Method 2 — global check (no import)
const isDesktop = typeof globalThis.createWindow === 'function';

// Method 3 — env var (Node-side code only)
const isDesktop = process.env.ELIT_RUNTIME_TARGET === 'desktop';
```

Always gate desktop-only calls behind one of these — calling `windowMinimize()` in a browser throws.

## Window Lifecycle Pattern

```ts
// src/main.ts (or a desktop-only module)
import {
  detectRenderRuntimeTarget,
  windowMinimize, windowMaximize, windowQuit, windowSetTitle, windowDrag
} from 'elit/desktop';

const isDesktop = detectRenderRuntimeTarget() === 'desktop';

export const TitleBar = () =>
  div({ class: 'titlebar', onmousedown: isDesktop ? () => windowDrag() : undefined },
    span('My App'),
    div({ class: 'titlebar-buttons' },
      button({ onclick: () => isDesktop && windowMinimize() }, '_'),
      button({ onclick: () => isDesktop && windowMaximize() }, '[]'),
      button({ onclick: () => isDesktop && windowQuit() }, 'X')
    )
  );
```

## Auto-Render Pipeline

For most apps you don't call `createWindow` manually — Elit's auto-render does it:

1. `dom.render('#app', App())` runs as normal.
2. Framework calls `captureRenderedVNode('#app', vNode, 'desktop')` internally.
3. After render, `completeDesktopAutoRender(options)` generates HTML from the captured VNode.
4. The shell calls `createWindow({ html, ...options })` — the window appears.

You configure window options via `setDesktopRenderOptions(...)`:

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

Call this BEFORE `dom.render(...)` so the options are set before the window is created.

## IPC: JS ↔ Shell Messages

```ts
import { onMessage } from 'elit/desktop';

// Receive messages from the native shell
onMessage((msg: string) => {
  const data = JSON.parse(msg);
  console.log('shell says:', data);
});

// Send messages back — typically via windowEval or a custom protocol
// (no built-in sendMessage; use createWindowServer for bidirectional IPC)
```

For request/response IPC, use `createWindowServer`:

```ts
import { createWindowServer } from 'elit/desktop';

const { port } = await createWindowServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true }));
  }
}, { port: 0, exposePort: true });

console.log('IPC server on', port);
```

## High-Risk Areas

- **Calling `window*` APIs in a browser context** — throws. Always gate with `detectRenderRuntimeTarget()`.
- **Forgetting to gate the `onmousedown: () => windowDrag()`** — works in desktop, throws in browser.
- **Calling `setDesktopRenderOptions()` AFTER `dom.render()`** — too late; window is already created with defaults.
- **Mixing `url` and `html` in `WindowOptions`** — they're mutually exclusive; one wins silently.
- **Assuming `windowQuit()` triggers cleanup** — it closes all windows immediately. Run cleanup BEFORE calling it.
- **`createWindowServer` on a fixed `port`** — fails if port is taken. Use `port: 0` for a random free port.
- **Treating `onMessage` payloads as objects** — they're strings. JSON.parse first.

## SSR / Build Considerations

- Server-side code (`src/server.ts`) cannot use `elit/desktop` — it's runtime-injected by the desktop shell, which doesn't run server-side.
- Code-split desktop-only modules so the browser bundle doesn't try to evaluate them at import time. Use dynamic `import()` gated by `detectRenderRuntimeTarget()`.
- Tree-shaking does NOT remove `elit/desktop` imports automatically — they're side-effectful (augment `globalThis`).

## Validation

1. `npm run typecheck` — desktop types are declared via `elit/desktop`.
2. `npm run dev` — verify the app works in browser (gates should hide desktop-only features).
3. `npm run desktop:run` — verify in the actual desktop shell. Check window title, size, custom title bar.
4. `npm run desktop:build` — produces a platform binary; run it standalone and verify the same behavior.
5. Test IPC: send a message from the shell to your `onMessage` handler and confirm receipt.

## References

**Detailed API references (next to this skill file):**
- `references/window-api.md` — `createWindow`, `createWindowServer`, all `window*` control functions, `onMessage`, `windowEval`, `WindowOptions`, `ServeWindowOptions`
- `references/render-context.md` — `detectRenderRuntimeTarget`, `setRenderRuntimeTarget`, `captureRenderedVNode`, `completeDesktopAutoRender`, `setDesktopRenderOptions`, `DesktopRenderOptions`, `CapturedRenderState`

**In this project:**
- `src/main.ts` — where you'd add a desktop-detection gate or import `elit/desktop`
- `src/desktop-titlebar.ts` (if present) — custom title bar pattern
- `elit.config.ts` → `desktop` section — see `elit-runtime-app` skill

**Installed type definitions:**
- `node_modules/elit/dist/desktop.d.ts` — full desktop API surface

**External docs:**
- Desktop config reference: https://d-osc.github.io/elit/CONFIG.md#desktop
- CLI commands (`elit desktop run/build/wapk`): https://d-osc.github.io/elit/CLI.md
- GitHub repo (browse `src/desktop/`): https://github.com/d-osc/elit

**Related skills:**
- `elit-client-app` — the VNode tree rendered to desktop is the same as the browser tree; most UI code is shared
- `elit-runtime-app` — `desktop` config section (`mode`, `entry`, `runtime`, `compiler`, `outDir`, `platform`, `native.entry`)
- `elit-native-app` — when `desktop.mode: 'native'` and you have `desktop.native.entry` that generates native code instead of bundling web
