import type { ServerResponse } from '@elitjs/http';

export const json = (res: ServerResponse, data: any, status = 200) => (res.writeHead(status, { 'Content-Type': 'application/json' }), res.end(JSON.stringify(data)));
export const text = (res: ServerResponse, data: string, status = 200) => (res.writeHead(status, { 'Content-Type': 'text/plain' }), res.end(data));
export const html = (res: ServerResponse, data: string, status = 200) => (res.writeHead(status, { 'Content-Type': 'text/html' }), res.end(data));
export const status = (res: ServerResponse, code: number, message = '') => (res.writeHead(code, { 'Content-Type': 'application/json' }), res.end(JSON.stringify({ status: code, message })));

export const sendError = (res: ServerResponse, code: number, msg: string): void => {
  res.writeHead(code, { 'Content-Type': 'text/plain' });
  res.end(msg);
};

export const send404 = (res: ServerResponse, msg = 'Not Found'): void => sendError(res, 404, msg);
export const send403 = (res: ServerResponse, msg = 'Forbidden'): void => sendError(res, 403, msg);
export const send500 = (res: ServerResponse, msg = 'Internal Server Error'): void => sendError(res, 500, msg);