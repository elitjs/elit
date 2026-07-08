---
name: elit-ref-test
description: 'API reference for @elitjs/test: runTests, runJestTests, runWatchMode, setupGlobals/clearGlobals, globals object, transpileFile, TestReporter/DotReporter/JsonReporter/VerboseReporter, formatErrorStack, coverage tracking and reports (text/html/clover/coverage-final.json), TestMatchers/DescribeFunction/TestFunction/MockFunction/TestOptions types. Use when running tests programmatically or extending the test runner.'
argument-hint: 'Describe the test run config (files, reporter, coverage), globals setup, custom reporter, or coverage report you need.'
user-invocable: true
---

# @elitjs/test Reference

Built-in Jest-compatible test runner. `elit test` uses this internally — call programmatically when integrating into custom CLIs, CI scripts, or extending behavior.

## Exports

```ts
// Runner (from ./test)
function runTests(options?: TestOptions): Promise<void>;
function runJestTests(): Promise<void>;
function runWatchMode(): Promise<void>;

// Globals (from ./runtime)
interface TestMatchers<T> { /* see below */ }

function setupGlobals(): void;
function clearGlobals(): void;

const globals: {
  describe: DescribeFunction;
  it: TestFunction;
  test: TestFunction;
  expect: <T>(value: T) => TestMatchers<T>;
  beforeAll: (fn: HookFunction) => void;
  afterAll: (fn: HookFunction) => void;
  beforeEach: (fn: HookFunction) => void;
  afterEach: (fn: HookFunction) => void;
  vi: typeof vi;
};

function transpileFile(): Promise<string>;

// Coverage tracking
type CoverageOptions = { /* provider, reporter, include, exclude */ };
interface FileCoverage { /* internal */ }

function initializeCoverageTracking(): void;
function resetCoverageTracking(): void;
function markFileAsCovered(file: string): void;
function markLineExecuted(file: string, line: number, executed: boolean): void;
function getExecutedLines(file: string, coverage: FileCoverage): number[];
function calculateUncoveredLines(file: string, coverage: FileCoverage): number[];
function processCoverage(...args: any[]): any;
function generateTextReport(...args: any[]): string;
function generateHtmlReport(...args: any[]): string;
function generateCoverageFinalJson(...args: any[]): any;
function generateCloverXml(...args: any[]): string;

// Reporters
class TestReporter { /* default — dots + summary */ }
class DotReporter { /* one dot per test */ }
class JsonReporter { /* machine-readable JSON */ }
class VerboseReporter { /* every test name listed */ }

function formatErrorStack(stack: string, options?: any): string;
function formatProgress(passed: number, failed: number, skipped: number, total: number): string;

interface TestReporterOptions { /* internal */ }
interface JsonReport { /* internal */ }
interface JsonTestResult { /* internal */ }
```

## Type reference

### `TestOptions`

```ts
interface TestOptions {
  files?: string[];                // explicit file list (overrides include/exclude)
  include?: string[];              // glob patterns — default ['**/*.test.ts', '**/*.spec.ts']
  exclude?: string[];              // glob patterns to skip — default includes node_modules
  reporter?: 'default' | 'dot' | 'json' | 'verbose';   // default 'default'
  timeout?: number;                // per-test timeout ms — default 5000
  bail?: boolean;                  // stop on first failure — default false
  run?: boolean;                   // actually execute — default true
  watch?: boolean;                 // watch mode — default false
  endToEnd?: boolean;              // include e2e tests — default false
  colors?: boolean;                // ANSI colors — default true
  globals?: boolean;               // inject describe/it/expect/etc as globals — default true
  describePattern?: string;        // regex — only run matching describe blocks
  testPattern?: string;            // regex — only run matching tests
  coverage?: {
    enabled: boolean;
    provider: 'v8' | 'istanbul';   // default 'v8'
    reporter?: ('text' | 'html' | 'lcov' | 'json' | 'coverage-final.json' | 'clover')[];
    include?: string[];
    exclude?: string[];
  };
}
```

### `TestMatchers<T>`

Returned by `expect(value)`. Every matcher has a `.not` counterpart via `not: TestMatchers<any>`.

```ts
interface TestMatchers<T> {
  toBe(value: T): void;                       // Object.is — strict equality, no coercion
  toEqual(value: T): void;                    // deep equality
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeNull(): void;
  toBeUndefined(): void;
  toBeDefined(): void;
  toBeGreaterThan(value: number): void;
  toBeLessThan(value: number): void;
  toContain(value: any): void;                // substring or array member
  toHaveLength(length: number): void;
  toThrow(error?: any): void;                 // for functions — optional regex/class/string
  toMatch(pattern: RegExp | string): void;
  toBeInstanceOf(classType: any): void;
  toHaveProperty(path: string | string[], value?: any): void;
  toBeCalled(): void;                         // mock was called at least once
  toBeCalledTimes(times: number): void;
  toBeCalledWith(...args: any[]): void;
  lastReturnedWith(value: any): void;
  not: TestMatchers<any>;
  resolves: TestMatchers<any>;                // unwrap successful promise
  rejects: TestMatchers<any>;                 // unwrap rejected promise
}
```

### `DescribeFunction` and `TestFunction`

```ts
interface DescribeFunction {
  (name: string, fn: () => void): void;
  skip: (name: string, fn: () => void) => void;
  only: (name: string, fn: () => void) => void;
}

interface TestFunction {
  (name: string, fn: () => void | Promise<void>, timeout?: number): void;
  skip: (name: string, fn: () => void, timeout?: number): void;
  only: (name: string, fn: () => void, timeout?: number): void;
  todo: (name: string, fn: () => void, timeout?: number) => void;
}
```

### `MockFunction<T>`

From `vi.fn(implementation)`. Tracks calls and results.

