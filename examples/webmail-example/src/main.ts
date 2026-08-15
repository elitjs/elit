import {
  aside,
  button,
  div,
  form,
  h1,
  h2,
  header,
  input,
  main,
  option,
  p,
  pre,
  section,
  select,
  small,
  span,
  strong,
  textarea,
} from '@elitjs/el';
import { render } from '@elitjs/dom';
import { bindValue, createState, reactive } from '@elitjs/state';

import type {
  WebmailAccount,
  WebmailAccountRegisterResponse,
  WebmailAccountsResponse,
  WebmailDraftInput,
  WebmailMailboxId,
  WebmailMailboxStats,
  WebmailMessage,
  WebmailMessageResponse,
  WebmailMessagesResponse,
  WebmailMessageSummary,
  WebmailStatusResponse,
} from './shared';
import './styles';

const emptyStats: WebmailMailboxStats = {
  all: 0,
  inbox: 0,
  sent: 0,
  drafts: 0,
  unread: 0,
};

const initialDraft: WebmailDraftInput = {
  from: 'alex@elit.local',
  to: '',
  subject: '',
  text: '',
};

interface WebmailState {
  items: WebmailMessageSummary[];
  selectedMessage: WebmailMessage | null;
  activeMailbox: WebmailMailboxId;
  stats: WebmailMailboxStats;
  smtp: WebmailStatusResponse['smtp'] | null;
  accounts: WebmailAccount[];
  loading: boolean;
  sending: boolean;
  saving: boolean;
  registering: boolean;
  composeOpen: boolean;
  registerOpen: boolean;
  notice: string | null;
  error: string | null;
}

const searchQueryState = createState('');
const draftFromState = createState(initialDraft.from);
const draftToState = createState(initialDraft.to);
const draftSubjectState = createState(initialDraft.subject);
const draftTextState = createState(initialDraft.text);
const registerEmailState = createState('');
const registerNameState = createState('');

const appState = createState<WebmailState>({
  items: [],
  selectedMessage: null,
  activeMailbox: 'all',
  stats: emptyStats,
  smtp: null,
  accounts: [],
  loading: false,
  sending: false,
  saving: false,
  registering: false,
  composeOpen: false,
  registerOpen: false,
  notice: null,
  error: null,
});

const mailboxLabels: Array<{ id: WebmailMailboxId; label: string }> = [
  { id: 'all', label: 'All mail' },
  { id: 'inbox', label: 'Inbox' },
  { id: 'sent', label: 'Sent' },
  { id: 'drafts', label: 'Drafts' },
];

function updateState(next: Partial<WebmailState> | ((current: WebmailState) => WebmailState)): void {
  appState.value = typeof next === 'function'
    ? next(appState.value)
    : { ...appState.value, ...next };
}

function getCurrentDraft(): WebmailDraftInput {
  return {
    from: draftFromState.value,
    to: draftToState.value,
    subject: draftSubjectState.value,
    text: draftTextState.value,
  };
}

function resetDraft(fromAddress: string = initialDraft.from): void {
  draftFromState.value = fromAddress;
  draftToState.value = initialDraft.to;
  draftSubjectState.value = initialDraft.subject;
  draftTextState.value = initialDraft.text;
}

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = typeof payload?.error === 'string'
      ? payload.error
      : `Request failed with ${response.status}`;
    throw new Error(errorMessage);
  }

  return payload as T;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function mailboxCount(stats: WebmailMailboxStats, mailbox: WebmailMailboxId): number {
  if (mailbox === 'all') {
    return stats.all;
  }

  return stats[mailbox];
}

async function loadStatus(): Promise<void> {
  const status = await readJson<WebmailStatusResponse>('/api/status');

  updateState((current) => ({
    ...current,
    smtp: status.smtp,
    stats: status.stats,
  }));
}

async function loadMessages(mailbox: WebmailMailboxId = appState.value.activeMailbox): Promise<void> {
  updateState({ loading: true, activeMailbox: mailbox, error: null });

  const params = new URLSearchParams();
  if (mailbox !== 'all') {
    params.set('mailbox', mailbox);
  }

  if (searchQueryState.value.trim()) {
    params.set('q', searchQueryState.value.trim());
  }

  try {
    const payload = await readJson<WebmailMessagesResponse>(`/api/messages${params.size ? `?${params.toString()}` : ''}`);
    updateState((current) => ({
      ...current,
      items: payload.items,
      stats: payload.stats,
      loading: false,
      selectedMessage: current.selectedMessage && payload.items.some((item) => item.id === current.selectedMessage?.id)
        ? current.selectedMessage
        : null,
    }));
  } catch (error) {
    updateState({
      loading: false,
      error: error instanceof Error ? error.message : 'Unable to load messages.',
    });
  }
}

