# resolve.alias Example

Demonstrates the **top-level `resolve.alias`** config (and per-target `dev.resolve.alias` / `preview.resolve.alias` / `build.resolve.alias`). One map lets you write `@/components/Counter` instead of `./components/Counter` across the dev server, the preview server, and the build bundler.

## How it works

```ts
// elit.config.ts
import { defineConfig } from 'elit/config';

export default defineConfig({
  resolve: {
    alias: { '@': './src' },
  },
});
```

This single top-level entry is inherited by `dev`, `preview`, and `build`. Per-target `resolve.alias` overrides extend it (target wins on conflicting keys).

```ts
// src/main.ts
import { Counter } from '@/components/Counter';   // alias import
import { multiply } from '@/utils/math';          // alias import from a util

// src/components/Counter.ts (nested file also uses the alias)
import { add } from '@/utils/math';
```

## Project structure

```
alias-example/
├── elit.config.ts                  # top-level resolve.alias
├── index.html
├── src/
│   ├── main.ts                     # imports '@/components/Counter' and '@/utils/math'
│   ├── components/
│   │   └── Counter.ts              # imports '@/utils/math' (alias works from nested files too)
│   └── utils/
│       └── math.ts                 # plain helper
├── test-alias.mjs                  # runtime check
└── package.json
```

## Run

```bash
npm install
npm run dev          # http://localhost:3057
```

Open the URL — the page should render `6 * 7 = 42` and a working counter that increments through an alias-resolved `add` function.

## Automated check

```bash
npm run test:alias
```

Starts the dev server, then verifies:

1. `/` returns `200`
2. `/src/main.ts` is served with `@/components/Counter` rewritten to a relative path
3. The rewritten path resolves on the wire (`/src/components/Counter.js`)
4. `Counter.js` itself also has its `@/utils/math` import rewritten

Verified output on this repo:

```
 resolve.alias runtime report
================================================================
 PASS  GET / returns 200                                        got 200
 PASS  GET /src/main.ts returns 200                             got 200
 PASS  main.ts: '@/components/Counter' is rewritten             alias rewritten
 PASS  main.ts: rewritten to relative ./components/Counter.js   relative path found
 PASS  GET /src/components/Counter.js serves transpiled module  got 200
 PASS  Counter.js: '@/utils/math' is rewritten                  alias rewritten
================================================================
 6/6 checks passed
```

## Behavior notes

- Alias keys match only at the **start** of a specifier, and only when followed by `/` or when the alias equals the whole specifier. So `{ '@': './src' }` matches `@/foo` but not `@app/foo`.
- When multiple aliases could match, the longest key wins (`@app` is checked before `@`).
- Rewritten paths are made relative to the importing file. Files with no extension get a `.js` suffix so the dev server's `.js → .ts` fallback resolves the underlying TypeScript file.
- Bare `node_modules` imports (`elit/el`, `elit/state`, ...) pass through untouched.
- Top-level `resolve.alias` is also inherited by `elit build` (the bundler passes it straight through to esbuild via `resolve.alias`).

## Override pattern

Per-target alias overrides win on conflicting keys:

```ts
export default defineConfig({
  resolve: {
    alias: { '@': './src' },        // shared default
  },
  build: {
    resolve: {
      alias: { '@shared': './shared' },   // adds @shared for build only
    },
  },
});
```

See [`docs/CONFIG.md`](../../docs/CONFIG.md) for the full reference.
