import { EventEmitter } from 'node:events';

import type { IncomingHttpHeaders } from './types';
import {
  getRequestPath,
  headersToRawHeaders,
  headersToRecord,
  isFetchResponse,
  isNodeIncomingMessage,
} from './utils';

/**
 * IncomingMessage - Ultra-optimized for zero-copy operations
 */
export class IncomingMessage extends EventEmitter {
  public method: string;
  public url: string;
  public headers: IncomingHttpHeaders;
  public statusCode?: number;
  public statusMessage?: string;
  public httpVersion: string = '1.1';
  public rawHeaders: string[] = [];
  public socket: any;

  private _req: any;

  constructor(req: any, requestMethod?: string) {
    super();
    this._req = req;

    if (isFetchResponse(req)) {
      this.method = requestMethod || 'GET';
      this.url = getRequestPath(req.url);
      this.headers = headersToRecord(req.headers);
      this.statusCode = req.status;
      this.statusMessage = req.statusText;
      this.rawHeaders = headersToRawHeaders(req.headers);
    } else if (isNodeIncomingMessage(req)) {
      this.method = req.method;
      this.url = req.url;
      this.headers = req.headers;
      this.statusCode = req.statusCode;
      this.statusMessage = req.statusMessage;
      this.httpVersion = req.httpVersion;
      this.rawHeaders = req.rawHeaders;
      this.socket = req.socket;
    } else {
      this.method = req.method;
      this.url = getRequestPath(req.url);
      this.headers = headersToRecord(req.headers);
      this.rawHeaders = headersToRawHeaders(req.headers);
    }
  }

  async text(): Promise<string> {
    if (isNodeIncomingMessage(this._req)) {
      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        this._req.on('data', (chunk: Buffer) => chunks.push(chunk));
        this._req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        this._req.on('error', reject);
      });
    }

    return this._req.text();
  }

  async json(): Promise<any> {
    if (isNodeIncomingMessage(this._req)) {
      const text = await this.text();
      return JSON.parse(text);
    }

    return this._req.json();
  }
}