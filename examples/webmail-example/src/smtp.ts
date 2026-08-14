import type { ElitSMTPServerConfig, SMTPServerSession } from '@elitjs/smtp-server';

import { WEBMAIL_SMTP_BANNER, WEBMAIL_SMTP_HOST, WEBMAIL_SMTP_PORT } from './shared';
import { addIncomingMessage } from './store';

function unfoldHeaders(rawHeaders: string): string[] {
  const lines = rawHeaders.split(/\r?\n/);
  const unfolded: string[] = [];

  for (const line of lines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += ` ${line.trim()}`;
      continue;
    }

    unfolded.push(line);
  }

  return unfolded.filter(Boolean);
}

function parseHeaders(raw: string): Record<string, string> {
  const headers: Record<string, string> = {};

  for (const line of unfoldHeaders(raw)) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();
    headers[key] = value;
  }

  return headers;
}

function stripAddress(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return (match ? match[1] : value).replace(/^['"]|['"]$/g, '').trim();
}

function splitAddressHeader(value: string | undefined, fallback: string[]): string[] {
  if (!value) {
    return fallback;
  }

  const items = value
    .split(/[;,]/)
    .map((entry) => stripAddress(entry))
    .filter(Boolean);

  return items.length > 0 ? items : fallback;
}

function splitRawMessage(rawMessage: string): { headers: Record<string, string>; body: string } {
  const boundaryIndex = rawMessage.search(/\r?\n\r?\n/);
  if (boundaryIndex === -1) {
    return {
      headers: {},
      body: rawMessage.trim(),
    };
  }

  const rawHeaders = rawMessage.slice(0, boundaryIndex);
  const body = rawMessage.slice(boundaryIndex).replace(/^\r?\n\r?\n/, '').trim();

  return {
    headers: parseHeaders(rawHeaders),
    body,
  };
}

function parseIncomingMessage(rawMessage: string, session: SMTPServerSession): {
  from: string;
  to: string[];
  subject: string;
  text: string;
} {
  const { headers, body } = splitRawMessage(rawMessage);
  const envelopeFrom = session.envelope.mailFrom && session.envelope.mailFrom.address
    ? session.envelope.mailFrom.address
    : 'mailer-daemon@elit.local';
  const envelopeRecipients = session.envelope.rcptTo.map((entry) => entry.address).filter(Boolean);

  return {
    from: stripAddress(headers.from || envelopeFrom),
    to: splitAddressHeader(headers.to, envelopeRecipients.length > 0 ? envelopeRecipients : ['alex@elit.local']),
    subject: (headers.subject || '(no subject)').trim() || '(no subject)',
    text: body || '(empty message)',
  };
}

function readMessageStream(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    stream.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    stream.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });

    stream.on('error', reject);
  });
}

export function createWebmailSmtpConfig(overrides: Partial<ElitSMTPServerConfig> = {}): ElitSMTPServerConfig {
  return {
    host: WEBMAIL_SMTP_HOST,
    port: WEBMAIL_SMTP_PORT,
    name: 'mail.elit.local',
    banner: WEBMAIL_SMTP_BANNER,
    authOptional: true,
    allowInsecureAuth: true,
    disabledCommands: ['AUTH', 'STARTTLS'],
    onData(stream, session, callback) {
      readMessageStream(stream)
        .then((rawMessage) => {
          const payload = parseIncomingMessage(rawMessage, session);
          addIncomingMessage({
            ...payload,
            source: 'smtp',
          });
          callback();
        })
        .catch((error) => {
          callback(error as Error);
        });
    },
    ...overrides,
  };
}