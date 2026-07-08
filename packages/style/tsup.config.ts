import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm', 'iife'],
  dts: true,
  clean: true,
  minify: false,
  shims: true,
  target: 'es2020',
  outExtension({ format }) {
    if (format === 'cjs') return { js: '.cjs', dts: '.d.ts' };
    if (format === 'iife') return { js: '.iife.js', dts: '.d.ts' };
    return { js: '.mjs', dts: '.d.ts' };
  }
});
