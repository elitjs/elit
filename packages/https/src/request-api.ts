import { isNode } from '@elitjs/runtime';

import type { IncomingMessage } from '@elitjs/http';

import { ClientRequest } from './client-request';
import { loadHttpClasses } from './http-classes';
import { https } from './node-modules';
import type { RequestOptions } from './types';

/**
 * Make HTTPS request
 */
export function request(url: string | URL, options?: RequestOptions, callback?: (res: IncomingMessage) => void): ClientRequest {
  const urlString = typeof url === 'string' ? url : url.toString();
  const req = new ClientRequest(urlString, options);

  if (isNode) {
    const { IncomingMessage } = loadHttpClasses();

    const nodeReq = https.request(urlString, {
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
    const { IncomingMessage } = loadHttpClasses();

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
 * Make HTTPS GET request
 */
export function get(url: string | URL, options?: RequestOptions, callback?: (res: IncomingMessage) => void): ClientRequest {
  const req = request(url, { ...options, method: 'GET' }, callback);
  req.end();
  return req;
}