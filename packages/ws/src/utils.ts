import { runtime } from '@elitjs/runtime';

import type { Data } from './types';

type Callback = ((err?: Error) => void) | (() => void);

/**
 * Helper: Queue callback with optional error.
 */
export function queueCallback(callback?: Callback, error?: Error): void {
  if (callback) {
    queueMicrotask(() => (callback as (err?: Error) => void)(error));
  }
}

/**
 * Helper: Create native WebSocket instance.
 */
export function createNativeWebSocket(url: string, protocols?: string[]): any {
  // @ts-ignore - WebSocket is available in Node.js 18+ and all modern runtimes
  if (runtime === 'node' && typeof globalThis.WebSocket === 'undefined') {
    throw new Error('WebSocket is not available. Please use Node.js 18+ or install ws package.');
  }

  // @ts-ignore
  return new globalThis.WebSocket(url, protocols);
}

export function getRequestPath(url?: string): string {
  const [pathname = '/'] = (url || '/').split('?');
  return pathname || '/';
}

export function isIgnorableConnectionError(error?: Error | null): boolean {
  const errorCode = (error as any)?.code;
  return errorCode === 'ECONNABORTED' || errorCode === 'ECONNRESET' || errorCode === 'EPIPE';
}

export function coerceBunMessage(message: any): { payload: string | Buffer; isBinary: boolean } {
  const isBinary = typeof message !== 'string';
  const payload = typeof message === 'string'
    ? message
    : message instanceof ArrayBuffer
      ? Buffer.from(message)
      : ArrayBuffer.isView(message)
        ? Buffer.from(message.buffer, message.byteOffset, message.byteLength)
        : Buffer.from(String(message));

  return { payload, isBinary };
}

export function parseFrame(data: Buffer): string | null {
  if (data.length < 2) {
    return null;
  }

  const firstByte = data[0];
  const secondByte = data[1];

  const opcode = firstByte & 0x0f;
  const isMasked = (secondByte & 0x80) === 0x80;
  let payloadLength = secondByte & 0x7f;
  let offset = 2;

  if (payloadLength === 126) {
    payloadLength = data.readUInt16BE(2);
    offset = 4;
  } else if (payloadLength === 127) {
    payloadLength = Number(data.readBigUInt64BE(2));
    offset = 10;
  }

  let payload = data.subarray(offset);

  if (isMasked) {
    const maskKey = data.subarray(offset, offset + 4);
    payload = data.subarray(offset + 4, offset + 4 + payloadLength);

    for (let index = 0; index < payload.length; index += 1) {
      payload[index] ^= maskKey[index % 4];
    }
  }

  if (opcode === 1) {
    return payload.toString('utf8');
  }

  return null;
}

export function createFrame(data: Data): Buffer {
  const payload = typeof data === 'string' ? Buffer.from(data) : data;
  const payloadLength = Buffer.isBuffer(payload) ? payload.length : 0;

  let frame: Buffer;
  let offset = 2;

  if (payloadLength < 126) {
    frame = Buffer.allocUnsafe(2 + payloadLength);
    frame[1] = payloadLength;
  } else if (payloadLength < 65536) {
    frame = Buffer.allocUnsafe(4 + payloadLength);
    frame[1] = 126;
    frame.writeUInt16BE(payloadLength, 2);
    offset = 4;
  } else {
    frame = Buffer.allocUnsafe(10 + payloadLength);
    frame[1] = 127;
    frame.writeBigUInt64BE(BigInt(payloadLength), 2);
    offset = 10;
  }

  frame[0] = 0x81;

  if (Buffer.isBuffer(payload)) {
    payload.copy(frame, offset);
  }

  return frame;
}