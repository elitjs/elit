---
name: elit-ref-native-desktop
description: 'API reference for @elitjs/native (renderNativeTree, renderNativeJson, renderAndroidCompose, renderSwiftUI, materializeNativeTree, renderMaterializedNativeTree, renderMaterializedNativeJson + NativePlatform/Tree/Node types) and @elitjs/desktop (createWindow, createWindowServer, windowEval, onMessage, windowMinimize/Maximize/Unmaximize, windowSetTitle, windowDrag, windowSetPosition, windowSetSize, windowSetAlwaysOnTop, windowQuit + WindowOptions/ServeWindowOptions/DesktopRuntimeName). Use for exact signatures.'
argument-hint: 'Describe the native target (Android/iOS/desktop native), window behavior, or runtime rendering flow.'
user-invocable: true
---

# @elitjs/native and @elitjs/desktop Reference

Two related packages:

- **`@elitjs/native`** — Transforms an Elit VNode tree into a runtime-agnostic `NativeTree`, or emits Android (Jetpack Compose) / iOS (SwiftUI) source code.
- **`@elitjs/desktop`** — Runtime API for desktop windows (only available inside the desktop process). Globals are declared on `window`/global; exports are the same functions.

## @elitjs/native — exports

```ts
function renderNativeTree(input: Child, options?: NativeTransformOptions): NativeTree;
function renderNativeJson(input: Child, options?: NativeTransformOptions): string;
function renderAndroidCompose(input: Child, options?: AndroidComposeOptions): string;
function renderSwiftUI(input: Child, options?: SwiftUIOptions): string;
function materializeNativeTree(tree: NativeTree, styleResolveOptions?: NativeStyleResolveOptions): NativeTree;
function renderMaterializedNativeTree(input: Child, options?: NativeTransformOptions): NativeTree;
function renderMaterializedNativeJson(input: Child, options?: NativeTransformOptions): string;
```

### Type reference

```ts
type NativePlatform = 'android' | 'ios' | 'generic';

interface NativeTransformOptions {
  platform?: NativePlatform;            // default 'generic'
  // (other internal options omitted — pass nothing for defaults)
}

interface NativeTree {
  platform: NativePlatform;
  roots: NativeNode[];
}

type NativeNode = NativeElementNode | NativeTextNode;

interface NativeElementNode {
  kind: 'element';
  tag: string;                          // 'view', 'text', 'button', 'input', ...
  props: NativePropObject;
  children: NativeNode[];
}

interface NativeTextNode {
  kind: 'text';
  text: string;
}

type NativePropValue = NativePropScalar | NativePropObject | NativePropValue[];
type NativePropScalar = string | number | boolean | null;
interface NativePropObject { [key: string]: NativePropValue }

interface NativeResolvedStyleMap extends Map<NativeElementNode, Record<string, NativePropValue>> {}
interface NativeStyleContextMap extends Map<NativeElementNode, any> {}

interface AndroidComposeOptions {
  packageName: string;                  // e.g. 'com.example.app'
  functionName?: string;                // default 'ElitScreen'
  includePreview?: boolean;             // default true
  imports?: string[];
}

interface SwiftUIOptions {
  structName?: string;                  // default 'ElitScreen'
  includePreview?: boolean;             // default true
}

interface NativeStyleResolveOptions { /* internal */ }
```

## @elitjs/desktop — exports

```ts
type DesktopRuntimeName = 'quickjs' | 'bun' | 'node' | 'deno';

interface WindowOptions {
  url?: string;                          // mutually exclusive with html
  html?: string;                         // raw HTML body
  title?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  center?: boolean;
  maximized?: boolean;
  resizable?: boolean;
  decorations?: boolean;
  transparent?: boolean;
  always_on_top?: boolean;
  minimizable?: boolean;
  maximizable?: boolean;
  closable?: boolean;
  skip_taskbar?: boolean;
  icon?: string;
  devtools?: boolean;
  proxy_port?: number;
  proxy_pipe?: string;
  proxy_secret?: string;
}

interface ServeWindowOptions extends Omit<WindowOptions, 'url'> {
  port?: number;
  exposePort?: boolean;
}

interface ServeWindowResultExposed { port: number; host: string; url: string }
interface ServeWindowResultPipe  { pipe: string }
type ServeWindowResult = ServeWindowResultExposed | ServeWindowResultPipe;

// Window control
function createWindow(opts: WindowOptions): void;
function createWindowServer(
  app: (req: any, res: any) => void,
  opts?: ServeWindowOptions
): Promise<ServeWindowResult>;

// Messaging
function onMessage(handler: (msg: string) => void): void;
function windowEval(code: string): void;

// State / position
function windowMinimize(): void;
function windowMaximize(): void;
function windowUnmaximize(): void;
function windowSetTitle(title: string): void;
function windowDrag(): void;
function windowSetPosition(x: number, y: number): void;
function windowSetSize(w: number, h: number): void;
function windowSetAlwaysOnTop(value: boolean): void;
function windowQuit(): void;
```

