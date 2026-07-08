import { request as httpRequest, type IncomingMessage, type ServerResponse } from '@elitjs/http';
import { request as httpsRequest } from '@elitjs/https';

import { json } from './responses';

import type { ProxyConfig } from './public-types';

function rewritePath(path: string, pathRewrite?: Record<string, string>): string {
  if (!pathRewrite) return path;

  for (const [from, to] of Object.entries(pathRewrite)) {
    const regex = new RegExp(from);
    if (regex.test(path)) {
      return path.replace(regex, to);
    }
  }

  return path;
}

export function createProxyHandler(proxyConfigs: ProxyConfig[]) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
    const url = req.url || '/';
    const path = url.split('?')[0];
    const proxy = proxyConfigs.find((config) => path.startsWith(config.context));
    if (!proxy) {
      return false;
    }

    const { target, changeOrigin, pathRewrite, headers } = proxy;

    try {
      const targetUrl = new URL(target);
      const isHttps = targetUrl.protocol === 'https:';
      const requestLib = isHttps ? httpsRequest : httpRequest;
      const proxyPath = rewritePath(url, pathRewrite);
      const proxyUrl = `${isHttps ? 'https' : 'http'}://${targetUrl.hostname}:${targetUrl.port || (isHttps ? 443 : 80)}${proxyPath}`;

      const proxyReqHeaders: Record<string, string | number | string[]> = {};
      for (const [key, value] of Object.entries(req.headers)) {
        if (value !== undefined) {
          proxyReqHeaders[key] = value;
        }
      }

      if (headers) {
        for (const [key, value] of Object.entries(headers)) {
          if (value !== undefined) {
            proxyReqHeaders[key] = value;
          }
        }
      }

      if (changeOrigin) {
        proxyReqHeaders.host = targetUrl.host;
      } else {
        delete proxyReqHeaders.host;
      }

      const proxyReq = requestLib(proxyUrl, {
        method: req.method,
        headers: proxyReqHeaders,
      }, (proxyRes) => {
        const outgoingHeaders: Record<string, string | number | string[]> = {};
        for (const [key, value] of Object.entries(proxyRes.headers)) {
          if (value !== undefined) {
            outgoingHeaders[key] = value;
          }
        }

        res.writeHead(proxyRes.statusCode || 200, outgoingHeaders);
        proxyRes.on('data', (chunk) => res.write(chunk));
        proxyRes.on('end', () => res.end());
      });

      proxyReq.on('error', (error) => {
        console.error('[Proxy] Error proxying %s to %s:', url, target, error.message);
        if (!res.headersSent) {
          json(res, { error: 'Bad Gateway', message: 'Proxy error' }, 502);
        }
      });

      req.on('data', (chunk) => proxyReq.write(chunk));
      req.on('end', () => proxyReq.end());

      return true;
    } catch (error) {
      console.error('[Proxy] Invalid proxy configuration for %s:', path, error);
      return false;
    }
  };
}