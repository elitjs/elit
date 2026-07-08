import { getCwd, getSeparator } from './platform';
import type { FormatInputPathObject, ParsedPath } from './types';

/**
 * Helper: Find last separator index
 */
export function findLastSeparator(path: string): number {
  return Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
}

/**
 * Helper: Check if path is absolute (POSIX)
 */
export function isAbsolutePosix(path: string): boolean {
  return path.length > 0 && path[0] === '/';
}

/**
 * Helper: Check if path is absolute (Windows)
 */
export function isAbsoluteWin(path: string): boolean {
  const len = path.length;
  if (len === 0) return false;

  const code = path.charCodeAt(0);
  if (code === 47 || code === 92) {
    return true;
  }

  if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
    if (len > 2 && path.charCodeAt(1) === 58) {
      const code2 = path.charCodeAt(2);
      if (code2 === 47 || code2 === 92) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Normalize a path
 */
export function normalizePath(path: string, isWin: boolean): string {
  if (path.length === 0) return '.';

  const separator = getSeparator(isWin);
  const isAbsolute = isWin ? isAbsoluteWin(path) : isAbsolutePosix(path);
  const trailingSeparator = path[path.length - 1] === separator || (isWin && path[path.length - 1] === '/');
  const normalized = path.replace(isWin ? /[\/\\]+/g : /\/+/g, separator);
  const parts = normalized.split(separator);
  const result: string[] = [];

  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];

    if (part === '' || part === '.') {
      if (index === 0 && isAbsolute) result.push('');
      continue;
    }

    if (part === '..') {
      if (result.length > 0 && result[result.length - 1] !== '..') {
        if (!(result.length === 1 && result[0] === '')) {
          result.pop();
        }
      } else if (!isAbsolute) {
        result.push('..');
      }
    } else {
      result.push(part);
    }
  }

  let finalPath = result.join(separator);

  if (finalPath.length === 0) {
    return isAbsolute ? separator : '.';
  }

  if (trailingSeparator && finalPath[finalPath.length - 1] !== separator) {
    finalPath += separator;
  }

  return finalPath;
}

/**
 * Join paths
 */
export function joinPaths(paths: string[], isWin: boolean): string {
  if (paths.length === 0) return '.';

  const separator = getSeparator(isWin);
  let joined = '';
  for (let index = 0; index < paths.length; index++) {
    const path = paths[index];
    if (path && path.length > 0) {
      if (joined.length === 0) {
        joined = path;
      } else {
        joined += separator + path;
      }
    }
  }

  if (joined.length === 0) return '.';

  return normalizePath(joined, isWin);
}

/**
 * Resolve paths to absolute path
 */
export function resolvePaths(paths: string[], isWin: boolean): string {
  const separator = getSeparator(isWin);
  let resolved = '';
  let absolute = false;

  for (let index = paths.length - 1; index >= 0 && !absolute; index--) {
    const path = paths[index];
    if (path && path.length > 0) {
      resolved = path + (resolved.length > 0 ? separator + resolved : '');
      absolute = isWin ? isAbsoluteWin(resolved) : isAbsolutePosix(resolved);
    }
  }

  if (!absolute) {
    const cwd = getCwd();
    resolved = cwd + (resolved.length > 0 ? separator + resolved : '');
  }

  return normalizePath(resolved, isWin);
}

/**
 * Get relative path
 */
export function relativePath(from: string, to: string, isWin: boolean): string {
  const resolvedFrom = resolvePaths([from], isWin);
  const resolvedTo = resolvePaths([to], isWin);

  if (resolvedFrom === resolvedTo) return '';

  const separator = getSeparator(isWin);
  const fromParts = resolvedFrom.split(separator).filter((part) => part.length > 0);
  const toParts = resolvedTo.split(separator).filter((part) => part.length > 0);
  const minLength = Math.min(fromParts.length, toParts.length);
  let commonLength = 0;

  for (let index = 0; index < minLength; index++) {
    if (fromParts[index] === toParts[index]) {
      commonLength++;
    } else {
      break;
    }
  }

  const result: string[] = [];
  const upCount = fromParts.length - commonLength;

  for (let index = 0; index < upCount; index++) {
    result.push('..');
  }

  for (let index = commonLength; index < toParts.length; index++) {
    result.push(toParts[index]);
  }

  return result.join(separator) || '.';
}

