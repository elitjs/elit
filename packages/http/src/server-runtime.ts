import { EventEmitter } from 'node:events';

import { isBun, isDeno, isNode } from '@elitjs/runtime';

import { http } from './node-modules';
import { IncomingMessage } from './incoming-message';
import { ServerResponse } from './response';
import type { RequestListener, ServerListenOptions, ServerOptions } from './types';
import {
  closeAndEmit,
  createAddress,
  createErrorResponse,
  emitListeningWithCallback,
  headersToRawHeaders,
  headersToRecord,
} from './utils';

/**
 * Server - Optimized for each runtime
 */
export class Server extends EventEmitter {
  private nativeServer?: any;
  private requestListener?: RequestListener;
  private _bunWebSocketServers: Set<any> = new Set();
  public _listening: boolean = false;

  constructor(requestListener?: RequestListener) {
    super();
    this.requestListener = requestListener;
  }

  registerWebSocketServer(wsServer: any): void {
    this._bunWebSocketServers.add(wsServer);
  }

  unregisterWebSocketServer(wsServer: any): void {
    this._bunWebSocketServers.delete(wsServer);
  }

  private resolvePmInheritedFd(explicitPort?: number, explicitFd?: number): number | undefined {
    if (typeof explicitFd === 'number' && Number.isInteger(explicitFd) && explicitFd >= 0) {
      return explicitFd;
    }

    const fdValue = process.env.ELIT_PM_LISTEN_FD;
    if (!fdValue) {
      return undefined;
    }

    const parsedFd = Number.parseInt(fdValue, 10);
    if (!Number.isInteger(parsedFd) || parsedFd < 0) {
      return undefined;
    }

    const publicPort = Number.parseInt(process.env.ELIT_PM_PUBLIC_PORT ?? process.env.ELIT_PM_PORT ?? '', 10);
    if (Number.isInteger(explicitPort) && Number.isInteger(publicPort) && explicitPort !== publicPort) {
      return undefined;
    }

    return parsedFd;
  }

