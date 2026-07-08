import type { IncomingMessage, ServerResponse } from '@elitjs/http';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD' | 'ALL';

export interface ElitRequest extends IncomingMessage {
  body?: any;
  query?: Record<string, string>;
  params?: Record<string, string>;
}

export interface ElitResponse extends ServerResponse {
  json(data: any, statusCode?: number): this;
  send(data: any): this;
  status(code: number): this;
}

export interface ServerRouteContext {
  req: ElitRequest;
  res: ElitResponse;
  params: Record<string, string>;
  query: Record<string, string>;
  body: any;
  headers: Record<string, string | string[] | undefined>;
  user?: any;
}

export type ServerRouteHandler = (ctx: ServerRouteContext, next?: () => Promise<void>) => void | Promise<void>;
export type Middleware = (ctx: ServerRouteContext, next: () => Promise<void>) => void | Promise<void>;

export type StateChangeHandler<T = any> = (value: T, oldValue: T) => void;

export interface SharedStateOptions<T = any> {
  initial: T;
  persist?: boolean;
  validate?: (value: T) => boolean;
}