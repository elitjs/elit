---
name: elit-ref-build
description: 'API reference for @elitjs/build: build() function and BuildOptions/BuildResult/ResolveConfig types. Cross-runtime bundler (esbuild on Node, Bun.Build on Bun, Deno.emit on Deno). Use when calling the bundler programmatically instead of via elit build CLI.'
argument-hint: 'Describe the entry, output, format, externals, or copy/transform to configure.'
user-invocable: true
---

# @elitjs/build Reference

Cross-runtime production bundler. Single function — `build(options)` — that dispatches to the right runtime transpiler.

## Exports

```ts
function build(options: BuildOptions): Promise<BuildResult>;

interface BuildOptions {
  entry: string;                                      // required — e.g. './src/main.ts'
  outDir?: string;                                    // default 'dist'
  outFile?: string;                                   // default 'main.js'
  minify?: boolean;                                   // default true
  sourcemap?: boolean;                                // default true
  target?: 'es2015' | 'es2016' | 'es2017' | 'es2018' | 'es2019' | 'es2020' | 'es2021' | 'es2022' | 'esnext';   // default 'es2020'
  format?: 'esm' | 'cjs' | 'iife';                    // default 'esm'
  globalName?: string;                                // required when format: 'iife'
  platform?: 'browser' | 'node' | 'neutral';          // default 'browser'
  basePath?: string;                                  // for resolving absolute imports
  external?: string[];                                // skip bundling, leave as import
  resolve?: ResolveConfig;                            // alias map
  treeshake?: boolean;                                // default true
  logging?: boolean;                                  // default false
  env?: Record<string, string>;                       // injected as process.env.*
  copy?: Array<{
    from: string;
    to: string;
    transform?: (content: string, config: BuildOptions) => string;
  }>;
  onBuildEnd?: (result: BuildResult) => void | Promise<void>;
  standalonePreview?: boolean;                        // emit preview server bundle
  standaloneDev?: boolean;                            // emit dev server bundle
  standaloneDevOutFile?: string;
  standalonePreviewOutFile?: string;
}

interface BuildResult {
  outputPath: string;
  buildTime: number;                                  // ms
  size: number;                                       // bytes
}

interface ResolveConfig {
  alias?: Record<string, string>;                     // e.g. { '@': './src' }
}
```

## Patterns

### Basic build

```ts
import { build } from '@elitjs/build';

const result = await build({
  entry: './src/main.ts',
  outDir: './dist',
  outFile: 'main.js',
  format: 'esm',
  minify: true,
  sourcemap: true,
  target: 'es2020'
});

console.log(`Built in ${result.buildTime}ms → ${result.outputPath} (${result.size} bytes)`);
```

### Path aliases

```ts
await build({
  entry: './src/main.ts',
  resolve: { alias: { '@': './src', '@components': './src/components' } }
});
// `import { Foo } from '@/components/Foo'` resolves to `./src/components/Foo`
```

### Externals (skip bundling)

```ts
await build({
  entry: './src/main.ts',
  external: ['react', 'react-dom', /^node:/]
});
// `import React from 'react'` stays as-is in output
```

### Copy with transform

```ts
await build({
  entry: './src/main.ts',
  copy: [
    {
      from: './public/index.html',
      to: './index.html',
      transform: (content, config) => {
        let html = content.replace('src="../src/main.ts"', 'src="main.js"');
        if (config.basePath) {
          html = html.replace(
            '<meta name="viewport"',
            `<base href="${config.basePath}/">\n  <meta name="viewport"`
          );
        }
        return html;
      }
    },
    { from: './public/favicon.svg', to: './favicon.svg' }
  ]
});
```

### Inject env vars

```ts
await build({
  entry: './src/main.ts',
  env: {
    APP_VERSION: '1.2.3',
    API_URL: process.env.API_URL || 'http://localhost:3000'
  }
});
// `process.env.APP_VERSION` becomes a static string in the output
```

### IIFE with global name

```ts
await build({
  entry: './src/widget.ts',
  format: 'iife',
  globalName: 'MyWidget',
  minify: true
});
// Exposes window.MyWidget
```

### onBuildEnd hook

```ts
await build({
  entry: './src/main.ts',
  onBuildEnd: async (result) => {
    console.log(`Done in ${result.buildTime}ms`);
    await uploadSourcemap(result.outputPath + '.map');
  }
});
```

### Standalone server bundles

```ts
// Build with a self-contained preview server bundle
await build({
  entry: './src/main.ts',
  standalonePreview: true,
  standalonePreviewOutFile: 'server.js'
});
```

## Config wiring (`elit.config.ts`)

The `elit.config.ts` `build` block mirrors `BuildOptions` (with multi-build via array):

```ts
export default {
  build: [{
    entry: './src/main.ts',
    outDir: './dist',
    outFile: 'main.js',
    format: 'esm',
    minify: true,
    sourcemap: true,
    target: 'es2020',
    copy: [/* ... */]
  }]
};
```

`elit build` reads this and calls `build()` for each entry in the array.

## Rules

- `entry` is the only required field. Everything else has sensible defaults.
- `format: 'iife'` requires `globalName` — without it, the bundler will warn or fail.
- `external` accepts strings (exact match) or regex (matched against import specifiers).
- `resolve.alias` rewrites at the **start of import specifier** — `{ '@': './src' }` rewrites `@/x` but not `pkg/@/x`.
- `copy[].transform` runs synchronously. Return the new content; don't try to write files yourself.
- `env` only injects values referenced via `process.env.X` in source. Don't expect `process.env` to be a full object at runtime.
- Runtime selection is automatic: Node → esbuild, Bun → Bun.Build, Deno → Deno.emit. Don't try to override.
- `standaloneDev` / `standalonePreview` produce a separate `server.js` that runs without `elit dev` / `elit preview`. Use for production-style deploys.

## Anti-Patterns

- Forgetting `outDir` — output lands in `./dist` by default; if you expected a different folder, you'll be surprised.
- Setting `minify: false` for a production build. Bloats the bundle.
- Setting `sourcemap: true` in production without realizing it doubles output size. Use `'hidden'` if supported, or omit.
- Using `basePath` to mean "where files live" — it's for resolving absolute URL-style imports at build time, not runtime base paths.
- Calling `build()` in a tight loop without `onBuildEnd`. Cache the result and inspect it; don't just `await` and discard.

## Validation

- After `build({...})`, the file at `result.outputPath` should exist and be valid JS.
- `result.size > 0` and `result.buildTime < some_threshold` is a basic sanity check.
- Run `node result.outputPath` (for `format: 'cjs'`) or import it (for `esm`) to verify it actually executes.
- Cross-runtime: `await build({...})` should produce equivalent output on Node/Bun/Deno (modulo runtime-specific transpiler differences).
