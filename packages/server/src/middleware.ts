import { isBun } from '@elitjs/runtime';

import { requestAcceptsGzip } from './utils';

import type { Middleware } from './types';

export function cors(options: {
  origin?: string | string[];
  methods?: string[];
  credentials?: boolean;
  maxAge?: number;
} = {}): Middleware {
  const { origin = '*', methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], credentials = true, maxAge = 86400 } = options;

  return async (ctx, next) => {
    const requestOriginHeader = ctx.req.headers.origin;
    const requestOrigin = Array.isArray(requestOriginHeader) ? requestOriginHeader[0] : (requestOriginHeader || '');
    const allowOrigin = Array.isArray(origin) && origin.includes(requestOrigin) ? requestOrigin : (Array.isArray(origin) ? '' : origin);

    if (allowOrigin) ctx.res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    ctx.res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
    ctx.res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (credentials) ctx.res.setHeader('Access-Control-Allow-Credentials', 'true');
    ctx.res.setHeader('Access-Control-Max-Age', String(maxAge));

    if (ctx.req.method === 'OPTIONS') {
      ctx.res.writeHead(204);
      ctx.res.end();
      return;
    }

    await next();
  };
}

export function logger(options: { format?: 'simple' | 'detailed' } = {}): Middleware {
  const { format = 'simple' } = options;
  return async (ctx, next) => {
    const start = Date.now();
    const { method, url } = ctx.req;
    await next();
    const duration = Date.now() - start;
    const status = ctx.res.statusCode;
    console.log(format === 'detailed' ? `[${new Date().toISOString()}] ${method} ${url} ${status} - ${duration}ms` : `${method} ${url} - ${status} (${duration}ms)`);
  };
}

export function errorHandler(): Middleware {
  return async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      console.error('Error:', error);
      if (!ctx.res.headersSent) {
        ctx.res.writeHead(500, { 'Content-Type': 'application/json' });
        ctx.res.end(JSON.stringify({ error: 'Internal Server Error', message: error instanceof Error ? error.message : 'Unknown error' }));
      }
    }
  };
}

export function rateLimit(options: { windowMs?: number; max?: number; message?: string } = {}): Middleware {
  const { windowMs = 60000, max = 100, message = 'Too many requests' } = options;
  const clients = new Map<string, { count: number; resetTime: number }>();

  return async (ctx, next) => {
    const ip = ctx.req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let clientData = clients.get(ip);

    if (!clientData || now > clientData.resetTime) {
      clientData = { count: 0, resetTime: now + windowMs };
      clients.set(ip, clientData);
    }

    if (++clientData.count > max) {
      ctx.res.writeHead(429, { 'Content-Type': 'application/json' });
      ctx.res.end(JSON.stringify({ error: message }));
      return;
    }

    await next();
  };
}

export function bodyLimit(options: { limit?: number } = {}): Middleware {
  const { limit = 1024 * 1024 } = options;
  return async (ctx, next) => {
    const contentLength = ctx.req.headers['content-length'];
    const contentLengthStr = Array.isArray(contentLength) ? contentLength[0] : (contentLength || '0');
    if (parseInt(contentLengthStr, 10) > limit) {
      ctx.res.writeHead(413, { 'Content-Type': 'application/json' });
      ctx.res.end(JSON.stringify({ error: 'Request body too large' }));
      return;
    }

    await next();
  };
}

export function cacheControl(options: { maxAge?: number; public?: boolean } = {}): Middleware {
  const { maxAge = 3600, public: isPublic = true } = options;
  return async (ctx, next) => {
    ctx.res.setHeader('Cache-Control', `${isPublic ? 'public' : 'private'}, max-age=${maxAge}`);
    await next();
  };
}

export function compress(): Middleware {
  return async (ctx, next) => {
    if (isBun || !requestAcceptsGzip(ctx.req.headers['accept-encoding'])) {
      await next();
      return;
    }

    const originalEnd = ctx.res.end.bind(ctx.res);
    const chunks: Buffer[] = [];

    ctx.res.write = ((chunk: any) => {
      chunks.push(Buffer.from(chunk));
      return true;
    }) as any;

    ctx.res.end = ((chunk?: any) => {
      if (chunk) {
        chunks.push(Buffer.from(chunk));
      }

      const buffer = Buffer.concat(chunks);
      const { gzipSync } = require('zlib');
      const compressed = gzipSync(buffer);

      ctx.res.setHeader('Content-Encoding', 'gzip');
      ctx.res.setHeader('Content-Length', compressed.length);
      originalEnd(compressed);
      return ctx.res;
    }) as any;

    await next();
  };
}

export function security(): Middleware {
  return async (ctx, next) => {
    ctx.res.setHeader('X-Content-Type-Options', 'nosniff');
    ctx.res.setHeader('X-Frame-Options', 'DENY');
    ctx.res.setHeader('X-XSS-Protection', '1; mode=block');
    ctx.res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    ctx.res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    ctx.res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    await next();
  };
}