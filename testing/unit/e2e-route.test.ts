/// <reference path="../../packages/test/src/globals.d.ts" />

import { existsSync } from 'node:fs';

import { ServerRouter } from '../../packages/server/src';
import { expectSelector, withE2EPage, withE2EServer } from '../../packages/e2e/src';

// ---- cookie jar (API level, no browser needed) ----

describe('cookie jar on the request context', () => {
    it('replays Set-Cookie on subsequent requests', async () => {
        const router = new ServerRouter();

        router.post('/login', (_req, res) => {
            res.setHeader('Set-Cookie', 'session=abc123; Path=/; HttpOnly');
            res.json({ ok: true });
        });

        router.get('/me', (req, res) => {
            const cookie = Array.isArray(req.headers.cookie) ? req.headers.cookie[0] : req.headers.cookie;
            if (!cookie?.includes('session=abc123')) {
                return res.status(401).json({ error: 'unauthorized' });
            }
            return res.json({ user: 'elit' });
        });

        await withE2EServer(router, async (app) => {
            await app.request.post('/login');
            // app.request and app.client share the jar — the session sticks.
            const data = await app.client.getJson('/me');
            expect(data).toEqual({ user: 'elit' });
        });
    });
});

// ---- page.route + press (browser level) ----

function createUiRouter(): ServerRouter {
    const router = new ServerRouter();

    router.get('/api/data', (_req, res) => {
        res.json({ ok: true, source: 'real' });
    });

    router.get('/', (_req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.end(`<!DOCTYPE html>
            <html>
              <body>
                <p id="status">idle</p>
                <input id="field">
                <ul id="items"></ul>
                <script>
                  fetch('/api/data')
                    .then((r) => r.json())
                    .then((d) => { document.getElementById('status').textContent = 'src:' + d.source; });

                  document.getElementById('field').addEventListener('keydown', (e) => {
                    if (e.key !== 'Enter') return;
                    const li = document.createElement('li');
                    li.textContent = 'added';
                    document.getElementById('items').appendChild(li);
                  });
                </script>
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

runBrowserTests('network interception and keyboard', () => {
    it('page.route fulfills requests with mocked data', async () => {
        await withE2EPage(createUiRouter, async (page) => {
            await page.route('**/api/data', (route) =>
                route.fulfill({ status: 200, body: { ok: true, source: 'mocked' } }),
            );

            await page.goto('/');
            await page.waitForSelector('#status');
            // The page must show the mocked payload, never the real one.
            expect(await page.textContent('#status')).toBe('src:mocked');
        });
    }, 60000);

    it('page.route can abort requests', async () => {
        await withE2EPage(createUiRouter, async (page) => {
            await page.route('**/api/data', (route) => route.abort());

            await page.goto('/');
            // fetch failed → status paragraph never updates past 'idle'.
            expect(await page.textContent('#status')).toBe('idle');
        });
    }, 60000);

    it('unroute restores real network', async () => {
        await withE2EPage(createUiRouter, async (page) => {
            await page.route('**/api/data', (route) => route.fulfill({ body: { source: 'mocked' } }));
            await page.unroute('**/api/data');

            await page.goto('/');
            await page.waitForSelector('#status');
            expect(await page.textContent('#status')).toBe('src:real');
        });
    }, 60000);

    it('route handlers can read the paused request', async () => {
        await withE2EPage(createUiRouter, async (page) => {
            let seenUrl = '';
            let seenMethod = '';
            await page.route('**/api/data', async (route) => {
                seenUrl = route.request.url;
                seenMethod = route.request.method;
                await route.continue();
            });

            await page.goto('/');
            await page.waitForSelector('#status');
            expect(seenUrl).toContain('/api/data');
            expect(seenMethod).toBe('GET');
            await expectSelector(page, '#status').toHaveText('src:real');
        });
    }, 60000);

    it('press dispatches real key events', async () => {
        await withE2EPage(createUiRouter, async (page) => {
            await page.goto('/');
            await page.press('#field', 'Enter');
            await page.press('#field', 'Escape'); // must be ignored by the handler
            expect(await page.evaluate('document.querySelectorAll("#items li").length')).toBe(1);
        });
    }, 60000);
});
