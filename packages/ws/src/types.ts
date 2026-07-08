import type { IncomingMessage } from '@elitjs/http';

/**
 * WebSocket data types
 */
export type Data = string | Buffer | ArrayBuffer | Buffer[];

/**
 * WebSocket send options
 */
export interface SendOptions {
  binary?: boolean;
  compress?: boolean;
  fin?: boolean;
  mask?: boolean;
}

/**
 * Verify client callback
 */
export type VerifyClientCallback = (
  info: {
    origin: string;
    secure: boolean;
    req: IncomingMessage;
  },
  callback?: (result: boolean, code?: number, message?: string) => void
) => boolean | void;

/**
 * WebSocket server options
 */
export interface ServerOptions {
  host?: string;
  port?: number;
  backlog?: number;
  server?: any;
  verifyClient?: VerifyClientCallback;
  handleProtocols?: (protocols: Set<string>, request: IncomingMessage) => string | false;
  path?: string;
  noServer?: boolean;
  clientTracking?: boolean;
  perMessageDeflate?: boolean | object;
  maxPayload?: number;
}