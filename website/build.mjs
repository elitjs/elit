import { mkdir, readFile, rm, writeFile, copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const websiteDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(websiteDir, '..');
const distDir = resolve(websiteDir, 'dist');

const aliasMap = {
    '@elitjs/core': resolve(repoRoot, 'packages/core/src/index.ts'),
    '@elitjs/devtools': resolve(repoRoot, 'packages/devtools/src/index.ts'),
    '@elitjs/dom': resolve(repoRoot, 'packages/dom/src/index.ts'),
    '@elitjs/el': resolve(repoRoot, 'packages/el/src/index.ts'),
    '@elitjs/render-context': resolve(repoRoot, 'packages/render-context/src/index.ts'),
    '@elitjs/router': resolve(repoRoot, 'packages/router/src/index.ts'),
    '@elitjs/state': resolve(repoRoot, 'packages/state/src/index.ts'),
    '@elitjs/style': resolve(repoRoot, 'packages/style/src/index.ts'),
};

const aliasPlugin = {
    name: 'elit-source-alias',
    setup(buildApi) {
        buildApi.onResolve({ filter: /^@elitjs\// }, (args) => {
            const resolved = aliasMap[args.path];
            if (!resolved) {
                return null;
            }
            return { path: resolved };
        });
    },
};

const rewriteScriptSrc = (content) => content.replace(/src="\/src\/main\.ts"/g, 'src="/index.js"');

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

await build({
    absWorkingDir: websiteDir,
    bundle: true,
    entryPoints: [resolve(websiteDir, 'src/main.ts')],
    format: 'esm',
    minify: true,
    outfile: resolve(distDir, 'index.js'),
    platform: 'browser',
    plugins: [aliasPlugin],
    sourcemap: false,
    target: 'es2022',
});

const indexHtml = await readFile(resolve(websiteDir, 'index.html'), 'utf8');
await writeFile(resolve(distDir, 'index.html'), rewriteScriptSrc(indexHtml));
await copyFile(resolve(repoRoot, 'favicon.svg'), resolve(distDir, 'favicon.svg'));
