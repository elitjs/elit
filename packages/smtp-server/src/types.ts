import type { AddressInfo, Server as NetServer } from 'net';

import type { SMTPServer, SMTPServerOptions } from 'smtp-server';

export type {
  SMTPServerAddress,
  SMTPServerAuthentication,
  SMTPServerAuthenticationResponse,
  SMTPServerDataStream,
  SMTPServerEnvelope,
  SMTPServerOptions,
  SMTPServerSession,
} from 'smtp-server';

export interface ElitSMTPServerConfig extends SMTPServerOptions {
  port?: number;
  host?: string;
  label?: string;
}

export type ElitSMTPServerInput = ElitSMTPServerConfig | ElitSMTPServerConfig[] | undefined;

export interface ResolvedElitSMTPServerConfig extends SMTPServerOptions {
  port: number;
  host: string;
  label?: string;
}

export interface ElitSMTPServerHandle {
  server: SMTPServer;
  config: ResolvedElitSMTPServerConfig;
  listen(callback?: () => void): NetServer;
  address(): AddressInfo | string | null;
  close(): Promise<void>;
}