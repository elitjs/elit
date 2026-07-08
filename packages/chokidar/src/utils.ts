import { existsSync, statSync } from '@elitjs/fs';
import { dirname } from '@elitjs/path';

import type { FSWatcher } from './watcher';

/**
 * Helper: Normalize path separators (eliminates duplication in path handling)
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

/**
 * Helper: Emit event and all event (eliminates duplication in event emitting)
 */
export function emitEvent(watcher: FSWatcher, eventType: string, path: string): void {
  watcher.emit(eventType, path);
  watcher.emit('all', eventType, path);
}

/**
 * Check if a path matches a glob pattern
 */
export function matchesPattern(filePath: string, pattern: string): boolean {
  const regexPattern = normalizePath(pattern)
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.');

  const regex = new RegExp(`^${regexPattern}$`);
  const normalizedPath = normalizePath(filePath);

  return regex.test(normalizedPath);
}

/**
 * Helper: Check if path matches any pattern (eliminates duplication in pattern matching)
 */
export function matchesAnyPattern(path: string, patterns: string[]): boolean {
  return patterns.some((pattern) => matchesPattern(path, pattern));
}

/**
 * Extract base directory from glob pattern
 * e.g., 'src/**\/*.ts' -> 'src', '**\/*.ts' -> '.'
 */
export function getBaseDirectory(pattern: string): string {
  const normalizedPattern = normalizePath(pattern);

  const parts = normalizedPattern.split(/[\\/]/);
  let baseDir = '';
  let sawGlob = false;

  for (const part of parts) {
    if (part.includes('*') || part.includes('?')) {
      sawGlob = true;
      break;
    }
    baseDir = baseDir ? `${baseDir}/${part}` : part;
  }

  if (sawGlob) {
    return baseDir || '.';
  }

  if (normalizedPattern && existsSync(normalizedPattern)) {
    try {
      return statSync(normalizedPattern).isDirectory()
        ? normalizedPattern
        : normalizePath(dirname(normalizedPattern)) || '.';
    } catch {
      return normalizePath(dirname(normalizedPattern)) || '.';
    }
  }

  const lastSegment = parts[parts.length - 1] || '';
  if (lastSegment.includes('.') && !lastSegment.startsWith('.')) {
    return normalizePath(dirname(normalizedPattern)) || '.';
  }

  return normalizedPattern || '.';
}