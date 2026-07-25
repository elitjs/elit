import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * Helper: Lazy-load http module classes.
 *
 * Uses `createRequire` (rather than a bare `require()`) so this resolves
 * correctly when the package is loaded as ESM — a bare `require('@elitjs/http')`
 * is left as a dynamic require by esbuild and throws under Node's ESM loader.
 */
export function loadHttpClasses(): { IncomingMessage: any; ServerResponse: any } {
  const httpModule = require('@elitjs/http');
  return {
    IncomingMessage: httpModule.IncomingMessage,
    ServerResponse: httpModule.ServerResponse,
  };
}
