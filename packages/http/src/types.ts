import type { IncomingMessage } from './incoming-message';
import type { ServerResponse } from './response';

/**
 * HTTP Headers type
 */
export type IncomingHttpHeaders = Record<string, string | string[] | undefined>;
export type OutgoingHttpHeaders = Record<string, string | string[] | number>;

/**
 * Request listener type
 */
export type RequestListener = (req: IncomingMessage, res: ServerResponse) => void;

/**
 * Request options
 */
export interface RequestOptions {
  method?: string;
  headers?: OutgoingHttpHeaders;
  timeout?: number;
  signal?: AbortSignal;
}

export interface ServerListenOptions {
  port?: number;
  hostname?: string;
  backlog?: number;
  fd?: number;
}

/**
 * Server options
 */
export interface ServerOptions {
  IncomingMessage?: typeof IncomingMessage;
  ServerResponse?: typeof ServerResponse;
}