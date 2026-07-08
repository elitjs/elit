/**
 * SMTP server helpers built on top of the smtp-server package.
 */

import { SMTPServer } from 'smtp-server';

import { DEFAULT_SMTP_HOST, DEFAULT_SMTP_PORT } from './constants';
import { createSmtpServer, startSmtpServer } from './factory';

export { DEFAULT_SMTP_HOST, DEFAULT_SMTP_PORT } from './constants';
export { normalizeSmtpServerConfigs, resolveSmtpServerConfig } from './config';
export { createSmtpServer, startSmtpServer } from './factory';
export type {
  ElitSMTPServerConfig,
  ElitSMTPServerHandle,
  ElitSMTPServerInput,
  ResolvedElitSMTPServerConfig,
  SMTPServerAddress,
  SMTPServerAuthentication,
  SMTPServerAuthenticationResponse,
  SMTPServerDataStream,
  SMTPServerEnvelope,
  SMTPServerOptions,
  SMTPServerSession,
} from './types';

export default {
  SMTPServer,
  createSmtpServer,
  startSmtpServer,
  DEFAULT_SMTP_HOST,
  DEFAULT_SMTP_PORT,
};