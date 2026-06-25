// This config demonstrates the `elit/config` subpath export (added in 3.6.9)
// and the `blockFiles` option for `dev` and `preview` (also added in 3.6.9).
//
// `defineConfig` is imported from the `elit/config` subpath. If this resolves,
// it proves the new subpath export is wired up correctly.
import { defineConfig } from 'elit/config';

// When you set `blockFiles`, you REPLACE the defaults — they are not merged.
// To keep the default sensitive-file protection while adding your own patterns,
// repeat the defaults and append your own. The list below mirrors the
// documented defaults and adds `secrets/**` so anything under ./secrets/
// is also blocked.
const DEFAULT_BLOCK_FILES = [
  '.env',
  '.env.*',
  '*.pem',
  '*.key',
  '*.p12',
  '*.pfx',
  '.git/**',
  '.htaccess',
  'docker-compose.yml',
  'docker-compose.yaml',
  'Dockerfile',
];

export default defineConfig({
  dev: {
    port: 3055,
    host: 'localhost',
    open: false,
    logging: true,
    root: '.',
    blockFiles: [...DEFAULT_BLOCK_FILES, 'secrets/**'],
  },
  preview: {
    port: 3056,
    host: 'localhost',
    open: false,
    logging: true,
    root: '.',
    blockFiles: [...DEFAULT_BLOCK_FILES, 'secrets/**'],
  },
  build: {
    entry: './src/main.ts',
    outDir: './dist',
    outFile: 'main.js',
    format: 'esm',
    sourcemap: false,
    minify: false,
  },
});
