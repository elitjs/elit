import type { ServerOptions } from '@elitjs/ws';

/**
 * WSS server options.
 */
export interface WSSServerOptions extends ServerOptions {
  key?: string | Buffer;
  cert?: string | Buffer;
  ca?: string | Buffer;
  passphrase?: string;
  rejectUnauthorized?: boolean;
  requestCert?: boolean;
  httpsServer?: any;
}