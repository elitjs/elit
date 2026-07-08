import type { AddressInfo, Server as NetServer } from 'net';

import { SMTPServer } from 'smtp-server';

import { resolveSmtpServerConfig } from './config';
import { closeSmtpServer } from './lifecycle';

import type { ElitSMTPServerConfig, ElitSMTPServerHandle } from './types';

export function createSmtpServer(config: ElitSMTPServerConfig = {}): ElitSMTPServerHandle {
  const resolvedConfig = resolveSmtpServerConfig(config);
  const { port, host, label: _label, ...serverOptions } = resolvedConfig;
  const server = new SMTPServer(serverOptions);

  return {
    server,
    config: resolvedConfig,
    listen(callback?: () => void): NetServer {
      return callback
        ? server.listen(port, host, callback)
        : server.listen(port, host);
    },
    address(): AddressInfo | string | null {
      return server.server.address() as AddressInfo | string | null;
    },
    close(): Promise<void> {
      return closeSmtpServer(server);
    },
  };
}

export function startSmtpServer(config: ElitSMTPServerConfig = {}): ElitSMTPServerHandle {
  const handle = createSmtpServer(config);
  handle.listen();
  return handle;
}