import { EventEmitter } from 'events';

import { runtime } from '@elitjs/runtime';

import type { WatchOptions } from './types';

/**
 * FSWatcher class - Compatible with chokidar
 */
export class FSWatcher extends EventEmitter {
  private _watcher: any;
  private _closed = false;
  private _watched = new Set<string>();

  constructor(options?: WatchOptions) {
    super();
    this.options = options || {};
  }

  public options: WatchOptions;

  /**
   * Add paths to be watched
   */
  add(paths: string | string[]): FSWatcher {
    if (this._closed) {
      throw new Error('Watcher has been closed');
    }

    const pathArray = Array.isArray(paths) ? paths : [paths];

    if (this._watcher && typeof this._watcher.add === 'function') {
      this._watcher.add(pathArray);
    }

    if (runtime !== 'node' || !this._watcher || typeof this._watcher.add !== 'function') {
      pathArray.forEach((path) => this._trackWatchedPath(path));
    }

    return this;
  }

  /**
   * Stop watching paths
   */
  unwatch(paths: string | string[]): FSWatcher {
    if (this._closed) {
      return this;
    }

    const pathArray = Array.isArray(paths) ? paths : [paths];

    if (this._watcher && typeof this._watcher.unwatch === 'function') {
      this._watcher.unwatch(pathArray);
    }

    if (runtime !== 'node' || !this._watcher || typeof this._watcher.unwatch !== 'function') {
      pathArray.forEach((path) => this._untrackWatchedPath(path));
    }

    return this;
  }

  /**
   * Close the watcher
   */
  async close(): Promise<void> {
    if (this._closed) {
      return;
    }

    this._closed = true;

    if (this._watcher && typeof this._watcher.close === 'function') {
      await this._watcher.close();
    }

    this.removeAllListeners();
  }

  /**
   * Get watched paths
   */
  getWatched(): { [directory: string]: string[] } {
    if (this._watcher && typeof this._watcher.getWatched === 'function') {
      return this._watcher.getWatched();
    }

    const result: { [directory: string]: string[] } = {};
    this._watched.forEach((path) => {
      const dir = path.substring(0, path.lastIndexOf('/')) || '.';
      const file = path.substring(path.lastIndexOf('/') + 1);
      if (!result[dir]) {
        result[dir] = [];
      }
      result[dir].push(file);
    });

    return result;
  }

  /**
   * Internal method to set native watcher
   * @internal
   */
  _setWatcher(watcher: any): void {
    this._watcher = watcher;
  }

  /**
   * Internal method to track watched paths
   * @internal
   */
  _trackWatchedPath(path: string): void {
    this._watched.add(path);
  }

  /**
   * Internal method to untrack watched paths
   * @internal
   */
  _untrackWatchedPath(path: string): void {
    this._watched.delete(path);
  }

  /**
   * Internal method to read closed state
   * @internal
   */
  _isClosed(): boolean {
    return this._closed;
  }
}