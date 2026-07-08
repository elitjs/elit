/**
 * WebSocket module with unified API across runtimes
 * Pure implementation without external dependencies
 * - Node.js: uses native 'ws' module (built-in WebSocket implementation)
 * - Bun: uses native WebSocket
 * - Deno: uses native WebSocket
 */

import { CLOSE_CODES, ReadyState } from './constants';
import { createWebSocketServer, WebSocketServer } from './server';
import { getRuntime } from './runtime';
import { WebSocket } from './websocket';

export { CLOSE_CODES, ReadyState } from './constants';
export { createWebSocketServer, WebSocketServer } from './server';
export { getRuntime } from './runtime';
export { WebSocket } from './websocket';
export type { Data, SendOptions, ServerOptions, VerifyClientCallback } from './types';

/**
 * Default export
 */
export default {
  WebSocket,
  WebSocketServer,
  createWebSocketServer,
  ReadyState,
  CLOSE_CODES,
  getRuntime,
};
