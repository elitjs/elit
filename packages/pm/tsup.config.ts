import { defineConfig, type Format, type Options } from 'tsup';

const createBundleFormats = (): Format[] => ['cjs', 'esm'];

const sharedOptions = {
    dts: true,
    clean: false,
    minify: false,
    splitting: false,
    treeshake: false,
    sourcemap: false,
    target: 'es2020',
    platform: 'node' as const,
    external: ['esbuild', 'source-map', 'v8', 'bun'],
} satisfies Options;

export default defineConfig([
    {
        ...sharedOptions,
        entry: {
            index: 'src/index.ts',
        },
        format: createBundleFormats(),
        outExtension({ format }: { format: string }) {
            return {
                js: format === 'cjs' ? '.cjs' : '.mjs',
                dts: '.d.ts',
            };
        },
    },
    {
        ...sharedOptions,
        entry: {
            cli: 'src/cli.ts',
        },
        format: createBundleFormats(),
        banner() {
            return {
                js: '#!/usr/bin/env node',
            };
        },
        outExtension({ format }: { format: string }) {
            return {
                js: format === 'cjs' ? '.cjs' : '.js',
                dts: '.d.ts',
            };
        },
    },
]);