  listen(port?: number, hostname?: string, backlog?: number, listeningListener?: () => void): this;
  listen(port?: number, hostname?: string, listeningListener?: () => void): this;
  listen(port?: number, listeningListener?: () => void): this;
  listen(options?: ServerListenOptions, listeningListener?: () => void): this;
  listen(...args: any[]): this {
    let port = 3000;
    let hostname = '0.0.0.0';
    let fd: number | undefined;
    let callback: (() => void) | undefined;

    const firstArg = args[0];
    if (typeof firstArg === 'number') {
      port = firstArg;
      const secondArg = args[1];
      if (typeof secondArg === 'string') {
        hostname = secondArg;
        callback = args[2] || args[3];
      } else if (typeof secondArg === 'function') {
        callback = secondArg;
      }
    } else if (firstArg && typeof firstArg === 'object') {
      port = firstArg.port || 3000;
      hostname = firstArg.hostname || '0.0.0.0';
      fd = typeof firstArg.fd === 'number' ? firstArg.fd : undefined;
      callback = args[1];
    }

    fd = this.resolvePmInheritedFd(firstArg && typeof firstArg === 'object' ? firstArg.port : port, fd);

    const self = this;

    if (isNode) {
      this.nativeServer = http.createServer((req: any, res: any) => {
        const incomingMessage = new IncomingMessage(req);
        const serverResponse = new ServerResponse(incomingMessage, res);

        if (self.requestListener) {
          self.requestListener(incomingMessage, serverResponse);
        } else {
          self.emit('request', incomingMessage, serverResponse);
        }
      });

      this.nativeServer.on('upgrade', (req: any, socket: any, head: any) => {
        self.emit('upgrade', req, socket, head);
      });

      if (fd !== undefined) {
        this.nativeServer.listen({ fd, exclusive: false }, () => {
          this._listening = true;
          this.emit('listening');
          if (callback) callback();
        });
      } else {
        this.nativeServer.listen(port, hostname, () => {
          this._listening = true;
          this.emit('listening');
          if (callback) callback();
        });
      }

      this.nativeServer.on('error', (err: Error) => this.emit('error', err));
      this.nativeServer.on('close', () => {
        this._listening = false;
        this.emit('close');
      });
    } else if (isBun) {
      // @ts-ignore
      this.nativeServer = Bun.serve({
        port,
        hostname,
        websocket: {
          open: (ws: any) => {
            ws.data?.wsServer?._handleBunOpen(ws, ws.data?.request);
          },
          message: (ws: any, message: any) => {
            ws.data?.wsServer?._handleBunMessage(ws, message);
          },
          close: (ws: any, code: number, reason: any) => {
            ws.data?.wsServer?._handleBunClose(ws, code, reason);
          },
        },
        fetch: (req: Request) => {
          const urlObj = new URL(req.url);
          const pathname = urlObj.pathname;
          const requestUrl = urlObj.pathname + urlObj.search;
          const incomingHeaders = headersToRecord(req.headers);
          const rawHeaders = headersToRawHeaders(req.headers);

          const upgradeHeader = req.headers.get('upgrade');
          if (upgradeHeader && upgradeHeader.toLowerCase() === 'websocket') {
            const matchingWebSocketServer = Array.from(this._bunWebSocketServers).find((wsServer: any) => {
              return !wsServer.path || wsServer.path === pathname;
            });

            if (!matchingWebSocketServer) {
              return new Response('WebSocket path not found', { status: 404 });
            }

            const requestHeaders: Record<string, string> = {};
            req.headers.forEach((value, key) => {
              requestHeaders[key] = value;
            });

            const upgraded = this.nativeServer.upgrade(req, {
              data: {
                wsServer: matchingWebSocketServer,
                request: {
                  method: req.method,
                  url: requestUrl,
                  headers: requestHeaders,
                  socket: { remoteAddress: undefined },
                },
              },
            });

            if (upgraded) {
              return undefined as any;
            }

            return new Response('WebSocket upgrade failed', { status: 400 });
          }

          let statusCode = 200;
          let statusMessage = 'OK';
          let body = '';
          const headers: Record<string, string> = Object.create(null);
          let responseReady = false;

          const incomingMessage: any = {
            method: req.method,
            url: requestUrl,
            headers: incomingHeaders,
            httpVersion: '1.1',
            rawHeaders,
            _req: req,
            text: () => req.text(),
            json: () => req.json(),
          };

          const serverResponse: any = {
            statusCode: 200,
            statusMessage: 'OK',
            headersSent: false,
            _headers: headers,

            setHeader(name: string, value: string | string[] | number) {
              headers[name.toLowerCase()] = Array.isArray(value) ? value.join(', ') : String(value);
              return this;
            },

            getHeader(name: string) {
              return headers[name.toLowerCase()];
            },

            getHeaders() {
              return { ...headers };
            },

            writeHead(status: number, arg2?: any, arg3?: any) {
              statusCode = status;
              this.statusCode = status;
              this.headersSent = true;

              if (typeof arg2 === 'string') {
                statusMessage = arg2;
                this.statusMessage = arg2;
                if (arg3) {
                  for (const key in arg3) {
                    headers[key.toLowerCase()] = arg3[key];
                  }
                }
              } else if (arg2) {
                for (const key in arg2) {
                  headers[key.toLowerCase()] = arg2[key];
                }
              }
              return this;
            },

            write(chunk: any) {
              if (!this.headersSent) {
                this.writeHead(statusCode);
              }
              body += chunk;
              return true;
            },

            end(chunk?: any) {
              if (chunk !== undefined) {
                this.write(chunk);
              }
              if (!this.headersSent) {
                this.writeHead(statusCode);
              }
              responseReady = true;
            },
          };

          if (self.requestListener) {
            self.requestListener(incomingMessage, serverResponse);
          } else {
            self.emit('request', incomingMessage, serverResponse);
          }

          if (!responseReady) {
            serverResponse.end();
          }

          return new Response(body, {
            status: statusCode,
            statusText: statusMessage,
            headers,
          });
        },
        error: (err: Error) => {
          this.emit('error', err);
          return createErrorResponse();
        },
      });

      this._listening = true;
      emitListeningWithCallback(this, callback);

      this.nativeServer.stop = this.nativeServer.stop || this.nativeServer.close;
      this.nativeServer.close = this.nativeServer.close || this.nativeServer.stop;

      this.nativeServer.on?.('close', () => {
        this._listening = false;
        this.emit('close');
      });
    } else if (isDeno) {
      const server = this;
      // @ts-ignore
      this.nativeServer = Deno.serve({
        port,
        hostname,
      }, async (req: Request) => {
        const urlObj = new URL(req.url);
        const requestUrl = urlObj.pathname + urlObj.search;
        const incomingHeaders = headersToRecord(req.headers);
        const rawHeaders = headersToRawHeaders(req.headers);

        const bodyChunks: Uint8Array[] = [];
        const responseHeaders = new Headers();
        let statusCode = 200;
        let statusText = 'OK';
        let responseClosed = false;

        const incomingMessage: any = {
          method: req.method,
          url: requestUrl,
          headers: incomingHeaders,
          httpVersion: '1.1',
          rawHeaders,
          _req: req,
          text: () => req.text(),
          json: () => req.json(),
        };

        const serverResponse: any = {
          statusCode: 200,
          statusMessage: 'OK',
          headersSent: false,

          setHeader(name: string, value: string | string[] | number) {
            responseHeaders.set(name, Array.isArray(value) ? value.join(', ') : String(value));
            return this;
          },

          getHeader(name: string) {
            return responseHeaders.get(name) ?? undefined;
          },

          getHeaders() {
            const headers: Record<string, string> = {};
            responseHeaders.forEach((value, key) => {
              headers[key] = value;
            });
            return headers;
          },

          writeHead(status: number, arg2?: any, arg3?: any) {
            statusCode = status;
            this.statusCode = status;
            this.headersSent = true;

            if (typeof arg2 === 'string') {
              statusText = arg2;
              this.statusMessage = arg2;
              if (arg3) {
                Object.entries(arg3).forEach(([key, value]) => {
                  responseHeaders.set(key, Array.isArray(value) ? value.join(', ') : String(value));
                });
              }
            } else if (arg2) {
              Object.entries(arg2).forEach(([key, value]) => {
                responseHeaders.set(key, Array.isArray(value) ? value.join(', ') : String(value));
              });
            }
            return this;
          },

          write(chunk: any) {
            if (!this.headersSent) {
              this.writeHead(statusCode);
            }

            if (typeof chunk === 'string') {
              bodyChunks.push(new TextEncoder().encode(chunk));
            } else if (chunk instanceof Uint8Array) {
              bodyChunks.push(chunk);
            } else if (chunk !== undefined && chunk !== null) {
              bodyChunks.push(new TextEncoder().encode(String(chunk)));
            }

            return true;
          },

          end(chunk?: any) {
            if (chunk !== undefined) {
              this.write(chunk);
            }
            if (!this.headersSent) {
              this.writeHead(statusCode);
            }
            responseClosed = true;
          },
        };

        if (server.requestListener) {
          server.requestListener(incomingMessage, serverResponse);
        } else {
          server.emit('request', incomingMessage, serverResponse);
        }

        if (!responseClosed) {
          serverResponse.end();
        }

        const body = bodyChunks.length === 0
          ? undefined
          : (() => {
              const totalLength = bodyChunks.reduce((sum, chunk) => sum + chunk.length, 0);
              const output = new ArrayBuffer(totalLength);
              const combined = new Uint8Array(output);
              let offset = 0;
              for (const chunk of bodyChunks) {
                combined.set(chunk, offset);
                offset += chunk.length;
              }
              return output;
            })();

        return new Response(body, {
          status: statusCode,
          statusText,
          headers: responseHeaders,
        });
      });

      this._listening = true;
      emitListeningWithCallback(this, callback);

      (this.nativeServer.finished as Promise<void>)
        .then(() => closeAndEmit(this))
        .catch((err: Error) => this.emit('error', err));
    }

    return this;
  }

