import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/contracts.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  minify: false,
  shims: true,
  target: 'es2020',
  platform: 'node',
  external: ['esbuild', 'source-map', 'v8', 'bun'],
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.mjs',
      dts: '.d.ts'
    };
  }
});
