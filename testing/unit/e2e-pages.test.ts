/// <reference path="../../packages/test/src/globals.d.ts" />

import { existsSync } from 'node:fs';

import { ServerRouter } from '../../packages/server/src';
import { expectSelector, openE2EPage, startE2EServer } from '../../packages/e2e/src';

function createRouter(): ServerRouter {
    const router = new ServerRouter();

    router.get('/', (_req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.end(`<!DOCTYPE html>
            <html>
              <body>
                <h1>Main page</h1>
                <a id="open-popup" href="/popup" target="_blank">Open popup</a>
              </body>
            </html>`);
    });

    router.get('/popup', (_req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.end(`<!DOCTYPE html>
            <html>
              <body>
                <h1>Popup page</h1>
              </body>
            </html>`);
    });

    return router;
}

const browserAvailable = (() => {
    if (process.env.ELIT_E2E_BROWSER) return true;
    return [
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    ].some((candidate) => existsSync(candidate));
})();

const runBrowserTests = browserAvailable ? describe : describe.skip;

runBrowserTests('multi-page support', () => {
    it('newPage opens an independent tab in the same browser', async () => {
        const app = await startE2EServer(createRouter());
        const page = await openE2EPage(app);
        try {
            await page.goto('/');
            const second = await page.newPage();
            try {
                await second.goto('/popup');
                expect(await second.textContent('h1')).toBe('Popup page');
                // pages are independent — the first one still sees its own document
                expect(await page.textContent('h1')).toBe('Main page');
                expect(await page.evaluate<string>('location.pathname')).toBe('/');
                expect(await second.evaluate<string>('location.pathname')).toBe('/popup');
            } finally {
                // closing a sibling must not kill the root page
                await second.close();
            }
            expect(await page.textContent('h1')).toBe('Main page');
        } finally {
            await page.close();
        }
    }, 60000);

    it('waitForPopup captures window.open targets', async () => {
        const app = await startE2EServer(createRouter());
        const page = await openE2EPage(app);
        try {
            await page.goto('/');
            const popupPromise = page.waitForPopup(10000);
            await page.click('#open-popup');
            const popup = await popupPromise;

            // The popup auto-navigates to its href — wait for it to settle.
            await expectSelector(popup, 'h1').toHaveText('Popup page');
            await popup.close();
        } finally {
            await page.close();
        }
    }, 60000);

    it('closing the root page tears down siblings', async () => {
        const app = await startE2EServer(createRouter());
        const page = await openE2EPage(app);
        const sibling = await page.newPage();
        await page.goto('/');
        await sibling.goto('/popup');

        await page.close(); // root close must close the sibling's browser too

        // The sibling's session is dead — evaluating must fail.
        let failed = false;
        try {
            await sibling.evaluate('1 + 1');
        } catch {
            failed = true;
        }
        expect(failed).toBe(true);
    }, 60000);
});
