import { isNode, isBun, isDeno } from '@elitjs/runtime';

import { fs, fsPromises } from './node-modules';
import type { BufferEncoding } from './types';

type RealpathOptions = { encoding?: BufferEncoding };

/**
 * Rename/move file (async)
 */
export async function rename(oldPath: string, newPath: string): Promise<void> {
  if (isNode || isBun) {
    return fsPromises.rename(oldPath, newPath);
  } else if (isDeno) {
    // @ts-ignore
    await Deno.rename(oldPath, newPath);
  }
}

/**
 * Rename/move file (sync)
 */
export function renameSync(oldPath: string, newPath: string): void {
  if (isNode || isBun) {
    fs.renameSync(oldPath, newPath);
  } else if (isDeno) {
    // @ts-ignore
    Deno.renameSync(oldPath, newPath);
  }
}

/**
 * Copy file (async)
 */
export async function copyFile(src: string, dest: string, flags?: number): Promise<void> {
  if (isNode || isBun) {
    return fsPromises.copyFile(src, dest, flags);
  } else if (isDeno) {
    // @ts-ignore
    await Deno.copyFile(src, dest);
  }
}

/**
 * Copy file (sync)
 */
export function copyFileSync(src: string, dest: string, flags?: number): void {
  if (isNode || isBun) {
    fs.copyFileSync(src, dest, flags);
  } else if (isDeno) {
    // @ts-ignore
    Deno.copyFileSync(src, dest);
  }
}

/**
 * Resolve pathname to absolute path (async)
 */
export async function realpath(path: string, options?: RealpathOptions): Promise<string> {
  if (isNode || isBun) {
    return fsPromises.realpath(path, options);
  } else if (isDeno) {
    // @ts-ignore
    return await Deno.realPath(path);
  }

  return path;
}

/**
 * Resolve pathname to absolute path (sync)
 */
export function realpathSync(path: string, options?: RealpathOptions): string {
  if (isNode || isBun) {
    return fs.realpathSync(path, options);
  } else if (isDeno) {
    // @ts-ignore
    return Deno.realPathSync(path);
  }

  return path;
}
