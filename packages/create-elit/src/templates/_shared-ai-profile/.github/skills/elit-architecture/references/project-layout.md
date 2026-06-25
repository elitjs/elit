# Project Layout — Canonical Structure

## Why this layout

The `auth-fullstack-example` template works as a *showcase* but puts all server logic in one 596-line `server.ts` and all styles in one 1182-line `styles.ts`. For real apps, split by domain and feature so files stay readable and changes don't ripple across unrelated code.

## Top-level layout

```
.
├── elit.config.ts        # source of truth — dev/build/preview/mobile/desktop/wapk
├── package.json
├── tsconfig.json
├── src/                  # application source
├── databases/            # elit/database schemas (one file per collection)
├── public/               # static assets
└── tests/                # optional — test files (or co-located)
```

## Inside `src/`

### Entries (composition only)

| File | Purpose | Max lines |
|---|---|---|
| `main.ts` | Browser entry. Calls `injectStyles()` + `dom.render('#app', App())`. | 30 |
| `client.ts` | SSR shell. Returns the VNode tree for initial paint. | 30 |
| `router.ts` | Route table + `createRouter`/`createRouterView`. | 50 |
| `native-screen.ts` | Native entry (when targeting mobile/desktop native). | 200 |

Entries compose — they should not contain business logic, data fetching, or styling.

### `pages/` — one file per route

Each page is a function `(router: Router, params?: RouteParams) => VNode`. Co-locate its styles.

```
pages/
├── HomePage.ts
├── HomePage.styles.ts
├── auth/
│   ├── LoginPage.ts
│   ├── LoginPage.styles.ts
│   ├── RegisterPage.ts
│   ├── RegisterPage.styles.ts
│   └── authRoutes.ts            # route table fragment
└── profile/
    ├── ProfilePage.ts
    ├── ProfilePage.styles.ts
    └── profileRoutes.ts
```

Group related pages into subfolders (`auth/`, `profile/`, `chat/`). Each subfolder may export its own route table fragment that `router.ts` composes.

### `components/` — reusable UI

One folder per component. Each folder has the component file plus its co-located styles.

```
components/
├── Button/
│   ├── Button.ts
│   └── Button.styles.ts
├── Header/
│   ├── Header.ts
│   ├── Header.styles.ts
│   └── index.ts                 # local barrel
└── index.ts                     # app-wide barrel
```

**When something becomes a component:**
- Used 2+ times across pages.
- Has its own state.
- Has a non-trivial render that crowds the parent page.

If it's used once, leave it inline in the page.

### `server/` — split by domain

```
server/
├── index.ts                     # composes domain routers into one ServerRouter
├── auth/
│   ├── routes.ts                # POST /api/auth/register, /login, /forgot-password
│   ├── repository.ts            # db.execute calls for users
│   ├── tokens.ts                # signToken, verifyToken
│   └── middleware.ts            # domain-specific middleware (e.g., rateLimit)
├── chat/
│   ├── routes.ts
│   ├── repository.ts
│   └── sse.ts                   # SSE channel map + broadcast helpers
├── profile/
│   ├── routes.ts
│   └── repository.ts
└── _shared/
    ├── auth-middleware.ts       # requireAuth(request) helper
    ├── bearer.ts                # parseBearerToken(request)
    ├── response-helpers.ts      # ok(), error(), created(), noContent()
    ├── db-helpers.ts            # extractFirst(result), extractRows(result)
    ├── db.ts                    # Database singleton (db instance)
    └── serialization.ts         # toPublicUser(user) — strips password
```

**Domain boundaries:**
- `auth/` owns registration, login, password reset, session tokens.
- `chat/` owns messages, channels, SSE.
- `profile/` owns user profile read/update.
- Don't cross-call between domains — go through `_shared/` or compose at the parent router.

**`server/index.ts` composition pattern:**

```ts
import { ServerRouter } from 'elit/server';
import { registerAuthRoutes } from './auth/routes';
import { registerChatRoutes } from './chat/routes';
import { registerProfileRoutes } from './profile/routes';

export const router = new ServerRouter();

registerAuthRoutes(router);
registerChatRoutes(router);
registerProfileRoutes(router);
```

**`_shared/` rules:**
- Lower bar than `shared/`: server-only utilities. Can import `elit/server`, `elit/database`.
- Hoist a helper here on **second reuse**, not third. Don't pre-extract.
- Keep files small (≤150 lines). Split further if a helper grows.

**Domain `routes.ts` pattern:**

```ts
// src/server/auth/routes.ts
import type { ServerRouter } from 'elit/server';
import { requireAuth } from '../_shared/auth-middleware';
import { ok, error } from '../_shared/response-helpers';
import { toPublicUser } from '../_shared/serialization';
import { authRepo } from './repository';
import { signToken } from './tokens';

export const registerAuthRoutes = (router: ServerRouter): void => {
  router.post('/api/auth/register', async (req, res) => { /* ... */ });
  router.post('/api/auth/login', async (req, res) => { /* ... */ });
  router.get('/api/auth/me', async (req, res) => {
    const auth = requireAuth(req, res);
    if (!auth) return;
    ok(res, toPublicUser(auth.user));
  });
};
```