async function openMessage(id: string): Promise<void> {
  try {
    const payload = await readJson<WebmailMessageResponse>(`/api/messages/${id}`);
    updateState((current) => ({
      ...current,
      selectedMessage: payload.message,
      stats: payload.stats,
      items: current.items.map((item) => item.id === id ? { ...item, unread: false } : item),
    }));
  } catch (error) {
    updateState({
      error: error instanceof Error ? error.message : 'Unable to open the message.',
    });
  }
}

async function sendDraft(): Promise<void> {
  updateState({ sending: true, error: null, notice: null });

  try {
    const currentDraft = getCurrentDraft();
    await readJson<WebmailMessageResponse>('/api/messages/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(currentDraft),
    });

    updateState({
      sending: false,
      composeOpen: false,
      notice: `Sent "${currentDraft.subject.trim() || '(no subject)'}".`,
    });

    resetDraft(currentDraft.from);
    await loadMessages('sent');
  } catch (error) {
    updateState({
      sending: false,
      error: error instanceof Error ? error.message : 'Unable to send the message.',
    });
  }
}

async function saveDraft(): Promise<void> {
  updateState({ saving: true, error: null, notice: null });

  try {
    const currentDraft = getCurrentDraft();
    await readJson<WebmailMessageResponse>('/api/messages/draft', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(currentDraft),
    });

    updateState({
      saving: false,
      composeOpen: false,
      notice: `Saved draft "${currentDraft.subject.trim() || '(no subject)'}".`,
    });

    resetDraft(currentDraft.from);
    await loadMessages('drafts');
  } catch (error) {
    updateState({
      saving: false,
      error: error instanceof Error ? error.message : 'Unable to save draft.',
    });
  }
}

function replyToMessage(message: WebmailMessage): void {
  draftFromState.value = initialDraft.from;
  draftToState.value = message.from;
  draftSubjectState.value = message.subject.startsWith('Re: ') ? message.subject : `Re: ${message.subject}`;
  draftTextState.value = `\n\n--- Original message from ${message.from} on ${new Date(message.receivedAt).toLocaleDateString()} ---\n${message.text}`;
  updateState({ composeOpen: true, notice: null, error: null });
}

async function simulateInbound(): Promise<void> {
  updateState({ error: null, notice: null });

  try {
    await readJson<WebmailMessageResponse>('/api/demo/inbound', {
      method: 'POST',
    });

    updateState({
      notice: 'Injected a demo inbound message into Inbox.',
    });

    await loadMessages(appState.value.activeMailbox === 'sent' || appState.value.activeMailbox === 'drafts' ? 'all' : appState.value.activeMailbox);
  } catch (error) {
    updateState({
      error: error instanceof Error ? error.message : 'Unable to inject a demo message.',
    });
  }
}

async function loadAccounts(): Promise<void> {
  const payload = await readJson<WebmailAccountsResponse>('/api/accounts');

  updateState((current) => ({
    ...current,
    accounts: payload.accounts,
  }));

  if (payload.accounts.length > 0 && !draftFromState.value) {
    const defaultAccount = payload.accounts.find((a) => a.isDefault) ?? payload.accounts[0];
    draftFromState.value = defaultAccount.email;
  }
}

async function registerAccount(): Promise<void> {
  updateState({ registering: true, error: null, notice: null });

  try {
    const payload = await readJson<WebmailAccountRegisterResponse>('/api/accounts/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: registerEmailState.value,
        name: registerNameState.value,
      }),
    });

    registerEmailState.value = '';
    registerNameState.value = '';

    updateState({
      registering: false,
      accounts: payload.accounts,
      notice: `Registered ${payload.account.email} successfully.`,
    });

    draftFromState.value = payload.account.email;
  } catch (error) {
    updateState({
      registering: false,
      error: error instanceof Error ? error.message : 'Unable to register account.',
    });
  }
}

function renderMailboxButton(state: WebmailState, mailbox: { id: WebmailMailboxId; label: string }) {
  const active = state.activeMailbox === mailbox.id;

  return button({
    className: active ? 'mailbox-button mailbox-button-active' : 'mailbox-button',
    onclick: () => {
      void loadMessages(mailbox.id);
    },
  }, [
    span(mailbox.label),
    span({ className: active ? 'mailbox-count mailbox-button-active-count' : 'mailbox-count' }, String(mailboxCount(state.stats, mailbox.id))),
  ]);
}

