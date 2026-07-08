/**
 * File System module with unified API across runtimes
 * Compatible with Node.js 'fs' module API
 * - Node.js: uses 'fs' module
 * - Bun: uses Bun.file() and native APIs
 * - Deno: uses Deno.readFile(), etc.
 */

import { runtime } from '@elitjs/runtime';

import {
  appendFile,
  appendFileSync,
  exists,
  existsSync,
  readFile,
  readFileSync,
  stat,
  statSync,
  writeFile,
  writeFileSync,
} from './file-ops';
import {
  mkdir,
  mkdirSync,
  readdir,
  readdirSync,
  rmdir,
  rmdirSync,
  unlink,
  unlinkSync,
} from './directory-ops';
import {
  copyFile,
  copyFileSync,
  realpath,
  realpathSync,
  rename,
  renameSync,
} from './path-ops';

export type {
  BufferEncoding,
  Dirent,
  MkdirOptions,
  ReadFileOptions,
  ReaddirOptions,
  Stats,
  WriteFileOptions,
} from './types';
export {
  appendFile,
  appendFileSync,
  exists,
  existsSync,
  readFile,
  readFileSync,
  stat,
  statSync,
  writeFile,
  writeFileSync,
} from './file-ops';
export {
  mkdir,
  mkdirSync,
  readdir,
  readdirSync,
  rmdir,
  rmdirSync,
  unlink,
  unlinkSync,
} from './directory-ops';
export {
  copyFile,
  copyFileSync,
  realpath,
  realpathSync,
  rename,
  renameSync,
} from './path-ops';

/**
 * Get current runtime
 */
export function getRuntime(): 'node' | 'bun' | 'deno' {
  return runtime;
}

/**
 * Promises API (re-export for compatibility)
 */
export const promises = {
  readFile,
  writeFile,
  appendFile,
  stat,
  mkdir,
  readdir,
  unlink,
  rmdir,
  rename,
  copyFile,
  realpath,
};

/**
 * Default export
 */
export default {
  readFile,
  readFileSync,
  writeFile,
  writeFileSync,
  appendFile,
  appendFileSync,
  exists,
  existsSync,
  stat,
  statSync,
  mkdir,
  mkdirSync,
  readdir,
  readdirSync,
  unlink,
  unlinkSync,
  rmdir,
  rmdirSync,
  rename,
  renameSync,
  copyFile,
  copyFileSync,
  realpath,
  realpathSync,
  promises,
  getRuntime,
};
