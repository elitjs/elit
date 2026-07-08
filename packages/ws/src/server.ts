import { createRequire } from 'node:module';
import { EventEmitter } from 'events';

const require = createRequire(import.meta.url);

import type { IncomingMessage } from '@elitjs/http';

import { runtime } from '@elitjs/runtime';
import { CLOSE_CODES, ReadyState } from './constants';
import type { Data, ServerOptions } from './types';
import {
  coerceBunMessage,
  createFrame,
  getRequestPath,
  isIgnorableConnectionError,
  parseFrame,
  queueCallback,
} from './utils';
import { WebSocket } from './websocket';

/**
 * WebSocket server implementation.
 */
export class WebSocketServer extends EventEmitter {
  public clients: Set<WebSocket> = new Set();
  public options: ServerOptions;
  public path?: string;

  private _httpServer: any;
  private _ownsHttpServer: boolean = false;

  constructor(options?: ServerOptions, callback?: () => void) {
    super();
    this.options = options || {};
    this.path = options?.path;

    if (runtime === 'node') {
      if (options?.server) {
        this._httpServer = options.server;
        this._setupUpgradeHandler();
      } else if (!options?.noServer) {
        const http = require('http');
        this._httpServer = http.createServer();
        this._ownsHttpServer = true;
        this._setupUpgradeHandler();

        if (options?.port) {
          this._httpServer.listen(options.port, options.host, callback);
        }
      }
    } else if (runtime === 'bun') {
      if (options?.server?.registerWebSocketServer) {
        this._httpServer = options.server;
        options.server.registerWebSocketServer(this);
      }

      queueCallback(callback);
    } else {
      queueCallback(callback);
    }
  }

  private _setupUpgradeHandler(): void {
    this._httpServer.on('upgrade', (request: any, socket: any, head: Buffer) => {
      const requestPath = getRequestPath(request.url);

      console.log('[WebSocket] Upgrade request:', requestPath, 'Expected:', this.path || '(any)');
      if (this.path && requestPath !== this.path) {
        console.log('[WebSocket] Path mismatch, ignoring');
        return;
      }

      this.handleUpgrade(request, socket, head, (client) => {
        console.log('[WebSocket] Client connected');
        this.emit('connection', client, request);
      });
    });
  }

  /**
   * Handle HTTP upgrade for WebSocket.
   */
  handleUpgrade(request: IncomingMessage, socket: any, _head: Buffer, callback: (client: WebSocket) => void): void {
    const key = request.headers['sec-websocket-key'];
    if (!key) {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      return;
    }

    const crypto = require('crypto');
    const acceptKey = crypto
      .createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');

    const headers = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      '',
      '',
    ];

    socket.write(headers.join('\r\n'));

    const client = this._createClientFromSocket(socket);

    if (this.options.clientTracking !== false) {
      this.clients.add(client);
      client.on('close', () => {
        this.clients.delete(client);
      });
    }

