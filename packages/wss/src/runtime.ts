import { runtime } from '@elitjs/runtime';

/**
 * Get current runtime.
 */
export function getRuntime(): 'node' | 'bun' | 'deno' {
  return runtime;
}