---
name: elit-native-desktop
description: 'Generate native Android (Jetpack Compose), iOS (SwiftUI), and desktop UI from the same Elit.js VNode tree with @elitjs/native and @elitjs/desktop. Use when targeting mobile, native desktop mode, or running WAPK apps.'
argument-hint: 'Describe the native target, desktop window, or WAPK runtime behavior to add.'
user-invocable: true
---

# Elit.js Native And Desktop

Use this skill when the task targets Android, iOS, native desktop, or packaged (WAPK) runtimes from an app that already has a working browser tree.

## What Matters First

- One VNode tree, many runtimes. Build the UI with `@elitjs/el` factories once, then emit native output with `@elitjs/native`.
- `renderNativeTree(node, { platform })` returns a runtime-agnostic `NativeTree`. Hand it to Android, iOS, or desktop runtimes.
- `renderAndroidCompose(node, { packageName, functionName })` and `renderSwiftUI(node, { structName })` emit source files.
- Desktop mode has two flavors: **hybrid** (WebView shell) and **native** (shared native tree rendered by the dedicated runtime). `desktop.mode` picks which one runs.
- WAPK (`.wapk`) is a packaged app archive — useful for shipping or running detached via `elit pm`.

## Imports

- `@elitjs/native` — `renderNativeTree`, `renderNativeJson`, `renderAndroidCompose`, `renderSwiftUI`.
- `@elitjs/desktop` — `createWindow`, `createWindowServer`, `onMessage`, `windowQuit`, `windowSetTitle`, `windowEval`.

## Patterns

### Render a shared native tree

```ts
import { el } from '@elitjs/el';
import { renderNativeTree } from '@elitjs/native';

const App = el('view', {},
    el('text', {}, 'Hello native'),
    el('button', { onPress: () => {} }, 'Tap'),
);

const tree = renderNativeTree(App, { platform: 'generic' });
// tree.roots is runtime-agnostic; ship to iOS/Android/desktop
```

### Emit Compose source

```ts
import { renderAndroidCompose } from '@elitjs/native';

const composeFile = renderAndroidCompose(App, {
    packageName: 'com.example.generated',
    functionName: 'HomeScreen',
    includePreview: true,
});
```

### Emit SwiftUI source

```ts
import { renderSwiftUI } from '@elitjs/native';

const swiftFile = renderSwiftUI(App, {
    structName: 'HomeScreen',
    includePreview: true,
});
```

### CLI shortcuts

```bash
npx elit native generate android ./src/native-screen.ts --name HomeScreen --package com.example.app
npx elit native generate ios   ./src/native-screen.ts --out ./ios/HomeScreen.swift
npx elit native generate ir    ./src/native-screen.ts --platform android --export screen
```

### Native desktop window

```ts
import { createWindow, onMessage, windowQuit, windowSetTitle } from '@elitjs/desktop';

onMessage((message) => {
    if (message === 'desktop:ready') {
        windowSetTitle('Elit.js Desktop');
        windowQuit();
    }
});

createWindow({
    title: 'Elit.js Desktop',
    width: 960,
    height: 640,
    icon: './public/favicon.svg',
    html: `<!doctype html><html><body>
        <main>Hello from Elit.js Desktop</main>
        <script>
            window.addEventListener('DOMContentLoaded', () => {
                window.ipc.postMessage('desktop:ready');
            });
        </script>
    </body></html>`,
});
```

### WAPK package and run

```bash
npx elit wapk pack .                         # builds ./app.wapk
npx elit wapk run ./app.wapk                 # runs the packaged app
npx elit wapk pack . --password secret-123   # locked archive
npx elit desktop wapk run ./app.wapk         # WAPK inside desktop mode
```

## Config wiring

```ts
export default {
    mobile: {
        appId: 'com.example.app',
        appName: 'Example',
        webDir: 'dist',
        mode: 'hybrid',                  // or 'native'
        native: {
            entry: './src/native-screen.ts',  // generates Compose/SwiftUI on sync
        },
    },
    desktop: {
        mode: 'native',                  // or 'hybrid'
        native: { entry: './src/main.ts' },
        runtime: 'quickjs',              // 'quickjs' | 'node' | 'bun' | 'deno'
        compiler: 'auto',                // 'auto' | 'none' | 'esbuild' | 'tsx' | 'tsup'
    },
};
```

`mobile.mode: 'native'` requires `mobile.native.entry` and switches the Android/iOS host to generated native UI. `mobile.mode: 'hybrid'` ships the WebView + your `webDir` build.

## Rules

- Keep the native source tree small and self-contained. Generated Compose/SwiftUI covers a practical subset — don't expect every browser API to translate.
- The native CSS subset supports typography, spacing, gradients, shadows, flex and simple grid layouts, `currentColor`, named colors, and per-side borders. See `elit native generate --help` and the docs links in the README.
- For desktop native, Cargo is required the first time the native runtime builds.
- WAPK runtime syncs file changes back into the same `.wapk` archive by default. Use `--watcher` for event-driven sync or `--sync-interval <ms>` for polling.
- Locked WAPK archives stay encrypted when sync writes back. Pass `--password` consistently.

## Anti-Patterns

- Mixing browser globals (`document`, `window`, `localStorage`) into the shared native tree — they won't exist on native runtimes. Use `onMessage` and `createWindow` only inside the desktop runtime.
- Treating `elit mobile run` as a browser preview. It boots a real Android emulator or simulator — run `elit mobile doctor` first.
- Editing generated `ElitGeneratedScreen.kt` / `.swift` by hand. Re-running `sync` overwrites them; edit the source VNode tree instead.

## Validation

- `npx elit native generate android ./src/screen.ts` should print the Compose source to stdout or write the configured output file.
- `npx elit mobile doctor --json` validates the local mobile toolchain before build/run.
- `npx elit desktop ./src/main.ts` boots the desktop shell. Use `--mode native` to exercise the native renderer.
- `npx elit wapk inspect ./app.wapk` lists archive contents (or reports locked status).
