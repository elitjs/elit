/// <reference path="../../packages/test/src/globals.d.ts" />

import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ServerRouter } from '../../packages/server/src';
import { openE2EPage, startE2EServer, withE2EPage } from '../../packages/e2e/src';

function createPageRouter(): ServerRouter {
    const router = new ServerRouter();

    router.get('/', (_req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.end(`<!DOCTYPE html>
            <html>
              <body>
                <h1>Elit E2E</h1>
                <button id="count">Clicked 0 times</button>
                <script>
                  let clicks = 0;
                  document.getElementById('count').addEventListener('click', () => {
                    clicks++;
                    document.getElementById('count').textContent = 'Clicked ' + clicks + ' times';
                  });
                </script>
              </body>
            </html>`);
    });

    router.get('/api/data', (_req, res) => {
        res.json({ ok: true });
    });

    return router;
}

const browserAvailable = (() => {
    if (process.env.ELIT_E2E_BROWSER) return true;
    const candidates = [
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    ];
    return candidates.some((candidate) => existsSync(candidate));
})();

const runBrowserTests = browserAvailable ? describe : describe.skip;

runBrowserTests('e2e browser page (CDP)', () => {
    it('navigates to the app and reads text content', async () => {
        await withE2EPage(createPageRouter, async (page) => {
            await page.goto('/');
            expect(await page.textContent('h1')).toBe('Elit E2E');
        });
    }, 60000);

    it('captures a png screenshot', async () => {
        const screenshotPath = join(tmpdir(), `elit-e2e-shot-${Date.now()}.png`);
        await withE2EPage(createPageRouter, async (page) => {
            await page.goto('/');
            const buffer = await page.screenshot({ path: screenshotPath });
            expect(buffer.length).toBeGreaterThan(1000);
            expect(buffer.subarray(1, 4).toString()).toBe('PNG');
        });
        rmSync(screenshotPath, { force: true });
    }, 60000);

    it('clicks elements and observes the dom change', async () => {
        await withE2EPage(createPageRouter, async (page) => {
            await page.goto('/');
            await page.click('#count');
            await page.click('#count');
            expect(await page.textContent('#count')).toBe('Clicked 2 times');
        });
    }, 60000);

    it('fills inputs and evaluates expressions', async () => {
        const router = new ServerRouter();
        router.get('/', (_req, res) => {
            res.setHeader('Content-Type', 'text/html');
            res.end('<!DOCTYPE html><html><body><input id="name"><span id="out"></span></body></html>');
        });

        const app = await startE2EServer(router);
        const page = await openE2EPage(app);
        try {
            await page.goto('/');
            await page.fill('#name', 'elit');
            await page.evaluate(`document.getElementById('out').textContent = document.getElementById('name').value`);
            expect(await page.textContent('#out')).toBe('elit');
            expect(await page.evaluate<string>('document.title')).toBeDefined();
        } finally {
            await page.close();
        }
    }, 60000);
});
