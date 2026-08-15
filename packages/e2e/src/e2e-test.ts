import { writeTraceArtifact } from './lifecycle';
import { startE2EServer } from './server';
import type { E2EServerTarget } from './server';
import type { E2EApp, E2EAPIRequest, E2EServerOptions, E2ETestFixtures } from './types';

type GlobalTest = ((name: string, fn: () => void | Promise<void>, timeout?: number) => void) & {
  skip?: (name: string, fn: () => void | Promise<void>, timeout?: number) => void;
  only?: (name: string, fn: () => void | Promise<void>, timeout?: number) => void;
};

type GlobalDescribe = (name: string, fn: () => void) => void;

function globalTest(): GlobalTest {
  const globals = globalThis as { test?: GlobalTest; it?: GlobalTest };
  const test = globals.test ?? globals.it;
  if (!test) {
    throw new Error(
      'e2eTest() needs the @elitjs/test globals (test/it). Run via `elit test` or call setupGlobals() first.',
    );
  }
  return test;
}

export interface E2ETest {
  /** Declares a test with `{ app, request }` fixtures — a fresh server per test. */
  (name: string, fn: (fixtures: E2ETestFixtures) => void | Promise<void>, timeout?: number): void;
  skip(name: string, fn: (fixtures: E2ETestFixtures) => void | Promise<void>, timeout?: number): void;
  only(name: string, fn: (fixtures: E2ETestFixtures) => void | Promise<void>, timeout?: number): void;
  /** Groups tests — every test inside still gets its own fresh server. */
  describe(name: string, fn: () => void): void;
}

/**
 * Playwright-style test factory: every test gets `{ app, request }` fixtures and
 * a fresh server that closes automatically when the test ends — pass or fail.
 *
 * ```ts
 * const test = e2eTest(() => createTodoRouter());
 *
 * test('lists todos', async ({ request }) => {
 *   const res = await request.get('/api/todos');
 *   expectResponse(res).toBeOK();
 * });
 * ```
 *
 * @param target a `ServerRouter` (reused as-is) or a factory returning a fresh
 *   router/handler per test — the factory form keeps every test isolated.
 */
export function e2eTest(
  target: E2EServerTarget | (() => E2EServerTarget),
  options?: E2EServerOptions & { trace?: boolean },
): E2ETest {
  const makeTarget = (): E2EServerTarget =>
    typeof target === 'function' ? (target as () => E2EServerTarget)() : target;

  const traceEnabled = options?.trace ?? process.env.ELIT_E2E_TRACE !== undefined;

  const declare = (raw: GlobalTest) => (name: string, fn: (fixtures: E2ETestFixtures) => void | Promise<void>, timeout?: number) =>
    raw(name, async () => {
      const app = await startE2EServer(makeTarget(), options);
      const page = traceEnabled ? await import('./browser').then((m) => m.openE2EPage(app)) : undefined;
      if (page) await page.startTracing(name);
      const fixtures: E2ETestFixtures = { app, request: app.request };
      if (page) fixtures.page = page;
      try {
        await fn(fixtures);
      } catch (error) {
        if (page) await writeTraceArtifact(page);
        throw error;
      } finally {
        await page?.close();
        await app.close();
      }
    }, timeout);

  const test = declare(globalTest()) as unknown as E2ETest;

  test.skip = (name, fn, timeout) => {
    const raw = globalTest().skip;
    if (raw) declare(raw)(name, fn, timeout);
  };
  test.only = (name, fn, timeout) => {
    const raw = globalTest().only;
    if (raw) declare(raw)(name, fn, timeout);
  };
  test.describe = (name: string, fn: () => void) => {
    const describe = (globalThis as { describe?: GlobalDescribe }).describe;
    if (!describe) throw new Error('e2eTest().describe needs the @elitjs/test globals (describe).');
    describe(name, fn);
  };

  return test;
}
