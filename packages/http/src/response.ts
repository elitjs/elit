import { EventEmitter } from 'node:events';

import { isNode } from '@elitjs/runtime';

import type { IncomingMessage } from './incoming-message';
import type { OutgoingHttpHeaders } from './types';
import { headersToInit, queueCallback } from './utils';

/**
 * ServerResponse - Ultra-optimized write operations
 */
export class ServerResponse extends EventEmitter {
  public statusCode: number = 200;
  public statusMessage: string = 'OK';
  public headersSent: boolean = false;

  private _headers: OutgoingHttpHeaders;
  private _body: string = '';
  private _resolve?: (response: Response) => void;
  private _finished: boolean = false;
  private _nodeRes?: any;

  constructor(_req?: IncomingMessage, nodeRes?: any) {
    super();
    this._nodeRes = nodeRes;
    this._headers = Object.create(null);
  }

  setHeader(name: string, value: string | string[] | number): this {
    if (this.headersSent) {
      throw new Error('Cannot set headers after they are sent');
    }

    if (isNode && this._nodeRes) {
      this._nodeRes.setHeader(name, value);
    }

    this._headers[name.toLowerCase()] = value;
    return this;
  }

  getHeader(name: string): string | string[] | number | undefined {
    if (isNode && this._nodeRes) {
      return this._nodeRes.getHeader(name);
    }
    return this._headers[name.toLowerCase()];
  }

  getHeaders(): OutgoingHttpHeaders {
    if (isNode && this._nodeRes) {
      return this._nodeRes.getHeaders();
    }
    return { ...this._headers };
  }

  getHeaderNames(): string[] {
    if (isNode && this._nodeRes) {
      return this._nodeRes.getHeaderNames();
    }
    return Object.keys(this._headers);
  }

  hasHeader(name: string): boolean {
    if (isNode && this._nodeRes) {
      return this._nodeRes.hasHeader(name);
    }
    return name.toLowerCase() in this._headers;
  }

  removeHeader(name: string): void {
    if (this.headersSent) {
      throw new Error('Cannot remove headers after they are sent');
    }

    if (isNode && this._nodeRes) {
      this._nodeRes.removeHeader(name);
    }

    delete this._headers[name.toLowerCase()];
  }

  writeHead(statusCode: number, statusMessage?: string | OutgoingHttpHeaders, headers?: OutgoingHttpHeaders): this {
    if (this.headersSent) {
      throw new Error('Cannot write headers after they are sent');
    }

    this.statusCode = statusCode;

    if (typeof statusMessage === 'string') {
      this.statusMessage = statusMessage;
      if (headers) {
        for (const key in headers) {
          this.setHeader(key, headers[key]!);
        }
      }
    } else if (statusMessage) {
      for (const key in statusMessage) {
        this.setHeader(key, statusMessage[key]!);
      }
    }

    if (isNode && this._nodeRes) {
      if (typeof statusMessage === 'string') {
        this._nodeRes.writeHead(statusCode, statusMessage, headers);
      } else {
        this._nodeRes.writeHead(statusCode, statusMessage);
      }
    }

    this.headersSent = true;
    return this;
  }

  write(chunk: any, encoding?: BufferEncoding | (() => void), callback?: () => void): boolean {
    if (typeof encoding === 'function') {
      callback = encoding;
      encoding = 'utf8';
    }

    if (!this.headersSent) {
      this.writeHead(this.statusCode);
    }

    if (isNode && this._nodeRes) {
      return this._nodeRes.write(chunk, encoding, callback);
    }

    this._body += chunk;
    queueCallback(callback);
    return true;
  }

  end(chunk?: any, encoding?: BufferEncoding | (() => void), callback?: () => void): this {
    if (this._finished) {
      return this;
    }

    if (typeof chunk === 'function') {
      callback = chunk;
      chunk = undefined;
    } else if (typeof encoding === 'function') {
      callback = encoding;
      encoding = 'utf8';
    }

    if (chunk !== undefined) {
      this.write(chunk, encoding as BufferEncoding);
    }

    if (!this.headersSent) {
      this.writeHead(this.statusCode);
    }

    this._finished = true;

    if (isNode && this._nodeRes) {
      this._nodeRes.end(callback);
      this.emit('finish');
    } else {
      const response = new Response(this._body, {
        status: this.statusCode,
        statusText: this.statusMessage,
        headers: headersToInit(this._headers),
      });

      if (this._resolve) {
        this._resolve(response);
      }

      queueCallback(callback);
    }

    return this;
  }

  _setResolver(resolve: (response: Response) => void): void {
    this._resolve = resolve;
  }

  json(data: any, statusCode = 200): this {
    if (!this.headersSent) {
      this.setHeader('Content-Type', 'application/json');
    }
    this.statusCode = statusCode;
    this.end(JSON.stringify(data));
    return this;
  }

  send(data: any): this {
    if (typeof data === 'object') {
      return this.json(data);
    }
    if (!this.headersSent) {
      this.setHeader('Content-Type', 'text/plain');
    }
    this.end(String(data));
    return this;
  }

  status(code: number): this {
    this.statusCode = code;
    return this;
  }
}