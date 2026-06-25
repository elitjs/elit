# elit/native — Renderer + Codegen API

The native renderer takes an Elit VNode tree and produces platform-specific native code. Three call sites cover the pipeline:

1. `renderNativeTree(vnode, options?)` — VNode → platform-agnostic IR
2. `renderAndroidCompose(input, options?)` — IR or VNode → Kotlin source
3. `renderSwiftUI(input, options?)` — IR or VNode → Swift source

Plus helpers for debugging and CLI integration.

## `renderNativeTree(input, options?)`

```ts
import { renderNativeTree } from 'elit/native';
import { div, h1, button } from 'elit/el';

const tree = renderNativeTree(
  div({ class: 'container' },
    h1('Hello Native'),
    button({ onClick: () => {} }, 'Click')
  ),
  { platform: 'android' }
);
```

**Returns:** `NativeTree` — a platform-agnostic IR that subsequent codegen steps consume.

**NativeTransformOptions:**
```ts
interface NativeTransformOptions {
  platform?: 'generic' | 'android' | 'ios';   // default 'generic'
  statePrefix?: string;                        // default 'state'
  // ...internal flags for the resolver
}
```

**What it does:**
- Walks the VNode tree, mapping each tag to a native component (`div` → `View`, `button` → `Button`, etc.).
- Extracts inline `style={...}` and `class="..."` (from `createStyles()`) into a normalized style object.
- Auto-detects `State<T>` objects referenced via `bindValue`/`bindChecked` and emits `NativeStateDescriptor` entries.
- Maps `onClick`/`onChange`/`onInput` to native events (`press`/`change`/`input`).

## `renderNativeJson(input, options?)`

Same as `renderNativeTree` but returns a pretty JSON string. Use for debugging — see exactly what the codegen will receive.

```ts
import { renderNativeJson } from 'elit/native';
import { div } from 'elit/el';

console.log(renderNativeJson(div({ class: 'card' }, 'Hi'), { platform: 'ios' }));
/*
{
  "platform": "ios",
  "roots": [{ "kind": "element", "component": "View", ... }],
  "stateDescriptors": []
}
*/
```

## `renderAndroidCompose(input, options?)`

```ts
import { renderAndroidCompose } from 'elit/native';

const kotlin = renderAndroidCompose(
  irOrVNode,
  {
    packageName: 'com.example.app',
    functionName: 'HomeScreen',
    includePreview: true,
    includeImports: true
  }
);
```

**Accepts:** `VNode` or `NativeTree`. If you pass a VNode, the function runs `renderNativeTree` internally first.

**AndroidComposeOptions:**
```ts
interface AndroidComposeOptions {
  packageName: string;          // required — Kotlin package
  functionName?: string;        // default 'ElitScreen'
  includePreview?: boolean;     // default true — emit @Preview helper
  includeImports?: boolean;     // default true — prepend import block
}
```

**Output example (sketch):**

```kotlin
package com.example.app

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview

@Composable
fun HomeScreen() {
  var name by remember { mutableStateOf("") }

  Column(modifier = Modifier.padding(24.dp)) {
    Text(text = "Hello Native", fontSize = 24.sp, fontWeight = FontWeight.Bold)
    TextField(value = name, onValueChange = { name = it })
    Button(onClick = { /* greet */ }) { Text("Greet") }
  }
}

@Preview
@Composable
fun HomeScreenPreview() = HomeScreen()
```

## `renderSwiftUI(input, options?)`

```ts
import { renderSwiftUI } from 'elit/native';

const swift = renderSwiftUI(
  irOrVNode,
  {
    structName: 'HomeView',
    includePreview: true,
    includeImports: true
  }
);
```

**SwiftUIOptions:**
```ts
interface SwiftUIOptions {
  structName?: string;          // default 'ElitScreenView'
  includePreview?: boolean;     // default true — emit #Preview helper
  includeImports?: boolean;     // default true
}
```

**Output example (sketch):**

```swift
import SwiftUI

struct HomeView: View {
  @State private var name: String = ""

  var body: some View {
    VStack(spacing: 12) {
      Text("Hello Native").font(.title).fontWeight(.bold)
      TextField("Enter your name", text: $name)
      Button(action: { /* greet */ }) { Text("Greet") }
    }
    .padding(24)
  }
}

#Preview {
  HomeView()
}
```

