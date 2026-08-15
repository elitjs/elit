import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';

import type { E2EApp } from './types';
import { matcherSource, parseSelector, type E2ESelectorQuery } from './selectors';
import { extractVp8Frame, muxWebM, type E2EVideoFrame } from './video';
import type { E2ETrace, E2ETraceStep } from './trace';

const BROWSER_ENV = 'ELIT_E2E_BROWSER';

function isExecutableOnPath(command: string): boolean {
    const extensions = process.platform === 'win32' ? ['.exe', '.cmd', '.bat'] : [''];

    for (const dir of (process.env.PATH ?? '').split(delimiter).filter(Boolean)) {
        for (const extension of extensions) {
            if (existsSync(join(dir, command + extension))) {
                return true;
            }
        }
    }

    return false;
}

function findBrowserExecutable(): string | undefined {
  const custom = process.env[BROWSER_ENV];
  if (custom) return custom;

  const candidates: string[] = [];
  if (process.platform === 'win32') {
    for (const programFiles of ['C:/Program Files', 'C:/Program Files (x86)']) {
      candidates.push(
        `${programFiles}/Google/Chrome/Application/chrome.exe`,
        `${programFiles}/Microsoft/Edge/Application/msedge.exe`,
      );
    }
  } else if (process.platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    );
  } else {
    candidates.push('google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge');
  }

  return candidates.find((candidate) => existsSync(candidate) || isExecutableOnPath(candidate));
}

/** Minimal CDP session over the platform's global WebSocket. */
class CDPSession {
  private socket?: WebSocket;
  private nextId = 1;
  private readonly pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  private readonly listeners = new Map<string, Set<(params: any) => void>>();

  constructor(private readonly timeoutMs = 15000) {}

  async connect(wsUrl: string): Promise<void> {
    await new Promise<void>((resolvePromise, reject) => {
      const socket = new WebSocket(wsUrl);
      this.socket = socket;
      socket.addEventListener('open', () => resolvePromise());
      socket.addEventListener('error', () => reject(new Error(`Failed to connect to browser at ${wsUrl}`)));
    });

    this.socket!.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id !== undefined && this.pending.has(message.id)) {
        const entry = this.pending.get(message.id)!;
        this.pending.delete(message.id);
        if (message.error) {
          entry.reject(new Error(`${message.error.message ?? 'CDP error'}`));
        } else {
          entry.resolve(message.result);
        }
        return;
      }
      if (message.method) {
        for (const listener of this.listeners.get(message.method) ?? []) {
          listener(message.params ?? {});
        }
      }
    });
  }

  send(method: string, params: Record<string, unknown> = {}): Promise<any> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('Browser session is closed'));
    }
    const id = this.nextId++;
    const message = { id, method, params };
    return new Promise((resolvePromise, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Browser command "${method}" timed out after ${this.timeoutMs}ms`));
      }, this.timeoutMs);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolvePromise(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      this.socket!.send(JSON.stringify(message));
    });
  }

  waitFor(event: string, timeoutMs = 30000): Promise<any> {
    return new Promise((resolvePromise, reject) => {
      const timer = setTimeout(() => {
        this.removeListener(event, listener);
        reject(new Error(`Timed out waiting for browser event "${event}"`));
      }, timeoutMs);
      const listener = (params: any) => {
        clearTimeout(timer);
        this.removeListener(event, listener);
        resolvePromise(params);
      };
      this.addListener(event, listener);
    });
  }

  /** Subscribes to a CDP event; returns an unsubscribe function. */
  on(event: string, listener: (params: any) => void): () => void {
    this.addListener(event, listener);
    return () => this.removeListener(event, listener);
  }

  private addListener(event: string, listener: (params: any) => void): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
  }

  private removeListener(event: string, listener: (params: any) => void): void {
    this.listeners.get(event)?.delete(listener);
  }

  close(): void {
    this.socket?.close();
    this.pending.clear();
    this.listeners.clear();
  }
}

export interface E2EPageOptions {
  /** Browser executable. Defaults to $ELIT_E2E_BROWSER, then Chrome/Edge/Chromium. */
  executablePath?: string;
  /** Run headless (default true). */
  headless?: boolean;
  /** Navigation timeout in ms (default 30000). */
  timeout?: number;
  /** Page viewport (default 1280x720). */
  viewport?: { width: number; height: number };
  /** Overrides navigator.language / Intl (e.g. 'th-TH'). */
  locale?: string;
  /** Overrides the timezone (e.g. 'Asia/Bangkok'). */
  timezoneId?: string;
  /** Emulates prefers-color-scheme. */
  colorScheme?: 'light' | 'dark' | 'no-preference';
  /** Overrides geolocation (grant permissions via `page.grantPermissions(['geolocation'])`). */
  geolocation?: { latitude: number; longitude: number; accuracy?: number };
  /** Overrides navigator.userAgent. */
  userAgent?: string;
  /** Mobile emulation: touch-enabled viewport + mobile metrics. */
  mobile?: { width: number; height: number; pixelRatio?: number };
  /** Records a .webm screencast of the page; `true` uses the default output dir. */
  video?: boolean | { dir?: string };
  /** Records an action trace (screenshots per step) and dumps a viewer when a test fails. */
  trace?: boolean;
}

export interface E2EStorageState {
  cookies: Array<{ name: string; value: string; domain: string; path: string }>;
  localStorage: Array<{ name: string; value: string }>;
}

export type E2EWaitState = 'attached' | 'visible' | 'hidden' | 'detached';

export interface E2EWaitOptions {
  state?: E2EWaitState;
  timeout?: number;
}

export interface E2EActionOptions {
  timeout?: number;
}

export interface E2ENetworkResponse {
  url: string;
  status: number;
}

const POLL_INTERVAL_MS = 100;
const DEFAULT_ACTION_TIMEOUT_MS = 10000;

/** Converts a URL glob (`**` crosses `/`, `*` does not) into a RegExp. */
function urlPatternToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `^${escaped.replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*')}$`,
  );
}

/** Human-readable description of a selector query, used in error messages. */
export function describeQuery(query: E2ESelectorQuery): string {
  switch (query.kind) {
    case 'css':
      return `selector "${query.value}"`;
    case 'testid':
      return `testid "${query.value}"`;
    case 'text':
      return `text "${query.value}"${query.exact ? ' (exact)' : ''}`;
    case 'role':
      return `role "${query.role}"${query.name !== undefined ? ` named "${query.name}"` : ''}`;
  }
}

const KEY_DEFINITIONS: Record<string, { code: string; text?: string }> = {
  enter: { code: 'Enter', text: '\r' },
  escape: { code: 'Escape' },
  tab: { code: 'Tab', text: '\t' },
  backspace: { code: 'Backspace' },
  delete: { code: 'Delete' },
  home: { code: 'Home' },
  end: { code: 'End' },
  pageup: { code: 'PageUp' },
  pagedown: { code: 'PageDown' },
  arrowleft: { code: 'ArrowLeft' },
  arrowright: { code: 'ArrowRight' },
  arrowup: { code: 'ArrowUp' },
  arrowdown: { code: 'ArrowDown' },
  ' ': { code: 'Space', text: ' ' },
};

const VIRTUAL_KEY_CODES: Record<string, number> = {
  Enter: 13, Escape: 27, Tab: 9, Backspace: 8, Delete: 46,
  Home: 36, End: 35, PageUp: 33, PageDown: 34,
  ArrowLeft: 37, ArrowRight: 39, ArrowUp: 38, ArrowDown: 40, Space: 32,
};

/** Repeatedly evaluates `fn` until it returns a truthy value or the timeout hits. */
export async function pollUntil<T>(
  fn: () => T | Promise<T>,
  options: { timeout: number; message: string },
): Promise<T> {
  const start = Date.now();
  while (Date.now() - start < options.timeout) {
    const value = await fn();
    if (value) return value;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, POLL_INTERVAL_MS));
  }
  throw new Error(options.message);
}

