/**
 * Development server with HMR support
 * Cross-runtime transpilation support
 * - Node.js: uses stripTypeScriptTypes with esbuild fallback
 * - Bun: uses Bun.Transpiler
 * - Deno: uses Deno.emit
 */

export { createDevServer } from './dev-server';
export { clearImportMapCache, createImportMap } from './import-map';
export { bodyLimit, cacheControl, compress, cors, errorHandler, logger, rateLimit, security } from './middleware';
export { createProxyHandler } from './proxy';
export { html, json, status, text } from './responses';
export { ServerRouter } from './router';
export { SharedState, StateManager } from './state';
export type {
  ElitRequest,
  ElitResponse,
  HttpMethod,
  Middleware,
  ServerRouteContext,
  ServerRouteHandler,
  SharedStateOptions,
  StateChangeHandler,
} from './types';
export type {
  ClientConfig,
  DevServer,
  DevServerOptions,
  HMRMessage,
  PreviewOptions,
  ProxyConfig,
  ResolveConfig,
  Router,
  StateManager as DevServerStateManager,
  WebSocketConnection,
  WebSocketEndpointConfig,
  WebSocketEndpointContext,
  WebSocketEndpointHandler,
  WebSocketRequest,
  WorkerConfig,
} from './public-types';