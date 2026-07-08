import type { IncomingHttpHeaders, OutgoingHttpHeaders } from './types';

/**
 * Helper: Queue callback (eliminates duplication in callback handling)
 */
export function queueCallback(callback?: () => void): void {
  if (callback) queueMicrotask(callback);
}

export function getRequestPath(url?: string): string {
  if (!url) return '';

  try {
    const urlObj = new URL(url);
    return urlObj.pathname + urlObj.search;
  } catch {
    return url;
  }
}

export function headersToRecord(headers: Headers): IncomingHttpHeaders {
  const result: IncomingHttpHeaders = Object.create(null);
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

export function headersToRawHeaders(headers: Headers): string[] {
  const rawHeaders: string[] = [];
  headers.forEach((value, key) => {
    rawHeaders.push(key, value);
  });
  return rawHeaders;
}

export type RequestBodyChunk = string | Uint8Array;

export function normalizeRequestBodyChunk(chunk: any, encoding: BufferEncoding = 'utf8'): RequestBodyChunk {
  if (typeof chunk === 'string') {
    if (encoding !== 'utf8' && typeof Buffer !== 'undefined') {
      return Buffer.from(chunk, encoding);
    }

    return chunk;
  }

  if (chunk instanceof Uint8Array) {
    return chunk;
  }

  if (chunk instanceof ArrayBuffer) {
    return new Uint8Array(chunk);
  }

  if (ArrayBuffer.isView(chunk)) {
    return new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
  }

  return new TextEncoder().encode(String(chunk));
}

export function buildRequestBody(chunks: RequestBodyChunk[]): BodyInit | undefined {
  if (chunks.length === 0) {
    return undefined;
  }

  if (chunks.length === 1) {
    return chunks[0] as unknown as BodyInit;
  }

  if (chunks.every((chunk) => typeof chunk === 'string')) {
    return (chunks as string[]).join('');
  }

  const encoder = new TextEncoder();
  const bodyParts = chunks.map((chunk) => typeof chunk === 'string' ? encoder.encode(chunk) : chunk);
  const totalLength = bodyParts.reduce((sum, part) => sum + part.byteLength, 0);
  const body = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of bodyParts) {
    body.set(part, offset);
    offset += part.byteLength;
  }

  return body as unknown as BodyInit;
}

export function isFetchResponse(value: any): value is Response {
  return typeof value?.status === 'number'
    && typeof value?.statusText === 'string'
    && typeof value?.headers?.forEach === 'function';
}

export function isNodeIncomingMessage(value: any): boolean {
  return typeof value?.on === 'function'
    && typeof value?.headers === 'object'
    && (typeof value?.httpVersion === 'string' || value?.socket !== undefined);
}

/**
 * Helper: Convert headers to HeadersInit (eliminates duplication in Response creation)
 */
export function headersToInit(headers: OutgoingHttpHeaders): HeadersInit {
  const result: HeadersInit = {};
  for (const key in headers) {
    const value = headers[key];
    result[key] = Array.isArray(value) ? value.join(', ') : String(value);
  }
  return result;
}

/**
 * Helper: Create address object (eliminates duplication in address() method)
 */
export function createAddress(port: number, address: string, family = 'IPv4'): { port: number; family: string; address: string } {
  return { port, family, address };
}

/**
 * Helper: Create error Response (eliminates duplication in error handling)
 */
export function createErrorResponse(): Response {
  return new Response('Internal Server Error', { status: 500 });
}

type LifecycleServerLike = {
  _listening: boolean;
  emit(event: string, ...args: any[]): boolean;
};

/**
 * Helper: Emit listening and queue callback (eliminates duplication in Bun/Deno listen)
 */
export function emitListeningWithCallback(server: LifecycleServerLike, callback?: () => void): void {
  server._listening = true;
  server.emit('listening');
  queueCallback(callback);
}

/**
 * Helper: Close server and emit events (eliminates duplication in Bun/Deno close)
 */
export function closeAndEmit(server: LifecycleServerLike, callback?: (err?: Error) => void): void {
  server._listening = false;
  server.emit('close');
  if (callback) queueMicrotask(() => callback());
}