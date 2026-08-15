/// <reference path="../../packages/test/src/globals.d.ts" />

import { existsSync } from 'node:fs';

import { ServerRouter } from '../../packages/server/src';
import { expectSelector, withE2EPage } from '../../packages/e2e/src';

function createAsyncRouter(): ServerRouter {
    const router = new ServerRouter();

    // Elements and data arrive late on purpose — auto-waiting has to handle them.
    router.get('/', (_req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.end(`<!DOCTYPE html>
            <html>
              <body>
                <h1>Async App</h1>
                <div id="late"></div>
                <input id="field">
                <script>
                  setTimeout(() => {
                    document.getElementById('late').innerHTML =
                      '<button id="btn" style="display:none">Go</button><span id="msg">hello</span>';
                    document.getElementById('btn').style.display = '';
                    fetch('/api/data').then((r) => r.json()).then((d) => {
                      const el = document.createElement('p');
                      el.className = 'item';
                      el.textContent = 'loaded ' + d.ok;
                      document.body.appendChild(el);
                    });
                  }, 300);
                </script>
              </body>
            </html>`);
    });

    router.get('/api/data', (_req, res) => {
        res.json({ ok: true });
    });

    // A tall page for fullPage screenshots.
    router.get('/tall', (_req, res) => {
        res.setHeader('Content-Type', 'text/html');
        const blocks = Array.from({ length: 30 }, (_, i) => `<div style="height:100px">block ${i}</div>`).join('');
        res.end(`<!DOCTYPE html><html><body><div id="tall-list">${blocks}</div></body></html>`);
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

runBrowserTests('e2e auto-waiting and assertions', () => {
    it('waitForSelector waits for late-rendered elements', async () => {
        await withE2EPage(createAsyncRouter, async (page) => {
            await page.goto('/');
            await page.waitForSelector('#btn', { state: 'visible', timeout: 5000 });
            expect(await page.textContent('#msg')).toBe('hello');
        });
    }, 60000);

    it('click auto-waits for the element to appear', async () => {
        await withE2EPage(createAsyncRouter, async (page) => {
            await page.goto('/');
            // #btn only exists after 300ms — click must wait for it.
            await page.click('#btn');
        });
    }, 60000);

    it('locator actions auto-wait too', async () => {
        await withE2EPage(createAsyncRouter, async (page) => {
            await page.goto('/');
            const field = page.locator('#field');
            await field.fill('typed');
            expect(await field.textContent()).toBe(''); // inputs carry their value, not text content
            expect(await field.isVisible()).toBe(true);
        });
    }, 60000);

    it('expectSelector retries until the condition passes', async () => {
        await withE2EPage(createAsyncRouter, async (page) => {
            await page.goto('/');
            // .item appears only after the fetch resolves (~300ms+).
            await expectSelector(page, '.item').toBeVisible();
            await expectSelector(page, '.item').toHaveText('loaded true');
            await expectSelector(page, '.item').toHaveCount(1);
        });
    }, 60000);

    it('expectSelector toHaveValue polls input state', async () => {
        await withE2EPage(createAsyncRouter, async (page) => {
            await page.goto('/');
            await page.fill('#field', 'elit');
            await expectSelector(page, '#field').toHaveValue('elit');
        });
    }, 60000);

    it('waitForResponse captures the network response', async () => {
        await withE2EPage(createAsyncRouter, async (page) => {
            await page.goto('/');
            const response = await page.waitForResponse('/api/data', { timeout: 10000 });
            expect(response.status).toBe(200);
            expect(response.url).toContain('/api/data');
        });
    }, 60000);

    it('waitForLoadState networkidle settles after fetches finish', async () => {
        await withE2EPage(createAsyncRouter, async (page) => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');
            await expectSelector(page, '.item').toBeVisible();
        });
    }, 60000);

    it('fullPage screenshot captures content beyond the viewport', async () => {
        await withE2EPage(createAsyncRouter, async (page) => {
            await page.goto('/tall');
            const viewportShot = await page.screenshot();
            const fullShot = await page.screenshot({ fullPage: true });
            expect(fullShot.length).toBeGreaterThan(viewportShot.length);
        });
    }, 60000);

    it('element screenshot clips to the selector', async () => {
        await withE2EPage(createAsyncRouter, async (page) => {
            await page.goto('/tall');
            await page.waitForSelector('#tall-list');
            const clipped = await page.screenshot({ element: '#tall-list' });
            const full = await page.screenshot({ fullPage: true });
            expect(clipped.length).toBeGreaterThan(1000);
            expect(clipped.length).toBeLessThan(full.length);
        });
    }, 60000);
});
