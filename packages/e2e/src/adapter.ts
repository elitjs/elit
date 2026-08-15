import type { E2EApp } from './types';

/**
 * Structural types matching playwright-core's Browser/Context/Page surface —
 * pass your own playwright objects; @elitjs/e2e never imports playwright itself.
 */
export interface E2EBrowserLike {
  newContext(options?: Record<string, unknown>): Promise<E2EContextLike>;
}

export interface E2EContextLike {
  newPage(): Promise<E2EPageLike>;
  close(): Promise<void>;
}

export interface E2EPageLike {
  goto(url: string, options?: Record<string, unknown>): Promise<unknown>;
  screenshot(options?: Record<string, unknown>): Promise<Buffer>;
  content(): Promise<string>;
  textContent(selector: string, options?: Record<string, unknown>): Promise<string | null>;
  click(selector: string, options?: Record<string, unknown>): Promise<void>;
  fill(selector: string, value: string, options?: Record<string, unknown>): Promise<void>;
  evaluate<R>(fn: string | ((arg: unknown) => R), arg?: unknown): Promise<R>;
  close(): Promise<void>;
}

export interface AttachE2EOptions {
  /** Extra context options (viewport, locale, …) — baseURL is set for you. */
  contextOptions?: Record<string, unknown>;
}

export interface E2EAttachment {
  page: E2EPageLike;
  context: E2EContextLike;
  /** Navigates to a path on the e2e server (baseURL is already configured). */
  goto(path: string): Promise<unknown>;
  close(): Promise<void>;
}

/**
 * Bridges an elit e2e server to a real Playwright browser.
 *
 * You install playwright yourself (`npm i -D playwright`), then:
 *
 * ```ts
 * import { chromium } from 'playwright';
 * import { withE2EServer, attachE2E } from '@elitjs/e2e';
 *
 * await withE2EServer(router, async (app) => {
 *   const browser = await chromium.launch();
 *   const pw = await attachE2E(app, browser);
 *   await pw.goto('/');
 *   await pw.page.screenshot({ path: 'home.png' });
 *   await pw.close();
 *   await browser.close();
 * });
 * ```
 */
export async function attachE2E(
  app: E2EApp,
  browser: E2EBrowserLike,
  options: AttachE2EOptions = {},
): Promise<E2EAttachment> {
  const context = await browser.newContext({
    baseURL: app.url,
    ...options.contextOptions,
  });
  const page = await context.newPage();

  return {
    page,
    context,
    goto: (path: string) => page.goto(path),
    close: () => context.close(),
  };
}
