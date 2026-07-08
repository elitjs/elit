/**
 * File encoding types
 */
export type BufferEncoding =
  | 'ascii' | 'utf8' | 'utf-8' | 'utf16le' | 'ucs2' | 'ucs-2'
  | 'base64' | 'base64url' | 'latin1' | 'binary' | 'hex';

/**
 * Read file options
 */
export interface ReadFileOptions {
  encoding?: BufferEncoding | null;
  flag?: string;
  signal?: AbortSignal;
}

/**
 * Write file options
 */
export interface WriteFileOptions {
  encoding?: BufferEncoding | null;
  mode?: number;
  flag?: string;
  signal?: AbortSignal;
}

/**
 * Mkdir options
 */
export interface MkdirOptions {
  recursive?: boolean;
  mode?: number;
}

/**
 * Readdir options
 */
export interface ReaddirOptions {
  encoding?: BufferEncoding | null;
  withFileTypes?: boolean;
  recursive?: boolean;
}

/**
 * File stats
 */
export interface Stats {
  isFile(): boolean;
  isDirectory(): boolean;
  isBlockDevice(): boolean;
  isCharacterDevice(): boolean;
  isSymbolicLink(): boolean;
  isFIFO(): boolean;
  isSocket(): boolean;
  dev: number;
  ino: number;
  mode: number;
  nlink: number;
  uid: number;
  gid: number;
  rdev: number;
  size: number;
  blksize: number;
  blocks: number;
  atimeMs: number;
  mtimeMs: number;
  ctimeMs: number;
  birthtimeMs: number;
  atime: Date;
  mtime: Date;
  ctime: Date;
  birthtime: Date;
}

/**
 * Directory entry
 */
export interface Dirent {
  name: string;
  isFile(): boolean;
  isDirectory(): boolean;
  isBlockDevice(): boolean;
  isCharacterDevice(): boolean;
  isSymbolicLink(): boolean;
  isFIFO(): boolean;
  isSocket(): boolean;
}
