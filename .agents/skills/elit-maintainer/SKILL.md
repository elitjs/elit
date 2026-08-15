---
name: elit-maintainer
description: 'Edit, debug, refactor, or extend the Elit repository. Use when working on runtime boundaries, subpath imports, browser/client modules, server modules, native generation, desktop runtime glue, CLI commands, tests, or docs in this repo.'
argument-hint: 'Describe the Elit module, runtime, or behavior you want to change.'
user-invocable: true
---

# Elit Maintainer

Use this skill when the task is inside the Elit repository itself rather than in an app built with Elit.

## What Matters First

- Elit is split by runtime. Identify whether the task belongs to browser/client, server, native, desktop, CLI, docs, or tests before changing code.
- Public files at the root of `src/` are mostly facades. Follow them to the owning implementation instead of editing the facade first.
- Keep imports aligned with the package export map in `package.json`.
- Prefer current subpaths such as `elit/server`; do not reintroduce `elit-server`.

## Runtime Map

- Browser/client: `src/client/`, surfaced by `src/dom.ts`, `src/el.ts`, `src/state.ts`, `src/style.ts`, `src/router.ts`, and `src/render-context.ts`.
- Server/backend: `src/server/`, surfaced by `src/server.ts`, `src/http.ts`, `src/https.ts`, `src/ws.ts`, `src/wss.ts`, `packages/function-store`, and `src/smtp-server.ts`.
- Native generation: `src/native/`, surfaced by `src/native.ts`.
- Desktop runtime glue: `src/desktop/` plus the Rust host in `desktop/`.
- CLI/build: `src/cli/`, `src/build/`, `scripts/`, and the `tsup*.config.ts` files.
- Verification surfaces: `testing/unit/`, `examples/`, and `docs/`.

## Working Procedure

1. Classify the task by runtime and find the public entry point that exposes it.
2. Step through the facade into the owning implementation before editing behavior.
3. Preserve runtime boundaries and shared VNode or reactive-state contracts when a change spans multiple outputs.
4. If the change affects public API, CLI behavior, config behavior, or docs examples, update the nearest docs or example in the same pass.
5. Validate with the smallest command that can falsify the change.

## Validation Matrix

- TypeScript or API edits: `npm run typecheck`
- Shared behavior or regressions: `elit test --run --file ./testing/unit/<name>.test.ts`
- Wider behavior changes: `npm run test:run`
- Build, export, bundling, or CLI pipeline changes: `npm run build`
- Docs-only changes with rendered output impact: `npm run docs:build`

## High-Risk Repo Details

- `createRouterView(router, options)` returns a function and should be rendered from `reactive(router.currentRoute, () => RouterView())`.
- Desktop APIs from `elit/desktop` are runtime-injected and should stay inside desktop execution paths.
- Native rendering is not the DOM renderer. Use `elit/native` and keep outputs serializable across IR, Compose, SwiftUI, and desktop-native paths.
- Only `VITE_` environment variables are injected into client bundles.
- Prefer README and current package exports when older docs or examples disagree.

## Useful Checks

- Read `README.md` first for the module map and AI quick context.
- Check `examples/` for the closest runtime-specific pattern before inventing a new one.
- Check `testing/unit/` for the preferred assertion and fixture style before adding tests.
- Check `docs/native-css-support.md` and `docs/native-element-support.md` before changing native rendering behavior.