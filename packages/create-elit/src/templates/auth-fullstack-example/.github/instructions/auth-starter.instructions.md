---
description: "Use when editing the auth and chat Elit starter. Covers auth pages, profile or chat flows, server routes, simple token handling, and file-backed app data."
name: "Auth Starter Guidance"
applyTo:
  - "src/server.ts"
  - "src/router.ts"
  - "src/pages/**/*.ts"
  - "src/components/**/*.ts"
  - "databases/**/*.ts"
  - "elit.config.ts"
---

# Auth Starter Guidance

- This starter combines auth, profile, and chat behavior. Route, page, and server changes are usually connected.
- Keep server behavior on `elit/server` and storage on `elit/function-store`.
- Preserve the current simple auth flow unless the task explicitly redesigns it. Do not casually break registration, login, profile, or chat assumptions while changing one screen.
- If you change request or response payloads, update both server routes and the affected pages in the same pass.
- This starter already has more moving parts than the basic starter, so prefer local, behavior-scoped edits over broad rewrites.