  close(callback?: (err?: Error) => void): this {
    if (!this.nativeServer) {
      if (callback) queueMicrotask(() => callback());
      return this;
    }

    if (isNode) {
      this.nativeServer.close(callback);
    } else if (isBun) {
      this.nativeServer.stop();
      closeAndEmit(this, callback);
    } else if (isDeno) {
      // @ts-ignore
      this.nativeServer.shutdown();
      closeAndEmit(this, callback);
    }

    return this;
  }

  address(): { port: number; family: string; address: string } | null {
    if (!this.nativeServer) return null;

    if (isNode) {
      const addr = this.nativeServer.address();
      if (!addr) return null;
      if (typeof addr === 'string') {
        return createAddress(0, addr, 'unix');
      }
      return addr;
    }

    if (isBun) {
      return createAddress(this.nativeServer.port, this.nativeServer.hostname);
    }

    if (isDeno) {
      // @ts-ignore
      const addr = this.nativeServer.addr;
      return createAddress(addr.port, addr.hostname);
    }

    return null;
  }

  get listening(): boolean {
    return this._listening;
  }
}

export function createServer(requestListener?: RequestListener): Server;
export function createServer(options: ServerOptions, requestListener?: RequestListener): Server;
export function createServer(
  arg1?: ServerOptions | RequestListener,
  arg2?: RequestListener,
): Server {
  const requestListener = typeof arg1 === 'function' ? arg1 : arg2;
  return new Server(requestListener);
}