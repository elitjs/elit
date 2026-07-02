/// <reference path="../../src/test-globals.d.ts" />

import fs from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';

import { createDevServer } from '../../src/server';

async function waitForListening(server: any): Promise<void> {
    if (server.listening) {
        return;
    }

    await new Promise<void>((resolve) => {
        server.once('listening', resolve);
    });
}

const HTML_ACCEPT = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';

function setupSpaRoot(tempDir: string): string {
    const root = join(tempDir, 'app');
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(
        join(root, 'index.html'),
        '<!doctype html><html><head><title>SPA</title></head><body><div id="app"></div><script type="module" src="/src/main.ts"></script></body></html>',
    );
    fs.mkdirSync(join(root, 'src'), { recursive: true });
    fs.writeFileSync(join(root, 'src', 'main.ts'), 'console.log("spa-entry");\n');
    return root;
}

describe('dev server SPA history fallback', () => {
    it('serves index.html for a navigation request to a missing path', async () => {
        const tempDir = fs.mkdtempSync(join(os.tmpdir(), 'elit-history-'));
        const root = setupSpaRoot(tempDir);

        const devServer = createDevServer({
            port: 0,
            host: '127.0.0.1',
            logging: false,
            open: false,
            root,
            mode: 'dev',
        });

        try {
            await waitForListening(devServer.server as any);
            const address = (devServer.server as any).address();
            const port = typeof address === 'object' && address ? address.port : 0;

            const res = await fetch(`http://127.0.0.1:${port}/about`, {
                headers: { Accept: HTML_ACCEPT },
            });

            expect(res.status).toBe(200);
            const body = await res.text();
            expect(body).toContain('<title>SPA</title>');
            expect(body).toContain('<div id="app"></div>');
        } finally {
            await devServer.close();
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it('still 404s for missing asset extensions', async () => {
        const tempDir = fs.mkdtempSync(join(os.tmpdir(), 'elit-history-asset-'));
        const root = setupSpaRoot(tempDir);

        const devServer = createDevServer({
            port: 0,
            host: '127.0.0.1',
            logging: false,
            open: false,
            root,
            mode: 'dev',
        });

        try {
            await waitForListening(devServer.server as any);
            const address = (devServer.server as any).address();
            const port = typeof address === 'object' && address ? address.port : 0;

            const res = await fetch(`http://127.0.0.1:${port}/missing.js`);
            expect(res.status).toBe(404);
        } finally {
            await devServer.close();
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it('does not fall back for non-HTML Accept headers', async () => {
        const tempDir = fs.mkdtempSync(join(os.tmpdir(), 'elit-history-json-'));
        const root = setupSpaRoot(tempDir);

        const devServer = createDevServer({
            port: 0,
            host: '127.0.0.1',
            logging: false,
            open: false,
            root,
            mode: 'dev',
        });

        try {
            await waitForListening(devServer.server as any);
            const address = (devServer.server as any).address();
            const port = typeof address === 'object' && address ? address.port : 0;

            const res = await fetch(`http://127.0.0.1:${port}/about`, {
                headers: { Accept: 'application/json' },
            });
            expect(res.status).toBe(404);
        } finally {
            await devServer.close();
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it('falls back to SSR output when ssr is configured', async () => {
        const tempDir = fs.mkdtempSync(join(os.tmpdir(), 'elit-history-ssr-'));
        const root = setupSpaRoot(tempDir);

        const devServer = createDevServer({
            port: 0,
            host: '127.0.0.1',
            logging: false,
            open: false,
            root,
            ssr: () => '<!doctype html><html><body>SSR-MARKER-ABOUT</body></html>',
            mode: 'dev',
        });

        try {
            await waitForListening(devServer.server as any);
            const address = (devServer.server as any).address();
            const port = typeof address === 'object' && address ? address.port : 0;

            const res = await fetch(`http://127.0.0.1:${port}/about`, {
                headers: { Accept: HTML_ACCEPT },
            });
            expect(res.status).toBe(200);
            expect(await res.text()).toContain('SSR-MARKER-ABOUT');
        } finally {
            await devServer.close();
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it('returns 404 when historyApiFallback is disabled', async () => {
        const tempDir = fs.mkdtempSync(join(os.tmpdir(), 'elit-history-off-'));
        const root = setupSpaRoot(tempDir);

        const devServer = createDevServer({
            port: 0,
            host: '127.0.0.1',
            logging: false,
            open: false,
            root,
            historyApiFallback: false,
            mode: 'dev',
        });

        try {
            await waitForListening(devServer.server as any);
            const address = (devServer.server as any).address();
            const port = typeof address === 'object' && address ? address.port : 0;

            const res = await fetch(`http://127.0.0.1:${port}/about`, {
                headers: { Accept: HTML_ACCEPT },
            });
            expect(res.status).toBe(404);
        } finally {
            await devServer.close();
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it('respects basePath in multi-client setups', async () => {
        const tempDir = fs.mkdtempSync(join(os.tmpdir(), 'elit-history-multi-'));
        const root = setupSpaRoot(tempDir);

        const devServer = createDevServer({
            port: 0,
            host: '127.0.0.1',
            logging: false,
            open: false,
            clients: [{ root, basePath: '/app' }],
            mode: 'dev',
        });

        try {
            await waitForListening(devServer.server as any);
            const address = (devServer.server as any).address();
            const port = typeof address === 'object' && address ? address.port : 0;

            const res = await fetch(`http://127.0.0.1:${port}/app/about`, {
                headers: { Accept: HTML_ACCEPT },
            });
            expect(res.status).toBe(200);
            const body = await res.text();
            expect(body).toContain('<title>SPA</title>');
        } finally {
            await devServer.close();
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it('falls back for paths with .html extension', async () => {
        const tempDir = fs.mkdtempSync(join(os.tmpdir(), 'elit-history-htmlext-'));
        const root = setupSpaRoot(tempDir);

        const devServer = createDevServer({
            port: 0,
            host: '127.0.0.1',
            logging: false,
            open: false,
            root,
            mode: 'dev',
        });

        try {
            await waitForListening(devServer.server as any);
            const address = (devServer.server as any).address();
            const port = typeof address === 'object' && address ? address.port : 0;

            const res = await fetch(`http://127.0.0.1:${port}/users/123.html`, {
                headers: { Accept: HTML_ACCEPT },
            });
            expect(res.status).toBe(200);
            expect(await res.text()).toContain('<title>SPA</title>');
        } finally {
            await devServer.close();
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });
});
