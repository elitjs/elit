---
description: "Use when editing the todo fullstack Elit starter. Covers the Todo page, CRUD API routes, and file-backed persistence in databases/todo.ts."
name: "Todo Starter Guidance"
applyTo:
  - "src/server.ts"
  - "src/pages/**/*.ts"
  - "src/components/**/*.ts"
  - "databases/**/*.ts"
  - "src/mobile.ts"
  - "elit.config.ts"
---

# Todo Starter Guidance

- This starter is fullstack. UI changes often depend on `src/pages/TodoPage.ts`, `src/server.ts`, and `databases/todo.ts` together.
- Keep API work on `elit/server` and persistence work on `elit/function-store`.
- Preserve the current todo payload shape and summary flow unless the task explicitly changes the API contract.
- `databases/todo.ts` is starter data and persistence state. Treat it as app data, not as a place for random code.
- When changing filters, sort order, completion flow, or summaries, update both the UI assumptions and the route behavior in the same pass.