/**
 * A real browser page driven over the Chrome DevTools Protocol — no external
 * dependencies, uses the Chrome/Edge/Chromium already installed on the machine.
 *
 * ```ts
 * const page = await openE2EPage(app);
 * await page.goto('/');
 * await page.screenshot({ path: 'home.png' });
 * await page.close();
 * ```
 */
export class E2EPage {
  private inflightRequests = 0;
  private lastNetworkActivity = Date.now();
  private readonly networkResponses: E2ENetworkResponse[] = [];
  private readonly routes: Array<{ source: string; pattern: RegExp; handler: (route: E2ERoute) => void | Promise<void> }> = [];
  private fetchInterceptionEnabled = false;
  private dialogHandler: ((dialog: E2EDialog) => void | Promise<void>) | undefined;
  private readonly frameContexts = new Map<string, number>();
  private browserWsUrl = '';
  private browserSession?: CDPSession;
  private videoFrames: E2EVideoFrame[] = [];
  private videoStartedAt = 0;
  private screencastActive = false;
  private videoStopper: (() => Promise<string>) | undefined;
  private traceSteps: E2ETraceStep[] | undefined;
  private traceStartedAt = 0;
  private traceName = 'trace';
  private traceUrl = '';

  private constructor(
    private readonly process: ChildProcess,
    private readonly session: CDPSession,
    private readonly userDataDir: string,
    public readonly baseUrl: string,
    private readonly timeoutMs: number,
    private browserHandle?: BrowserHandle,
    private targetId?: string,
  ) {}

  static async open(appOrUrl: E2EApp | string, options: E2EPageOptions = {}): Promise<E2EPage> {
    const baseUrl = typeof appOrUrl === 'string' ? appOrUrl : appOrUrl.url;
    const executable = options.executablePath ?? findBrowserExecutable();
    if (!executable) {
      throw new Error(
        'No browser found for @elitjs/e2e screenshots. Install Chrome/Edge/Chromium or set ELIT_E2E_BROWSER.',
      );
    }

    const handle = await launchBrowser(executable, options);
    return E2EPage.attachToHandle(handle, baseUrl, options);
  }

  /**
   * Opens another page (tab) in the same browser process, bound to the same base URL.
   * Closing the page that spawned the browser closes every sibling too.
   */
  async newPage(): Promise<E2EPage> {
    if (!this.browserHandle) {
      throw new Error('This page cannot spawn siblings');
    }
    return E2EPage.attachToHandle(this.browserHandle, this.baseUrl, { timeout: this.timeoutMs });
  }

  /**
   * Waits for a `window.open(...)` popup from this page and returns it as a full page.
   *
   * ```ts
   * const popupPromise = page.waitForPopup();
   * await page.getByRole('link', { name: 'Open' }).click();
   * const popup = await popupPromise;
   * ```
   */
  async waitForPopup(timeout: number = this.timeoutMs): Promise<E2EPage> {
    const handle = this.browserHandle;
    if (!handle) {
      throw new Error('This page cannot watch popups');
    }
    // Poll the target list — robust regardless of whether the popup opened
    // before or after this call (CDP target events can race with discovery).
    return pollUntil(async () => {
      const list = (await fetch(`${handle.httpBase}/json/list`).then((response) => response.json())) as Array<{
        id: string;
        type: string;
        url?: string;
        webSocketDebuggerUrl?: string;
      }>;
      const known = new Set([...handle.pages].map((page) => page.targetId));
      const candidates = list.filter((target) => target.type === 'page' && !known.has(target.id) && target.webSocketDebuggerUrl);
      // Popup tabs start at about:blank and may swap targets mid-navigation —
      // only pick ones that have navigated to their real destination.
      const navigated = candidates.filter((target) => target.url && target.url !== 'about:blank');
      const entry = navigated[navigated.length - 1];
      if (!entry || !entry.webSocketDebuggerUrl) return null;
      return E2EPage.attachToHandle(handle, this.baseUrl, {}, {
        id: entry.id,
        webSocketDebuggerUrl: entry.webSocketDebuggerUrl,
      });
    }, { timeout, message: 'Timed out waiting for a popup' });
  }