Inside the desktop runtime, all of these are also **global functions** (declared on the global scope). Either import them or use as globals.

## Patterns

### Build a VNode tree once, render to many runtimes

```ts
import { el } from '@elitjs/el';
import { renderNativeTree, renderAndroidCompose, renderSwiftUI } from '@elitjs/native';

const App = el('view', {},
  el('text', {}, 'Hello native'),
  el('button', { onClick: () => {} }, 'Tap')
);

const tree = renderNativeTree(App, { platform: 'generic' });
// tree.roots is runtime-agnostic — feed it to Android, iOS, or desktop native
```

### Emit Android Compose source

```ts
import { renderAndroidCompose } from '@elitjs/native';

const compose = renderAndroidCompose(App, {
  packageName: 'com.example.generated',
  functionName: 'HomeScreen',
  includePreview: true
});
// compose is a Kotlin source string ready to write to a .kt file
```

### Emit SwiftUI source

```ts
import { renderSwiftUI } from '@elitjs/native';

const swift = renderSwiftUI(App, {
  structName: 'HomeScreen',
  includePreview: true
});
// swift is a Swift source string ready to write to a .swift file
```

### Materialize styles into the tree

`materializeNativeTree()` walks the tree and resolves class-based styles into inline `style` objects on each element. Use it before handing the tree to a renderer that doesn't know about CSS classes (e.g. a custom native renderer):

```ts
import { renderNativeTree, materializeNativeTree, renderMaterializedNativeJson } from '@elitjs/native';

const tree = renderNativeTree(App, { platform: 'generic' });
const materialized = materializeNativeTree(tree);    // classes → inline styles
const json = renderMaterializedNativeJson(App);       // one-shot helper
```

### Desktop window — minimal

```ts
import { createWindow, onMessage, windowSetTitle, windowQuit } from '@elitjs/desktop';

onMessage((msg) => {
  if (msg === 'ready') {
    windowSetTitle('My App');
  }
  if (msg === 'quit') {
    windowQuit();
  }
});

createWindow({
  title: 'My App',
  width: 960,
  height: 640,
  icon: './public/favicon.svg',
  html: `<!doctype html><html><body>
    <main id="app"></main>
    <script>
      window.addEventListener('DOMContentLoaded', () => {
        window.ipc.postMessage('ready');
      });
    </script>
  </body></html>`
});
```

### Desktop window — control state

```ts
import {
  windowMinimize, windowMaximize, windowUnmaximize,
  windowSetSize, windowSetPosition, windowDrag, windowSetAlwaysOnTop
} from '@elitjs/desktop';

windowMaximize();
windowUnmaximize();
windowSetSize(800, 600);
windowSetPosition(100, 100);
windowDrag();
windowSetAlwaysOnTop(true);
```

### Desktop window — `url` mode

```ts
createWindow({
  url: 'http://localhost:3000',     // load an existing dev server
  title: 'My App',
  width: 1024,
  height: 768
});
```

### Evaluate JS inside the window

```ts
windowEval(`document.title = 'Updated';`);
```

### Create a desktop window server

```ts
import { createWindowServer } from '@elitjs/desktop';
import { ServerRouter, json } from '@elitjs/server';

const router = new ServerRouter();
router.get('/api/hello', (ctx) => json(ctx.res, { ok: true }));

await createWindowServer(
  (req, res) => router.handle(req, res),
  { port: 0, exposePort: true }     // 0 = pick a free port
);
// Result: { port, host, url } or { pipe } on Windows
```

