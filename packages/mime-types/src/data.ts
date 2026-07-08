/**
 * Common MIME type mappings (for Bun/Deno)
 * Lightweight version with most common types
 */
const MIME_TYPES: Record<string, string> = {
  // Text
  'txt': 'text/plain',
  'html': 'text/html',
  'htm': 'text/html',
  'css': 'text/css',
  'js': 'text/javascript',
  'mjs': 'text/javascript',
  'json': 'application/json',
  'xml': 'application/xml',
  'csv': 'text/csv',
  'md': 'text/markdown',
  'markdown': 'text/x-markdown',

  // Images
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'gif': 'image/gif',
  'svg': 'image/svg+xml',
  'webp': 'image/webp',
  'ico': 'image/x-icon',
  'bmp': 'image/bmp',
  'tiff': 'image/tiff',
  'tif': 'image/tiff',

  // Audio
  'mp3': 'audio/mpeg',
  'wav': 'audio/wav',
  'ogg': 'audio/ogg',
  'aac': 'audio/aac',
  'm4a': 'audio/mp4',
  'flac': 'audio/flac',

  // Video
  'mp4': 'video/mp4',
  'webm': 'video/webm',
  'avi': 'video/x-msvideo',
  'mov': 'video/quicktime',
  'mkv': 'video/x-matroska',
  'flv': 'video/x-flv',

  // Application
  'pdf': 'application/pdf',
  'zip': 'application/zip',
  'gz': 'application/gzip',
  'tar': 'application/x-tar',
  'rar': 'application/x-rar-compressed',
  '7z': 'application/x-7z-compressed',

  // Documents
  'doc': 'application/msword',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'xls': 'application/vnd.ms-excel',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'ppt': 'application/vnd.ms-powerpoint',
  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  // Fonts
  'woff': 'font/woff',
  'woff2': 'font/woff2',
  'ttf': 'font/ttf',
  'otf': 'font/otf',
  'eot': 'application/vnd.ms-fontobject',

  // Web
  'wasm': 'application/wasm',
  'manifest': 'application/manifest+json',

  // Binary
  'bin': 'application/octet-stream',
  'exe': 'application/x-msdownload',
  'dll': 'application/x-msdownload',

  // TypeScript/Modern JS
  'ts': 'text/typescript',
  'tsx': 'text/tsx',
  'jsx': 'text/jsx',
};

/**
 * Reverse mapping: MIME type to extensions
 */
const TYPE_TO_EXTENSIONS: Record<string, string[]> = {};
for (const ext in MIME_TYPES) {
  const type = MIME_TYPES[ext];
  if (!TYPE_TO_EXTENSIONS[type]) {
    TYPE_TO_EXTENSIONS[type] = [];
  }
  TYPE_TO_EXTENSIONS[type].push(ext);
}

/**
 * Charset mappings
 */
const CHARSETS: Record<string, string> = {
  'text/plain': 'UTF-8',
  'text/html': 'UTF-8',
  'text/css': 'UTF-8',
  'text/javascript': 'UTF-8',
  'application/json': 'UTF-8',
  'application/xml': 'UTF-8',
  'text/csv': 'UTF-8',
  'text/markdown': 'UTF-8',
  'text/x-markdown': 'UTF-8',
  'text/typescript': 'UTF-8',
  'text/tsx': 'UTF-8',
  'text/jsx': 'UTF-8',
  'application/javascript': 'UTF-8',
};

export { CHARSETS, MIME_TYPES, TYPE_TO_EXTENSIONS };
export const types = MIME_TYPES;