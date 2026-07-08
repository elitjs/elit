import type { IncomingMessage, ServerResponse } from '@elitjs/http';

import type {
  ElitRequest,
  ElitResponse,
  HttpMethod,
  Middleware,
  ServerRouteContext,
  ServerRouteHandler,
} from './types';

interface ServerRoute {
  method: HttpMethod;
  pattern: RegExp;
  paramNames: string[];
  handler: ServerRouteHandler;
  middlewares: Middleware[];
}

export class ServerRouter {
  private routes: ServerRoute[] = [];
  private middlewares: Middleware[] = [];

  use(...args: Array<any>): this {
    if (typeof args[0] === 'string') {
      const path = args[0];
      const middlewares = args.slice(1);
      return this.addRoute('ALL', path, middlewares);
    }

    const middleware = args[0];
    this.middlewares.push(this.toMiddleware(middleware));
    return this;
  }

  all = (path: string, ...handlers: Array<Middleware | ServerRouteHandler | ((req: ElitRequest, res: ServerResponse, next?: () => void) => any)>): this => this.addRoute('ALL', path, handlers as any);
  get = (path: string, ...handlers: Array<Middleware | ServerRouteHandler | ((req: ElitRequest, res: ServerResponse, next?: () => void) => any)>): this => this.addRoute('GET', path, handlers as any);
  post = (path: string, ...handlers: Array<Middleware | ServerRouteHandler | ((req: ElitRequest, res: ServerResponse, next?: () => void) => any)>): this => this.addRoute('POST', path, handlers as any);
  put = (path: string, ...handlers: Array<Middleware | ServerRouteHandler | ((req: ElitRequest, res: ServerResponse, next?: () => void) => any)>): this => this.addRoute('PUT', path, handlers as any);
  delete = (path: string, ...handlers: Array<Middleware | ServerRouteHandler | ((req: ElitRequest, res: ServerResponse, next?: () => void) => any)>): this => this.addRoute('DELETE', path, handlers as any);
  patch = (path: string, ...handlers: Array<Middleware | ServerRouteHandler | ((req: ElitRequest, res: ServerResponse, next?: () => void) => any)>): this => this.addRoute('PATCH', path, handlers as any);
  options = (path: string, ...handlers: Array<Middleware | ServerRouteHandler | ((req: ElitRequest, res: ServerResponse, next?: () => void) => any)>): this => this.addRoute('OPTIONS', path, handlers as any);
  head = (path: string, ...handlers: Array<Middleware | ServerRouteHandler | ((req: ElitRequest, res: ServerResponse, next?: () => void) => any)>): this => this.addRoute('HEAD', path, handlers as any);

  private toMiddleware(fn: Middleware | ServerRouteHandler | ((req: ElitRequest, res: ServerResponse, next?: () => void) => any)): Middleware {
    return async (ctx: ServerRouteContext, next: () => Promise<void>) => {
      const handler: any = fn;

      if (handler.length >= 3) {
        const expressNext = () => {
          void next();
        };

        const result = handler(ctx.req, ctx.res, expressNext);
        if (result && typeof result.then === 'function') {
          await result;
        }
        return;
      }

      if (handler.length === 2) {
        const result = handler(ctx.req, ctx.res);
        if (result && typeof result.then === 'function') {
          await result;
        }
        await next();
        return;
      }

      const result = (fn as ServerRouteHandler)(ctx);
      if (result && typeof result.then === 'function') {
        await result;
      }
      await next();
    };
  }

  private addRoute(method: HttpMethod, path: string, handlers: Array<Middleware | ServerRouteHandler | ((req: ElitRequest, res: ServerResponse, next?: () => void) => any)>): this {
    const { pattern, paramNames } = this.pathToRegex(path);
    if (!handlers || handlers.length === 0) {
      throw new Error('Route must include a handler');
    }

    const rawMiddlewares = handlers.slice(0, handlers.length - 1);
    const rawLast = handlers[handlers.length - 1];
    const middlewares = rawMiddlewares.map((handler) => this.toMiddleware(handler as any));

    const last = ((): ServerRouteHandler => {
      const handler: any = rawLast;
      if (typeof handler !== 'function') {
        throw new Error('Route handler must be a function');
      }

      if (handler.length >= 2) {
        return async (ctx: ServerRouteContext) => {
          if (handler.length >= 3) {
            await new Promise<void>((resolve) => {
              try {
                handler(ctx.req, ctx.res, () => resolve());
              } catch {
                resolve();
              }
            });
          } else {
            const result = handler(ctx.req, ctx.res);
            if (result && typeof result.then === 'function') {
              await result;
            }
          }
        };
      }

      return handler as ServerRouteHandler;
    })();

    this.routes.push({ method, pattern, paramNames, handler: last, middlewares });
    return this;
  }

