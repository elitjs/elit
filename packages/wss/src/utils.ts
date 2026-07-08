import { EventEmitter } from 'events';

import type { WSSServerOptions } from './types';

/**
 * Helper: Queue callback.
 */
export function queueCallback(callback?: () => void): void {
  if (callback) {
    queueMicrotask(callback);
  }
}

/**
 * Helper: Build HTTPS options from WSS options.
 */
export function buildHttpsOptions(options?: WSSServerOptions): any {
  const httpsOptions: any = {};

  if (options?.key) httpsOptions.key = options.key;
  if (options?.cert) httpsOptions.cert = options.cert;
  if (options?.ca) httpsOptions.ca = options.ca;
  if (options?.passphrase) httpsOptions.passphrase = options.passphrase;
  if (options?.rejectUnauthorized !== undefined) httpsOptions.rejectUnauthorized = options.rejectUnauthorized;
  if (options?.requestCert !== undefined) httpsOptions.requestCert = options.requestCert;

  return httpsOptions;
}

/**
 * Helper: Emit close event with optional callback.
 */
export function emitCloseWithCallback(emitter: EventEmitter, callback?: (err?: Error) => void): void {
  emitter.emit('close');
  queueCallback(callback as any);
}