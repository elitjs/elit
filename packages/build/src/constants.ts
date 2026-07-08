import type { BuildOptions } from './contracts';

export const defaultOptions: Omit<BuildOptions, 'entry'> = {
    outDir: 'dist',
    minify: true,
    sourcemap: false,
    target: 'es2020',
    format: 'esm',
    treeshake: true,
    logging: true,
    external: [],
};