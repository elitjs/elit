// Demonstrates top-level resolve.alias (added in 3.6.9 → 3.7.0).
// `@` becomes an alias for ./src, so `import { x } from '@/utils/math'`
// resolves to ./src/utils/math.ts in both dev and build.
import { defineConfig } from 'elit/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': './src',
    },
  },
  dev: {
    port: 3057,
    host: 'localhost',
    open: false,
    logging: true,
    root: '.',
  },
  preview: {
    port: 3058,
    host: 'localhost',
    open: false,
    logging: true,
    root: '.',
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
