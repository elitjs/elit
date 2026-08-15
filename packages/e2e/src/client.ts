import { request as httpRequest } from 'node:http';

import { E2EResponse } from './response';
import type { E2EAPIRequest, E2EClient, E2ERequestOptions } from './types';

function buildUrl(baseUrl: string, path: string, options: E2ERequestOptions): URL {
  const url = new URL(path.replace(/^\//, ''), baseUrl);
  const query = options.params ?? options.query;
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url;
}

/**
 * Cookie jar shared by an app's request context — responses' Set-Cookie headers
 * are stored and replayed as a Cookie header, so login flows keep their session.
 */
export interface E2ECookieJar {
  /** Number of stored cookies. */
  readonly size: number;
  getCookiesHeader(host: string): string | undefined;
  storeFromResponse(host: string, setCookie: string | string[] | undefined): void;
  clear(): void;
}

export function createE2ECookieJar(): E2ECookieJar {
  const cookies = new Map<string, Map<string, string>>();

  const store = (host: string, name: string, value: string) => {
    if (!cookies.has(host)) cookies.set(host, new Map());
    cookies.get(host)!.set(name, value);
  };

  return {
    get size() {
      return [...cookies.values()].reduce((total, jar) => total + jar.size, 0);
    },
    getCookiesHeader(host: string) {
      const jar = cookies.get(host);
      if (!jar || jar.size === 0) return undefined;
      return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
    },
    storeFromResponse(host: string, setCookie: string | string[] | undefined) {
      if (!setCookie) return;
      const entries = Array.isArray(setCookie) ? setCookie : [setCookie];
      for (const header of entries) {
        const [pair] = header.split(';');
        const separator = pair.indexOf('=');
        if (separator > 0) store(host, pair.slice(0, separator).trim(), pair.slice(separator + 1).trim());
      }
    },
    clear() {
      cookies.clear();
    },
  };
}

function buildMultipartBody(fields: Record<string, string>): { body: string; contentType: string } {
  const boundary = `----elit-e2e-${Math.random().toString(36).slice(2)}`;
  const parts: string[] = [];
  for (const [name, value] of Object.entries(fields)) {
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
    );
  }
  parts.push(`--${boundary}--\r\n`);
  return { body: parts.join(''), contentType: `multipart/form-data; boundary=${boundary}` };
}

async function send(url: URL, options: E2ERequestOptions, jar?: E2ECookieJar): Promise<E2EResponse> {
  return new Promise((resolvePromise, reject) => {
    const multipart = options.multipart ? buildMultipartBody(options.multipart) : undefined;
    const rawBody = multipart?.body ?? options.data ?? options.body;
    const payload =
      rawBody === undefined
        ? undefined
        : typeof rawBody === 'string'
          ? rawBody
          : JSON.stringify(rawBody);

    const headers: Record<string, string> = { ...(options.headers ?? {}) };
    const cookie = jar?.getCookiesHeader(url.host);
    if (cookie && !Object.keys(headers).some((key) => key.toLowerCase() === 'cookie')) {
      headers.cookie = cookie;
    }
    if (payload !== undefined && !Object.keys(headers).some((key) => key.toLowerCase() === 'content-type')) {
      headers['content-type'] =
        multipart?.contentType ??
        (typeof rawBody === 'string' ? 'text/plain' : 'application/json');
    }

    const req = httpRequest(
      {
        hostname: url.hostname,
        port: url.port,
        path: `${url.pathname}${url.search}`,
        method: options.method ?? 'GET',
        headers,
        // One-shot connection per request — no keep-alive sockets outlive the test.
        agent: false,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('error', reject);
        res.on('end', () => {
          jar?.storeFromResponse(url.host, res.headers['set-cookie']);
          resolvePromise(
            new E2EResponse({
              url: url.toString(),
              status: res.statusCode ?? 0,
              statusText: res.statusMessage ?? '',
              headers: { ...res.headers },
              body: Buffer.concat(chunks),
            }),
          );
        });
      },
    );

    req.on('error', reject);
    // Send the payload in end() so Node sets Content-Length instead of chunked
    // transfer — server-side body parsers commonly key off content-length.
    req.end(payload);
  });
}

/** Playwright-style APIRequestContext bound to the server URL. */
export function createE2ERequest(baseUrl: string, jar?: E2ECookieJar): E2EAPIRequest {
  const fetchFn = (path: string, options: E2ERequestOptions = {}): Promise<E2EResponse> =>
    send(buildUrl(baseUrl, path, options), options, jar);

  return {
    baseUrl,
    fetch: fetchFn,
    get: (path, options) => fetchFn(path, { ...options, method: 'GET' }),
    head: (path, options) => fetchFn(path, { ...options, method: 'HEAD' }),
    post: (path, options) => fetchFn(path, { ...options, method: 'POST' }),
    put: (path, options) => fetchFn(path, { ...options, method: 'PUT' }),
    patch: (path, options) => fetchFn(path, { ...options, method: 'PATCH' }),
    delete: (path, options) => fetchFn(path, { ...options, method: 'DELETE' }),
  };
}

/** Convenience helpers on top of the request context — JSON in, JSON out. */
export function createE2EClient(baseUrl: string, jar?: E2ECookieJar): E2EClient {
  const request = createE2ERequest(baseUrl, jar);

  const readJson = async (path: string, options: E2ERequestOptions): Promise<unknown> => {
    const response = await request.fetch(path, options);
    const text = await response.text();
    if (!text) return undefined;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  };

  return {
    ...request,
    getJson: async (path, options) => readJson(path, { ...options, method: 'GET' }) as Promise<any>,
    post: async (path, body, options) => readJson(path, { ...options, method: 'POST', body }) as Promise<any>,
    put: async (path, body, options) => readJson(path, { ...options, method: 'PUT', body }) as Promise<any>,
    patch: async (path, body, options) => readJson(path, { ...options, method: 'PATCH', body }) as Promise<any>,
    delete: async (path, options) => readJson(path, { ...options, method: 'DELETE' }) as Promise<any>,
    webSocket: (path) =>
      new Promise<WebSocket>((resolvePromise, reject) => {
        if (typeof WebSocket === 'undefined') {
          reject(new Error('No global WebSocket available in this runtime'));
          return;
        }
        const socket = new WebSocket(buildUrl(baseUrl.replace(/^http/, 'ws'), path, {}).toString());
        socket.addEventListener('open', () => resolvePromise(socket));
        socket.addEventListener('error', () => reject(new Error(`WebSocket connection to ${path} failed`)));
      }),
  };
}
