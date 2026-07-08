import { isNode, isBun, isDeno } from '@elitjs/runtime';

import { fs, fsPromises } from './node-modules';
import type { BufferEncoding, Dirent, MkdirOptions, ReaddirOptions } from './types';
import { parseOptions, processDenoEntries, processDenoEntriesAsync } from './utils';

type RemoveDirectoryOptions = { recursive?: boolean };

/**
 * Create directory (async)
 */
export async function mkdir(path: string, options?: MkdirOptions | number): Promise<void> {
  const opts = typeof options === 'number' ? { mode: options } as MkdirOptions : options || {};

  if (isNode || isBun) {
    await fsPromises.mkdir(path, opts);
  } else if (isDeno) {
    // @ts-ignore
    await Deno.mkdir(path, { recursive: opts.recursive });
  }
}

/**
 * Create directory (sync)
 */
export function mkdirSync(path: string, options?: MkdirOptions | number): void {
  const opts = typeof options === 'number' ? { mode: options } as MkdirOptions : options || {};

  if (isNode || isBun) {
    fs.mkdirSync(path, opts);
  } else if (isDeno) {
    // @ts-ignore
    Deno.mkdirSync(path, { recursive: opts.recursive });
  }
}

/**
 * Read directory (async)
 */
export async function readdir(path: string, options?: ReaddirOptions | BufferEncoding): Promise<string[] | Dirent[]> {
  const opts = parseOptions<ReaddirOptions>(options, {});

  if (isNode || isBun) {
    return fsPromises.readdir(path, opts);
  } else if (isDeno) {
    // @ts-ignore
    return processDenoEntriesAsync(Deno.readDir(path), opts.withFileTypes);
  }

  throw new Error('Unsupported runtime');
}

/**
 * Read directory (sync)
 */
export function readdirSync(path: string, options?: ReaddirOptions | BufferEncoding): string[] | Dirent[] {
  const opts = parseOptions<ReaddirOptions>(options, {});

  if (isNode || isBun) {
    return fs.readdirSync(path, opts);
  } else if (isDeno) {
    // @ts-ignore
    return processDenoEntries(Deno.readDirSync(path), opts.withFileTypes);
  }

  throw new Error('Unsupported runtime');
}

/**
 * Remove file (async)
 */
export async function unlink(path: string): Promise<void> {
  if (isNode || isBun) {
    return fsPromises.unlink(path);
  } else if (isDeno) {
    // @ts-ignore
    await Deno.remove(path);
  }
}

/**
 * Remove file (sync)
 */
export function unlinkSync(path: string): void {
  if (isNode || isBun) {
    fs.unlinkSync(path);
  } else if (isDeno) {
    // @ts-ignore
    Deno.removeSync(path);
  }
}

/**
 * Remove directory (async)
 */
export async function rmdir(path: string, options?: RemoveDirectoryOptions): Promise<void> {
  if (isNode || isBun) {
    return fsPromises.rmdir(path, options);
  } else if (isDeno) {
    // @ts-ignore
    await Deno.remove(path, { recursive: options?.recursive });
  }
}

/**
 * Remove directory (sync)
 */
export function rmdirSync(path: string, options?: RemoveDirectoryOptions): void {
  if (isNode || isBun) {
    fs.rmdirSync(path, options);
  } else if (isDeno) {
    // @ts-ignore
    Deno.removeSync(path, { recursive: options?.recursive });
  }
}
