# File-Size Budget — Limits and Refactor Triggers

## Why budgets

Long files hide bugs. When a file exceeds its budget, the next change is harder to review, harder to test, and more likely to introduce regressions. The budgets below are based on what a reader can hold in working memory while making a change.

## Budget table

| File type | Soft | Hard |
|---|---|---|
| Browser entry (`main.ts`) | 30 | 50 |
| SSR shell (`client.ts`) | 30 | 50 |
| Router (`router.ts`) | 50 | 100 |
| Page (`pages/**/*.ts`) | 150 | 250 |
| Component (`components/**/*.ts`) | 100 | 200 |
| Server entry (`server/index.ts`) | 50 | 100 |
| Server domain routes (`server/<domain>/routes.ts`) | 150 | 250 |
| Server repository (`server/<domain>/repository.ts`) | 150 | 250 |
| Server middleware (`server/<domain>/middleware.ts`) | 100 | 200 |
| Server shared utility (`server/_shared/*.ts`) | 80 | 150 |
| Style file (`*.styles.ts`, `styles/*.ts`) | 200 | 400 |
| Shared type (`shared/types/*.ts`) | 80 | 150 |
| Shared utility (`shared/utils/*.ts`) | 80 | 150 |
| Native screen (`native-screen.ts`) | 200 | 400 |
| Test file (`*.test.ts`) | 200 | 400 |

- **Soft limit** = refactor trigger. Plan a split at the next opportunity.
- **Hard limit** = must split before merge. No exceptions without a documented reason in the PR.

## How to count

- Lines = total file lines including blank lines and comments.
- Imports count.
- For `.styles.ts` files, the count is the file's own lines, not the generated CSS.

Use `wc -l` or your editor's line count.

## Refactor playbooks

### `main.ts` over budget

**Symptoms:** Logic in the entry. Side-effect imports. Inline component composition that grew.

**Fix:** Move composition into a top-level `App` component.

```ts
// src/main.ts (target shape — ≤10 lines)
import { dom } from 'elit/dom';
import { injectGlobalStyles } from './styles';
import { App } from './components/App/App';

injectGlobalStyles();
dom.render('#app', App());
```

```ts
// src/components/App/App.ts
import { div } from 'elit/el';
import { reactive } from 'elit/state';
import { router } from '../../router';
import { RouterView } from '../../router';
import { Header } from '../Header/Header';
import { Footer } from '../Footer/Footer';

export const App = () =>
  div(
    Header(router),
    main(reactive(router.currentRoute, () => RouterView())),
    Footer()
  );
```

### `client.ts` over budget

**Symptoms:** Inline head metadata, script tags, base path logic.

**Fix:** Extract into `client-head.ts`:

```ts
// src/client-head.ts
import { title, link, meta, script } from 'elit/el';

export const headNodes = () => [
  title('App Name'),
  link({ rel: 'icon', href: '/favicon.svg' }),
  meta({ name: 'viewport', content: 'width=device-width, initial-scale=1' }),
];

export const bodyScripts = () => [
  script({ src: '/main.js', defer: true }),
];
```

```ts
// src/client.ts (target shape — ≤15 lines)
import { html, head, body, div } from 'elit/el';
import { headNodes, bodyScripts } from './client-head';

export const client = () =>
  html(
    head(...headNodes()),
    body(
      div({ id: 'app' }),
      ...bodyScripts()
    )
  );
```

### `router.ts` over budget

**Symptoms:** Long route table with handlers defined inline.

**Fix:** Group into sub-tables per area:

```ts
// src/pages/auth/authRoutes.ts
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';
import type { RouteEntry } from '../../router';

export const authRoutes: RouteEntry[] = [
  { path: '/login', component: (router) => LoginPage(router) },
  { path: '/register', component: (router) => RegisterPage(router) },
];
```

```ts
// src/router.ts (target shape — ≤30 lines)
import { createRouter, createRouterView } from 'elit/router';
import { HomePage } from './pages/HomePage';
import { authRoutes } from './pages/auth/authRoutes';
import { profileRoutes } from './pages/profile/profileRoutes';

const routes = [
  { path: '/', component: (router) => HomePage(router) },
  ...authRoutes,
  ...profileRoutes,
];

export const router = createRouter({ mode: 'hash', base: '/', routes });
export const RouterView = createRouterView(router, { mode: 'hash', routes });
export type RouteEntry = typeof routes[number];
```

### Page over budget

**Symptoms:** Inline sub-components, helpers, multiple concerns in one file.

**Fix:**
1. Extract sub-components into the same folder: `pages/chat/ChatMessageList.ts`, `pages/chat/ChatInput.ts`.
2. Move data-fetching hooks into `pages/<area>/use<Area>.ts` (client-side data loader).
3. Move styles into `<PageName>.styles.ts`.
4. Move form/validation logic into `pages/<area>/<Page>Model.ts`.

