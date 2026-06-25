---
name: elit-native-app
description: 'Work on native screen rendering in this Elit app — generate Kotlin Compose, SwiftUI, or desktop-native code from a VNode tree. Use when editing `src/native-screen.ts`, `mobile.native.entry`, `desktop.native.entry`, or any code that feeds `elit/native`.'
argument-hint: 'Describe the native screen, styling, or codegen target.'
user-invocable: true
---

# Elit Native App

Use this skill when the task involves **native code generation** from an Elit VNode tree: Android (Kotlin Jetpack Compose), iOS/macOS (SwiftUI), or desktop-native. Native is a separate render path from the browser DOM — same reactive primitives, different output.

## Route The Task First

1. Screen declaration → `src/native-screen.ts` (or whatever `mobile.native.entry` / `desktop.native.entry` points to)
2. Renderer + codegen APIs (`renderNativeTree`, `renderAndroidCompose`, `renderSwiftUI`) → `references/native-renderer.md`
3. Styling (CSS subset, units, color resolution) → `references/native-styling.md`
4. State + bindings (`createState`, `bindValue`, `bindChecked` on native) → `references/native-styling.md`
5. CLI codegen (`elit native generate ...`) → `references/native-renderer.md`
6. Config wiring (`mobile.native.*`, `desktop.native.*`) → `elit-runtime-app` skill

## Public API Surface

```ts
import {
  renderNativeTree,           // VNode → NativeTree (IR)
  renderNativeJson,           // VNode → JSON string (for debugging)
  renderAndroidCompose,       // VNode/NativeTree → Kotlin source
  renderSwiftUI               // VNode/NativeTree → Swift source
} from 'elit/native';
```

For state and bindings, import from `elit/state` (same primitives as browser):

```ts
import { createState, bindValue, bindChecked, computed } from 'elit/state';
```

## Screen Declaration

A native screen is a function that returns a VNode tree. Elit exports it by name from the file pointed to by `mobile.native.entry` / `desktop.native.entry`.

```ts
// src/native-screen.ts
import { div, h1, p, button, input } from 'elit/el';
import { createState, bindValue } from 'elit/state';

export const screen = () => {
  const name = createState('');

  return div(
    { style: { padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' } },
    h1({ style: { fontSize: '24px', fontWeight: '700' } }, 'Hello Native'),
    input({
      type: 'text',
      placeholder: 'Enter your name',
      ...bindValue(name)
    }),
    button(
      { onClick: () => alert(`Hi, ${name.value}!`) },
      'Greet'
    )
  );
};
```

The export name must match `mobile.native.exportName` (default: `screen`).

## Component Mapping

Native doesn't render every HTML tag — it maps common ones to native primitives:

| HTML | Android Compose | SwiftUI |
|---|---|---|
| `div` | `Box` (or `Column`/`Row` if `display:flex`) | `VStack` / `HStack` / `ZStack` |
| `span`, `p` | `Text` | `Text` |
| `h1`..`h6` | `Text` (with size/weight) | `Text` (with font modifier) |
| `button` | `Button` | `Button` |
| `input[type=text]` | `TextField` | `TextField` |
| `input[type=checkbox]` | `Checkbox` | `Toggle` |
| `ul`/`ol` | `Column` (or `LazyColumn` if `display:list`) | `List` |
| `li` | `ListItem` | `Row in List` |
| `img` | `Image` | `Image` |
| `hr` | `HorizontalDivider` | `Divider` |

For unsupported tags, Elit falls back to a generic container.

## Renderer Pipeline

```ts
import { renderNativeTree, renderAndroidCompose, renderSwiftUI } from 'elit/native';
import { div, h1 } from 'elit/el';

const tree = div({ class: 'container' }, h1('Hello'));

// Step 1: VNode → IR (platform-agnostic)
const ir = renderNativeTree(tree, { platform: 'android' });

// Step 2a: IR → Kotlin Compose
const kotlin = renderAndroidCompose(ir, {
  packageName: 'com.example.app',
  functionName: 'HomeScreen'
});

// Step 2b: OR IR → SwiftUI
const swift = renderSwiftUI(tree, {  // accepts VNode or NativeTree
  structName: 'HomeView',
  includePreview: true
});
```

You usually don't call these directly — the CLI does, based on `mobile`/`desktop` config. But the API is public for tooling, tests, and previews.

## CLI

```bash
# Generate Kotlin Compose
elit native generate android ./src/native-screen.ts \
  --name HomeScreen \
  --package com.example.app

# Generate SwiftUI
elit native generate ios ./src/native-screen.ts \
  --out ./ios/App/HomeView.swift

# Dump intermediate IR (debugging)
elit native generate ir ./src/native-screen.ts --platform android
```

