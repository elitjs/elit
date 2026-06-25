# elit/test — TestOptions

Test runner config. Tests run via `elit test` (or `npm test`).

## Basic Config

```ts
// elit.config.ts
export default {
  test: {
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', 'benchmark', 'docs', 'coverage'],
    testTimeout: 5000,
    bail: false,
    globals: true,
    watch: false,
    reporter: 'verbose'
  }
};
```

## Full Options

```ts
interface TestOptions {
  environment?: 'node' | 'jsdom' | 'happy-dom' | 'edge-runtime';
  globals?: boolean;          // inject describe/it/expect globally
  setupFiles?: string[];      // run before each test file
  include?: string[];         // test file patterns
  exclude?: string[];         // paths to skip
  testTimeout?: number;       // default 5000ms
  isolate?: boolean;          // isolate each test file (default true)
  pool?: string;              // 'threads' | 'forks'
  poolOptions?: {
    threads?: {
      singleThread?: boolean;
      minThreads?: number;
      maxThreads?: number;
      isolate?: boolean;
    };
    forks?: {
      singleFork?: boolean;
      minForks?: number;
      maxForks?: number;
      isolate?: boolean;
    };
  };
  coverage?: TestCoverageOptions;
  watch?: boolean;
  ui?: boolean;
  reporter?: 'verbose' | 'dot' | 'json' | 'tap';
  bail?: number | boolean;    // stop after N failures
  pattern?: string | RegExp;  // filter test names
  colors?: boolean;
  retry?: number;             // retries on failure
  includeSrc?: string[];      // source files for coverage analysis
  excludeSrc?: string[];
  env?: Record<string, string>;
}

interface TestCoverageOptions {
  provider?: 'v8' | 'istanbul';
  reporter?: ('text' | 'json' | 'html' | 'lcov' | 'lcovonly' | 'coverage-final.json' | 'clover')[];
  dir?: string;
  include?: string[];
  exclude?: string[];
  thresholds?: {
    lines?: number;
    functions?: number;
    branches?: number;
    statements?: number;
  };
  all?: boolean;
}
```

## Coverage Example

```ts
test: {
  coverage: {
    enabled: true,
    provider: 'v8',
    reporter: ['text', 'html', 'lcov', 'json', 'coverage-final.json', 'clover'],
    include: ['**/*.ts'],
    exclude: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**', '**/dist/**', '**/coverage/**'],
    thresholds: {
      lines: 80,
      functions: 75,
      branches: 70,
      statements: 80
    }
  }
}
```

Run with: `npm run test:coverage` → `elit test --coverage`.

## Example Test File

```ts
// src/utils/format.test.ts
import { describe, it, expect } from 'elit/test';

describe('format', () => {
  it('formats currency', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
  });

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });
});
```

When `globals: true`, you can omit the imports:

```ts
// with globals: true
describe('format', () => {
  it('works', () => {
    expect(1 + 1).toBe(2);
  });
});
```

## Async Tests

```ts
import { describe, it, expect } from 'elit/test';

describe('user API', () => {
  it('fetches a user', async () => {
    const user = await fetchUser('abc');
    expect(user.name).toBe('Ada');
  });

  it('rejects unknown user', async () => {
    await expect(fetchUser('xyz')).rejects.toThrow('not found');
  });
});
```

## Setup Files

Run before each test file. Use for test DB setup, mocking, polyfills.

```ts
test: {
  setupFiles: ['./test/setup.ts']
}
```

```ts
// test/setup.ts
import { beforeAll, afterAll } from 'elit/test';
import { startTestServer } from './testServer';

beforeAll(async () => {
  await startTestServer();
});

// afterAll(() => stop());
```

## Environment Selection

```ts
test: {
  environment: 'jsdom'        // for DOM tests
  // OR
  environment: 'happy-dom'    // faster DOM, less complete
  // OR
  environment: 'node'         // (default) for server tests
  // OR
  environment: 'edge-runtime' // for edge runtime polyfills
}
```

## Watch Mode

```ts
test: { watch: true }
```

Or via CLI: `elit test --watch` / `npm run test:watch`.

## Reporter Options

```ts
test: { reporter: 'verbose' }  // every test name listed
test: { reporter: 'dot' }      // minimal — one dot per test
test: { reporter: 'json' }     // machine-readable JSON output
test: { reporter: 'tap' }      // TAP format
```

For CI, `'dot'` is concise; for local dev, `'verbose'` is most informative.

## CLI

```bash
elit test                                       # run all
elit test --run --file ./src/utils.test.ts     # one file
elit test --watch                              # watch mode
elit test --coverage                           # with coverage
elit test --pattern "format"                   # filter by name
elit test --bail 1                             # stop on first failure
```

## Gotchas

- **`globals: true` mixing with explicit imports** — both work; pick one style per project.
- **Async tests without `await` or `return`** — test resolves before the assertion runs. Always `await` or `return` the promise.
- **`testTimeout` too low for integration tests** — bump to 30000 for DB/network tests.
- **Coverage `include` catching test files** — set `exclude: ['**/*.test.ts']` to keep coverage focused on source.
- **`isolate: false`** — faster but tests can leak state into each other. Use only when you control ordering.
- **`watch: true` in CI** — never terminates. Use `--run` explicitly.
- **DOM tests without `environment: 'jsdom'`** — `document` is undefined, throws.
