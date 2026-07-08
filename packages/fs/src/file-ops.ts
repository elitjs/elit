import { isNode, isBun, isDeno } from '@elitjs/runtime';

import { fs, fsPromises } from './node-modules';
import type { BufferEncoding, ReadFileOptions, Stats, WriteFileOptions } from './types';
import { createStatsFromDenoFileInfo, dataToUint8Array, decodeContent, parseOptions } from './utils';

/**
 * Read file (async)
 */
export async function readFile(path: string, options?: ReadFileOptions | BufferEncoding): Promise<string | Buffer> {
  const opts = parseOptions<ReadFileOptions>(options, {});

  if (isNode || isBun) {
    return fsPromises.readFile(path, opts);
  } else if (isDeno) {
    // @ts-ignore
    const content = await Deno.readFile(path);
    return decodeContent(content, opts.encoding);
  }

  throw new Error('Unsupported runtime');
}

/**
 * Read file (sync)
 */
export function readFileSync(path: string, options?: ReadFileOptions | BufferEncoding): string | Buffer {
  const opts = parseOptions<ReadFileOptions>(options, {});

  if (isNode || isBun) {
    return fs.readFileSync(path, opts);
  } else if (isDeno) {
    // @ts-ignore
    const content = Deno.readFileSync(path);
    return decodeContent(content, opts.encoding);
  }

  throw new Error('Unsupported runtime');
}

/**
 * Write file (async)
 */
export async function writeFile(path: string, data: string | Buffer | Uint8Array, options?: WriteFileOptions | BufferEncoding): Promise<void> {
  const opts = parseOptions<WriteFileOptions>(options, {});

  if (isNode || isBun) {
    return fsPromises.writeFile(path, data, opts);
  } else if (isDeno) {
    // @ts-ignore
    await Deno.writeFile(path, dataToUint8Array(data));
  }
}

/**
 * Write file (sync)
 */
export function writeFileSync(path: string, data: string | Buffer | Uint8Array, options?: WriteFileOptions | BufferEncoding): void {
  const opts = parseOptions<WriteFileOptions>(options, {});

  if (isNode || isBun) {
    fs.writeFileSync(path, data, opts);
  } else if (isDeno) {
    // @ts-ignore
    Deno.writeFileSync(path, dataToUint8Array(data));
  }
}

/**
 * Append file (async)
 */
export async function appendFile(path: string, data: string | Buffer, options?: WriteFileOptions | BufferEncoding): Promise<void> {
  const opts = parseOptions<WriteFileOptions>(options, {});

  if (isNode) {
    return fsPromises.appendFile(path, data, opts);
  }

  if (await exists(path)) {
    const existing = await readFile(path);
    const combined = Buffer.isBuffer(existing)
      ? Buffer.concat([existing, Buffer.isBuffer(data) ? data : Buffer.from(data)])
      : existing + (Buffer.isBuffer(data) ? data.toString() : data);
    await writeFile(path, combined, opts);
  } else {
    await writeFile(path, data, opts);
  }
}

/**
 * Append file (sync)
 */
export function appendFileSync(path: string, data: string | Buffer, options?: WriteFileOptions | BufferEncoding): void {
  const opts = parseOptions<WriteFileOptions>(options, {});

  if (isNode) {
    fs.appendFileSync(path, data, opts);
    return;
  }

  if (existsSync(path)) {
    const existing = readFileSync(path);
    const combined = Buffer.isBuffer(existing)
      ? Buffer.concat([existing, Buffer.isBuffer(data) ? data : Buffer.from(data)])
      : existing + (Buffer.isBuffer(data) ? data.toString() : data);
    writeFileSync(path, combined, opts);
  } else {
    writeFileSync(path, data, opts);
  }
}

/**
 * Check if file/directory exists (async)
 */
export async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if file/directory exists (sync)
 */
export function existsSync(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file stats (async)
 */
export async function stat(path: string): Promise<Stats> {
  if (isNode || isBun) {
    return fsPromises.stat(path);
  } else if (isDeno) {
    // @ts-ignore
    const info = await Deno.stat(path);
    return createStatsFromDenoFileInfo(info);
  }

  throw new Error('Unsupported runtime');
}

/**
 * Get file stats (sync)
 */
export function statSync(path: string): Stats {
  if (isNode || isBun) {
    return fs.statSync(path);
  } else if (isDeno) {
    // @ts-ignore
    const info = Deno.statSync(path);
    return createStatsFromDenoFileInfo(info);
  }

  throw new Error('Unsupported runtime');
}
