import type { ElitConfig } from '@elitjs/config';
import type { BuildOptions } from '@elitjs/build';

const rewriteScriptSrc = (content: string, config: BuildOptions): string => {
    let html = content.replace('src="./src/main.ts"', 'src="./index.js"');
    if (config.basePath) {
            const normalizedBase = config.basePath.endsWith('/')
                ? config.basePath.slice(0, -1)
                : config.basePath;
            const baseTag = `<base href="${normalizedBase}/">`;
            html = html.replace(
              '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
              `<meta name="viewport" content="width=device-width, initial-scale=1.0">\n  ${baseTag}`
            );
    }
    return html;
};

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
        basePath: '/elit/',
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
        basePath: '/elit/',
        resolve: { alias: buildAlias },
        copy: [
            { from: 'index.html', to: 'index.html', transform: rewriteScriptSrc },
            { from: 'favicon.svg', to: 'favicon.svg' },
        ],
    },
    preview: {
        port: 5181,
        open: false,
        root: 'dist',
        basePath: '/elit/',
    },
};

export default config;
