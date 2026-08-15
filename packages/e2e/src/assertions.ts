import type { E2EActionOptions, E2EPage, E2EWaitOptions } from './browser';
import type { E2EFrame } from './browser';
import { pollUntil } from './browser';
import { matcherSource, parseSelector } from './selectors';
import type { E2EResponse } from './response';

/**
 * Playwright-style response assertions:
 *
 * ```ts
 * const res = await request.get('/api/todos');
 * expectResponse(res).toBeOK();
 * expectResponse(res).toHaveStatus(200);
 * ```
 */
export class E2EResponseAssertions {
  constructor(private readonly response: E2EResponse) {}

  private assert(condition: boolean, message: string): void {
    if (!condition) {
      throw new Error(`${message} (got ${this.response.status()} ${this.response.url})`);
    }
  }

  /** Passes when the response status is 2xx — mirrors Playwright's toBeOK(). */
  toBeOK(): void {
    this.assert(this.response.ok(), `Expected response to be ok (2xx)`);
  }

  toHaveStatus(status: number): void {
    this.assert(this.response.status() === status, `Expected response status ${status}`);
  }

  toHaveHeader(name: string, value: string): void {
    const actual = this.response.headerValue(name);
    this.assert(actual === value, `Expected header "${name}" to be "${value}", received "${actual}"`);
  }

  async toHaveJSONBody<T = unknown>(expected: T): Promise<void> {
    const actual = await this.response.json();
    const condition =
      typeof expected === 'object' && expected !== null
        ? JSON.stringify(actual) === JSON.stringify(expected)
        : actual === expected;
    this.assert(
      condition,
      `Expected JSON body ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
}

export function expectResponse(response: E2EResponse): E2EResponseAssertions {
  return new E2EResponseAssertions(response);
}

const DEFAULT_ASSERT_TIMEOUT_MS = 5000;

/**
 * Playwright-style auto-retrying DOM assertions — each matcher polls the page
 * until it passes or the timeout (default 5000ms) is reached, so tests tolerate
 * async rendering without manual waitFor calls.
 *
 * ```ts
 * await expectSelector(page, 'h1').toBeVisible();
 * await expectSelector(page, '#count').toHaveText('Clicked 2 times');
 * ```
 */
/** Anything that can host selector assertions — a page or an iframe. */
export interface E2ESelectorHost {
  waitForSelector(selector: string, options?: E2EWaitOptions): Promise<void>;
  evaluate<T = unknown>(fn: string | (() => T | Promise<T>)): Promise<T>;
  textContent(selector: string, options?: E2EActionOptions): Promise<string | null>;
}

export class E2ESelectorAssertions {
  constructor(
    private readonly page: E2EPage | E2EFrame,
    private readonly selector: string,
  ) {}

  private async poll(check: () => Promise<boolean>, message: string, timeout?: number): Promise<void> {
    await pollUntil(check, {
      timeout: timeout ?? DEFAULT_ASSERT_TIMEOUT_MS,
      message: `${message} (selector: "${this.selector}")`,
    });
  }

  async toBeVisible(timeout?: number): Promise<void> {
    await this.poll(async () => {
      await this.page.waitForSelector(this.selector, { state: 'attached', timeout: 1000 }).catch(() => undefined);
      return this.page.evaluate(`(function () {
        const element = ${matcherSource(parseSelector(this.selector))}[0];
        if (!element) return false;
        return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
      })()`);
    }, 'Expected element to be visible', timeout);
  }

  async toBeHidden(timeout?: number): Promise<void> {
    await this.poll(
      () =>
        this.page.evaluate(`(function () {
          const element = ${matcherSource(parseSelector(this.selector))}[0];
          if (!element) return true;
          return !(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
        })()`),
      'Expected element to be hidden',
      timeout,
    );
  }

  async toHaveText(text: string, timeout?: number): Promise<void> {
    await this.poll(
      async () => (await this.page.textContent(this.selector, { timeout: 1000 }))?.trim() === text.trim(),
      `Expected element text to be "${text}"`,
      timeout,
    );
  }

  async toHaveValue(value: string, timeout?: number): Promise<void> {
    await this.poll(
      () =>
        this.page.evaluate(`${matcherSource(parseSelector(this.selector))}[0]?.value === ${JSON.stringify(value)}`),
      `Expected input value to be "${value}"`,
      timeout,
    );
  }

  async toHaveCount(count: number, timeout?: number): Promise<void> {
    await this.poll(
      () =>
        this.page.evaluate(`${matcherSource(parseSelector(this.selector))}.length === ${count}`),
      `Expected element count to be ${count}`,
      timeout,
    );
  }
}

export function expectSelector(host: E2ESelectorHost, selector: string): E2ESelectorAssertions {
  return new E2ESelectorAssertions(host as E2EPage | E2EFrame, selector);
}
