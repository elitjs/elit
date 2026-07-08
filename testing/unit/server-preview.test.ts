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

describe('preview server root resolution', () => {
    it('serves built index.html before SSR at the root path in preview mode', async () => {
        const tempDirectory = fs.mkdtempSync(join(os.tmpdir(), 'elit-preview-server-'));
        const indexHtml = '<!doctype html><html><head><title>Built Index</title></head><body><div id="app"></div><script type="module" src="main.js"></script></body></html>';
        const ssrHtml = '<!doctype html><html><head><title>SSR</title></head><body><div id="app"></div><script type="module" src="/src/main.js"></script></body></html>';

        try {
            fs.writeFileSync(join(tempDirectory, 'index.html'), indexHtml);
            fs.writeFileSync(join(tempDirectory, 'main.js'), 'console.log("built preview");\n');

            const devServer = createDevServer({
                port: 0,
                host: '127.0.0.1',
                logging: false,
                open: false,
                root: tempDirectory,
                ssr: () => ssrHtml,
                mode: 'preview',
            });

            try {
                await waitForListening(devServer.server as any);

                const address = (devServer.server as any).address();
                const port = typeof address === 'object' && address ? address.port : 0;
                const response = await fetch(`http://127.0.0.1:${port}/`);
                const html = await response.text();

                expect(response.status).toBe(200);
                expect(html).toContain('<title>Built Index</title>');
                expect(html).toContain('src="main.js"');
                expect(html).not.toContain('/src/main.js');
                expect(html).not.toContain('<title>SSR</title>');
            } finally {
                await devServer.close();
            }
        } finally {
            fs.rmSync(tempDirectory, { recursive: true, force: true });
        }
    });
});