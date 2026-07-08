import { runtime } from '@elitjs/runtime';
import { CHARSETS, MIME_TYPES, TYPE_TO_EXTENSIONS } from './data';
import { getExtension, normalizeMimeType } from './utils';

/**
 * Lookup MIME type from file path or extension
 */
export function lookup(path: string): string | false {
  const ext = getExtension(path) || path.toLowerCase();
  return MIME_TYPES[ext] || false;
}

/**
 * Get the default extension for a MIME type
 */
export function extension(type: string): string | false {
  const normalized = normalizeMimeType(type);
  const exts = TYPE_TO_EXTENSIONS[normalized];
  return exts && exts.length > 0 ? exts[0] : false;
}

/**
 * Get all extensions for a MIME type
 */
export function extensions(type: string): string[] | undefined {
  const normalized = normalizeMimeType(type);
  return TYPE_TO_EXTENSIONS[normalized];
}

/**
 * Get the default charset for a MIME type
 */
export function charset(type: string): string | false {
  const normalized = normalizeMimeType(type);
  return CHARSETS[normalized] || false;
}

/**
 * Create a full Content-Type header value
 */
export function contentType(typeOrExt: string): string | false {
  let type: string | false;
  if (typeOrExt.includes('/')) {
    type = typeOrExt;
  } else {
    type = lookup(typeOrExt);
    if (!type) return false;
  }

  const normalized = normalizeMimeType(type);
  const charsetValue = CHARSETS[normalized];

  if (charsetValue) {
    return `${normalized}; charset=${charsetValue.toLowerCase()}`;
  }

  return normalized;
}

/**
 * Get current runtime
 */
export function getRuntime(): 'node' | 'bun' | 'deno' {
  return runtime;
}