  private static async attachToHandle(
    handle: BrowserHandle,
    baseUrl: string,
    options: E2EPageOptions,
    existingTarget?: { id: string; webSocketDebuggerUrl: string },
  ): Promise<E2EPage> {
    const target = existingTarget
      ? { id: existingTarget.id, webSocketDebuggerUrl: existingTarget.webSocketDebuggerUrl }
      : await fetch(`${handle.httpBase}/json/new?about%3Ablank`, { method: 'PUT' }).then((response) => response.json());

    const session = new CDPSession();
    await session.connect(target.webSocketDebuggerUrl);
    await session.send('Page.enable');
    await session.send('Runtime.enable');

    const page = new E2EPage(handle.process, session, handle.userDataDir, baseUrl, options.timeout ?? 30000, handle, target.id);
    page.browserWsUrl = handle.wsUrl;
    handle.pages.add(page);
    if (!handle.root) handle.root = page;

    // Track the network so waitForResponse / networkidle have something to watch.
    await session.send('Network.enable');
    session.on('Network.requestWillBeSent', () => {
      page.inflightRequests++;
      page.lastNetworkActivity = Date.now();
    });
    const requestDone = () => {
      page.inflightRequests = Math.max(0, page.inflightRequests - 1);
      page.lastNetworkActivity = Date.now();
    };
    session.on('Network.loadingFinished', requestDone);
    session.on('Network.loadingFailed', requestDone);
    session.on('Network.responseReceived', (params: any) => {
      page.networkResponses.push({ url: params.response.url, status: params.response.status });
      if (page.networkResponses.length > 500) page.networkResponses.shift();
    });

    // Route interception (page.route) — events only arrive while Fetch is enabled.
    session.on('Fetch.requestPaused', (params: any) => {
      page.handlePausedRequest(params).catch((error) => {
        // A paused request that cannot be continued (session closed, command timeout)
        // must not escape as an unhandled rejection and kill the host process.
        console.error('[E2E] Failed to resume paused request:', error instanceof Error ? error.message : String(error));
      });
    });

    // Iframes get their own execution contexts — remember frameId -> contextId.
    session.on('Runtime.executionContextCreated', (params: any) => {
      const frameId = params.context?.auxData?.frameId;
      if (frameId) page.frameContexts.set(frameId, params.context.id);
    });

    // JS dialogs (alert/confirm/prompt) auto-accept unless a handler is registered.
    session.on('Page.javascriptDialogOpening', (params: any) => {
      const dialog = new E2EDialog(session, params);
      if (page.dialogHandler) {
        void page.dialogHandler(dialog);
      } else {
        void dialog.accept();
      }
    });

    await session.send('Emulation.setDeviceMetricsOverride', {
      width: options.mobile?.width ?? options.viewport?.width ?? 1280,
      height: options.mobile?.height ?? options.viewport?.height ?? 720,
      deviceScaleFactor: options.mobile?.pixelRatio ?? 1,
      mobile: Boolean(options.mobile),
      screenWidth: options.mobile?.width ?? 1280,
      screenHeight: options.mobile?.height ?? 720,
      screenOrientation: options.mobile
        ? { angle: 0, type: 'portraitPrimary' }
        : { angle: 0, type: 'landscapePrimary' },
    });

    // Device emulation overrides.
    if (options.mobile) {
      await session.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    }
    if (options.locale) {
      await session.send('Emulation.setLocaleOverride', { locale: options.locale });
    }
    if (options.timezoneId) {
      await session.send('Emulation.setTimezoneOverride', { timezoneId: options.timezoneId });
    }
    if (options.colorScheme) {
      await session.send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-color-scheme', value: options.colorScheme }],
      });
    }
    if (options.geolocation) {
      await session.send('Emulation.setGeolocationOverride', {
        latitude: options.geolocation.latitude,
        longitude: options.geolocation.longitude,
        accuracy: options.geolocation.accuracy ?? 100,
      });
    }
    if (options.userAgent) {
      await session.send('Emulation.setUserAgentOverride', {
        userAgent: options.userAgent,
        ...(options.locale ? { acceptLanguage: options.locale } : {}),
      });
    }

    // Auto-record: the `video` option, or ELIT_E2E_VIDEO set by `elit e2e --video`.
    const videoSetting =
      options.video ??
      (process.env.ELIT_E2E_VIDEO !== undefined
        ? process.env.ELIT_E2E_VIDEO === '1' || process.env.ELIT_E2E_VIDEO === ''
          ? true
          : { dir: process.env.ELIT_E2E_VIDEO }
        : undefined);
    if (videoSetting) {
      const dir = typeof videoSetting === 'object' && videoSetting.dir ? videoSetting.dir : 'e2e-videos';
      await page.startVideo();
      page.videoStopper = () =>
        page.stopVideo({ path: join(dir, `video-${Date.now()}.webm`) });
    }
    return page;
  }

  /** Navigates to a path on the app (or an absolute URL) and waits for the load event. */
  async goto(pathOrUrl: string): Promise<void> {
    const url = /^https?:\/\//.test(pathOrUrl) ? pathOrUrl : `${this.baseUrl.replace(/\/$/, '')}/${pathOrUrl.replace(/^\//, '')}`;
    const loaded = this.session.waitFor('Page.loadEventFired', this.timeoutMs);
    await this.session.send('Page.navigate', { url });
    await loaded;
    await this.recordTraceStep('goto', url);
  }

  /** Captures a PNG screenshot; returns the buffer and optionally writes it to `path`. */
  async screenshot(options: { path?: string; fullPage?: boolean; element?: string } = {}): Promise<Buffer> {
    const params: Record<string, unknown> = { format: 'png' };

    if (options.fullPage) {
      params.captureBeyondViewport = true;
    }

    if (options.element) {
      const rect = await this.evaluate<{ x: number; y: number; width: number; height: number } | null>(
        `(function () {
          const element = document.querySelector(${JSON.stringify(options.element)});
          if (!element) return null;
          const rect = element.getBoundingClientRect();
          return { x: rect.x, y: rect.y + window.scrollY, width: rect.width, height: rect.height };
        })()`,
      );
      if (!rect) throw new Error(`No element matches selector "${options.element}"`);
      params.clip = { ...rect, scale: 1 };
      params.captureBeyondViewport = true;
    }

    const result = await this.session.send('Page.captureScreenshot', params);
    const buffer = Buffer.from(result.data, 'base64');
    if (options.path) {
      const { writeFile } = await import('node:fs/promises');
      await writeFile(options.path, buffer);
    }
    return buffer;
  }

  /** Injects a script that runs before page scripts on every navigation. */
  async addInitScript(script: string): Promise<void> {
    await this.session.send('Page.addScriptToEvaluateOnNewDocument', { source: script });
  }

  /** Exposes `window.<name>(payload)` in the page that calls back into Node with a JSON payload. */
  async exposeBinding(name: string, handler: (payload: unknown) => void): Promise<void> {
    await this.session.send('Runtime.addBinding', { name });
    this.session.on('Runtime.bindingCalled', (params: any) => {
      if (params.name !== name) return;
      try {
        handler(JSON.parse(params.payload));
      } catch {
        handler(params.payload);
      }
    });
  }

  /** Resolves when the browser process exits (e.g. the user closes a headed window). */
  async waitForExit(): Promise<void> {
    if (this.process.exitCode !== null) return;
    await new Promise<void>((resolvePromise) => {
      this.process.once('exit', () => resolvePromise());
    });
  }

  // ---- tracing (action + screenshot per step) ----

  /** Starts recording every subsequent action with a screenshot after each step. */
  async startTracing(name = 'trace'): Promise<void> {
    this.traceSteps = [];
    this.traceStartedAt = Date.now();
    this.traceName = name;
    this.traceUrl = await this.evaluate<string>('location.href').catch(() => this.baseUrl);
    await this.recordTraceStep('start', this.traceUrl);
  }

  /** Stops tracing and returns the captured steps (null when not tracing). */
  async stopTracing(): Promise<E2ETrace | null> {
    if (!this.traceSteps) return null;
    const trace: E2ETrace = {
      name: this.traceName,
      url: this.traceUrl,
      startedAt: this.traceStartedAt,
      steps: this.traceSteps,
    };
    this.traceSteps = undefined;
    return trace;
  }

  private async recordTraceStep(action: string, detail?: string): Promise<void> {
    if (!this.traceSteps) return;
    const screenshot = await this.session
      .send('Page.captureScreenshot', { format: 'png' })
      .then((result: any) => result.data as string)
      .catch(() => undefined);
    this.traceSteps.push({
      action,
      detail,
      timestamp: Date.now() - this.traceStartedAt,
      screenshot,
    });
  }

  // ---- video recording (CDP screencast -> webm) ----

  /** Starts a screencast of the page. Call stopVideo() to write the .webm file. */
  async startVideo(): Promise<void> {
    if (this.screencastActive) return;
    this.screencastActive = true;
    this.videoFrames = [];
    this.videoStartedAt = Date.now();

    this.session.on('Page.screencastFrame', (params: any) => {
      const webp = Buffer.from(params.data, 'base64');
      const vp8 = extractVp8Frame(webp);
      if (vp8) {
        this.videoFrames.push({ data: vp8, timestamp: Date.now() - this.videoStartedAt });
      }
      void this.session.send('Page.screencastFrameAck', { sessionId: params.sessionId }).catch(() => undefined);
    });

    await this.session.send('Page.startScreencast', {
      format: 'webp',
      quality: 75,
      everyNthFrame: 1,
    });
  }

  /** Stops the screencast and writes `frames` as a .webm; returns the file path. */
  async stopVideo(options: { path?: string } = {}): Promise<string> {
    if (this.screencastActive) {
      this.screencastActive = false;
      await this.session.send('Page.stopScreencast').catch(() => undefined);
    }
    if (this.videoFrames.length === 0) {
      throw new Error('No video frames were captured');
    }

    const { mkdir, writeFile } = await import('node:fs/promises');
    const path = options.path ?? `e2e-video-${Date.now()}.webm`;

    const webm = muxWebM(this.videoFrames, 1280, 720);
    const directory = path.replace(/[\/][^\/]+$/, '');
    if (directory && directory !== path) {
      await mkdir(directory, { recursive: true });
    }
    await writeFile(path, webm);
    this.videoFrames = [];
    return path;
  }

  /** Renders the current page to a PDF (Chromium only) and optionally writes it to `path`. */
  async pdf(options: { path?: string; printBackground?: boolean; landscape?: boolean } = {}): Promise<Buffer> {
    const result = await this.session.send('Page.printToPDF', {
      printBackground: options.printBackground ?? true,
      landscape: options.landscape ?? false,
    });
    const buffer = Buffer.from(result.data, 'base64');
    if (options.path) {
      const { writeFile } = await import('node:fs/promises');
      await writeFile(options.path, buffer);
    }
    return buffer;
  }

  // ---- waiting (Playwright-style) ----

  private async selectorState(query: E2ESelectorQuery, contextId?: number): Promise<'attached' | 'visible' | 'detached'> {
    return this.evaluate(`(function () {
      const element = ${matcherSource(query)}[0];
      if (!element) return 'detached';
      const visible = !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
      return visible ? 'visible' : 'attached';
    })()`, contextId);
  }

  /** Waits until `selector` reaches `state` (default: visible). Auto-waits elements before actions. */
  async waitForSelector(selector: string, options: E2EWaitOptions = {}): Promise<void> {
    return this.waitForQuery(parseSelector(selector), options);
  }

  async waitForQuery(query: E2ESelectorQuery, options: E2EWaitOptions = {}, contextId?: number): Promise<void> {
    const state = options.state ?? 'visible';
    const timeout = options.timeout ?? this.timeoutMs;
    const check = async () => {
      const current = await this.selectorState(query, contextId);
      if (state === 'hidden') return current !== 'visible';
      if (state === 'detached') return current === 'detached';
      if (state === 'attached') return current !== 'detached';
      return current === 'visible';
    };
    await pollUntil(check, {
      timeout,
      message: `Timed out waiting for ${describeQuery(query)} to be ${state}`,
    });
  }

  /** Waits until the page URL equals `url` (string), matches (RegExp), or passes the predicate. */
  async waitForURL(
    url: string | RegExp | ((url: string) => boolean),
    options: { timeout?: number } = {},
  ): Promise<void> {
    const predicate =
      typeof url === 'function' ? url : typeof url === 'string' ? (href: string) => href === url : (href: string) => url.test(href);
    await pollUntil(async () => {
      const href = await this.evaluate<string>('location.href');
      return predicate(href);
    }, {
      timeout: options.timeout ?? this.timeoutMs,
      message: `Timed out waiting for URL to match ${url}`,
    });
  }

  /** Waits for a document lifecycle state: 'load', 'domcontentloaded', or 'networkidle'. */
  async waitForLoadState(state: 'load' | 'domcontentloaded' | 'networkidle' = 'load'): Promise<void> {
    if (state === 'networkidle') {
      await pollUntil(
        () => this.inflightRequests === 0 && Date.now() - this.lastNetworkActivity >= 500,
        { timeout: this.timeoutMs, message: 'Timed out waiting for network idle' },
      );
      return;
    }
    const expected = state === 'load' ? 'complete' : 'interactive';
    await pollUntil(
      async () => {
        const readyState = await this.evaluate<string>('document.readyState');
        return readyState === expected || readyState === 'complete';
      },
      { timeout: this.timeoutMs, message: `Timed out waiting for ${state}` },
    );
  }

  /** Waits for a network response matching `url` (substring), RegExp, or predicate. */
  async waitForResponse(
    match: string | RegExp | ((response: E2ENetworkResponse) => boolean),
    options: { timeout?: number } = {},
  ): Promise<E2ENetworkResponse> {
    const predicate =
      typeof match === 'function'
        ? match
        : typeof match === 'string'
          ? (response: E2ENetworkResponse) => response.url.includes(match)
          : (response: E2ENetworkResponse) => match.test(response.url);
    return pollUntil(() => this.networkResponses.find(predicate), {
      timeout: options.timeout ?? this.timeoutMs,
      message: `Timed out waiting for a response matching ${match}`,
    });
  }

  /** Evaluates a function or expression in the page and returns its JSON value. */
  async evaluate<T = unknown>(fn: string | (() => T | Promise<T>), contextId?: number): Promise<T> {
    const expression = typeof fn === 'function' ? `(${fn.toString()})()` : fn;
    const params: Record<string, unknown> = {
      expression,
      awaitPromise: true,
      returnByValue: true,
    };
    if (contextId !== undefined) params.contextId = contextId;
    const result = await this.session.send('Runtime.evaluate', params);
    if (result.exceptionDetails) {
      throw new Error(`Page evaluation failed: ${result.exceptionDetails.text}`);
    }
    return result.result?.value as T;
  }

  /** Returns the text content of the first element matching `selector` (waits for it to attach). */
  async textContent(selector: string, options?: E2EActionOptions): Promise<string | null> {
    return this.textContentQuery(parseSelector(selector), options);
  }

  async textContentQuery(query: E2ESelectorQuery, options?: E2EActionOptions, contextId?: number): Promise<string | null> {
    await this.waitForQuery(query, { state: 'attached', timeout: options?.timeout ?? DEFAULT_ACTION_TIMEOUT_MS }, contextId);
    return this.evaluate(`${matcherSource(query)}[0]?.textContent ?? null`, contextId);
  }

  /** Clicks the first element matching `selector` (auto-waits until it is visible). */
  async click(selector: string, options?: E2EActionOptions): Promise<void> {
    return this.clickQuery(parseSelector(selector), options);
  }

  async clickQuery(query: E2ESelectorQuery, options?: E2EActionOptions, contextId?: number): Promise<void> {
    // Main-frame clicks use real mouse input — trusted events count as user
    // activation (popups, downloads) and behave like a real user. Elements
    // inside iframes keep the synthetic click (mouse coordinates would need
    // frame-offset translation).
    if (contextId === undefined) {
      const center = await this.elementCenter(query, options);
      const params = { x: center.x, y: center.y, button: 'left' as const, clickCount: 1 };
      await this.session.send('Input.dispatchMouseEvent', { ...params, type: 'mousePressed' });
      await this.session.send('Input.dispatchMouseEvent', { ...params, type: 'mouseReleased' });
      await this.recordTraceStep('click', describeQuery(query));
      return;
    }
    await this.waitForQuery(query, { state: 'visible', timeout: options?.timeout ?? DEFAULT_ACTION_TIMEOUT_MS }, contextId);
    const clicked = await this.evaluate<boolean>(`(function () {
      const element = ${matcherSource(query)}[0];
      if (!element) return false;
      element.click();
      return true;
    })()`, contextId);
    if (!clicked) throw new Error(`No element matches ${describeQuery(query)}`);
    await this.recordTraceStep('click', describeQuery(query));
  }

  /** Fills an input with `value`, dispatching input/change events (auto-waits until visible). */
  async fill(selector: string, value: string, options?: E2EActionOptions): Promise<void> {
    return this.fillQuery(parseSelector(selector), value, options);
  }

  async fillQuery(query: E2ESelectorQuery, value: string, options?: E2EActionOptions, contextId?: number): Promise<void> {
    await this.waitForQuery(query, { state: 'visible', timeout: options?.timeout ?? DEFAULT_ACTION_TIMEOUT_MS }, contextId);
    const filled = await this.evaluate<boolean>(`(function () {
      const element = ${matcherSource(query)}[0];
      if (!element) return false;
      element.value = ${JSON.stringify(value)};
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`, contextId);
    if (!filled) throw new Error(`No element matches ${describeQuery(query)}`);
    await this.recordTraceStep('fill', `${describeQuery(query)} = ${JSON.stringify(value)}`);
  }

  /** Moves the mouse over the element matching `selector` (real mouse events). */
  async hover(selector: string, options?: E2EActionOptions): Promise<void> {
    return this.hoverQuery(parseSelector(selector), options);
  }

  async hoverQuery(query: E2ESelectorQuery, options?: E2EActionOptions, contextId?: number): Promise<void> {
    const center = await this.elementCenter(query, options, contextId);
    await this.session.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: center.x, y: center.y, button: 'none' });
  }

  /** Double-clicks the element matching `selector` (real mouse events). */
  async dblclick(selector: string, options?: E2EActionOptions): Promise<void> {
    return this.dblclickQuery(parseSelector(selector), options);
  }

  async dblclickQuery(query: E2ESelectorQuery, options?: E2EActionOptions, contextId?: number): Promise<void> {
    const center = await this.elementCenter(query, options, contextId);
    const params = { x: center.x, y: center.y, button: 'left' as const };
    await this.waitForQuery(query, { state: 'visible', timeout: options?.timeout ?? DEFAULT_ACTION_TIMEOUT_MS }, contextId);
    await this.session.send('Input.dispatchMouseEvent', { ...params, type: 'mousePressed', clickCount: 1 });
    await this.session.send('Input.dispatchMouseEvent', { ...params, type: 'mouseReleased', clickCount: 1 });
    await this.session.send('Input.dispatchMouseEvent', { ...params, type: 'mousePressed', clickCount: 2 });
    await this.session.send('Input.dispatchMouseEvent', { ...params, type: 'mouseReleased', clickCount: 2 });
    await this.recordTraceStep('dblclick', describeQuery(query));
  }

  private async elementCenter(
    query: E2ESelectorQuery,
    options?: E2EActionOptions,
    contextId?: number,
  ): Promise<{ x: number; y: number }> {
    await this.waitForQuery(query, { state: 'visible', timeout: options?.timeout ?? DEFAULT_ACTION_TIMEOUT_MS }, contextId);
    const center = await this.evaluate<{ x: number; y: number } | null>(`(function () {
      const element = ${matcherSource(query)}[0];
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    })()`, contextId);
    if (!center) throw new Error(`No element matches ${describeQuery(query)}`);
    return center;
  }

  /** Returns a Playwright-style locator bound to `selector`; every action auto-waits. */
  locator(selector: string): E2ELocator {
    return new E2ELocator(this, parseSelector(selector));
  }

  /** Locates by ARIA role, optionally filtered by accessible name: `getByRole('button', { name: 'Save' })`. */
  getByRole(role: string, options: { name?: string; exact?: boolean } = {}): E2ELocator {
    return new E2ELocator(this, { kind: 'role', role, name: options.name, exact: options.exact });
  }

  /** Locates by visible text: `getByText('Welcome')` — prefers the deepest matching element. */
  getByText(text: string, options: { exact?: boolean } = {}): E2ELocator {
    return new E2ELocator(this, { kind: 'text', value: text, exact: options.exact });
  }

  /** Locates by `data-testid` attribute. */
  getByTestId(testId: string): E2ELocator {
    return new E2ELocator(this, { kind: 'testid', value: testId });
  }

  // ---- network interception (Playwright-style page.route) ----

  /** Intercepts requests matching `pattern` (glob: `**` crosses `/`, `*` does not). */
  async route(
    pattern: string,
    handler: (route: E2ERoute) => void | Promise<void>,
  ): Promise<void> {
    this.routes.push({ source: pattern, pattern: urlPatternToRegex(pattern), handler });
    if (!this.fetchInterceptionEnabled) {
      await this.session.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
      this.fetchInterceptionEnabled = true;
    }
  }

  /** Removes routes matching `pattern` (all routes when omitted) and disables interception when none remain. */
  async unroute(pattern?: string): Promise<void> {
    if (pattern === undefined) {
      this.routes.length = 0;
    } else {
      for (let index = this.routes.length - 1; index >= 0; index--) {
        if (this.routes[index].source === pattern) this.routes.splice(index, 1);
      }
    }
    if (this.routes.length === 0 && this.fetchInterceptionEnabled) {
      await this.session.send('Fetch.disable');
      this.fetchInterceptionEnabled = false;
    }
  }

  private async handlePausedRequest(params: any): Promise<void> {
    const request = {
      url: params.request.url as string,
      method: params.request.method as string,
      headers: (params.request.headers ?? {}) as Record<string, string>,
      postData: params.request.postData as string | undefined,
    };
    const route = new E2ERoute(this.session, params.requestId, request);
    const match = this.routes.find((entry) => entry.pattern.test(request.url));
    if (!match) {
      await route.continue();
      return;
    }
    try {
      await match.handler(route);
    } catch (error) {
      await route.continue().catch(() => undefined);
      throw error;
    }
  }

  // ---- storage state ----

  /** Exports cookies + localStorage of the current origin as a portable state object. */
  async storageState(): Promise<E2EStorageState> {
    const cookiesResult = await this.session.send('Storage.getCookies');
    const localStorage = await this.evaluate<Array<{ name: string; value: string }>>(`(function () {
      const items = [];
      for (let index = 0; index < localStorage.length; index++) {
        const name = localStorage.key(index);
        items.push({ name, value: localStorage.getItem(name) });
      }
      return items;
    })()`);
    return {
      cookies: (cookiesResult.cookies ?? []).map((cookie: any) => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
      })),
      localStorage,
    };
  }

  /** Restores a state object produced by `storageState()` — cookies and localStorage are written back. */
  async setStorageState(state: E2EStorageState): Promise<void> {
    if (state.cookies.length) {
      await this.session.send('Storage.setCookies', {
        cookies: state.cookies.map((cookie) => ({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
        })),
      });
    }
    if (state.localStorage.length) {
      await this.evaluate(`(function () {
        const items = ${JSON.stringify(state.localStorage)};
        for (const item of items) localStorage.setItem(item.name, item.value);
      })()`);
    }
  }

  // ---- permissions & file upload ----

  /** Connects (once) to the browser-level endpoint — Browser.* commands only work there. */
  private async ensureBrowserSession(): Promise<CDPSession> {
    if (!this.browserSession) {
      this.browserSession = new CDPSession();
      await this.browserSession.connect(this.browserWsUrl);
    }
    return this.browserSession;
  }

  /** Grants powerful-origin permissions (e.g. 'geolocation', 'notifications') for the page's origin. */
  async grantPermissions(permissions: string[]): Promise<void> {
    const browserSession = await this.ensureBrowserSession();
    await browserSession.send('Browser.grantPermissions', {
      permissions,
      origin: this.baseUrl,
    });
  }

  /**
   * Sets files on an `<input type="file">` by local path — the page sees them as chosen files.
   *
   * ```ts
   * await page.setInputFiles('#avatar', './fixtures/avatar.png');
   * ```
   */
  async setInputFiles(selector: string, files: string | string[]): Promise<void> {
    await this.waitForSelector(selector, { state: 'attached', timeout: DEFAULT_ACTION_TIMEOUT_MS });
    const document = await this.session.send('DOM.getDocument');
    const found = await this.session.send('DOM.querySelector', {
      nodeId: document.root.nodeId,
      selector,
    });
    if (!found.nodeId) {
      throw new Error(`No element matches selector "${selector}"`);
    }
    await this.session.send('DOM.setFileInputFiles', {
      nodeId: found.nodeId,
      files: Array.isArray(files) ? files : [files],
    });
  }

  // ---- dialogs ----

  /**
   * Handles `alert`/`confirm`/`prompt` dialogs: the page is frozen until the
   * handler accepts or dismisses. Without a handler, dialogs auto-accept.
   *
   * ```ts
   * await page.onDialog(async (dialog) => {
   *   expect(dialog.message()).toBe('Delete this item?');
   *   await dialog.accept();
   * });
   * ```
   */
  onDialog(handler: (dialog: E2EDialog) => void | Promise<void>): void {
    this.dialogHandler = handler;
  }

  // ---- frames (iframes) ----

  /** Lists all frames in the page (main frame first). */
  async frames(): Promise<Array<{ id: string; url: string; name: string; parentId?: string }>> {
    const tree = await this.session.send('Page.getFrameTree');
    const result: Array<{ id: string; url: string; name: string; parentId?: string }> = [];
    const walk = (node: any, parentId?: string) => {
      result.push({ id: node.frame.id, url: node.frame.url, name: node.frame.name ?? '', parentId });
      for (const child of node.childFrames ?? []) walk(child, node.frame.id);
    };
    walk(tree.frameTree);
    return result;
  }

  /**
   * Returns a frame scoped by name (exact) or url (substring) — locators and
   * evaluation inside it only see the iframe's document.
   *
   * ```ts
   * const frame = await page.frame({ url: '/widget' });
   * await frame.getByRole('button', { name: 'Buy' }).click();
   * ```
   */
  async frame(match: { name?: string; url?: string }): Promise<E2EFrame> {
    const all = await this.frames();
    const found = all.find(
      (candidate) =>
        (match.name !== undefined && candidate.name === match.name) ||
        (match.url !== undefined && candidate.url.includes(match.url)),
    );
    if (!found) throw new Error(`No frame matches ${JSON.stringify(match)}`);
    const contextId = this.frameContexts.get(found.id);
    if (contextId === undefined) {
      throw new Error(`Frame ${found.url} has no execution context yet — retry after it finishes loading`);
    }
    return new E2EFrame(this, found, contextId);
  }

  // ---- keyboard ----

  private async dispatchKey(key: string): Promise<void> {
    const normalized = key.length === 1 ? key : key.toLowerCase();
    const definition = KEY_DEFINITIONS[normalized] ?? { code: key };
    const keyName = normalized.length === 1 ? normalized : normalized.charAt(0).toUpperCase() + normalized.slice(1);
    const common = {
      key: keyName,
      code: definition.code,
      windowsVirtualKeyCode: VIRTUAL_KEY_CODES[definition.code] ?? 0,
      nativeVirtualKeyCode: VIRTUAL_KEY_CODES[definition.code] ?? 0,
    };
    const isSpecialKey = key.length !== 1 || (normalized !== ' ' && KEY_DEFINITIONS[normalized] !== undefined);
    await this.session.send('Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      ...common,
    });
    if (!isSpecialKey) {
      await this.session.send('Input.insertText', { text: key });
    }
    await this.session.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      ...common,
    });
  }

  /** Focuses the element matching `selector` and dispatches a key press (e.g. 'Enter', 'Escape', 'a'). */
  async press(selector: string, key: string, options?: E2EActionOptions): Promise<void> {
    await this.waitForSelector(selector, { state: 'visible', timeout: options?.timeout ?? DEFAULT_ACTION_TIMEOUT_MS });
    await this.evaluate(`${matcherSource(parseSelector(selector))}[0]?.focus()`);
    await this.dispatchKey(key);
    await this.recordTraceStep('press', `${selector} ${key}`);
  }

  /** Focuses the element and types `text` one keystroke at a time, with an optional delay between keys. */
  async type(selector: string, text: string, options?: E2EActionOptions & { delay?: number }): Promise<void> {
    await this.waitForSelector(selector, { state: 'visible', timeout: options?.timeout ?? DEFAULT_ACTION_TIMEOUT_MS });
    await this.evaluate(`${matcherSource(parseSelector(selector))}[0]?.focus()`);
    for (const character of text) {
      await this.dispatchKey(character);
      if (options?.delay) {
        await new Promise((resolvePromise) => setTimeout(resolvePromise, options.delay));
      }
    }
  }

  /**
   * Closes this page. Sibling pages (newPage/waitForPopup) close with the page
   * that spawned the browser; closing a sibling leaves the rest alone.
   */
  async close(): Promise<void> {
    if (this.videoStopper) {
      const stopVideo = this.videoStopper;
      this.videoStopper = undefined;
      try {
        const videoPath = await stopVideo();
        console.log(`Video saved to ${videoPath}`);
      } catch {
        // no frames captured — nothing to write
      }
    }
    const handle = this.browserHandle;
    handle?.pages.delete(this);

    const isRoot = !handle || handle.root === this;

    if (!isRoot) {
      this.session.close();
      if (this.targetId) {
        try {
          const browserSession = await this.ensureBrowserSession();
          await browserSession.send('Target.closeTarget', { targetId: this.targetId });
        } catch {
          // browser already gone — nothing left to close
        }
      }
      return;
    }

    // Root page: tear down every sibling and the whole browser process.
    if (handle) {
      for (const sibling of [...handle.pages]) {
        sibling.session.close();
      }
      handle.pages.clear();
    }
    this.session.close();
    this.browserSession?.close();
    await new Promise<void>((resolvePromise) => {
      if (this.process.exitCode !== null) {
        resolvePromise();
        return;
      }
      this.process.once('exit', () => resolvePromise());
      this.process.kill();
      setTimeout(resolvePromise, 5000);
    });
    // Chrome releases the user-data-dir lock asynchronously (notably on
    // Windows) — retry briefly instead of failing the test on cleanup.
    for (const delay of [0, 250, 1000]) {
      if (delay) await new Promise((resolvePromise) => setTimeout(resolvePromise, delay));
      try {
        rmSync(this.userDataDir, { recursive: true, force: true });
        return;
      } catch {
        // retry
      }
    }
  }
}

