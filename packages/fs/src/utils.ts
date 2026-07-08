import type { Dirent, Stats } from './types';

/**
 * Helper: Parse options from string or object (eliminates duplication in options parsing)
 */
export function parseOptions<T>(options: T | string | undefined, defaultValue: T): T {
  return typeof options === 'string' ? { encoding: options } as T : options || defaultValue;
}

/**
 * Helper: Decode content with optional encoding (eliminates duplication in read operations)
 */
export function decodeContent(content: ArrayBuffer | Uint8Array, encoding?: string | null): string | Buffer {
  if (encoding) {
    return new TextDecoder(encoding).decode(content);
  }

  return Buffer.from(content instanceof ArrayBuffer ? new Uint8Array(content) : content);
}

/**
 * Helper: Convert data to Uint8Array (eliminates duplication in write operations)
 */
export function dataToUint8Array(data: string | Buffer | Uint8Array): Uint8Array {
  if (typeof data === 'string') {
    return new TextEncoder().encode(data);
  }

  if (data instanceof Buffer) {
    return new Uint8Array(data);
  }

  return data;
}

/**
 * Helper: Create Dirent from Deno DirEntry
 */
export function createDirentFromDenoEntry(entry: any): Dirent {
  return {
    name: entry.name,
    isFile: () => entry.isFile,
    isDirectory: () => entry.isDirectory,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => entry.isSymlink || false,
    isFIFO: () => false,
    isSocket: () => false,
  };
}

/**
 * Helper: Process directory entries (eliminates duplication in readdir operations)
 */
export function processDenoEntries(iterator: any, withFileTypes?: boolean): any[] {
  const entries: any[] = [];

  for (const entry of iterator) {
    if (withFileTypes) {
      entries.push(createDirentFromDenoEntry(entry));
    } else {
      entries.push(entry.name);
    }
  }

  return entries;
}

/**
 * Helper: Process directory entries async (eliminates duplication in async readdir)
 */
export async function processDenoEntriesAsync(iterator: any, withFileTypes?: boolean): Promise<any[]> {
  const entries: any[] = [];

  for await (const entry of iterator) {
    if (withFileTypes) {
      entries.push(createDirentFromDenoEntry(entry));
    } else {
      entries.push(entry.name);
    }
  }

  return entries;
}

/**
 * Helper: Create Stats from Deno FileInfo
 */
export function createStatsFromDenoFileInfo(info: any): Stats {
  return {
    isFile: () => info.isFile,
    isDirectory: () => info.isDirectory,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => info.isSymlink || false,
    isFIFO: () => false,
    isSocket: () => false,
    dev: info.dev || 0,
    ino: info.ino || 0,
    mode: info.mode || 0,
    nlink: info.nlink || 1,
    uid: info.uid || 0,
    gid: info.gid || 0,
    rdev: 0,
    size: info.size,
    blksize: info.blksize || 4096,
    blocks: info.blocks || Math.ceil(info.size / 512),
    atimeMs: info.atime?.getTime() || Date.now(),
    mtimeMs: info.mtime?.getTime() || Date.now(),
    ctimeMs: info.birthtime?.getTime() || Date.now(),
    birthtimeMs: info.birthtime?.getTime() || Date.now(),
    atime: info.atime || new Date(),
    mtime: info.mtime || new Date(),
    ctime: info.birthtime || new Date(),
    birthtime: info.birthtime || new Date(),
  };
}
