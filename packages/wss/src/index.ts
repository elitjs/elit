/**
 * WebSocket Secure (WSS) module with unified API across runtimes
 * Pure implementation without external dependencies
 * Compatible with 'ws' package WSS API
 * - Node.js: uses native WebSocket with HTTPS
 * - Bun: uses native WebSocket with TLS
 * - Deno: uses native WebSocket with TLS
 */

import { WSSClient, createWSSClient } from './client';
import { getRuntime } from './runtime';
import { WSSServer, createWSSServer } from './server';
import { CLOSE_CODES, ReadyState } from '@elitjs/ws';

export { WSSClient, createWSSClient } from './client';
export { getRuntime } from './runtime';
export { WSSServer, createWSSServer } from './server';
export type { WSSServerOptions } from './types';
export type { Data, ServerOptions } from '@elitjs/ws';
export { CLOSE_CODES, ReadyState } from '@elitjs/ws';

/**
 * Default export
 */
export default {
  WSSClient,
  WSSServer,
  createWSSClient,
  createWSSServer,
  ReadyState,
  CLOSE_CODES,
  getRuntime,
};
