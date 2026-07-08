import { EventEmitter } from 'events';

import { ReadyState } from './constants';
import type { Data, SendOptions } from './types';
import { createNativeWebSocket, queueCallback } from './utils';

/**
 * WebSocket class.
 */
export class WebSocket extends EventEmitter {
  public readyState: ReadyState = ReadyState.CONNECTING;
  public url: string;
  public protocol: string = '';
  public extensions: string = '';
  public binaryType: 'nodebuffer' | 'arraybuffer' | 'fragments' = 'nodebuffer';

  /** @internal */
  public _socket: any;

  constructor(address: string | URL, protocols?: string | string[], _options?: any) {
    super();
    this.url = typeof address === 'string' ? address : address.toString();

    const protocolsArray = Array.isArray(protocols)
      ? protocols
      : protocols
        ? [protocols]
        : undefined;

    this._socket = createNativeWebSocket(this.url, protocolsArray);
    this._setupNativeSocket();
  }

  private _setupNativeSocket(): void {
    this._socket.onopen = () => {
      this.readyState = ReadyState.OPEN;
      this.emit('open');
    };

    this._socket.onmessage = (event: MessageEvent) => {
      const isBinary = event.data instanceof ArrayBuffer || event.data instanceof Blob;
      this.emit('message', event.data, isBinary);
    };

    this._socket.onclose = (event: CloseEvent) => {
      this.readyState = ReadyState.CLOSED;
      this.emit('close', event.code, event.reason);
    };

    this._socket.onerror = () => {
      this.emit('error', new Error('WebSocket error'));
    };
  }

  /**
   * Send data through WebSocket.
   */
  send(data: Data, options?: SendOptions | ((err?: Error) => void), callback?: (err?: Error) => void): void {
    const cb = typeof options === 'function' ? options : callback;

    if (this.readyState !== ReadyState.OPEN) {
      queueCallback(cb, new Error('WebSocket is not open'));
      return;
    }

    try {
      this._socket.send(data);
      queueCallback(cb);
    } catch (error) {
      queueCallback(cb, error as Error);
    }
  }

  /**
   * Close the WebSocket connection.
   */
  close(code?: number, reason?: string | Buffer): void {
    if (this.readyState === ReadyState.CLOSED || this.readyState === ReadyState.CLOSING) {
      return;
    }

    this.readyState = ReadyState.CLOSING;
    this._socket.close(code, typeof reason === 'string' ? reason : reason?.toString());
  }

  /**
   * Pause the socket (no-op for native WebSocket).
   */
  pause(): void {
    // Native WebSocket doesn't support pause.
  }

  /**
   * Resume the socket (no-op for native WebSocket).
   */
  resume(): void {
    // Native WebSocket doesn't support resume.
  }

  /**
   * Send a ping frame (no-op for native WebSocket).
   */
  ping(_data?: Data, _mask?: boolean, callback?: (err?: Error) => void): void {
    queueCallback(callback);
  }

  /**
   * Send a pong frame (no-op for native WebSocket).
   */
  pong(_data?: Data, _mask?: boolean, callback?: (err?: Error) => void): void {
    queueCallback(callback);
  }

  /**
   * Terminate the connection.
   */
  terminate(): void {
    this._socket.close();
    this.readyState = ReadyState.CLOSED;
  }

  /**
   * Get buffered amount.
   */
  get bufferedAmount(): number {
    return this._socket.bufferedAmount || 0;
  }
}