/**
 * Client-side HMR runtime for Elit
 * Import this in your app to enable hot module replacement
 */

import { ElitHMR } from './client';
import { isBrowserRuntime } from './utils';

export type { HMRClient } from './types';

// Create singleton instance
const hmr = new ElitHMR();

// Expose globally
if (isBrowserRuntime()) {
  window.__ELIT_HMR__ = hmr;
}

export default hmr;
