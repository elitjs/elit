import { isBun, isDeno, isNode } from '@elitjs/runtime';

/**
 * Helper: Get path separator for platform
 */
export function getSeparator(isWin: boolean): string {
  return isWin ? '\\' : '/';
}

/**
 * Helper: Get current working directory
 */
export function getCwd(): string {
  if (isNode || isBun) {
    return process.cwd();
  }

  if (isDeno) {
    // @ts-ignore
    return Deno.cwd();
  }

  return '/';
}

/**
 * Platform detection
 */
export const isWindows = (() => {
  if (isNode) {
    return process.platform === 'win32';
  }

  if (isDeno) {
    // @ts-ignore
    return Deno.build.os === 'windows';
  }

  return typeof process !== 'undefined' && process.platform === 'win32';
})();

/**
 * Path separator
 */
export const sep = isWindows ? '\\' : '/';

/**
 * Path delimiter
 */
export const delimiter = isWindows ? ';' : ':';