/** Opens a browser page against a running e2e server. */
export function openE2EPage(appOrUrl: E2EApp | string, options?: E2EPageOptions): Promise<E2EPage> {
  return E2EPage.open(appOrUrl, options);
}

/** A paused network request handed to a `page.route()` handler. */
export class E2ERoute {
  constructor(
    private readonly session: CDPSession,
    private readonly requestId: string,
    public readonly request: {
      url: string;
      method: string;
      headers: Record<string, string>;
      postData?: string;
    },
  ) {}

  /** Responds to the request without hitting the network. */
  async fulfill(options: { status?: number; headers?: Record<string, string>; contentType?: string; body?: string | Record<string, unknown> | unknown[] } = {}): Promise<void> {
    const body =
      options.body === undefined
        ? ''
        : typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body);

    const headers = Object.entries(options.headers ?? {}).map(([name, value]) => ({ name, value }));
    const hasContentType = headers.some((header) => header.name.toLowerCase() === 'content-type');
    if (!hasContentType && body) {
      headers.push({
        name: 'content-type',
        value: options.contentType ?? (body.trimStart().startsWith('{') || body.trimStart().startsWith('[') ? 'application/json' : 'text/plain'),
      });
    }

    await this.session.send('Fetch.fulfillRequest', {
      requestId: this.requestId,
      responseCode: options.status ?? 200,
      responseHeaders: headers,
      body: Buffer.from(body, 'utf8').toString('base64'),
    });
  }

  /** Fails the request as if the network dropped it. */
  async abort(errorCode: string = 'Failed'): Promise<void> {
    await this.session.send('Fetch.failRequest', { requestId: this.requestId, errorReason: errorCode });
  }

  /** Lets the request continue to the real server. */
  async continue(): Promise<void> {
    await this.session.send('Fetch.continueRequest', { requestId: this.requestId });
  }
}

