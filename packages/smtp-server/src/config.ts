import { DEFAULT_SMTP_HOST, DEFAULT_SMTP_PORT } from './constants';

import type { ElitSMTPServerConfig, ElitSMTPServerInput, ResolvedElitSMTPServerConfig } from './types';

export function resolveSmtpServerConfig(config: ElitSMTPServerConfig = {}): ResolvedElitSMTPServerConfig {
  const { port = DEFAULT_SMTP_PORT, host = DEFAULT_SMTP_HOST, label, ...serverOptions } = config;

  return {
    ...serverOptions,
    port,
    host,
    label,
  };
}

export function normalizeSmtpServerConfigs(input: ElitSMTPServerInput): ResolvedElitSMTPServerConfig[] {
  const configs = Array.isArray(input)
    ? input
    : input
      ? [input]
      : [];

  return configs.map((config) => resolveSmtpServerConfig(config));
}