For full codegen config, see `references/native-renderer.md`.

## Config Wiring

```ts
// elit.config.ts
export default {
  mobile: {
    appId: 'com.example.app',
    mode: 'native',                    // 'native' generates code; 'hybrid' = webview + native screens
    webDir: 'dist',
    native: {
      entry: './src/native-screen.ts',
      exportName: 'screen',
      android: {
        enabled: true,
        packageName: 'com.example.app',
        output: './android/app/src/main/java/com/example/app/GeneratedScreen.kt'
      },
      ios: {
        enabled: true,
        output: './ios/App/GeneratedScreen.swift'
      }
    }
  }
};
```

For desktop-native:

```ts
desktop: {
  mode: 'native',
  native: {
    entry: './src/native-screen.ts',
    exportName: 'screen'
  }
}
```

## High-Risk Areas

- **Using browser-only tags** (`canvas`, `iframe`, `video`, `audio`) — no native mapping. Falls back to empty container.
- **Inline `<style>` or external CSS files** — not parsed. Style via `style={...}` props or `createStyles()` only.
- **`onclick` vs `onClick`** — native accepts both; the renderer normalizes to native events (`press`/`change`/`input`). Stick to one convention.
- **Units other than `px`/`dp`/`sp`/`%`** — `em`, `rem`, `vh`, `vw` get scaled or dropped. Use `px` for predictable results.
- **State mutations after capture** — the codegen freezes state at `renderNativeTree()` call time. Use `bindValue`/`bindChecked` for live bindings.
- **`grid-template-areas`** — partially supported; complex layouts may degrade. Test on a real device.
- **`box-shadow`** — maps to native elevation (Android) or SwiftUI shadow modifier, but values aren't 1:1. Tune per platform.
- **Dynamic `import()` in screen code** — not bundled into generated native; structure imports statically.
- **DOM APIs (`document.*`, `window.*`)** — won't work in native codegen. Pure logic only.

## Validation

1. `npm run typecheck` — types include native renderer.
2. `npx elit native generate ir ./src/native-screen.ts --platform android` — IR dump confirms the tree was parsed correctly.
3. `npx elit native generate android ./src/native-screen.ts --name HomeScreen` — verify the Kotlin output opens in Android Studio.
4. `npx elit native generate ios ./src/native-screen.ts --out test.swift` — verify the Swift output compiles in Xcode.
5. `npm run mobile:run:android` / `npm run mobile:run:ios` — end-to-end test on a device/emulator.
6. For desktop-native: `npm run desktop:run -- --mode native` — verify in the desktop shell.

## References

**Detailed API references (next to this skill file):**
- `references/native-renderer.md` — `renderNativeTree`, `renderNativeJson`, `renderAndroidCompose`, `renderSwiftUI`, `NativeTree`/`NativeNode`/`NativeStateDescriptor` IR shape, `NativeTransformOptions`, `AndroidComposeOptions`, `SwiftUIOptions`, CLI commands
- `references/native-styling.md` — supported CSS properties (layout, typography, spacing, visuals, grid), unit resolution (`px`/`dp`/`sp`/`%`), color parsing, state bindings (`bindValue`/`bindChecked` native semantics), interaction mapping (`onclick` → `press`)

**In this project:**
- `src/native-screen.ts` — the screen entry (referenced by `mobile.native.entry` / `desktop.native.entry`)
- `elit.config.ts` → `mobile.native.*` and `desktop.native.*` sections
- Generated outputs (treat as build artifacts): `android/app/src/main/java/.../GeneratedScreen.kt`, `ios/App/GeneratedScreen.swift`

**Installed type definitions:**
- `node_modules/elit/dist/native.d.ts` — renderer + IR types
- `node_modules/elit/dist/state.d.ts` — same state primitives as browser

**External docs:**
- Native CSS support: https://d-osc.github.io/elit/native-css-support.md
- Native element support: https://d-osc.github.io/elit/native-element-support.md
- Mobile config reference: https://d-osc.github.io/elit/CONFIG.md#mobile
- GitHub repo (browse `src/native/`): https://github.com/d-osc/elit

**Related skills:**
- `elit-client-app` — same VNode primitives and `createState` from `elit/state`. The screen tree is constructed the same way as a browser tree.
- `elit-runtime-app` — `mobile.native.*`, `desktop.native.*`, CLI commands (`elit native generate`, `elit mobile run/build`)
- `elit-desktop-app` — when the native screen is being generated for the desktop shell (`desktop.mode: 'native'`) rather than mobile
