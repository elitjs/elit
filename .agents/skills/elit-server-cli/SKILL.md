---
name: elit-server-cli
description: 'Work on Elit server, HTTP or WebSocket modules, CLI commands, build wiring, process manager, function store, or exported runtime entrypoints. Use when editing `src/server`, `src/cli.ts`, `src/build`, `packages/function-store`, `src/smtp-server.ts`, or package export behavior.'
argument-hint: 'Describe the server module, CLI command, or build behavior to change.'
user-invocable: true
---

# Elit Server And CLI

Use this skill when the task belongs to backend runtime behavior, CLI command wiring, or the package entry surface.

## Route The Task First

1. Server runtime behavior: `src/server/`, `src/server.ts`, `src/http.ts`, `src/https.ts`, `src/ws.ts`, `src/wss.ts`
2. CLI entry or command wiring: `src/cli.ts` and implementation under `src/cli/`
3. Build and export surface: `src/build/`, `scripts/`, `tsup*.config.ts`, and `package.json` exports

## Working Rules

- Keep `src/cli.ts` as the executable facade. It can delegate into `src/cli/`, but removing or bypassing `src/cli.ts` breaks package and test expectations.
- Keep server-facing APIs behind `elit/server`; do not reintroduce `elit-server`.
- When moving or adding public entrypoints, keep `package.json` exports, type declarations, and built bundle names aligned.
- Update `README.md` or `docs/CLI.md` when CLI flags, subcommands, or public behavior change.
- Prefer targeted server or CLI validation over broad unrelated checks.

## High-Risk Areas

- CLI direct-execution guards and version lookup in `src/cli.ts`
- Server/browser boundary mistakes across client and server imports
- Build output naming and tsup entry configuration
- Database, SMTP, PM, and transport adapters that are exposed as subpath exports

## Validation

- Run `npm run typecheck`.
- Run `npm run build` when touching CLI, exports, or build pipeline code.
- Validate CLI behavior through the built binary with `node ./dist/cli.cjs ...` because installed global `elit` binaries can mask the current workspace build.
- Run a focused test file when one exists, or `npm run test:run` for broader server or CLI regressions.

## Useful Anchors

- `src/cli.ts`
- `src/server.ts`
- `src/server/`
- `docs/CLI.md`, `docs/server.md`, `docs/ws.md`, `docs/wss.md`
- `package.json` exports

## References

- Architecture and invariants: [server and cli architecture](./references/architecture.md)
- Validation and common commands: [server and cli command cheatsheet](./references/commands.md)

## Assets

- Guided worksheet: [server and export change checklist](./assets/server-export-change-checklist.md)