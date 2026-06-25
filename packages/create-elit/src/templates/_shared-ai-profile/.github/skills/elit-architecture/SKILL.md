---
name: elit-architecture
description: 'Design and refactor project structure for this Elit app — directory layout, file-size budgets, splitting by domain, extracting shared code, and preventing duplication. Use when a file is getting long, code is repeated across handlers, or before adding a new feature/page/server route.'
argument-hint: 'Describe the file that needs splitting, the duplicated pattern, or the new feature being added.'
user-invocable: true
---

# Elit Architecture

Use this skill when the task is about **how the project is organized** — not about specific framework APIs (those belong to the runtime-specific skills). The goal is a codebase where files are small, focused, and free of duplication.

## Route The Task First

1. Directory layout / where a new file belongs → `references/project-layout.md`
2. A file is too long / approaching budget → `references/file-size-budget.md`
3. Same logic repeated across files → `references/dry-patterns.md`
4. Types or utilities used by both client and server → `references/shared-code.md`
5. New page, new component, new server route → plan placement using the layout reference first

## Structure Principles

1. **One responsibility per file.** A page renders a route. A component is reusable UI. A server route file handles one domain. A repository file owns DB access for one entity.
2. **Files stay short.** See the budget table below. When a file crosses the threshold, split it.
3. **Composition over aggregation.** `main.ts`, `client.ts`, `server/index.ts`, `styles/index.ts` should *compose* — they should not contain logic.
4. **Co-locate related code.** A page's styles live next to the page (`HomePage.ts` + `HomePage.styles.ts`). A domain's routes, repository, and middleware live under one folder (`server/auth/`).
5. **Share horizontally via `shared/`.** Anything used by both client and server lives in `src/shared/` with a clear runtime boundary — no `elit/server` import from there.

## File-Size Budget

| File type | Soft | Hard | Action when exceeded |
|---|---|---|---|
| Browser entry (`main.ts`) | 30 | 50 | Move composition into smaller components/pages |
| SSR shell (`client.ts`) | 30 | 50 | Extract head logic into `client-head.ts` |
| Router (`router.ts`) | 50 | 100 | Group routes into sub-tables per area |
| Page (`pages/**/*.ts`) | 150 | 250 | Extract sub-components |
| Component (`components/**/*.ts`) | 100 | 200 | Split into sub-components |
| Server entry (`server/index.ts`) | 50 | 100 | Move route definitions to domain files |
| Server domain routes (`server/<domain>/routes.ts`) | 150 | 250 | Split domain further or extract middleware |
| Repository (`server/<domain>/repository.ts`) | 150 | 250 | Split entity or move mappers out |
| Style file (`*.styles.ts` or `styles/*.ts`) | 200 | 400 | Split by section or component |
| Shared utility (`shared/**/*.ts`) | 80 | 150 | Split by responsibility |
| Native screen (`native-screen.ts`) | 200 | 400 | Extract sub-screens into `native/` |

Soft = refactor trigger. Hard = must split before merge. See `references/file-size-budget.md` for refactor playbooks.

## DRY Checklist

Before adding code, check:

- [ ] **Bearer token parsing** — duplicated across handlers? Move to `server/_shared/bearer.ts`.
- [ ] **DB result extraction** (`result.logs[0]?.args?.[0]`) — same pattern 3+ times? Move to `server/_shared/db-helpers.ts`.
- [ ] **Password stripping** (`{ password: _, ...rest }`) — repeated? Move to `server/_shared/serialization.ts`.
- [ ] **Auth check** — same `verifyToken` + 401 response in every protected route? Extract as middleware in `server/_shared/auth-middleware.ts`.
- [ ] **Response shapes** — same `{ ok, data, error }` envelope? Move to `server/_shared/response-helpers.ts`.
- [ ] **CSS variables** — same color/spacing hardcoded across style files? Define once in `styles/tokens.ts`.
- [ ] **Validation** — same regex/assertion in client and server? Move to `shared/utils/validation.ts`.
- [ ] **Types** — same interface redeclared in client and server? Move to `shared/types/`.

See `references/dry-patterns.md` for each pattern with before/after examples.

## Canonical Directory Layout