function renderMessages(state: WebmailState) {
  if (state.loading) {
    return div({ className: 'placeholder' }, 'Loading mailbox...');
  }

  if (state.items.length === 0) {
    return div({ className: 'placeholder' }, 'No messages match the current mailbox and search filter.');
  }

  return div({ className: 'message-list' }, state.items.map((item) => {
    const active = state.selectedMessage?.id === item.id;

    return button({
      className: active ? 'message-item message-item-active' : 'message-item',
      onclick: () => {
        void openMessage(item.id);
      },
    }, [
      div({ className: 'message-meta' }, [
        div([
          item.unread ? span({ className: 'unread-dot' }) : null,
          strong(item.from),
        ]),
        small(formatDate(item.receivedAt)),
      ]),
      div({ className: 'message-subject' }, item.subject),
      div({ className: 'message-snippet' }, item.snippet),
      div({ className: 'message-meta' }, [
        small(`to ${item.to.join(', ')}`),
        span({ className: 'pill' }, item.source),
      ]),
    ]);
  }));
}

function renderPreview(state: WebmailState) {
  if (!state.selectedMessage) {
    return div({ className: 'placeholder' }, 'Select a message to open the reading pane. Inbox messages are marked as read when opened.');
  }

  return div([
    div({ className: 'preview-header' }, [
      div([
        div({ className: 'preview-subject' }, state.selectedMessage.subject),
        p({ className: 'panel-copy' }, `From ${state.selectedMessage.from} to ${state.selectedMessage.to.join(', ')}`),
      ]),
      div([
        span({ className: 'pill' }, state.selectedMessage.mailbox),
        p({ className: 'panel-copy' }, formatDate(state.selectedMessage.receivedAt)),
      ]),
    ]),
    div({ className: 'toolbar-actions' }, [
      button({
        className: 'action-button action-secondary',
        onclick: () => {
          replyToMessage(state.selectedMessage!);
        },
      }, 'Reply'),
    ]),
    pre({ className: 'preview-body' }, state.selectedMessage.text),
  ]);
}

function renderCompose(state: WebmailState) {
  if (!state.composeOpen) {
    return null;
  }

  return section({ className: 'panel compose-panel' }, [
    div([
      div({ className: 'panel-title' }, 'Compose'),
      p({ className: 'panel-copy' }, 'Messages sent from the form land in the local Sent mailbox. Use the SMTP sandbox when you want to exercise inbound delivery too.'),
    ]),
    form({
      onsubmit: (event: Event) => {
        event.preventDefault();
        void sendDraft();
      },
    }, [
      div({ className: 'compose-grid' }, [
        div({ className: 'compose-half' }, [
          p({ className: 'panel-copy' }, 'From'),
          state.accounts.length > 0
            ? select({
                className: 'field',
                ...bindValue(draftFromState),
              }, state.accounts.map((account) => option({
                value: account.email,
              }, `${account.name} <${account.email}>`)))
            : input({
                className: 'field',
                type: 'email',
                ...bindValue(draftFromState),
              }),
        ]),
        div({ className: 'compose-half' }, [
          p({ className: 'panel-copy' }, 'To'),
          input({
            className: 'field',
            type: 'text',
            placeholder: 'team@elit.local, demo@elit.local',
            ...bindValue(draftToState),
          }),
        ]),
      ]),
      div([
        p({ className: 'panel-copy' }, 'Subject'),
        input({
          className: 'field',
          type: 'text',
          ...bindValue(draftSubjectState),
        }),
      ]),
      div([
        p({ className: 'panel-copy' }, 'Body'),
        textarea({
          className: 'field',
          rows: 10,
          ...bindValue(draftTextState),
        }),
      ]),
      div({ className: 'compose-actions' }, [
        button({
          type: 'button',
          className: 'action-button action-secondary',
          onclick: () => {
            updateState({ composeOpen: false });
          },
        }, 'Close'),
        button({
          type: 'button',
          className: 'action-button action-secondary',
          onclick: () => {
            void saveDraft();
          },
        }, state.saving ? 'Saving...' : 'Save draft'),
        button({
          type: 'submit',
          className: 'action-button action-primary',
        }, state.sending ? 'Sending...' : 'Send message'),
      ]),
    ]),
  ]);
}

