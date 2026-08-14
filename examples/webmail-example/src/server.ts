import { ServerRouter } from '@elitjs/server';

import { WEBMAIL_SMTP_BANNER, WEBMAIL_SMTP_HOST, WEBMAIL_SMTP_PORT } from './shared';
import { createOutgoingMessage, getMailboxStats, getMessage, injectDemoInboundMessage, listAccounts, listMessages, registerAccount, saveDraftMessage } from './store';

export const server = new ServerRouter();

server.get('/api/health', (ctx) => {
  ctx.res.json({ ok: true, service: 'webmail-example' });
});

server.get('/api/accounts', (ctx) => {
  ctx.res.json({ accounts: listAccounts() });
});

server.post('/api/accounts/register', (ctx) => {
  try {
    const account = registerAccount(
      String(ctx.body?.email || ''),
      String(ctx.body?.name || ''),
    );

    ctx.res.status(201).json({
      account,
      accounts: listAccounts(),
    });
  } catch (error) {
    ctx.res.status(400).json({
      error: error instanceof Error ? error.message : 'Unable to register account.',
    });
  }
});

server.get('/api/status', (ctx) => {
  ctx.res.json({
    ok: true,
    smtp: {
      host: WEBMAIL_SMTP_HOST,
      port: WEBMAIL_SMTP_PORT,
      banner: WEBMAIL_SMTP_BANNER,
    },
    stats: getMailboxStats(),
  });
});

server.get('/api/messages', (ctx) => {
  const mailbox = typeof ctx.query.mailbox === 'string' ? ctx.query.mailbox : 'all';
  const query = typeof ctx.query.q === 'string' ? ctx.query.q : '';

  ctx.res.json({
    items: listMessages({ mailbox: mailbox as any, query }),
    stats: getMailboxStats(),
  });
});

server.get('/api/messages/:id', (ctx) => {
  const message = getMessage(ctx.params.id);
  if (!message) {
    ctx.res.status(404).json({ error: 'Message not found.' });
    return;
  }

  ctx.res.json({
    message,
    stats: getMailboxStats(),
  });
});

server.post('/api/messages/send', (ctx) => {
  try {
    const message = createOutgoingMessage({
      from: String(ctx.body?.from || ''),
      to: String(ctx.body?.to || ''),
      subject: String(ctx.body?.subject || ''),
      text: String(ctx.body?.text || ''),
    });

    ctx.res.status(201).json({
      message,
      stats: getMailboxStats(),
    });
  } catch (error) {
    ctx.res.status(400).json({
      error: error instanceof Error ? error.message : 'Unable to send message.',
    });
  }
});

server.post('/api/messages/draft', (ctx) => {
  try {
    const message = saveDraftMessage({
      from: String(ctx.body?.from || ''),
      to: String(ctx.body?.to || ''),
      subject: String(ctx.body?.subject || ''),
      text: String(ctx.body?.text || ''),
    });

    ctx.res.status(201).json({
      message,
      stats: getMailboxStats(),
    });
  } catch (error) {
    ctx.res.status(400).json({
      error: error instanceof Error ? error.message : 'Unable to save draft.',
    });
  }
});

server.post('/api/demo/inbound', (ctx) => {
  const message = injectDemoInboundMessage();

  ctx.res.status(201).json({
    message,
    stats: getMailboxStats(),
  });
});