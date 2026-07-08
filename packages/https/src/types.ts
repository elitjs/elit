import type { IncomingMessage, ServerResponse } from '@elitjs/http';

export type { RequestListener, RequestOptions, ServerListenOptions } from '@elitjs/http';

/**
 * HTTPS Server options
 */
export interface ServerOptions {
  IncomingMessage?: typeof IncomingMessage;
  ServerResponse?: typeof ServerResponse;
  key?: string | Buffer | Array<string | Buffer>;
  cert?: string | Buffer | Array<string | Buffer>;
  ca?: string | Buffer | Array<string | Buffer>;
  passphrase?: string;
  pfx?: string | Buffer | Array<string | Buffer>;
  dhparam?: string | Buffer;
  ecdhCurve?: string;
  honorCipherOrder?: boolean;
  requestCert?: boolean;
  rejectUnauthorized?: boolean;
  NPNProtocols?: string[] | Buffer[] | Uint8Array[] | Buffer | Uint8Array;
  ALPNProtocols?: string[] | Buffer[] | Uint8Array[] | Buffer | Uint8Array;
  SNICallback?: (servername: string, cb: (err: Error | null, ctx?: any) => void) => void;
  sessionTimeout?: number;
  ticketKeys?: Buffer;
  tls?: {
    key?: string | Buffer;
    cert?: string | Buffer;
    ca?: string | Buffer;
    passphrase?: string;
    dhParamsFile?: string;
  };
}