function renderRegister(state: WebmailState) {
  if (!state.registerOpen) {
    return null;
  }

  return section({ className: 'panel register-panel' }, [
    div([
      div({ className: 'panel-title' }, 'Register email account'),
      p({ className: 'panel-copy' }, 'Add a sender identity to use in the From field when composing. Registered accounts persist for this session.'),
    ]),
    form({
      onsubmit: (event: Event) => {
        event.preventDefault();
        void registerAccount();
      },
    }, [
      div({ className: 'compose-grid' }, [
        div({ className: 'compose-half' }, [
          p({ className: 'panel-copy' }, 'Email address'),
          input({
            className: 'field',
            type: 'email',
            placeholder: 'you@example.local',
            ...bindValue(registerEmailState),
          }),
        ]),
        div({ className: 'compose-half' }, [
          p({ className: 'panel-copy' }, 'Display name'),
          input({
            className: 'field',
            type: 'text',
            placeholder: 'Your name',
            ...bindValue(registerNameState),
          }),
        ]),
      ]),
      div({ className: 'compose-actions' }, [
        button({
          type: 'button',
          className: 'action-button action-secondary',
          onclick: () => {
            updateState({ registerOpen: false });
          },
        }, 'Close'),
        button({
          type: 'submit',
          className: 'action-button action-primary',
        }, state.registering ? 'Registering...' : 'Register account'),
      ]),
    ]),
    state.accounts.length > 0
      ? div([
          p({ className: 'panel-copy' }, `${state.accounts.length} registered account${state.accounts.length === 1 ? '' : 's'}`),
          div({ className: 'account-list' }, state.accounts.map((account) => div({ className: 'account-item' }, [
            div({ className: 'account-avatar' }, account.name.charAt(0).toUpperCase()),
            div({ className: 'account-info' }, [
              div({ className: 'account-email' }, account.email),
              div({ className: 'account-name' }, account.name),
            ]),
            account.isDefault ? span({ className: 'account-default-badge' }, 'default') : null,
          ]))),
        ])
      : null,
  ]);
}

function renderApp(state: WebmailState) {
  return div({ className: 'webmail-app' }, [
    header({ className: 'hero' }, [
      div([
        div({ className: 'eyebrow' }, 'Elit example'),
        h1({ className: 'headline' }, 'Webmail UI with a local SMTP sandbox and config-driven server wiring.'),
        p({ className: 'subhead' }, 'This example keeps mail in memory, exposes a small inbox API, and receives SMTP messages directly into the same mailbox store through `dev.smtp` and `preview.smtp`.'),
      ]),
      div({ className: 'hero-actions' }, [
        button({
          className: 'action-button action-primary',
          onclick: () => {
            updateState({ composeOpen: !state.composeOpen, notice: null, error: null });
          },
        }, state.composeOpen ? 'Hide compose' : 'Compose'),
        button({
          className: 'action-button action-secondary',
          onclick: () => {
            updateState({ registerOpen: !state.registerOpen, notice: null, error: null });
          },
        }, state.registerOpen ? 'Hide register' : 'Register email'),
        button({
          className: 'action-button action-secondary',
          onclick: () => {
            void simulateInbound();
          },
        }, 'Simulate inbound'),
        button({
          className: 'action-button action-secondary',
          onclick: () => {
            void loadMessages(state.activeMailbox);
          },
        }, 'Refresh'),
      ]),
    ]),
    state.notice ? div({ className: 'notice' }, state.notice) : null,
    state.error ? div({ className: 'error' }, state.error) : null,
    main({ className: 'layout' }, [
      aside({ className: 'panel sidebar' }, [
        div({ className: 'panel-title' }, 'Mailboxes'),
        p({ className: 'panel-copy' }, `${state.stats.unread} unread message${state.stats.unread === 1 ? '' : 's'} waiting in Inbox.`),
        ...mailboxLabels.map((mailbox) => renderMailboxButton(state, mailbox)),
        div({ className: 'smtp-box' }, state.smtp
          ? `SMTP sandbox: ${state.smtp.host}:${state.smtp.port}\n${state.smtp.banner}`
          : 'Loading SMTP status...'),
      ]),
      section({ className: 'panel list-panel' }, [
        div({ className: 'toolbar' }, [
          div([
            div({ className: 'panel-title' }, 'Inbox view'),
            p({ className: 'panel-copy' }, 'Filter by sender, recipient, subject, or body text.'),
          ]),
          form({
            onsubmit: (event: Event) => {
              event.preventDefault();
              void loadMessages(state.activeMailbox);
            },
          }, [
            input({
              className: 'field',
              type: 'search',
              placeholder: 'Search mail...',
              ...bindValue(searchQueryState),
            }),
          ]),
        ]),
        renderMessages(state),
      ]),
      section({ className: 'panel preview-panel' }, [
        div({ className: 'toolbar-actions' }, [
          span({ className: 'pill' }, state.activeMailbox),
          state.selectedMessage ? small(`Source: ${state.selectedMessage.source}`) : null,
        ]),
        h2({ className: 'panel-title' }, 'Reading pane'),
        renderPreview(state),
      ]),
    ]),
    renderCompose(state),
    renderRegister(state),
  ]);
}

render('root', reactive(appState, renderApp));

Promise.all([loadStatus(), loadMessages('all'), loadAccounts()]).catch((error) => {
  updateState({
    error: error instanceof Error ? error.message : 'Unable to bootstrap the webmail example.',
  });
});