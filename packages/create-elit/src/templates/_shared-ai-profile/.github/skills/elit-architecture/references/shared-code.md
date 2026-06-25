# Shared Code — Client/Server Boundary

The `shared/` directory holds types and utilities used by **both** the browser and the server. Getting this right is what lets types flow from server response to client rendering without redeclaration drift.

## What belongs in `shared/`

| Belongs | Doesn't belong |
|---|---|
| Type definitions (`User`, `PublicUser`, `Message`, `ApiResult<T>`) | Server logic (queries, hashing) |
| Pure validation (`isEmail`, `isStrongPassword`) | DOM-only utilities (`querySelector` wrappers) |
| Pure formatting (`formatDate`, `initials`, `truncate`) | Server-only config (DB connection strings) |
| Pure ID/format generators (`generateId`, `slugify`) | Native-only code (IR generation) |
| Constants shared across the wire (`LIMITS`, `MAX_FILE_SIZE`) | Constants used by one side only |

The test: **does both the client and the server import this?** If yes, it belongs in `shared/`. If only one side, keep it on that side.

## Runtime boundary rules

Code in `shared/` MUST NOT:

- Import from `elit/server`, `elit/database` — these are server-only.
- Import from `elit/desktop`, `elit/native` — these are runtime-injected only.
- Use `document.*`, `window.*`, `process.env.*` directly.
- Use Node.js built-ins (`fs`, `path`, `crypto`) — these don't exist in browsers.

Code in `shared/` MAY:

- Import from `elit/state` (reactive primitives work in both runtimes).
- Import from `elit/el` (element factories are runtime-agnostic).
- Import from `elit/router` (router works in both).
- Use standard web/JS globals: `URL`, `URLSearchParams`, `JSON`, `Math`, `Date`, `Array`, `Object`, `Promise`, `fetch` (in modern browsers and Node 18+).

## Layout

```
src/shared/
├── types/
│   ├── user.ts          # User, PublicUser, AuthSession
│   ├── api.ts           # ApiResult<T>, ApiError, Pagination
│   ├── chat.ts          # Message, Channel
│   └── index.ts         # barrel: export * from './user'; export * from './api'; ...
├── utils/
│   validation.ts        # isEmail, isStrongPassword, isUsername
│   format.ts            # formatDate, initials, truncate
│   id.ts                # generateId
│   fetch.ts             # fetchJson<T> client wrapper
│   └── index.ts         # barrel
└── constants.ts         # LIMITS, MAX_UPLOAD_SIZE
```

## Type definitions

Define types once in `shared/types/` and import them on both sides.

```ts
// src/shared/types/user.ts
export interface User {
  id: string;
  email: string;
  password: string;  // hashed; server-only — strip at boundary
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: PublicUser;
  token: string;
  expiresAt: string;
}
```

```ts
// src/shared/types/api.ts
export interface ApiResult<T> {
  data?: T;
  error?: string;
}

export interface ApiError {
  error: string;
  code?: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: Pagination;
}
```

**Server uses the full type** and converts to a public view at the boundary:

```ts
// src/server/_shared/serialization.ts
import type { User, PublicUser } from '../../../shared/types/user';

export const toPublicUser = (user: User): PublicUser => {
  const { password: _, ...rest } = user;
  return rest;
};
```

**Client only ever sees the public view:**

```ts
// src/pages/profile/ProfilePage.ts
import type { PublicUser } from '../../../shared/types/user';
import { createState } from 'elit/state';
import { fetchJson } from '../../../shared/utils/fetch';

export const ProfilePage = () => {
  const user = createState<PublicUser | null>(null);
  fetchJson<PublicUser>('/api/profile').then(data => user.value = data);
  // ...
};
```

## Validation

Same rules apply on both sides. Define once.

```ts
// src/shared/utils/validation.ts
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isEmail = (value: string): boolean => EMAIL_RE.test(value);

export const isStrongPassword = (password: string): boolean =>
  password.length >= 8 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /[0-9]/.test(password);

export const isUsername = (value: string): boolean =>
  /^[a-zA-Z0-9_]{3,20}$/.test(value);

export const validateEmail = (value: string): string | null =>
  isEmail(value) ? null : 'Invalid email format';

export const validatePassword = (value: string): string | null =>
  isStrongPassword(value)
    ? null
    : 'Password must be at least 8 characters with uppercase, lowercase, and a number';
```

**Client form:**

```ts
import { validateEmail } from '../../../shared/utils/validation';
import { computed } from 'elit/state';

const emailError = computed({ email }, ({ email }) => validateEmail(email));
```

**Server handler:**

```ts
import { isEmail } from '../../shared/utils/validation';

if (!isEmail(email)) return sendBadRequest(res, 'Invalid email');
```

## Formatting

Date, number, and string formatting belong here too.

