/**
 * MIME Types module with unified API across runtimes
 * Pure implementation without external dependencies
 * Compatible with 'mime-types' package API
 * Works on Node.js, Bun, and Deno
 */

import { charset, contentType, extension, extensions, getRuntime, lookup } from './api';
import { types } from './data';

export { charset, contentType, extension, extensions, getRuntime, lookup, types };

export default {
  lookup,
  extension,
  extensions,
  charset,
  contentType,
  types,
  getRuntime,
};