## CLI shortcuts

```bash
# Generate native source from a single file
npx elit native generate android ./src/native-screen.ts --name HomeScreen --package com.example.app
npx elit native generate ios   ./src/native-screen.ts --out ./ios/HomeScreen.swift
npx elit native generate ir    ./src/native-screen.ts --platform android --export screen

# Run desktop
npx elit desktop ./src/main.ts                       # hybrid mode
npx elit desktop ./src/main.ts --mode native         # native renderer

# Mobile sync (regenerates source on file change)
npx elit mobile sync
npx elit mobile doctor                               # toolchain check
npx elit mobile run                                  # boots emulator/simulator
```

## Config wiring (`elit.config.ts`)

```ts
export default {
  mobile: {
    appId: 'com.example.app',
    appName: 'Example',
    webDir: 'dist',
    mode: 'hybrid',                  // or 'native' or 'webview'
    native: {
      entry: './src/mobile.ts',      // or './src/native-screen.ts'
      exportName: 'screen',
      ios: { enabled: false }
    }
  },
  desktop: {
    compiler: 'auto',                // 'auto' | 'none' | 'esbuild' | 'tsx' | 'tsup'
    entry: './src/main.ts',
    mode: 'hybrid',                  // or 'native'
    outDir: './desktop-dist',
    runtime: 'quickjs'               // 'quickjs' | 'node' | 'bun' | 'deno'
  }
};
```

`mobile.mode: 'native'` requires `mobile.native.entry` and switches the Android/iOS host to generated native UI. `mobile.mode: 'hybrid'` ships the WebView + your `webDir` build.

## Rules

- Build the VNode tree with `@elitjs/el` factories once. Don't fork per runtime — that's the whole point.
- The native CSS subset supports typography, spacing, gradients, shadows, flex and simple grid layouts, `currentColor`, named colors, and per-side borders. Not all browser CSS translates — keep expectations modest.
- For desktop native, Cargo (Rust toolchain) is required the first time the native runtime builds.
- WAPK archives sync file changes back into the same `.wapk` archive by default. Use `--watcher` for event-driven sync or `--sync-interval <ms>` for polling.
- Locked WAPK archives stay encrypted when sync writes back. Pass `--password` consistently.
- For desktop windows, pass either `url` or `html` — never both.
- `window.ipc.postMessage('...')` is the channel from the page to the desktop runtime. `onMessage(...)` is the receiving end.
- The desktop runtime globals (`createWindow`, `windowQuit`, etc.) are only defined inside the desktop process. Importing them in browser or server code is fine (the imports are no-ops outside desktop), but calling them will throw at runtime.

## Anti-Patterns

- Mixing browser globals (`document`, `window.localStorage`, `window.fetch`) into the shared native tree. They won't exist on Android/iOS native runtimes. Use `onMessage` only inside the desktop runtime.
- Editing generated `ElitGeneratedScreen.kt` or `.swift` by hand. Re-running `sync` overwrites them — edit the source VNode tree instead.
- Treating `elit mobile run` as a browser preview. It boots a real Android emulator or iOS simulator — run `elit mobile doctor` first.
- Calling `renderAndroidCompose` with a VNode that uses unsupported tags. The renderer covers a practical subset; check the generated source rather than expecting every HTML element to map.
- Using `windowEval` to inject business logic. It's a power tool for one-off bridge calls; don't substitute it for proper IPC messages.
- Setting `mobile.mode: 'native'` without providing `mobile.native.entry`. The build will fail to find the source.

## Validation

- `npx elit native generate android ./src/screen.ts` should print the Compose source to stdout (or write the configured output file).
- `npx elit mobile doctor --json` validates the local mobile toolchain before build/run.
- `npx elit desktop ./src/main.ts` boots the desktop shell. Use `--mode native` to exercise the native renderer.
- `npx elit wapk inspect ./app.wapk` lists archive contents (or reports locked status).
- For shared VNode rendering, `renderNativeTree(App, { platform: 'generic' })` should always succeed without runtime errors — even if specific tags don't translate to a given native target.