```ts
// src/shared/utils/format.ts
export const formatDate = (iso: string, locale = 'en-US'): string =>
  new Date(iso).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

export const formatRelative = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
};

export const initials = (name: string): string =>
  name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

export const truncate = (value: string, max: number): string =>
  value.length > max ? value.slice(0, max - 1) + '…' : value;
```

## Client fetch wrapper

A typed fetch wrapper belongs in `shared/utils/` because both pages and any client-side logic use it. It returns the typed data or throws.

```ts
// src/shared/utils/fetch.ts
import type { ApiResult } from '../types/api';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const fetchJson = async <T>(
  url: string,
  init?: RequestInit
): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  const body: ApiResult<T> = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(response.status, body.error ?? `HTTP ${response.status}`);
  }

  return body.data as T;
};

export const fetchJsonWithAuth = <T>(
  url: string,
  token: string,
  init?: RequestInit
): Promise<T> =>
  fetchJson<T>(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
```

## Constants shared across the wire

When a constant affects both client display and server validation, define it once:

```ts
// src/shared/constants.ts
export const LIMITS = {
  USERNAME_MIN: 3,
  USERNAME_MAX: 20,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 128,
  BIO_MAX: 500,
  MESSAGE_MAX: 2000,
  CHANNEL_NAME_MAX: 50,
} as const;

export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;  // 10 MB
```

Both sides reference `LIMITS.MESSAGE_MAX`. Change once, both sides update.

**Server handler:**

```ts
import { LIMITS } from '../../shared/constants';

if (text.length > LIMITS.MESSAGE_MAX) {
  return sendBadRequest(res, `Message exceeds ${LIMITS.MESSAGE_MAX} characters`);
}
```

**Client form (counter):**

```ts
import { LIMITS } from '../../../shared/constants';

span(`${text.value.length} / ${LIMITS.MESSAGE_MAX}`)
```

## Anti-patterns

| Smell | Fix |
|---|---|
| Server imports `elit/server` from `shared/` | Move the server-only code out of `shared/` into `server/_shared/` or `server/<domain>/`. |
| Client imports `document.*` in `shared/` | Move DOM code to a client utility outside `shared/` (e.g., `src/client/utils/`). |
| Type re-declared on the client | Move the type to `shared/types/`. |
| Validation regex duplicated | Move to `shared/utils/validation.ts`. |
| `process.env.X` accessed from `shared/` | Pass values explicitly; don't read env at runtime in `shared/`. The server should read env and pass the value in. |
| Mixed `User` and `PublicUser` use on the client | The client should only ever see `PublicUser`. Convert at the server boundary. |
| `fetch()` called directly in pages | Wrap in `shared/utils/fetch.ts` for consistent error handling and typing. |
| Constants hardcoded on both sides | Move to `shared/constants.ts`. |

## Wiring with `resolve.alias`

For cleaner imports, configure aliases in `elit.config.ts`:

```ts
// elit.config.ts
import path from 'node:path';
import { defineConfig } from 'elit/config';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './src/shared'),
      '@server': path.resolve(__dirname, './src/server'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@components': path.resolve(__dirname, './src/components'),
    },
  },
});
```

```ts
// Before:
import type { User } from '../../../shared/types/user';
import { isEmail } from '../../../shared/utils/validation';

// After:
import type { User } from '@shared/types/user';
import { isEmail } from '@shared/utils/validation';
```

Top-level `resolve.alias` is inherited by `dev`, `preview`, and `build`, so the alias works in every runtime. Per-target `resolve.alias` extends (and overrides) the inherited map — re-declare keys you want to keep if you override.

Longest key wins on conflicts: `@app` is checked before `@`. Bare `node_modules` imports pass through untouched.

## Boundary diagram

```
┌─────────────────────────────────────────────────────────┐
│ Browser bundle (built from src/main.ts)                 │
│                                                         │
│   src/main.ts                                           │
│   src/router.ts                                         │
│   src/pages/**/*          (client-only)                 │
│   src/components/**/*     (client-only)                 │
│   src/styles/**/*         (client-only)                 │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │ src/shared/**/*  (also imported by server)      │   │
│   │   - types only                                  │   │
│   │   - pure functions (validation, format)         │   │
│   │   - no DOM, no server imports                   │   │
│   └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Server bundle (loaded from elit.config.ts → dev.api)    │
│                                                         │
│   src/server/index.ts                                   │
│   src/server/<domain>/**                                │
│   src/server/_shared/**                                 │
│   databases/**                                          │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │ src/shared/**/*  (also imported by client)      │   │
│   │   - same code, same behavior                    │   │
│   │   - no server-only imports from here            │   │
│   └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

If you find yourself wanting to add a server-only import to `shared/`, the code belongs in `server/_shared/` instead.
