import type { IncomingMessage, Server, ServerResponse } from 'node:http';

import type { E2EPage } from './browser';

import type { ServerRouter } from '@elitjs/server';

import type { E2EResponse } from './response';

export type E2EHandler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;

export type E2ERouterLike = Pick<ServerRouter, 'handle'>;

export interface E2EServerOptions {
  /** Port to listen on. Defaults to 0 — the OS picks a free ephemeral port. */
  port?: number;
  /** Host to bind. Defaults to '127.0.0.1'. */
  host?: string;
}

/** Options accepted by every E2EClient / app.request method — Playwright-style. */
export interface E2ERequestOptions {
  method?: string;
  /** Request headers. */
  headers?: Record<string, string>;
  /** Request body (Playwright name) — stringified as JSON unless it is a string. Alias of `body`. */
  data?: unknown;
  /** Request body — stringified as JSON unless it is a string. */
  body?: unknown;
  /** Query parameters (Playwright name) — alias of `query`. */
  params?: Record<string, string | number | boolean | undefined>;
  /** Query parameters. */
  query?: Record<string, string | number | boolean | undefined>;
  /** multipart/form-data fields — body is encoded with a random boundary. */
  multipart?: Record<string, string>;
}

/** Playwright-style request context bound to the running server's URL. */
export interface E2EAPIRequest {
  readonly baseUrl: string;
  fetch(path: string, options?: E2ERequestOptions): Promise<E2EResponse>;
  get(path: string, options?: E2ERequestOptions): Promise<E2EResponse>;
  head(path: string, options?: E2ERequestOptions): Promise<E2EResponse>;
  post(path: string, options?: E2ERequestOptions): Promise<E2EResponse>;
  put(path: string, options?: E2ERequestOptions): Promise<E2EResponse>;
  patch(path: string, options?: E2ERequestOptions): Promise<E2EResponse>;
  delete(path: string, options?: E2ERequestOptions): Promise<E2EResponse>;
}

/** @deprecated Use E2EAPIRequest (app.request) or the typed helpers on E2EClient. */
export interface E2EClient extends E2EAPIRequest {
  getJson<T = unknown>(path: string, options?: E2ERequestOptions): Promise<T>;
  post<T = unknown>(path: string, body?: unknown, options?: E2ERequestOptions): Promise<T>;
  put<T = unknown>(path: string, body?: unknown, options?: E2ERequestOptions): Promise<T>;
  patch<T = unknown>(path: string, body?: unknown, options?: E2ERequestOptions): Promise<T>;
  delete<T = unknown>(path: string, options?: E2ERequestOptions): Promise<T>;
  /** Opens a WebSocket connection to the server and waits for it to open. */
  webSocket(path: string): Promise<WebSocket>;
}

export interface E2EApp {
  /** The bound port (useful when options.port was left at 0). */
  port: number;
  /** Base URL of the running server, e.g. http://127.0.0.1:49152. */
  url: string;
  /** HTTP client bound to the server URL (getJson/post/… helpers). */
  client: E2EClient;
  /** Playwright-style request context bound to the server URL. */
  request: E2EAPIRequest;
  /** The underlying Node HTTP server. */
  server: Server;
  /** Stops the server, destroys idle keep-alive sockets, and resolves once closed. */
  close(): Promise<void>;
}

/** Fixtures injected into every test created by e2eTest(). */
export interface E2ETestFixtures {
  app: E2EApp;
  request: E2EAPIRequest;
  /** A live browser page — present when tracing is enabled (trace option / ELIT_E2E_TRACE). */
  page?: E2EPage;
}
