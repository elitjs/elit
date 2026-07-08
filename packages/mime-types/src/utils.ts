/**
 * Get the extension from a path
 */
export function getExtension(path: string): string {
  const match = /\.([^./\\]+)$/.exec(path);
  return match ? match[1].toLowerCase() : '';
}

/**
 * Normalize MIME type (remove parameters)
 */
export function normalizeMimeType(type: string): string {
  const match = /^([^;\s]+)/.exec(type);
  return match ? match[1].toLowerCase() : '';
}