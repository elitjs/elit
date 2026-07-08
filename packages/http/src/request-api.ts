import { isNode } from '@elitjs/runtime';

import { ClientRequest } from './client-request';
import { IncomingMessage } from './incoming-message';
import { http, https } from './node-modules';
import type { RequestOptions } from './types';

/**
 * Make HTTP request - optimized per runtime
 */
export function request(url: string | URL, options?: RequestOptions, callback?: (res: IncomingMessage) => void): ClientRequest {
  const urlString = typeof url === 'string' ? url : url.toString();
  const req = new ClientRequest(urlString, options);

  if (isNode) {
    const urlObj = new URL(urlString);
    const client = urlObj.protocol === 'https:' ? https : http;

    const nodeReq = client.request(urlString, {
      method: options?.method || 'GET',
      headers: options?.headers,
      timeout: options?.timeout,
      signal: options?.signal,
    }, (res: any) => {
      const incomingMessage = new IncomingMessage(res);
      if (callback) callback(incomingMessage);
      req.emit('response', incomingMessage);
    });

    req._setNativeRequest(nodeReq);
    nodeReq.on('error', (error: Error) => req.emit('error', error));
  } else {
    req._setExecutor(async (body) => {
      const response = await fetch(urlString, {
        method: options?.method || 'GET',
        headers: options?.headers as HeadersInit,
        body,
        signal: options?.signal,
      });

      const incomingMessage = new IncomingMessage(response, options?.method || 'GET');
      if (callback) callback(incomingMessage);
      req.emit('response', incomingMessage);
    });
  }

  return req;
}

/**
 * Make HTTP GET request
 */
export function get(url: string | URL, options?: RequestOptions, callback?: (res: IncomingMessage) => void): ClientRequest {
  const req = request(url, { ...options, method: 'GET' }, callback);
  req.end();
  return req;
}