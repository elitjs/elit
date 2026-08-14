import { defineConfig } from '@elitjs/config';

export default defineConfig({
  dev: {
    port: 3060,
    host: 'localhost',
    open: false,
    logging: true,
    root: '.',
  },
  preview: {
    port: 3061,
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
