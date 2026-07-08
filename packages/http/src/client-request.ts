import { EventEmitter } from 'node:events';

import type { RequestOptions } from './types';
import { buildRequestBody, normalizeRequestBodyChunk, queueCallback, type RequestBodyChunk } from './utils';

/**
 * Client request - lightweight wrapper
 */
export class ClientRequest extends EventEmitter {
  private _nativeRequest?: any;
  private _bodyChunks: RequestBodyChunk[] = [];
  private _executor?: (body: BodyInit | undefined) => Promise<void> | void;
  private _ended: boolean = false;

  constructor(_url: string | URL, _options: RequestOptions = {}) {
    super();
  }

  _setNativeRequest(nativeRequest: any): void {
    this._nativeRequest = nativeRequest;
  }

  _setExecutor(executor: (body: BodyInit | undefined) => Promise<void> | void): void {
    this._executor = executor;
  }

  write(chunk: any, encoding?: BufferEncoding | (() => void), callback?: () => void): boolean {
    if (this._ended) {
      throw new Error('Cannot write after end');
    }

    if (typeof encoding === 'function') {
      callback = encoding;
      encoding = undefined;
    }

    if (this._nativeRequest) {
      const actualEncoding = typeof encoding === 'string' ? encoding : undefined;
      return this._nativeRequest.write(chunk, actualEncoding, callback);
    }

    const actualEncoding = typeof encoding === 'string' ? encoding : 'utf8';
    this._bodyChunks.push(normalizeRequestBodyChunk(chunk, actualEncoding));
    queueCallback(callback);
    return true;
  }

  end(chunk?: any, encoding?: BufferEncoding | (() => void), callback?: () => void): void {
    if (typeof chunk === 'function') {
      callback = chunk;
      chunk = undefined;
      encoding = undefined;
    } else if (typeof encoding === 'function') {
      callback = encoding;
      encoding = undefined;
    }

    if (this._ended) {
      queueCallback(callback);
      return;
    }

    this._ended = true;

    if (this._nativeRequest) {
      const actualEncoding = typeof encoding === 'string' ? encoding : undefined;
      if (chunk !== undefined) {
        this._nativeRequest.end(chunk, actualEncoding, callback);
      } else {
        this._nativeRequest.end(callback);
      }
      return;
    }

    if (chunk !== undefined) {
      this._bodyChunks.push(normalizeRequestBodyChunk(chunk, typeof encoding === 'string' ? encoding : 'utf8'));
    }

    const executor = this._executor;
    const body = buildRequestBody(this._bodyChunks);
    if (executor) {
      Promise.resolve()
        .then(() => executor(body))
        .catch((error) => this.emit('error', error));
    }

    queueCallback(callback);
  }
}