/**
 * Playwright-style locator bound to a selector query — actions on it auto-wait
 * for the element to appear, so tests stay resilient against async rendering.
 *
 * ```ts
 * const title = page.locator('h1');
 * await title.click();
 * expect(await title.textContent()).toBe('Todos');
 *
 * await page.getByRole('button', { name: 'Save' }).click();
 * await page.getByText('Welcome').waitFor();
 * await page.getByTestId('submit').fill('yes');
 * ```
 */
export class E2ELocator {
  constructor(
    private readonly page: E2EPage,
    public readonly query: E2ESelectorQuery,
    private readonly contextId?: number,
  ) {}

  waitFor(options: E2EWaitOptions = {}): Promise<void> {
    return this.page.waitForQuery(this.query, options, this.contextId);
  }

  async isVisible(): Promise<boolean> {
    return this.page.evaluate(`(function () {
      const element = ${matcherSource(this.query)}[0];
      if (!element) return false;
      return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
    })()`, this.contextId);
  }

  click(options?: E2EActionOptions): Promise<void> {
    return this.page.clickQuery(this.query, options, this.contextId);
  }

  dblclick(options?: E2EActionOptions): Promise<void> {
    return this.page.dblclickQuery(this.query, options, this.contextId);
  }

  hover(options?: E2EActionOptions): Promise<void> {
    return this.page.hoverQuery(this.query, options, this.contextId);
  }

