# elit/build — BuildOptions

`build` is a single object or an array (array runs sequential builds). Use the array form for multi-target outputs (web + worker, ESM + CJS, etc.).

## Basic Build

```ts
// elit.config.ts
export default {
  build: {
    entry: './src/main.ts',
    outDir: './dist',
    outFile: 'main.js',
    format: 'esm',
    minify: true,
    sourcemap: true,
    target: 'es2020'
  }
};
```

## Multi-Build (array)

```ts
build: [
  { entry: './src/main.ts', outDir: './dist/web', format: 'esm' },
  { entry: './src/worker.ts', outDir: './dist/workers', format: 'iife' },
  { entry: './src/server.ts', outDir: './dist/server', format: 'cjs', platform: 'node' }
]
```

## Full Options Reference

```ts
interface BuildOptions {
  entry: string;             // source file, e.g. './src/main.ts'
  outDir?: string;           // default './dist'
  outFile?: string;          // default 'main.js'
  format?: 'esm' | 'cjs' | 'iife';
  platform?: 'browser' | 'node' | 'neutral';
  target?: 'es2015' | 'es2016' | 'es2017' | 'es2018' | 'es2019' | 'es2020' | 'es2021' | 'es2022' | 'esnext';
  globalName?: string;       // for IIFE / UMD globals
  minify?: boolean;
  sourcemap?: boolean;
  treeshake?: boolean;
  logging?: boolean;
  external?: string[];       // skip bundling these (e.g. ['electron'])
  resolve?: ResolveConfig;   // { alias?: Record<string, string> }
  env?: Record<string, string>;     // injected as process.env / import.meta.env
  basePath?: string;         // for asset path rewriting
  copy?: CopyConfig[];       // static file copies (see below)
  onBuildEnd?: (result: BuildResult) => void | Promise<void>;

  // Self-contained bundles
  standalonePreview?: boolean;
  standaloneDev?: boolean;
  standaloneDevOutFile?: string;
  standalonePreviewOutFile?: string;
}

interface BuildResult {
  outputPath: string;
  buildTime: number;
  size: number;
}

interface CopyConfig {
  from: string;
  to: string;
  transform?: (content: string, config: { basePath: string }) => string;
}
```

## `copy` — Static Asset Copies

For each entry, Elit copies files into `outDir`. Use `transform` to rewrite content (e.g. `index.html` script src).

```ts
build: [{
  entry: './src/main.ts',
  outDir: './dist',
  copy: [
    {
      from: './public/index.html',
      to: './index.html',
      transform: (content, { basePath }) => {
        // Rewrite the source path to the built bundle
        let html = content.replace('src="../src/main.ts"', 'src="main.js"');

        // Inject <base href> when deployed under a sub-path
        if (basePath) {
          html = html.replace(
            '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
            `<meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <base href="${basePath}/">`
          );
        }
        return html;
      }
    },
    { from: './public/favicon.svg', to: './favicon.svg' },
    { from: './public/robots.txt', to: './robots.txt' }
  ]
}]
```

**Critical:** always inject `<base href="${basePath}/">` when `basePath` is set — otherwise assets resolve against the wrong path.

## `onBuildEnd(result)`

Hook runs after a successful build. Use it to log, deploy, or post-process.

```ts
build: [{
  entry: './src/main.ts',
  outDir: './dist',
  onBuildEnd: async (result) => {
    console.log(`built in ${result.buildTime}ms, ${result.size} bytes → ${result.outputPath}`);
    await deploy(result.outputPath);
  }
}]
```

## `external`

Skip bundling these — useful when targeting Node platforms where deps are installed separately.

```ts
build: [{
  entry: './src/server.ts',
  platform: 'node',
  format: 'cjs',
  external: ['express', 'pg', 'aws-sdk']
}]
```

## `env` — Build-Time Variables

Inject constants at build time. Accessible as `process.env.X` (Node) or `import.meta.env.X` (browser).

```ts
build: [{
  entry: './src/main.ts',
  env: {
    BUILD_VERSION: require('./package.json').version,
    BUILD_TIME: new Date().toISOString()
  }
}]
```

For runtime secrets, use `dev.env` / `preview.env` instead — they're NOT inlined into the bundle.

## `resolve.alias` (per-target)

Extends top-level `resolve.alias` (target wins on conflicts).

```ts
build: {
  resolve: {
    alias: { '@shared': './src/shared' }   // adds @shared for this build only
  }
}
```

## Standalone Bundles

For deployable single-file bundles:

```ts
build: [{
  entry: './src/main.ts',
  standalonePreview: true,           // includes a preview server in the bundle
  standalonePreviewOutFile: 'preview.js'
}]
```

Resulting `preview.js` can be run with `node ./dist/preview.js` — no `elit` CLI needed.

## Format/Platform Combinations

| Target | format | platform | Notes |
|---|---|---|---|
| Browser app | `'esm'` | `'browser'` (default) | Default for `src/main.ts` |
| Browser IIFE | `'iife'` | `'browser'` | Use `globalName` |
| Node server | `'cjs'` | `'node'` | Use `external` for npm deps |
| Node ESM | `'esm'` | `'node'` | Set `"type": "module"` in package.json |
| Worker | `'iife'` | `'browser'` | Or `'esm'` for module workers |
| Library | `'esm'` + `'cjs'` (array) | `'neutral'` | Multi-build for dual ESM/CJS |

## Validation

```bash
npm run build
# Verify dist/ contains the expected files
ls dist/
# Run the built server
node ./dist/server.js
# Or preview
npm run preview
```

## Gotchas

- **`copy[].transform` forgetting `basePath`** — assets fail to load when deployed under a sub-path. Always handle it.
- **`external` for browser builds** — bundler can't resolve, fails. Use only for Node targets.
- **`format: 'cjs'` with `platform: 'browser'`** — usually wrong; browsers don't speak CommonJS without a loader.
- **Forgetting `outFile`** — defaults to `main.js`. If you reference `bundle.js` in HTML, the file is wrong.
- **Multiple builds with same `outDir`** — later builds overwrite earlier ones. Use distinct `outDir`s.
- **`treeshake: false`** — keeps dead code. Useful for debugging; usually leave default (true).
- **Async `onBuildEnd` not awaited** — build script exits before deploy finishes. Return a Promise.
- **`process.env.X` in browser code without `env: {}`** — undefined. Either set `env` at build time or use `VITE_X` for runtime.