    callback(client);
  }

  private _createClientFromSocket(socket: any): WebSocket {
    const client = Object.create(WebSocket.prototype) as WebSocket;
    EventEmitter.call(client);

    client.readyState = ReadyState.OPEN;
    client.url = 'ws://localhost';
    client.protocol = '';
    client.extensions = '';
    client.binaryType = 'nodebuffer';
    client._socket = socket;

    socket.on('data', (data: Buffer) => {
      try {
        const message = parseFrame(data);
        if (message) {
          client.emit('message', message, false);
        }
      } catch (error) {
        client.emit('error', error);
      }
    });

    socket.on('end', () => {
      client.readyState = ReadyState.CLOSED;
      client.emit('close', CLOSE_CODES.NORMAL, '');
    });

    socket.on('error', (error: Error) => {
      if (isIgnorableConnectionError(error)) {
        return;
      }

      client.emit('error', error);
    });

    client.send = (data: Data, _options?: any, callback?: (err?: Error) => void) => {
      if (!socket.writable || client.readyState !== ReadyState.OPEN) {
        const error = new Error('WebSocket is not open');
        (error as any).code = 'WS_NOT_OPEN';
        queueCallback(callback, error);
        return;
      }

      try {
        const frame = createFrame(data);
        socket.write(frame, (error?: Error) => {
          if (!error) {
            queueCallback(callback);
            return;
          }

          if (isIgnorableConnectionError(error)) {
            client.readyState = ReadyState.CLOSED;
            queueCallback(callback);
            return;
          }

          queueCallback(callback, error);
        });
      } catch (error) {
        queueCallback(callback, error as Error);
      }
    };

    client.close = (_code?: number, _reason?: string | Buffer) => {
      socket.end();
      client.readyState = ReadyState.CLOSED;
    };

    return client;
  }

  private _createClientFromBunSocket(socket: any): WebSocket {
    const client = Object.create(WebSocket.prototype) as WebSocket;
    EventEmitter.call(client);

    client.readyState = ReadyState.OPEN;
    client.url = 'ws://localhost';
    client.protocol = '';
    client.extensions = '';
    client.binaryType = 'nodebuffer';
    client._socket = socket;

    client.send = (data: Data, _options?: any, callback?: (err?: Error) => void) => {
      if (client.readyState !== ReadyState.OPEN) {
        queueCallback(callback, new Error('WebSocket is not open'));
        return;
      }

      try {
        socket.send(data);
        queueCallback(callback);
      } catch (error) {
        queueCallback(callback, error as Error);
      }
    };

    client.close = (code?: number, reason?: string | Buffer) => {
      if (client.readyState === ReadyState.CLOSED) {
        return;
      }

      client.readyState = ReadyState.CLOSING;
      socket.close(code ?? CLOSE_CODES.NORMAL, typeof reason === 'string' ? reason : reason?.toString());
    };

    client.terminate = () => {
      socket.close();
      client.readyState = ReadyState.CLOSED;
    };

    return client;
  }

  _handleBunOpen(socket: any, request: Partial<IncomingMessage> = {}): void {
    const client = this._createClientFromBunSocket(socket);

    if (socket.data) {
      socket.data.client = client;
    }

    if (this.options.clientTracking !== false) {
      this.clients.add(client);
      client.on('close', () => {
        this.clients.delete(client);
      });
    }

    const incomingRequest = {
      url: request.url || this.path,
      headers: request.headers || {},
      socket: request.socket || { remoteAddress: undefined },
    } as IncomingMessage;

    this.emit('connection', client, incomingRequest);
  }

  _handleBunMessage(socket: any, message: any): void {
    const client = socket.data?.client;
    if (!client) {
      return;
    }

    const { payload, isBinary } = coerceBunMessage(message);
    client.emit('message', payload, isBinary);
  }

  _handleBunClose(socket: any, code: number, reason: any): void {
    const client = socket.data?.client;
    if (!client) {
      return;
    }

    client.readyState = ReadyState.CLOSED;
    client.emit('close', code, typeof reason === 'string' ? reason : reason?.toString() || '');
    this.clients.delete(client);
  }

  /**
   * Close the server.
   */
  close(callback?: (err?: Error) => void): void {
    this.clients.forEach((client) => client.close());
    this.clients.clear();

    if (this._httpServer && this._ownsHttpServer) {
      this._httpServer.close(callback);
      return;
    }

    if (runtime === 'bun' && this._httpServer?.unregisterWebSocketServer) {
      this._httpServer.unregisterWebSocketServer(this);
    }

    this.emit('close');
    queueCallback(callback);
  }

  /**
   * Check if server should handle request.
   */
  shouldHandle(request: IncomingMessage): boolean {
    if (this.path && getRequestPath(request.url) !== this.path) {
      return false;
    }

    return true;
  }

  /**
   * Get server address.
   */
  address(): { port: number; family: string; address: string } | null {
    if (this._httpServer?.address) {
      return this._httpServer.address();
    }

    return null;
  }
}

/**
 * Create WebSocket server.
 */
export function createWebSocketServer(options?: ServerOptions, callback?: () => void): WebSocketServer {
  return new WebSocketServer(options, callback);
}