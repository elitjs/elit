import { defineConfig, type Format, type Options } from 'tsup';

const createBundleFormats = (): Format[] => ['cjs', 'esm'];
const getCliExtension = (format: string) => (format === 'cjs' ? '.cjs' : '.mjs');

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
    outExtension({ format }: { format: string }) {
        return {
            js: getCliExtension(format),
            dts: '.d.ts',
        };
    },
} satisfies Options;

export default defineConfig([
    {
        ...sharedOptions,
        entry: {
            index: 'src/index.ts',
        },
        format: createBundleFormats(),
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
