---
name: elit-ref-utils
description: 'API reference for utility packages: @elitjs/core (VNode, Child, Children, Props, State, ElementFactory, JsonNode, VirtualListController types), @elitjs/runtime (runtime constant, isNode/isBun/isDeno), @elitjs/config (loadConfig, resolveConfigPath, loadEnv, mergeConfig, loadWapkConfig), @elitjs/render-context (captureRenderedVNode, getCapturedRenderedVNode, detectRenderRuntimeTarget, setRenderRuntimeTarget, getDesktopRenderOptions, setDesktopRenderOptions), @elitjs/universal (createUniversalBridgeProps, createUniversalLinkProps, mergeUniversalProps, isExternalUniversalDestination), @elitjs/hmr (default ElitHMR singleton). Use for exact type and helper signatures.'
argument-hint: 'Describe the type contract, runtime check, config load, render-target switch, or universal bridge you need.'
user-invocable: true
---

# Utility Packages Reference

Foundational helpers and type contracts shared across `@elitjs/*`. Most apps don't call these directly — they're consumed by higher-level packages — but knowing the exact shapes helps when integrating.

## @elitjs/core — shared type contracts

Pure type definitions (no runtime values). All `@elitjs/*` packages import from here.

```ts
interface VNode {
  tagName?: string;
  props?: Props;
  children?: Children;
}

type Child = VNode | string | number | boolean | null | undefined | Child[];
type Children = Child[];

interface Props {
  [key: string]: any;
  className?: string | string[];
  class?: string | string[];
  style?: Partial<CSSStyleDeclaration> | string;
  dangerouslySetInnerHTML?: { __html: string };
  ref?: RefCallback | RefObject;
  onClick?: (event: MouseEvent) => void;
  onChange?: (event: Event) => void;
  onInput?: (event: Event) => void;
  onSubmit?: (event: Event) => void;
  value?: string | number | string[];
  checked?: boolean;
}

type RefCallback = (element: HTMLElement | SVGElement) => void;

interface RefObject {
  current: HTMLElement | SVGElement | null;
}

interface State<T> {
  value: T;
  subscribe(fn: (value: T) => void): () => void;     // returns unsubscribe
  destroy(): void;
}

interface StateOptions {
  throttle?: number;       // ms — coalesce rapid changes
  deep?: boolean;          // deep-watch object/array mutations
}

interface VirtualListController {
  render(): void;
  destroy(): void;
}

interface JsonNode {
  tag?: string;
  attributes?: Record<string, any>;
  children?: JsonNode | JsonNode[] | string | number | boolean | null;
}

type VNodeJson =
  | { tagName?: string; props?: Record<string, any>; children?: (VNodeJson | string | number | boolean | null)[] }
  | string
  | number
  | boolean
  | null;

type ElementFactory = {
  (...children: Child[]): VNode;
  (props: Props | null, ...children: Child[]): VNode;
};
```

Import these whenever you need to type VNodes or states in your own code:

```ts
import type { VNode, Props, State, Child, ElementFactory } from '@elitjs/core';

export function Card({ title }: { title: string }): VNode { /* ... */ }
export type Counter = State<number>;
```

## @elitjs/runtime — runtime detection

Cached at module load:

```ts
const runtime: 'node' | 'bun' | 'deno';
const isNode: boolean;
const isBun: boolean;
const isDeno: boolean;
```

### Patterns

```ts
import { runtime, isNode, isBun, isDeno } from '@elitjs/runtime';

if (isBun) {
  // use Bun APIs directly
} else if (isDeno) {
  // use Deno APIs
} else {
  // Node path
}

console.log(`Running on ${runtime}`);
```

The package also declares the `Bun` and `Deno` globals for TypeScript — importing `@elitjs/runtime` makes them visible as typed globals.

## @elitjs/config — config loader

```ts
function loadConfig(cwd?: string): Promise<ElitConfig>;
function resolveConfigPath(cwd?: string): string | null;
function loadEnv(path?: string): Record<string, string>;
function loadWapkConfig(cwd?: string): Promise<WapkConfig | null>;
function resolveWapkConfigPath(cwd?: string): string | null;
function mergeConfig(...configs: ElitConfig[]): ElitConfig;
```

### Patterns

```ts
import { loadConfig, resolveConfigPath, loadEnv } from '@elitjs/config';

const configPath = resolveConfigPath(process.cwd());   // '/path/to/elit.config.ts' or null
const config = await loadConfig();                      // loads and evaluates elit.config.ts
const env = loadEnv('./.env');                          // { KEY: 'value', ... }
```

The config loader is what `elit dev`, `elit build`, etc. use internally. You rarely call it from app code — but it's useful for tests and CLIs.

### `ElitConfig` shape (key fields)

```ts
interface ElitConfig {
  dev?: DevServerOptions;
  build?: Array<BuildConfig>;
  preview?: PreviewOptions;
  test?: TestConfig;
  mobile?: MobileConfig;
  desktop?: DesktopConfig;
  wapk?: WapkConfig;
  pm?: PmConfig;
}
```

For exact sub-shapes (`DevServerOptions`, `BuildConfig`, etc.), see [elit-ref-server](.claude/skills/elit-ref-server/SKILL.md) (which mirrors `DevServerOptions`/`PreviewOptions`) and the `elit.config.ts` examples in [elit-project-structure](.claude/skills/elit-project-structure/SKILL.md).

## @elitjs/render-context — render target detection

Used by `@elitjs/native` and `@elitjs/desktop` to switch behavior depending on where the VNode tree is being rendered.