  private pathToRegex(path: string): { pattern: RegExp; paramNames: string[] } {
    const paramNames: string[] = [];
    const pattern = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\//g, '\\/').replace(/:(\w+)/g, (_, name) => (paramNames.push(name), '([^\\/]+)'));
    return { pattern: new RegExp(`^${pattern}$`), paramNames };
  }

  private parseQuery(url: string): Record<string, string> {
    const query: Record<string, string> = {};
    const queryString = url.split('?')[1];
    if (!queryString) {
      return query;
    }

    queryString.split('&').forEach((pair) => {
      const [key, value] = pair.split('=');
      if (key) {
        query[key] = value !== undefined ? value : '';
      }
    });
    return query;
  }

  listRoutes(): Array<{ method: string; pattern: string; paramNames: string[]; handler: string }> {
    return this.routes.map((route) => ({
      method: route.method,
      pattern: route.pattern.source,
      paramNames: route.paramNames,
      handler: route.handler.name || '(anonymous)',
    }));
  }

  private async parseBody(req: IncomingMessage): Promise<any> {
    if (typeof (req as any).text === 'function') {
      try {
        const text = await (req as any).text();
        if (!text) {
          return {};
        }

        const contentType = req.headers['content-type'];
        const normalizedContentType = (Array.isArray(contentType) ? contentType[0] : (contentType || '')).toLowerCase();

        if (normalizedContentType.includes('application/json') || normalizedContentType.includes('json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
          try {
            return JSON.parse(text);
          } catch {
            return text;
          }
        }

        if (normalizedContentType.includes('application/x-www-form-urlencoded') || normalizedContentType.includes('urlencoded')) {
          return Object.fromEntries(new URLSearchParams(text));
        }

        return text;
      } catch (error) {
        console.log('[ServerRouter] Bun body parse error:', error);
        return {};
      }
    }

    return new Promise((resolve, reject) => {
      const contentLengthHeader = req.headers['content-length'];
      const contentLength = parseInt(Array.isArray(contentLengthHeader) ? contentLengthHeader[0] : (contentLengthHeader || '0'), 10);

      if (contentLength === 0) {
        resolve({});
        return;
      }

      const chunks: Buffer[] = [];
      req.on('data', (chunk) => {
        chunks.push(Buffer.from(chunk));
      });

      req.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        try {
          const contentType = req.headers['content-type'] || '';
          resolve(contentType.includes('json') ? (body ? JSON.parse(body) : {}) : contentType.includes('urlencoded') ? Object.fromEntries(new URLSearchParams(body)) : body);
        } catch (error) {
          reject(error);
        }
      });

      req.on('error', reject);
    });
  }

  async handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const method = req.method as HttpMethod;
    const url = req.url || '/';
    const path = url.split('?')[0];

    for (const route of this.routes) {
      if (route.method !== 'ALL' && route.method !== method) continue;
      if (!route.pattern.test(path)) continue;

      const match = path.match(route.pattern)!;
      const params = Object.fromEntries(route.paramNames.map((name, index) => [name, match[index + 1]]));

      let body: any = {};
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        try {
          body = await this.parseBody(req);
          (req as ElitRequest).body = body;
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end('{"error":"Invalid request body"}');
          return true;
        }
      }

      const query = this.parseQuery(url);
      (req as ElitRequest).query = query;
      (req as ElitRequest).params = params;

      let statusCode = 200;
      const elitRes = res as ElitResponse;
      elitRes.status = function(code: number): ElitResponse {
        statusCode = code;
        return this;
      };

      elitRes.json = function(data: any, overrideStatusCode?: number): ElitResponse {
        const code = overrideStatusCode !== undefined ? overrideStatusCode : statusCode;
        this.writeHead(code, { 'Content-Type': 'application/json' });
        this.end(JSON.stringify(data));
        return this;
      };

      elitRes.send = function(data: any): ElitResponse {
        if (typeof data === 'string') {
          this.writeHead(statusCode, { 'Content-Type': 'text/html' });
          this.end(data);
        } else {
          this.writeHead(statusCode, { 'Content-Type': 'application/json' });
          this.end(JSON.stringify(data));
        }
        return this;
      };

      const ctx: ServerRouteContext = {
        req: req as ElitRequest,
        res: elitRes,
        params,
        query,
        body,
        headers: req.headers as any,
      };

      const chain: Middleware[] = [
        ...this.middlewares,
        ...(route.middlewares || []),
        async (context, next) => {
          await route.handler(context, next);
        },
      ];

      let index = 0;
      const next = async () => {
        if (index >= chain.length) {
          return;
        }

        const middleware = chain[index++];
        await middleware(ctx, next);
      };

      try {
        await next();
      } catch (error) {
        console.error('[ServerRouter] Route error:', error);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal Server Error', message: error instanceof Error ? error.message : 'Unknown' }));
        }
      }

      return true;
    }

    return false;
  }
}