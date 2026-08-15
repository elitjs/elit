import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { openE2EPage, type E2EPage, type E2EPageOptions } from './browser';
import { buildTraceViewerHtml } from './trace';
import { startE2EServer } from './server';
import type { E2EServerTarget } from './server';
import type { E2EApp, E2EServerOptions } from './types';

/**
 * `withE2EServer` plus a real browser page — both close automatically when the
 * callback finishes, whether the test passed or failed.
 *
 * ```ts
 * await withE2EPage(router, async (page, app) => {
 *   await page.goto('/');
 *   await page.screenshot({ path: 'home.png' });
 * });
 * ```
 */
export async function withE2EPage<T>(
  target: E2EServerTarget | (() => E2EServerTarget),
  fn: (page: E2EPage, app: E2EApp) => T | Promise<T>,
  options?: E2EServerOptions & E2EPageOptions,
): Promise<T> {
  const makeTarget = (): E2EServerTarget => (typeof target === 'function' ? (target as () => E2EServerTarget)() : target);
  const { port, host, ...pageOptions } = options ?? {};

  const app = await startE2EServer(makeTarget(), { port, host });
  const page = await openE2EPage(app, pageOptions);

  const traceEnabled = pageOptions.trace ?? process.env.ELIT_E2E_TRACE !== undefined;
  if (traceEnabled) {
    await page.startTracing('e2e page');
  }

  let failed = false;
  try {
    return await fn(page, app);
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    if (traceEnabled && failed) {
      await writeTraceArtifact(page);
    }
    await page.close();
    await app.close();
  }
}

/** Dumps the page trace as a self-contained HTML viewer under e2e-traces/. */
export async function writeTraceArtifact(page: E2EPage, dir = 'e2e-traces'): Promise<string | undefined> {
  const trace = await page.stopTracing();
  if (!trace || trace.steps.length === 0) return undefined;
  const html = buildTraceViewerHtml(trace);
  await mkdir(dir, { recursive: true });
  const path = join(dir, `trace-${Date.now()}.html`);
  await writeFile(path, html);
  console.log(`Trace saved to ${path} — open with: elit e2e show-trace ${path}`);
  return path;
}
