/**
 * HTTPS module with unified API across runtimes
 * Optimized for maximum performance across Node.js, Bun, and Deno
 */

import { Agent } from './agent';
import { ClientRequest } from './client-request';
import { get, request } from './request-api';
import { getRuntime } from './runtime';
import { createServer, Server } from './server-runtime';

export { Agent } from './agent';
export { ClientRequest } from './client-request';
export { get, request } from './request-api';
export { getRuntime } from './runtime';
export { createServer, Server } from './server-runtime';
export type { RequestListener, RequestOptions, ServerOptions } from './types';

export default {
  createServer,
  request,
  get,
  Server,
  Agent,
  ClientRequest,
  getRuntime,
};