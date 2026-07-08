/// <reference path="../../packages/test/src/globals.d.ts" />

import fs from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';

import { createDevServer } from '../../packages/server/src';

async function waitForListening(server: any): Promise<void> {
    if (server.listening) {
        return;
    }

    await new Promise<void>((resolve) => {
        server.once('listening', resolve);
    });
}

describe('dev server standalone fallback root', () => {
    it('serves built assets when the primary source root is unavailable', async () => {
        const tempDirectory = fs.mkdtempSync(join(os.tmpdir(), 'elit-dev-fallback-'));
        const sourceRoot = join(tempDirectory, 'app');
        const fallbackRoot = join(tempDirectory, 'dist');

        fs.mkdirSync(sourceRoot, { recursive: true });
        fs.mkdirSync(fallbackRoot, { recursive: true });
        fs.writeFileSync(join(fallbackRoot, 'index.html'), '<!doctype html><html><head><title>Built Dev</title></head><body><div id="app"></div><script type="module" src="main.js"></script></body></html>');
        fs.writeFileSync(join(fallbackRoot, 'main.js'), 'console.log("built-dev");\n');

        const devServer = createDevServer({
            port: 0,
            host: '127.0.0.1',
            logging: false,
            open: false,
            root: sourceRoot,
            fallbackRoot,
            ssr: () => '<!doctype html><html><body><script type="module" src="/src/main.js"></script></body></html>',
            mode: 'dev',
        });

        try {
            await waitForListening(devServer.server as any);

            const address = (devServer.server as any).address();
            const port = typeof address === 'object' && address ? address.port : 0;
            const htmlResponse = await fetch(`http://127.0.0.1:${port}/`);
            const html = await htmlResponse.text();
            const assetResponse = await fetch(`http://127.0.0.1:${port}/main.js`);

            expect(htmlResponse.status).toBe(200);
            expect(html).toContain('<title>Built Dev</title>');
            expect(html).toContain('src="main.js"');
            expect(html).not.toContain('/src/main.js');
            expect(assetResponse.status).toBe(200);
        } finally {
            await devServer.close();
            fs.rmSync(tempDirectory, { recursive: true, force: true });
        }
    });

    it('serves missing built assets from the fallback root while keeping SSR and public assets on the primary root', async () => {
        const tempDirectory = fs.mkdtempSync(join(os.tmpdir(), 'elit-dev-fallback-mixed-'));
        const sourceRoot = join(tempDirectory, 'app');
        const fallbackRoot = join(tempDirectory, 'dist');

        fs.mkdirSync(join(sourceRoot, 'public'), { recursive: true });
        fs.mkdirSync(fallbackRoot, { recursive: true });
        fs.writeFileSync(join(sourceRoot, 'public', 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
        fs.writeFileSync(join(fallbackRoot, 'main.js'), 'console.log("built-dev-fallback");\n');

        const devServer = createDevServer({
            port: 0,
            host: '127.0.0.1',
            logging: false,
            open: false,
            root: sourceRoot,
            fallbackRoot,
            ssr: () => '<!doctype html><html><head><title>SSR Asset Fallback</title><link rel="icon" href="public/favicon.svg"></head><body><div id="app"></div><script type="module" src="/main.js"></script></body></html>',
            mode: 'dev',
        });

        try {
            await waitForListening(devServer.server as any);

            const address = (devServer.server as any).address();
            const port = typeof address === 'object' && address ? address.port : 0;
            const htmlResponse = await fetch(`http://127.0.0.1:${port}/`);
            const html = await htmlResponse.text();
            const assetResponse = await fetch(`http://127.0.0.1:${port}/main.js`);
            const faviconResponse = await fetch(`http://127.0.0.1:${port}/public/favicon.svg`);

            expect(htmlResponse.status).toBe(200);
            expect(html).toContain('<title>SSR Asset Fallback</title>');
            expect(html).toContain('src="/main.js"');
            expect(assetResponse.status).toBe(200);
            expect(await assetResponse.text()).toContain('built-dev-fallback');
            expect(faviconResponse.status).toBe(200);
        } finally {
            await devServer.close();
            fs.rmSync(tempDirectory, { recursive: true, force: true });
        }
    });
});