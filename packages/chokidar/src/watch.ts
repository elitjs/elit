import { createRequire } from 'node:module';
import { runtime } from '@elitjs/runtime';

const require = createRequire(import.meta.url);

import type { WatchOptions } from './types';
import { setupFsWatch } from './native-watch';
import { emitEvent, getBaseDirectory, matchesAnyPattern, normalizePath } from './utils';
import { FSWatcher } from './watcher';

function createWatchMap(paths: string[]): Map<string, string[]> {
  const watchMap = new Map<string, string[]>();

  paths.forEach((path) => {
    const baseDir = getBaseDirectory(path);
    if (!watchMap.has(baseDir)) {
      watchMap.set(baseDir, []);
    }
    watchMap.get(baseDir)!.push(path);
  });

  return watchMap;
}

function setupDenoWatch(
  watcher: FSWatcher,
  watchMap: Map<string, string[]>,
  pathArray: string[],
): void {
  const baseDirs = Array.from(watchMap.keys());
  const allPatterns = Array.from(watchMap.values()).flat();

  (async () => {
    try {
      // @ts-ignore
      const denoWatcher = Deno.watchFs(baseDirs);

      for await (const event of denoWatcher) {
        if (watcher._isClosed()) break;

        for (const path of event.paths) {
          const normalizedPath = normalizePath(path);

          if (!matchesAnyPattern(normalizedPath, allPatterns)) continue;

          switch (event.kind) {
            case 'create':
              emitEvent(watcher, 'add', path);
              break;
            case 'modify':
              emitEvent(watcher, 'change', path);
              break;
            case 'remove':
              emitEvent(watcher, 'unlink', path);
              break;
          }
        }
      }
    } catch (error) {
      if (!watcher._isClosed()) {
        watcher.emit('error', error as Error);
      }
    }
  })();

  pathArray.forEach((path) => watcher.add(path));
  queueMicrotask(() => watcher.emit('ready'));
}

/**
 * Watch files and directories
 */
export function watch(paths: string | string[], options?: WatchOptions): FSWatcher {
  const watcher = new FSWatcher(options);
  const pathArray = Array.isArray(paths) ? paths : [paths];
  const watchMap = createWatchMap(pathArray);

  if (runtime === 'node' || runtime === 'bun') {
    const fs = require('fs');
    watchMap.forEach((patterns, baseDir) => setupFsWatch(watcher, baseDir, patterns, fs));
  } else if (runtime === 'deno') {
    setupDenoWatch(watcher, watchMap, pathArray);
  }

  return watcher;
}

/**
 * Get current runtime
 */
export function getRuntime(): 'node' | 'bun' | 'deno' {
  return runtime;
}