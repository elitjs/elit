const net = require('node:net');

const mode = process.env.ELIT_PM_LISTEN_MODE;
const publicPort = Number.parseInt(process.env.ELIT_PM_PUBLIC_PORT ?? '', 10);
const originalListen = net.Server.prototype.listen;
const state = {
  handle: null,
  waiters: [],
};

function sendMessage(message) {
  if (typeof process.send === 'function') {
    process.send(message);
  }
}

function wantsSharedListener(args) {
  if (mode !== 'ipc' || !Number.isInteger(publicPort)) {
    return false;
  }

  const firstArg = args[0];
  if (typeof firstArg === 'number') {
    return firstArg === publicPort;
  }

  if (firstArg && typeof firstArg === 'object') {
    if (typeof firstArg.fd === 'number') {
      return false;
    }

    const requestedPort = typeof firstArg.port === 'number' ? firstArg.port : publicPort;
    return requestedPort === publicPort;
  }

  return false;
}

function attachSharedHandle(server, args, handle) {
  const callback = typeof args[args.length - 1] === 'function' ? args[args.length - 1] : undefined;
  originalListen.call(server, handle, () => {
    if (callback) {
      callback();
    }
    sendMessage({ type: 'elit:pm:listener-ready' });
  });
}

net.Server.prototype.listen = function patchedListen(...args) {
  if (!wantsSharedListener(args)) {
    return originalListen.apply(this, args);
  }

  if (state.handle) {
    attachSharedHandle(this, args, state.handle);
  } else {
    state.waiters.push((handle) => attachSharedHandle(this, args, handle));
  }

  return this;
};

process.on('message', (message, handle) => {
  if (!message || message.type !== 'elit:pm:listen-handle' || !handle) {
    return;
  }

  state.handle = handle;
  const waiters = state.waiters.splice(0);
  for (const waiter of waiters) {
    waiter(handle);
  }
});

sendMessage({ type: 'elit:pm:bootstrap-ready' });