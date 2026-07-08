import type { FSWatcher } from './watcher';
import { emitEvent, matchesAnyPattern, normalizePath } from './utils';

type NativeFsLike = {
  statSync(path: string): unknown;
  watch(
    path: string,
    options: { recursive: boolean },
    listener: (eventType: string, filename: string) => void,
  ): any;
};

/**
 * Helper: Handle rename event (eliminates duplication in rename handling)
 */
function handleRenameEvent(watcher: FSWatcher, fullPath: string, fs: NativeFsLike): void {
  try {
    fs.statSync(fullPath);
    emitEvent(watcher, 'add', fullPath);
  } catch {
    emitEvent(watcher, 'unlink', fullPath);
  }
}

/**
 * Helper: Setup fs.watch for Node.js/Bun (eliminates duplication in watcher setup)
 */
export function setupFsWatch(
  watcher: FSWatcher,
  baseDir: string,
  patterns: string[],
  fs: NativeFsLike,
): void {
  try {
    const nativeWatcher = fs.watch(baseDir, { recursive: true }, (eventType: string, filename: string) => {
      if (!filename) return;

      const fullPath = normalizePath(`${baseDir}/${filename}`);

      if (!matchesAnyPattern(fullPath, patterns)) return;

      if (eventType === 'rename') {
        handleRenameEvent(watcher, fullPath, fs);
      } else if (eventType === 'change') {
        emitEvent(watcher, 'change', fullPath);
      }
    });

    watcher._setWatcher(nativeWatcher);
    watcher._trackWatchedPath(baseDir);

    queueMicrotask(() => watcher.emit('ready'));
  } catch (error) {
    watcher.emit('error', error as Error);
  }
}