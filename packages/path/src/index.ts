/**
 * Path module with unified API across runtimes
 * Pure implementation without external dependencies
 * Compatible with Node.js 'path' module API
 * Works on Node.js, Bun, and Deno
 */

import {
  createPathOps,
  formatPath,
  getBasename,
  getDirname,
  getExtname,
  isAbsolutePosix,
  isAbsoluteWin,
  joinPaths,
  normalizePath,
  parsePath,
  relativePath,
  resolvePaths,
} from './operations';
import { delimiter, isWindows, sep } from './platform';
import { getRuntime } from './runtime';

import type { FormatInputPathObject, ParsedPath } from './types';

export { delimiter, sep } from './platform';
export { getRuntime } from './runtime';
export type { FormatInputPathObject, ParsedPath } from './types';

/**
 * POSIX path operations
 */
export const posix = createPathOps(false);

/**
 * Windows path operations
 */
export const win32 = createPathOps(true);

/**
 * Normalize a path (platform-specific)
 */
export function normalize(path: string): string {
  return normalizePath(path, isWindows);
}

/**
 * Join paths (platform-specific)
 */
export function join(...paths: string[]): string {
  return joinPaths(paths, isWindows);
}

/**
 * Resolve paths to absolute path (platform-specific)
 */
export function resolve(...paths: string[]): string {
  return resolvePaths(paths, isWindows);
}

/**
 * Check if path is absolute (platform-specific)
 */
export function isAbsolute(path: string): boolean {
  return isWindows ? isAbsoluteWin(path) : isAbsolutePosix(path);
}

/**
 * Get relative path (platform-specific)
 */
export function relative(from: string, to: string): string {
  return relativePath(from, to, isWindows);
}

/**
 * Get directory name (platform-specific)
 */
export function dirname(path: string): string {
  return getDirname(path, isWindows);
}

/**
 * Get base name (platform-specific)
 */
export function basename(path: string, ext?: string): string {
  return getBasename(path, ext, isWindows);
}

/**
 * Get extension name
 */
export function extname(path: string): string {
  return getExtname(path);
}

/**
 * Parse path into components (platform-specific)
 */
export function parse(path: string): ParsedPath {
  return parsePath(path, isWindows);
}

/**
 * Format path from components (platform-specific)
 */
export function format(pathObject: FormatInputPathObject): string {
  return formatPath(pathObject, isWindows);
}

/**
 * Convert to namespaced path (Windows only)
 */
export function toNamespacedPath(path: string): string {
  if (!isWindows || path.length === 0) return path;

  const resolved = resolvePaths([path], true);

  if (resolved.length >= 3) {
    if (resolved[0] === '\\') {
      if (resolved[1] === '\\' && resolved[2] !== '?') {
        return '\\\\?\\UNC\\' + resolved.slice(2);
      }
    } else if (resolved[1] === ':' && resolved[2] === '\\') {
      return '\\\\?\\' + resolved;
    }
  }

  return path;
}

export default {
  sep,
  delimiter,
  normalize,
  join,
  resolve,
  isAbsolute,
  relative,
  dirname,
  basename,
  extname,
  parse,
  format,
  toNamespacedPath,
  posix,
  win32,
  getRuntime,
};