```
pages/
└── chat/
    ├── ChatPage.ts             # composition only
    ├── ChatPage.styles.ts
    ├── ChatMessageList.ts
    ├── ChatInput.ts
    └── useChat.ts              # data hook
```

### Component over budget

**Symptoms:** Multiple components in one file. Internal helpers mixed with the public export.

**Fix:** Split into a folder:

```
components/
└── Header/
    ├── Header.ts               # public export
    ├── HeaderNav.ts            # internal
    ├── HeaderUserMenu.ts       # internal
    ├── Header.styles.ts
    └── index.ts                # local barrel
```

### Server route file over budget

**Symptoms:** One `routes.ts` per domain has 20+ handlers. Request parsing duplicated.

**Fix:**
1. Move request/response shape parsing into `repository.ts` (input mappers).
2. Move repeated middleware chains into `middleware.ts`.
3. If a single domain has > 15 routes, split the domain (e.g., `chat/` into `chat/messages/` and `chat/channels/`).

```ts
// Before — 250-line routes.ts with inline validation
router.post('/api/chat/send', async (req, res) => {
  const auth = requireAuth(req, res); if (!auth) return;
  const { text, channelId } = req.body;
  if (!text || typeof text !== 'string' || text.length === 0) return error(res, 400, '...');
  if (text.length > 2000) return error(res, 400, '...');
  if (!channelId || typeof channelId !== 'string') return error(res, 400, '...');
  const channel = await channelRepo.getById(channelId);
  if (!channel) return error(res, 404, '...');
  if (!channel.members.includes(auth.user.id)) return error(res, 403, '...');
  const message = await messageRepo.create({ text, channelId, userId: auth.user.id });
  broadcastToChannel(channelId, message);
  ok(res, message);
});

// After — 80-line routes.ts that delegates
router.post('/api/chat/send', async (req, res) => {
  const auth = requireAuth(req, res); if (!auth) return;
  const input = parseCreateMessageInput(req.body);
  if (!input.ok) return error(res, 400, input.error);
  const message = await chatService.sendMessage(auth.user.id, input.value);
  ok(res, message);
});
```

### Repository over budget

**Symptoms:** Many `db.execute` calls with similar shapes.

**Fix:** Extract query builders into `_shared/db-helpers.ts`:

```ts
// src/server/_shared/db-helpers.ts
import type { Database } from 'elit/database';

export const extractRows = <T>(result: unknown): T[] => {
  const rows = (result as any)?.logs?.[0]?.args?.[0];
  return Array.isArray(rows) ? rows as T[] : [];
};

export const extractFirst = <T>(result: unknown): T | null => {
  const rows = extractRows<T>(result);
  return rows.length ? rows[0] : null;
};

export const findByField = async <T>(
  db: Database, collection: string, field: string, value: unknown
): Promise<T | null> => {
  const result = await db.execute(
    `db.${collection}.find({ ${field}: ${JSON.stringify(value)} }).toArray()`
  );
  return extractFirst<T>(result);
};
```

### Style file over budget

**Symptoms:** All page/component styles in one global file (the `auth-fullstack-example` pattern with 1182 lines).

**Fix:**
1. Identify styles used by one page → move to `pages/<Area>/<Page>.styles.ts`.
2. Identify styles used by one component → move to `components/<Name>/<Name>.styles.ts`.
3. Keep only theme tokens, reset, and global utilities in `styles/`.

Each `.styles.ts` file uses its own `createStyles()` instance, importing tokens from `styles/tokens.ts`.

### `shared/utils/` file over budget

**Symptoms:** Mixed concerns (validation + formatting + ID generation).

**Fix:** Split by concern:

```
shared/utils/
├── validation.ts   # isEmail, isStrongPassword, isUuid
├── format.ts       # formatDate, initials, truncate
└── id.ts           # generateId
```

## What to NOT do

- **Splitting too early.** Don't pre-extract. Wait for actual reuse (the Rule of Two: extract on second use, not first).
- **Splitting by accident of length.** A 250-line page that's a single coherent form is fine. A 100-line file with three unrelated concerns is not.
- **Creating tiny files.** A 5-line file is usually a sign of over-splitting. Aim for files that have one clear purpose and 30–200 lines.
- **Using `wc -l` as the only signal.** Cohesion matters more than line count. Use the budget as a trigger to *evaluate*, not a mandate to split.

## Reviewing a PR for size

- Any file with > 250 line additions? Ask for a split plan.
- Any file crossing a hard limit? Block until split.
- New file already at soft limit? Flag for future refactor.
- Imports pulling from a different domain's folder? Likely a boundary violation; flag it.