```ts
type RenderRuntimeTarget = 'browser' | 'desktop-hybrid' | 'desktop-native' | 'mobile-native' | 'test';

function detectRenderRuntimeTarget(): RenderRuntimeTarget;
function setRenderRuntimeTarget(target: RenderRuntimeTarget): void;
function restoreRenderRuntimeTarget(): void;

interface DesktopRenderOptions { /* internal */ }
function getDesktopRenderOptions(): DesktopRenderOptions;
function setDesktopRenderOptions(options: DesktopRenderOptions): void;
function clearDesktopRenderOptions(): void;

interface DesktopInteractionOutputOptions { /* internal */ }
interface CapturedRenderState { /* internal */ }

function captureRenderedVNode(): void;
function getCapturedRenderedVNode(): VNode | null;
function clearCapturedRenderedVNode(): void;
```

### Patterns (rare in app code)

```ts
import { detectRenderRuntimeTarget } from '@elitjs/render-context';

const target = detectRenderRuntimeTarget();
if (target === 'mobile-native') {
  // skip browser-only setup
}
```

You'll typically only need this when writing shared components that branch on render target.

## @elitjs/universal — universal bridge

Build props that work across browser, native, and desktop runtimes. The props become `data-*` attributes in the browser and explicit fields on native.

```ts
type UniversalPayload =
  | string
  | number
  | boolean
  | null
  | UniversalPayload[]
  | { [key: string]: UniversalPayload };

interface UniversalBridgeOptions {
  action?: string;             // maps to nativeAction / data-elit-action
  route?: string;              // maps to nativeRoute / data-elit-route
  payload?: UniversalPayload;  // JSON-serialized into data-elit-payload
  desktopMessage?: string;     // maps to data-desktop-message
}

function isExternalUniversalDestination(destination: string): boolean;
function createUniversalBridgeProps(options: UniversalBridgeOptions): Props;
function createUniversalLinkProps(destination: string, options?: UniversalBridgeOptions): Props;
function mergeUniversalProps(...sources: Array<Props | undefined | null>): Props;
```

### Patterns

```ts
import { createUniversalLinkProps, createUniversalBridgeProps } from '@elitjs/universal';
import { el } from '@elitjs/el';

// Link that works on web (target=_blank if external) and triggers navigation on native
const Link = el('a', createUniversalLinkProps('https://example.com', { payload: { id: 42 } }), 'Visit');

// Button that triggers a native action and a desktop message
const Btn = el('button', {
  ...createUniversalBridgeProps({ action: 'share', desktopMessage: 'share:item', payload: { id: 42 } }),
  onClick: () => {}
}, 'Share');
```

## @elitjs/hmr — HMR client

Single default export — the dev server injects this automatically.

```ts
import hmr from '@elitjs/hmr';
// hmr is a singleton with methods to subscribe to update events
// You don't usually call this directly — the dev server wires it up
```

The dev server injects the HMR client into every module during transpilation. Use it only if you're building custom tooling that needs to listen for updates.

## Patterns across packages

### Type-only imports

```ts
import type { VNode, Child, Props, State } from '@elitjs/core';
import type { ServerRouteContext, Middleware } from '@elitjs/server';
import type { Router, RouteLocation, Route } from '@elitjs/router';
import type { NativeTree, NativePlatform } from '@elitjs/native';
```

Use `import type` for type-only imports to keep them out of the runtime bundle.

### Branching on runtime in shared code

```ts
import { isBun, isDeno } from '@elitjs/runtime';

export function readConfigFile(path: string): Promise<string> {
  if (isBun) return Bun.file(path).text();
  if (isDeno) return Deno.readTextFile(path);
  // Node path
  return import('node:fs/promises').then((fs) => fs.readFile(path, 'utf8'));
}
```

### Loading config in a custom CLI

```ts
import { loadConfig, resolveConfigPath } from '@elitjs/config';

const configPath = resolveConfigPath();
if (!configPath) {
  console.error('elit.config.ts not found');
  process.exit(1);
}

const config = await loadConfig();
console.log('Dev port:', config.dev?.port);
```

## Rules

- `@elitjs/core` is type-only. Don't expect runtime values from it.
- `runtime` is cached at module load — switching runtimes mid-process is not supported (and doesn't happen in practice).
- `loadConfig()` resolves relative to `process.cwd()` by default. Pass an explicit `cwd` for tests.
- `mergeConfig(a, b)` does a shallow merge — later configs override earlier ones at the top level only.
- `setRenderRuntimeTarget()` is for advanced scenarios (custom test renderers, SSR pipelines). Don't call it from app code.
- Universal bridge props use `data-*` attributes in the browser. The browser-side dev tools can read them; the native runtime reads the camelCased equivalents.

## Anti-Patterns

- Treating `@elitjs/core` as a runtime — it's pure types.
- Switching `runtime` value via mutation. It's a `const`, and the runtime doesn't change anyway.
- Manually calling `setRenderRuntimeTarget()` from app components. The render pipeline sets it; respect the value.
- Re-implementing config loading. Use `loadConfig()` — it handles TS transpilation, default merging, and env-var interpolation.
- Hardcoding universal bridge attributes (`data-elit-action`) instead of using `createUniversalBridgeProps()` — the prop names are an implementation detail.

## Validation

- `import { runtime } from '@elitjs/runtime'; console.log(runtime)` should print the actual runtime.
- `resolveConfigPath()` should find `elit.config.ts` (or `.js`/`.mjs`) in the cwd tree.
- `detectRenderRuntimeTarget()` should return `'browser'` when running in `dom.render()` and `'desktop-native'` inside the desktop native runtime.
- `createUniversalLinkProps('https://example.com')` should produce `{ href: 'https://example.com', target: '_blank', rel: 'noreferrer', nativeRoute: undefined, 'data-elit-route': undefined }`.