### `styles/` — global styles only

```
styles/
├── tokens.ts                    # createStyles() with CSS variables (colors, spacing, fonts)
├── reset.ts                     # base element styles
└── index.ts                     # injectStyles() — composes tokens + reset
```

**What goes here:**
- CSS variables (theme tokens).
- Reset/normalize rules.
- Base typography.
- Utility classes used app-wide.

**What does NOT go here:**
- Page-specific styles → co-locate with the page.
- Component-specific styles → co-locate with the component.

**`styles/tokens.ts` pattern:**

```ts
import { createStyles } from 'elit/style';

export const tokens = createStyles();
tokens.addVar('color-bg', '#ffffff');
tokens.addVar('color-surface', '#f9fafb');
tokens.addVar('color-border', '#e5e7eb');
tokens.addVar('color-primary', '#2563eb');
tokens.addVar('color-primary-hover', '#1d4ed8');
tokens.addVar('space-1', '4px');
tokens.addVar('space-2', '8px');
tokens.addVar('space-3', '12px');
tokens.addVar('space-4', '16px');
tokens.addVar('space-6', '24px');
tokens.addVar('radius-md', '8px');
tokens.addVar('font-size-base', '14px');
```

**`styles/index.ts` composition:**

```ts
import { injectStyles } from 'elit/style';
import { tokens } from './tokens';
import { reset } from './reset';

export const injectGlobalStyles = (): void => {
  injectStyles(tokens);
  injectStyles(reset);
};
```

### `shared/` — cross-runtime types and utilities

```
shared/
├── types/
│   ├── user.ts                  # User, PublicUser, AuthSession
│   ├── api.ts                   # ApiResult<T>, ApiError, Pagination
│   ├── chat.ts                  # Message, Channel
│   └── index.ts                 # barrel
├── utils/
│   ├── validation.ts            # isEmail, isStrongPassword
│   ├── format.ts                # formatDate, initials, truncate
│   └── index.ts                 # barrel
└── constants.ts                 # LIMITS, MAX_UPLOAD_SIZE
```

See `shared-code.md` for runtime boundary rules.

## Anti-patterns

| Smell | Fix |
|---|---|
| `server.ts` at 500+ lines | Split by domain into `server/<domain>/routes.ts`. |
| `styles.ts` at 1000+ lines | Move per-feature styles next to the feature. Keep tokens + reset global. |
| One `components/` folder with 20 files | Group into subfolders by area (`components/forms/`, `components/layout/`). |
| Re-declared types on client and server | Move to `shared/types/`. |
| Server route importing from a page file | Server and client don't share code except via `shared/`. |
| Page importing `elit/server` | Pages are client-only. Data fetching goes through `fetch()` or the client wrapper. |
| `databases/` schema file with logic | Schemas are data shapes only. Logic belongs in `server/<domain>/repository.ts`. |
| In-memory `Map` for state that needs to persist | Use `elit/database`. The in-memory map won't survive a restart. |
| Module-scope `createState` in a component | Declare inside the component function — module-scope state leaks across renders. |
| Cross-domain route handler import | Domains communicate via the router, not direct imports. |

## Adding a new feature — where does it go?

| Feature type | Location |
|---|---|
| New route (page) | `src/pages/<Area>/<Area>Page.ts` + `.styles.ts`, registered in `router.ts` |
| New API endpoint | `src/server/<domain>/routes.ts` |
| New database collection | `databases/<entity>.ts` (schema) + access in `server/<domain>/repository.ts` |
| New reusable UI | `src/components/<Name>/<Name>.ts` + `.styles.ts` |
| New server utility (used 2+ times) | `src/server/_shared/<name>.ts` |
| New shared type | `src/shared/types/<entity>.ts` |
| New shared validation/util | `src/shared/utils/<name>.ts` |
| New global style token | `src/styles/tokens.ts` |
| New domain | `src/server/<new-domain>/routes.ts` + register in `server/index.ts` |

## Migration from a flat layout

If the project currently has a flat `server.ts` and `styles.ts`:

1. **Don't rewrite all at once.** Migrate one domain at a time.
2. **Start with `_shared/`.** Extract `bearer.ts`, `response-helpers.ts`, `db-helpers.ts`, `serialization.ts` first — these are pure extractions with no behavior change.
3. **Pick the smallest domain** (usually `profile`) and move its routes to `server/profile/routes.ts`. Wire into `server/index.ts`.
4. **Repeat per domain** (auth, chat, users).
5. **Delete the old `server.ts`** when all routes are migrated.
6. **Then split styles**: move per-page styles to `pages/<area>/<Page>.styles.ts` one page at a time.
7. **Validate after each step** with `npm run typecheck` and `npm run dev`.

Each step should leave the app in a working state. If a step breaks the build, revert and try a smaller step.