## IR Shape — `NativeTree`

```ts
interface NativeTree {
  platform: 'generic' | 'android' | 'ios';
  roots: NativeNode[];
  stateDescriptors?: NativeStateDescriptor[];
}
```

### `NativeNode` (union)

```ts
type NativeNode =
  | { kind: 'text'; value: string; stateId?: string }
  | {
      kind: 'element';
      component: string;            // 'View', 'Text', 'Button', 'TextField', ...
      sourceTag: string;            // original HTML tag ('div', 'h1', 'button', ...)
      props: Record<string, NativePropValue>;
      events: string[];             // ['press', 'change', 'input']
      children: NativeNode[];
    };
```

### `NativeStateDescriptor`

```ts
interface NativeStateDescriptor {
  id: string;                      // 'state0', 'state1', ...
  type: 'string' | 'number' | 'boolean' | 'string-array';
  initialValue: string | number | boolean | string[];
}
```

The renderer auto-extracts these from `bindValue`/`bindChecked` references. Each `id` corresponds to a generated `@State` (SwiftUI) or `remember { mutableStateOf(...) }` (Compose).

### `NativePropValue`

```ts
type NativePropValue =
  | string
  | number
  | boolean
  | NativeColorValue          // { red, green, blue, alpha }
  | NativeGradientValue
  | NativeBindingReference   // points to a NativeStateDescriptor
  | NativeStyleMap;           // nested style object
```

## CLI Commands

```bash
# Generate IR dump (for debugging)
elit native generate ir ./src/native-screen.ts --platform android

# Generate Kotlin Compose
elit native generate android ./src/native-screen.ts \
  --name HomeScreen \
  --package com.example.app \
  --out ./android/GeneratedScreen.kt

# Generate SwiftUI
elit native generate ios ./src/native-screen.ts \
  --struct HomeView \
  --out ./ios/HomeView.swift
```

Flags:
- `--name` / `--struct` — function/struct name
- `--package` — Kotlin package (Android only)
- `--out` — output file path
- `--no-preview` — skip the preview helper
- `--no-imports` — skip the import block

## Common Patterns

### Render from a VNode directly (no intermediate IR)

```ts
import { div, h1 } from 'elit/el';
import { renderAndroidCompose } from 'elit/native';

const kotlin = renderAndroidCompose(
  div(h1('Hi')),
  { packageName: 'com.example.app', functionName: 'HiScreen' }
);
```

Both `renderAndroidCompose` and `renderSwiftUI` accept either input — they auto-detect.

### Inspect IR before codegen

```ts
import { renderNativeTree, renderAndroidCompose } from 'elit/native';

const ir = renderNativeTree(tree, { platform: 'android' });

// inspect, log, or post-process
console.log(ir.stateDescriptors);

const kotlin = renderAndroidCompose(ir, { packageName: 'com.app' });
```

### Generate for multiple platforms from one tree

```ts
import { renderNativeTree, renderAndroidCompose, renderSwiftUI } from 'elit/native';

const tree = renderNativeTree(vnode, { platform: 'generic' });

fs.writeFileSync('android.kt', renderAndroidCompose(tree, { packageName: 'com.app' }));
fs.writeFileSync('ios.swift', renderSwiftUI(tree, { structName: 'View' }));
```

Use `platform: 'generic'` for the IR step, then let each codegen handle platform specifics.

## Gotchas

- **Passing an already-rendered `NativeTree` to `renderNativeTree` again** — double-encoding, output is garbage. Pass VNodes to the renderer, IR to the codegen.
- **State objects not declared inside the screen function** — the renderer captures state by reference. Declare inside the closure.
- **`onClick: () => someAsyncWork()`** — the codegen emits the call inline; async work is fine but you can't `await` from native event handlers cleanly.
- **Generated code edits get overwritten** — treat `Generated*.kt` / `Generated*.swift` as build artifacts. Modify the source VNode and regenerate.
- **Missing `packageName` (Android)** — codegen fails. Always set it.
- **`includePreview: false` in production builds** — preview helpers add binary size; disable when shipping release builds.
- **Circular state references** — the renderer walks state eagerly; circular refs will infinite-loop. Refactor.
