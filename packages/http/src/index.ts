/**
 * HTTP module with unified API across runtimes
 * Ultra-optimized for maximum performance across Node.js, Bun, and Deno
 */

import { Agent } from './agent';
import { ClientRequest } from './client-request';
import { METHODS, STATUS_CODES } from './constants';
import { IncomingMessage } from './incoming-message';
import { get, request } from './request-api';
import { ServerResponse } from './response';
import { getRuntime } from './runtime';
import { createServer, Server } from './server-runtime';

export { Agent } from './agent';
export { ClientRequest } from './client-request';
export { METHODS, STATUS_CODES } from './constants';
export { IncomingMessage } from './incoming-message';
export { get, request } from './request-api';
export { ServerResponse } from './response';
export { getRuntime } from './runtime';
export { createServer, Server } from './server-runtime';
export { buildRequestBody, closeAndEmit, createAddress, createErrorResponse, emitListeningWithCallback, normalizeRequestBodyChunk, queueCallback } from './utils';
export type { RequestBodyChunk } from './utils';
export type {
  IncomingHttpHeaders,
  OutgoingHttpHeaders,
  RequestListener,
  RequestOptions,
  ServerListenOptions,
  ServerOptions,
} from './types';

export default {
  createServer,
  request,
  get,
  Server,
  IncomingMessage,
  ServerResponse,
  Agent,
  ClientRequest,
  METHODS,
  STATUS_CODES,
  getRuntime,
};