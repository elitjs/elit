import { createServer as createNodeServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

import { createE2EClient, createE2ECookieJar, createE2ERequest } from './client';
import type { E2EApp, E2EHandler, E2ERouterLike, E2EServerOptions } from './types';

export type E2EServerTarget = E2ERouterLike | E2EHandler;

function isRouterLike(target: E2EServerTarget): target is E2ERouterLike {
  return typeof (target as E2ERouterLike).handle === 'function';
}

function onceListening(server: Server): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    if (server.listening) {
      resolvePromise();
      return;
    }
    server.once('listening', () => resolvePromise());
    server.once('error', reject);
  });
}

/**
 * Starts a real HTTP server around a ServerRouter (or a raw request handler)
 * on an ephemeral port — ready to be exercised end-to-end from a test.
 *
 * ```ts
 * const app = await startE2EServer(router);
 * const res = await app.client.get('/api/hello');
 * await app.close();
 * ```
 */
export function startE2EServer(target: E2EServerTarget, options: E2EServerOptions = {}): Promise<E2EApp> {
  const { port = 0, host = '127.0.0.1' } = options;

  const server: Server = createNodeServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (isRouterLike(target)) {
      const handled = await target.handle(req as never, res as never);
      if (!handled && !res.writableEnded) {
        res.statusCode = 404;
        res.end('Not Found');
      }
      return;
    }
    await target(req, res);
  });

  server.listen(port, host);

  return onceListening(server).then(() => {
    const address = server.address();
    const boundPort = address && typeof address === 'object' ? address.port : port;
    const url = `http://${host}:${boundPort}`;
    // One jar for both interfaces — log in via app.request, stay logged in via app.client.
    const cookieJar = createE2ECookieJar();

    return {
      port: boundPort,
      url,
      client: createE2EClient(url, cookieJar),
      request: createE2ERequest(url, cookieJar),
      server,
      close: () =>
        new Promise<void>((resolvePromise) => {
          server.close(() => resolvePromise());
          // Idle keep-alive sockets (global fetch) would otherwise hold the
          // close callback open — drop them so the server shuts down now.
          server.closeIdleConnections?.();
          server.closeAllConnections?.();
        }),
    };
  });
}

/**
 * `startE2EServer` with automatic cleanup — the server always closes when
 * the callback finishes, whether the test passed or failed.
 *
 * ```ts
 * await withE2EServer(router, async (app) => {
 *   const res = await app.client.get('/api/hello');
 *   expect(res.status).toBe(200);
 * });
 * ```
 */
export async function withE2EServer<T>(
  target: E2EServerTarget,
  fn: (app: E2EApp) => T | Promise<T>,
  options?: E2EServerOptions,
): Promise<T> {
  const app = await startE2EServer(target, options);
  try {
    return await fn(app);
  } finally {
    await app.close();
  }
}