```
src/
├── main.ts                    # browser entry — composition only (≤30 lines)
├── client.ts                  # SSR shell — composition only (≤30 lines)
├── router.ts                  # route table (≤50 lines)
├── native-screen.ts           # mobile/desktop native entry (when used)
├── pages/                     # one file per route
│   ├── HomePage.ts
│   ├── HomePage.styles.ts     # co-located styles
│   ├── auth/
│   │   ├── LoginPage.ts
│   │   ├── LoginPage.styles.ts
│   │   ├── RegisterPage.ts
│   │   └── authRoutes.ts      # route table fragment for this area
│   └── profile/
│       ├── ProfilePage.ts
│       └── ProfilePage.styles.ts
├── components/                # reusable UI
│   ├── Button/
│   │   ├── Button.ts
│   │   └── Button.styles.ts
│   ├── Header/
│   │   ├── Header.ts
│   │   └── Header.styles.ts
│   └── index.ts               # barrel export
├── server/                    # split by domain
│   ├── index.ts               # composes domain routers (≤50 lines)
│   ├── auth/
│   │   ├── routes.ts          # /api/auth/... handlers
│   │   ├── repository.ts      # db.execute calls for users
│   │   └── middleware.ts      # domain-specific middleware
│   ├── chat/
│   │   ├── routes.ts
│   │   ├── repository.ts
│   │   └── sse.ts             # SSE channel management
│   └── _shared/
│       ├── auth-middleware.ts # requireAuth(request) helper
│       ├── bearer.ts          # parseBearerToken(request)
│       ├── response-helpers.ts # ok()/error()/created()
│       ├── db-helpers.ts      # extractFirst(result), extractRows(result)
│       └── serialization.ts   # toPublicUser(user) — strips password
├── styles/                    # global styles only
│   ├── tokens.ts              # CSS variables (colors, spacing, fonts)
│   ├── reset.ts               # base element styles
│   └── index.ts               # injectStyles() composition
└── shared/                    # cross-runtime types & utilities
    ├── types/
    │   ├── user.ts            # User, PublicUser, AuthSession
    │   └── api.ts             # ApiResult<T>, ApiError
    └── utils/
        ├── validation.ts      # isEmail, isStrongPassword
        └── format.ts          # formatDate, initials
databases/                     # elit/database schemas
└── users.ts
public/
└── index.html
elit.config.ts
```

See `references/project-layout.md` for the rationale behind each folder.

## High-Risk Areas

- **One giant `server.ts`** — common from copy-paste tutorials. Refactor early; every new route makes it worse. The `auth-fullstack-example` template ships a 596-line `server.ts` — treat it as a showcase, not a structure to copy.
- **One giant `styles.ts`** — same. The `auth-fullstack-example` template ships a 1182-line `styles.ts`. Split per feature early.
- **Singleton `styles` from `elit/style`** — module-scope state shared across every caller. Prefer `createStyles()` instances per feature so ordering is deterministic.
- **Module-scope side effects** (event listeners, state initialization at top level) — leak across renders. Initialize inside the component function.
- **Cross-runtime imports** — server code in a client entry (or vice versa) silently breaks SSR/HMR. Use `shared/` for anything touched by both sides.
- **Domain folders without a `_shared/`** — when two domains need the same helper, it ends up duplicated in each. Hoist to `_shared/` on first reuse, not third.
- **Page files that mix data fetching, rendering, and styles** — extract data hooks (`useXxx`) and styles out of the page.
- **Re-declaring types on each side of the wire** — leads to drift. Define once in `shared/types/`.
- **In-memory Maps for state that should be in `elit/database`** — fine for ephemeral cache, but they don't survive a restart and aren't shared across instances.

## Validation

1. `npm run typecheck` — confirms imports resolve and types are sound after restructuring.
2. `npm run dev` — exercise every route after a server split. SSE channels are easy to break.
3. `npm run build` — confirms the build matrix still produces all outputs.
4. Manual: open the file tree. Any `.ts` file > 250 lines (excluding `.styles.ts`) is a smell.
5. Search for duplicated patterns: `grep -rn "result.logs\[0\]"` should hit `_shared/db-helpers.ts` only. Same for `Bearer ` parsing, password stripping, etc.

## Adding a New Feature — Where It Goes

| Feature type | Location |
|---|---|
| New route (page) | `src/pages/<area>/<Area>Page.ts` + `.styles.ts`, registered in `router.ts` |
| New API endpoint | `src/server/<domain>/routes.ts` |
| New database collection | `databases/<entity>.ts` (schema) + access in `server/<domain>/repository.ts` |
| New reusable UI | `src/components/<Name>/<Name>.ts` + `.styles.ts` |
| New server utility (used 2+ times) | `src/server/_shared/<name>.ts` |
| New shared type | `src/shared/types/<entity>.ts` |
| New shared validation/util | `src/shared/utils/<name>.ts` |
| New global style token | `src/styles/tokens.ts` |

## References

**Detailed references (next to this skill file):**
- `references/project-layout.md` — full directory tree, rationale per folder, where new files belong, anti-patterns (where NOT to put things)
- `references/file-size-budget.md` — line-count limits per file type, refactor triggers, before/after for each split
- `references/dry-patterns.md` — duplication patterns (Bearer parsing, DB extraction, password stripping, response envelopes, validation, repositories) with extraction examples
- `references/shared-code.md` — `shared/` directory rules, runtime boundary enforcement, what belongs in `types/` vs `utils/`

**In this project:**
- `elit.config.ts` — confirms where `dev.clients[].api`, `dev.ssr`, `build[].entry` point
- `src/main.ts`, `src/client.ts`, `src/router.ts` — the composition roots (should stay short)
- `src/server/index.ts` — server composition (after refactor)
- `src/styles/index.ts` — style composition (after refactor)

**Related skills:**
- `elit-client-app` — when the file being split is a page or component
- `elit-server-app` — when the file being split is a server route or middleware
- `elit-runtime-app` — when restructuring requires `elit.config.ts` changes (e.g., pointing `dev.api` at a new `server/index.ts`)
- `elit-native-app` — when splitting `src/native-screen.ts` into sub-screens
- `elit-desktop-app` — when splitting desktop window logic
