/**
 * File watcher module with unified API across runtimes
 * Pure implementation without external dependencies
 * Compatible with 'chokidar' package API
 * - Node.js: uses native fs.watch
 * - Bun: uses native fs.watch with enhancements
 * - Deno: uses Deno.watchFs
 */

import { getRuntime, watch } from './watch';
import { FSWatcher } from './watcher';

export type { WatchOptions } from './types';
export { getRuntime, watch, FSWatcher };

export default {
  watch,
  FSWatcher,
  getRuntime,
};