```ts
interface MockFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T>;
  _isMock: boolean;
  _calls: Parameters<T>[];
  _results: Array<{ type: 'return' | 'throw'; value: any }>;
  _implementation: T | null;
  mockImplementation(fn: T): MockFunction<T>;
  mockReturnValue(value: ReturnType<T>): MockFunction<T>;
  mockResolvedValue(value: ReturnType<T>): MockFunction<T>;
  mockRejectedValue(value: any): MockFunction<T>;
  restore(): void;
  clear(): void;
}
```

Inspect `_calls` / `_results` directly, or via `expect(mock).toBeCalledWith(...)`.

## Patterns

### Run tests programmatically

```ts
import { runTests } from '@elitjs/test';

await runTests({
  include: ['test/**/*.test.ts'],
  reporter: 'verbose',
  timeout: 10000,
  coverage: { enabled: true, provider: 'v8', reporter: ['text', 'html'] }
});
```

### Use globals in test files

```ts
// test/counter.test.ts
import { describe, it, expect } from '@elitjs/test';
import { createState } from '@elitjs/state';

describe('counter', () => {
  it('increments', () => {
    const c = createState(0);
    c.value = 1;
    expect(c.value).toBe(1);
  });

  it.skip('TODO: deep equal', () => {});
});
```

If `globals: true` (default), you can omit the imports — `describe`, `it`, `expect`, etc. are global.

### Custom CLI with globals injection

```ts
import { setupGlobals, runTests, clearGlobals } from '@elitjs/test';

setupGlobals();   // inject describe/it/expect onto global
try {
  await runTests({ files: ['./test/foo.test.ts'] });
} finally {
  clearGlobals();
}
```

### Watch mode

```ts
import { runWatchMode } from '@elitjs/test';

await runWatchMode();   // blocks — re-runs on file change
```

Equivalent to `elit test --watch`.

### Mocks

```ts
import { vi } from '@elitjs/test';

const fetch = vi.fn(() => Promise.resolve({ ok: true }));

await fetch('https://example.com');
expect(fetch).toBeCalledTimes(1);
expect(fetch).toBeCalledWith('https://example.com');

fetch.mockResolvedValue({ ok: false });
```

### Asynchronous assertions

```ts
it('resolves to user', async () => {
  await expect(fetchUser(1)).resolves.toEqual({ id: 1, name: 'Ann' });
});

it('rejects on missing', async () => {
  await expect(fetchUser(-1)).rejects.toThrow('not found');
});
```

### Custom reporter

```ts
import { runTests, TestReporter } from '@elitjs/test';

class MyReporter extends TestReporter {
  onTestResult(result: TestResult) {
    console.log(result.status, result.name, result.duration + 'ms');
  }
}

await runTests({ reporter: 'default' });   // pass instance via custom runner if needed
```

For full custom reporter control, instantiate `TestReporter`/`DotReporter`/`JsonReporter`/`VerboseReporter` directly and pass to a manual runner.

### Coverage

```ts
await runTests({
  coverage: {
    enabled: true,
    provider: 'v8',                  // or 'istanbul'
    reporter: ['text', 'html', 'lcov', 'clover'],
    include: ['src/**'],
    exclude: ['src/**/*.test.ts']
  }
});
```

Reporters write to `coverage/` by default:
- `text` — stdout summary
- `html` — `coverage/index.html`
- `lcov` — `coverage/lcov.info` (CI)
- `clover` — `coverage/clover.xml`
- `json` — `coverage/coverage-final.json`

## Rules

- `globals: true` (default) injects `describe/it/test/expect/beforeAll/afterAll/beforeEach/afterEach/vi` onto `globalThis`. If you set `globals: false`, import them explicitly in every test file.
- `runTests()` returns a promise — always `await` it. Forgetting means the process exits before tests finish.
- `timeout` is per-test (ms). Default 5000. Long async tests need to bump it.
- `bail: true` stops at the first failing test — useful in CI to fail fast.
- `describePattern` / `testPattern` filter by regex match against the test's full name (parent describes + own name).
- `coverage.provider: 'v8'` uses V8's native coverage (faster, less precise on edge cases). `'istanbul'` instruments source (slower, more granular).
- `setupGlobals()` and `clearGlobals()` are idempotent — calling twice is safe.
- `_calls` and `_results` on `MockFunction` are public arrays — inspect them in custom assertions.
- `transpileFile()` is the same transpiler the runner uses internally. Use it when building custom tooling that needs to load TS at runtime.

## Anti-Patterns

- Using `toBe` for objects/arrays. Use `toEqual` for deep equality — `toBe` checks reference identity.
- `expect(fn).toThrow()` without actually wrapping `fn` in a function. `expect(fn())` runs `fn` immediately and the error escapes the matcher.
- Calling `setupGlobals()` outside the test process. It mutates `globalThis` of the current process only.
- Mixing `vi.fn()` with module-level imports of the real implementation. Mock before the system-under-test imports the dependency.
- Forgetting `await` inside `it('...', async () => { ... })`. The runner awaits the returned promise, but un-awaited inner rejections escape.
- Enabling coverage in watch mode — re-instrumenting on every change is slow. Toggle coverage off when iterating.
- Calling `clearGlobals()` while a test is still running — globals disappear mid-test, leading to `ReferenceError`.

## Validation

- `runTests({ files: ['./test/foo.test.ts'] })` should execute the file and print results.
- `setupGlobals()` should make `typeof globalThis.describe === 'function'` true.
- `expect(2).toBe(2)` should not throw; `expect(2).toBe(3)` should throw with a diff.
- `vi.fn()` should produce a function where `_isMock === true`.
- `runTests({ reporter: 'json' })` should print a JSON object to stdout with `total`, `passed`, `failed`, `skipped`.