  fill(value: string, options?: E2EActionOptions): Promise<void> {
    return this.page.fillQuery(this.query, value, options, this.contextId);
  }

  textContent(options?: E2EActionOptions): Promise<string | null> {
    return this.page.textContentQuery(this.query, options, this.contextId);
  }
}

/** Shared browser process state — every E2EPage from one launch hangs off this. */
interface BrowserHandle {
  process: ChildProcess;
  wsUrl: string;
  httpBase: string;
  userDataDir: string;
  pages: Set<E2EPage>;
  /** The first page created — closing it tears down the whole browser. */
  root?: E2EPage;
}

async function launchBrowser(executable: string, options: E2EPageOptions): Promise<BrowserHandle> {
  const userDataDir = mkdtempSync(join(tmpdir(), 'elit-e2e-'));
  const process = spawn(executable, [
    ...(options.headless === false ? [] : ['--headless=new']),
    ...(options.locale ? [`--lang=${options.locale}`] : []),
    ...(options.mobile ? [`--window-size=${options.mobile.width},${options.mobile.height}`] : []),
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--hide-scrollbars',
    'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  const wsUrl = await new Promise<string>((resolvePromise, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('Browser did not expose a DevTools endpoint')), 15000);
    const onData = (chunk: Buffer) => {
      output += chunk.toString();
      const match = output.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) {
        clearTimeout(timer);
        resolvePromise(match[1]);
      }
    };
    process.stderr!.on('data', onData);
    process.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

  return {
    process,
    wsUrl,
    httpBase: wsUrl.replace(/^ws:\/\//, 'http://').replace(/\/devtools\/browser\/.*$/, ''),
    userDataDir,
    pages: new Set(),
  };
}

/** A JS dialog (`alert`/`confirm`/`prompt`) opened by the page. */
export class E2EDialog {
  constructor(
    private readonly session: CDPSession,
    private readonly params: { type: string; message: string; defaultPrompt?: string },
  ) {}

  /** Dialog type: 'alert' | 'confirm' | 'prompt' | 'beforeunload'. */
  type(): string {
    return this.params.type;
  }

  /** The message text shown in the dialog. */
  message(): string {
    return this.params.message;
  }

  /** Default text pre-filled in a prompt dialog. */
  defaultValue(): string {
    return this.params.defaultPrompt ?? '';
  }

  /** Accepts the dialog, optionally answering a prompt. */
  accept(promptText?: string): Promise<void> {
    return this.session.send('Page.handleJavaScriptDialog', {
      accept: true,
      promptText: promptText ?? this.params.defaultPrompt ?? '',
    });
  }

  /** Dismisses the dialog (like pressing Cancel). */
  dismiss(): Promise<void> {
    return this.session.send('Page.handleJavaScriptDialog', { accept: false });
  }
}

/** An iframe scoped handle — locators and evaluation only see its document. */
export class E2EFrame {
  constructor(
    private readonly page: E2EPage,
    public readonly info: { id: string; url: string; name: string; parentId?: string },
    private readonly contextId: number,
  ) {}

  /** Evaluates an expression inside this frame's execution context. */
  evaluate<T = unknown>(fn: string | (() => T | Promise<T>)): Promise<T> {
    return this.page.evaluate(fn, this.contextId);
  }

  locator(selector: string): E2ELocator {
    return new E2ELocator(this.page, parseSelector(selector), this.contextId);
  }

  getByRole(role: string, options: { name?: string; exact?: boolean } = {}): E2ELocator {
    return new E2ELocator(this.page, { kind: 'role', role, name: options.name, exact: options.exact }, this.contextId);
  }

  getByText(text: string, options: { exact?: boolean } = {}): E2ELocator {
    return new E2ELocator(this.page, { kind: 'text', value: text, exact: options.exact }, this.contextId);
  }

  getByTestId(testId: string): E2ELocator {
    return new E2ELocator(this.page, { kind: 'testid', value: testId }, this.contextId);
  }

  waitForSelector(selector: string, options: E2EWaitOptions = {}): Promise<void> {
    return this.page.waitForQuery(parseSelector(selector), options, this.contextId);
  }

  textContent(selector: string, options?: E2EActionOptions): Promise<string | null> {
    return this.page.textContentQuery(parseSelector(selector), options, this.contextId);
  }
}