/**
 * Get directory name
 */
export function getDirname(path: string, isWin: boolean): string {
  if (path.length === 0) return '.';

  const separator = getSeparator(isWin);
  const normalized = normalizePath(path, isWin);
  const lastSeparatorIndex = normalized.lastIndexOf(separator);

  if (lastSeparatorIndex === -1) return '.';
  if (lastSeparatorIndex === 0) return separator;

  return normalized.slice(0, lastSeparatorIndex);
}

/**
 * Get base name
 */
export function getBasename(path: string, ext?: string, isWin?: boolean): string {
  if (path.length === 0) return '';

  const lastSeparatorIndex = isWin ? findLastSeparator(path) : path.lastIndexOf('/');
  let base = lastSeparatorIndex === -1 ? path : path.slice(lastSeparatorIndex + 1);

  if (ext && base.endsWith(ext)) {
    base = base.slice(0, base.length - ext.length);
  }

  return base;
}

/**
 * Get extension name
 */
export function getExtname(path: string): string {
  const lastDotIndex = path.lastIndexOf('.');
  const lastSeparatorIndex = findLastSeparator(path);

  if (lastDotIndex === -1 || lastDotIndex < lastSeparatorIndex || lastDotIndex === path.length - 1) {
    return '';
  }

  return path.slice(lastDotIndex);
}

/**
 * Parse path into components
 */
export function parsePath(path: string, isWin: boolean): ParsedPath {
  let root = '';

  if (isWin) {
    if (path.length >= 2 && path[1] === ':') {
      root = path.slice(0, 2);
      if (path.length > 2 && (path[2] === '\\' || path[2] === '/')) {
        root += '\\';
      }
    } else if (path[0] === '\\' || path[0] === '/') {
      root = '\\';
    }
  } else if (path[0] === '/') {
    root = '/';
  }

  const dir = getDirname(path, isWin);
  const base = getBasename(path, undefined, isWin);
  const ext = getExtname(path);
  const name = ext ? base.slice(0, base.length - ext.length) : base;

  return { root, dir, base, ext, name };
}

/**
 * Format path from components
 */
export function formatPath(pathObject: FormatInputPathObject, isWin: boolean): string {
  const separator = getSeparator(isWin);
  const dir = pathObject.dir || pathObject.root || '';
  const base = pathObject.base || ((pathObject.name || '') + (pathObject.ext || ''));

  if (!dir) return base;
  if (dir === pathObject.root) return dir + base;

  return dir + separator + base;
}

/**
 * Helper: Create path operation object
 */
export function createPathOps(isWin: boolean) {
  return {
    sep: getSeparator(isWin),
    delimiter: isWin ? ';' : ':',
    normalize: (path: string) => normalizePath(path, isWin),
    join: (...paths: string[]) => joinPaths(paths, isWin),
    resolve: (...paths: string[]) => resolvePaths(paths, isWin),
    isAbsolute: (path: string) => isWin ? isAbsoluteWin(path) : isAbsolutePosix(path),
    relative: (from: string, to: string) => relativePath(from, to, isWin),
    dirname: (path: string) => getDirname(path, isWin),
    basename: (path: string, ext?: string) => getBasename(path, ext, isWin),
    extname: (path: string) => getExtname(path),
    parse: (path: string) => parsePath(path, isWin),
    format: (pathObject: FormatInputPathObject) => formatPath(pathObject, isWin),
  };
}