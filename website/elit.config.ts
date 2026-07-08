import type { ElitConfig } from '@elitjs/config';

const rewriteScriptSrc = (content: string): string =>
    content.replace(/src="\/src\/main\.ts"/g, 'src="/index.js"');

const buildAlias = {
    '@elitjs/core': '../packages/core/dist/index.mjs',
    '@elitjs/devtools': '../packages/devtools/dist/index.mjs',
    '@elitjs/render-context': '../packages/render-context/dist/index.mjs',
    '@elitjs/dom': '../packages/dom/dist/index.mjs',
    '@elitjs/el': '../packages/el/dist/index.mjs',
    '@elitjs/router': '../packages/router/dist/index.mjs',
    '@elitjs/state': '../packages/state/dist/index.mjs',
    '@elitjs/style': '../packages/style/dist/index.mjs',
};

const config: ElitConfig = {
    dev: {
        port: 5180,
        open: false,
        root: '.',
    },
    build: {
        entry: 'src/main.ts',
        outDir: 'dist',
        outFile: 'index.js',
        format: 'esm',
        platform: 'browser',
        target: 'es2022',
        minify: true,
        sourcemap: false,
        resolve: { alias: buildAlias },
        copy: [
            { from: 'index.html', to: 'index.html', transform: rewriteScriptSrc },
            { from: 'favicon.svg', to: 'favicon.svg' },
        ],
    },
    preview: {
        port: 5181,
        open: false,
    },
};

export default config;
