import { EventEmitter } from 'events';

import type { IncomingMessage } from '@elitjs/http';
import { createServer as createHttpsServer } from '@elitjs/https';
import { WebSocket, WebSocketServer } from '@elitjs/ws';

import { runtime } from '@elitjs/runtime';
import type { WSSServerOptions } from './types';
import { buildHttpsOptions, emitCloseWithCallback, queueCallback } from './utils';

/**
 * WebSocket Secure server class.
 */
export class WSSServer extends EventEmitter {
  public clients: Set<WebSocket> = new Set();
  public options: WSSServerOptions;
  public path: string;

  private _httpsServer: any;
  private _wsServer!: WebSocketServer;

  constructor(options?: WSSServerOptions, callback?: () => void) {
    super();
    this.options = options || {};
    this.path = options?.path || '/';

    if (runtime === 'node') {
      if (options?.httpsServer) {
        this._httpsServer = options.httpsServer;
        this._setupServer(callback);
      } else if (options?.noServer) {
        this._wsServer = new WebSocketServer({ noServer: true });
        queueCallback(callback);
      } else {
        this._httpsServer = createHttpsServer(buildHttpsOptions(options));
        this._setupServer(callback);

        if (options?.port) {
          this._httpsServer.listen(options.port, options.host, callback);
        }
      }
    } else {
      this._wsServer = new WebSocketServer(options);
      queueCallback(callback);
    }
  }

  private _setupServer(callback?: () => void): void {
    this._wsServer = new WebSocketServer({
      ...this.options,
      server: this._httpsServer,
      noServer: false,
    });

    this._wsServer.on('connection', (client: WebSocket, request: IncomingMessage) => {
      if (this.options.clientTracking !== false) {
        this.clients.add(client);
        client.on('close', () => {
          this.clients.delete(client);
        });
      }

      this.emit('connection', client, request);
    });

    this._wsServer.on('error', (error: Error) => {
      this.emit('error', error);
    });

    if (!this.options?.port) {
      queueCallback(callback);
    }
  }

  /**
   * Handle HTTP upgrade for WebSocket.
   */
  handleUpgrade(request: IncomingMessage, socket: any, head: Buffer, callback: (client: WebSocket) => void): void {
    if (this._wsServer) {
      this._wsServer.handleUpgrade(request, socket, head, callback);
    }
  }

  /**
   * Check if server should handle request.
   */
  shouldHandle(request: IncomingMessage): boolean {
    if (this._wsServer) {
      return this._wsServer.shouldHandle(request);
    }

    if (this.path && request.url !== this.path) {
      return false;
    }

    return true;
  }

  /**
   * Close the server.
   */
  close(callback?: (err?: Error) => void): void {
    this.clients.forEach((client) => client.close());
    this.clients.clear();

    if (this._wsServer) {
      this._wsServer.close(() => {
        if (this._httpsServer) {
          this._httpsServer.close(callback);
        } else {
          emitCloseWithCallback(this, callback);
        }
      });
      return;
    }

    if (this._httpsServer) {
      this._httpsServer.close(callback);
      return;
    }

    emitCloseWithCallback(this, callback);
  }

  /**
   * Get server address.
   */
  address(): { port: number; family: string; address: string } | null {
    if (this._httpsServer?.address) {
      return this._httpsServer.address();
    }

    if (this._wsServer) {
      return this._wsServer.address();
    }

    return null;
  }
}

/**
 * Create WebSocket Secure server.
 */
export function createWSSServer(options?: WSSServerOptions, callback?: () => void): WSSServer {
  return new WSSServer(options, callback);
}