/// <reference path="../../packages/test/src/globals.d.ts" />

import { existsSync } from 'node:fs';

import { ServerRouter } from '../../packages/server/src';
import { expectSelector, withE2EPage } from '../../packages/e2e/src';

function createAppRouter(): ServerRouter {
    const router = new ServerRouter();

    // Inner document served inside an iframe (same origin).
    router.get('/widget', (_req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.end(`<!DOCTYPE html>
            <html>
              <body>
                <h2>Widget</h2>
                <button data-testid="widget-buy">Buy now</button>
                <p id="widget-status">idle</p>
                <script>
                  document.querySelector('[data-testid="widget-buy"]').addEventListener('click', () => {
                    document.getElementById('widget-status').textContent = 'bought';
                  });
                </script>
              </body>
            </html>`);
    });

    router.get('/', (_req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.end(`<!DOCTYPE html>
            <html>
              <body>
                <h1>Dashboard</h1>
                <nav><a href="/report" id="report-link">Open report</a></nav>

                <button id="save">Save changes</button>
                <button data-testid="delete-btn">Delete item</button>
                <button id="confirm-delete">Confirm delete</button>
                <input id="nickname" value="elit" aria-label="Nickname">
                <p id="msg">Welcome back</p>
                <div id="hover-target" style="width:100px;height:50px">hover me</div>
                <div id="dbl-target" style="width:100px;height:50px">double click me</div>
                <p id="dialog-result">none</p>
                <iframe src="/widget" title="widget frame"></iframe>

                <script>
                  document.getElementById('save').addEventListener('click', () => {
                    document.getElementById('msg').textContent = 'saved';
                  });

                  document.getElementById('dbl-target').addEventListener('dblclick', () => {
                    document.getElementById('msg').textContent = 'double clicked';
                  });
                  document.getElementById('hover-target').addEventListener('mouseover', () => {
                    document.getElementById('msg').textContent = 'hovered';
                  });

                  document.getElementById('confirm-delete').addEventListener('click', () => {
                    if (confirm('Delete this item?')) {
                      document.getElementById('dialog-result').textContent = 'confirmed';
                    } else {
                      document.getElementById('dialog-result').textContent = 'dismissed';
                    }
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

runBrowserTests('selector engine (getByRole/getByText/getByTestId)', () => {
    it('getByRole finds buttons by role and accessible name', async () => {
        await withE2EPage(createAppRouter, async (page) => {
            await page.goto('/');

            await page.getByRole('button', { name: 'Save changes' }).click();
            expect(await page.textContent('#msg')).toBe('saved');

            // links resolve by implicit ARIA role
            expect(await page.getByRole('link', { name: 'Open report' }).isVisible()).toBe(true);
        });
    }, 60000);

    it('getByRole works without a name filter and for headings', async () => {
        await withE2EPage(createAppRouter, async (page) => {
            await page.goto('/');
            await expectSelector(page, 'role=heading').toHaveText('Dashboard');
        });
    }, 60000);

    it('getByText matches visible text', async () => {
        await withE2EPage(createAppRouter, async (page) => {
            await page.goto('/');
            expect(await page.getByText('Welcome back').textContent()).toBe('Welcome back');
            await expectSelector(page, 'text=Welcome back').toBeVisible();
        });
    }, 60000);

    it('getByTestId matches data-testid attributes', async () => {
        await withE2EPage(createAppRouter, async (page) => {
            await page.goto('/');
            await page.getByTestId('delete-btn').waitFor();
            expect(await page.getByTestId('delete-btn').textContent()).toBe('Delete item');
            await expectSelector(page, 'testid=delete-btn').toHaveText('Delete item');
        });
    }, 60000);

    it('role= textbox resolves inputs by implicit role and aria-label name', async () => {
        await withE2EPage(createAppRouter, async (page) => {
            await page.goto('/');
            await expectSelector(page, 'role=textbox[name="Nickname"]').toHaveValue('elit');
            await page.getByRole('textbox', { name: 'Nickname' }).fill('elit2');
            await expectSelector(page, '#nickname').toHaveValue('elit2');
        });
    }, 60000);
});

runBrowserTests('hover, dblclick, and dialogs', () => {
    it('hover moves the mouse onto the element', async () => {
        await withE2EPage(createAppRouter, async (page) => {
            await page.goto('/');
            await page.hover('#hover-target');
            await expectSelector(page, '#msg').toHaveText('hovered');
        });
    }, 60000);

    it('dblclick fires double-click handlers', async () => {
        await withE2EPage(createAppRouter, async (page) => {
            await page.goto('/');
            await page.dblclick('#dbl-target');
            await expectSelector(page, '#msg').toHaveText('double clicked');
        });
    }, 60000);

    it('onDialog handles confirm dialogs', async () => {
        await withE2EPage(createAppRouter, async (page) => {
            let dialogMessage = '';
            let dialogType = '';
            page.onDialog(async (dialog) => {
                dialogMessage = dialog.message();
                dialogType = dialog.type();
                await dialog.accept();
            });

            await page.goto('/');
            await page.click('#confirm-delete');

            expect(dialogMessage).toBe('Delete this item?');
            expect(dialogType).toBe('confirm');
            await expectSelector(page, '#dialog-result').toHaveText('confirmed');
        });
    }, 60000);

    it('dialogs dismiss when the handler rejects them', async () => {
        await withE2EPage(createAppRouter, async (page) => {
            page.onDialog((dialog) => dialog.dismiss());

            await page.goto('/');
            await page.click('#confirm-delete');
            await expectSelector(page, '#dialog-result').toHaveText('dismissed');
        });
    }, 60000);
});

runBrowserTests('iframe support', () => {
    it('frames lists the iframe', async () => {
        await withE2EPage(createAppRouter, async (page) => {
            await page.goto('/');
            const frames = await page.frames();
            expect(frames.length).toBe(2);
            expect(frames.some((frame) => frame.url.includes('/widget'))).toBe(true);
        });
    }, 60000);

    it('frame locators only see the iframe document', async () => {
        await withE2EPage(createAppRouter, async (page) => {
            await page.goto('/');
            const frame = await page.frame({ url: '/widget' });

            // The widget's heading is only inside the frame; the parent's h1 is not.
            expect(await frame.getByRole('heading').textContent()).toBe('Widget');

            await frame.getByRole('button', { name: 'Buy now' }).click();
            await expectSelector(frame, '#widget-status').toHaveText('bought');
        });
    }, 60000);

    it('frame.getByTestId and prefixed selectors work inside frames', async () => {
        await withE2EPage(createAppRouter, async (page) => {
            await page.goto('/');
            const frame = await page.frame({ url: '/widget' });

            await frame.getByTestId('widget-buy').click();
            // The status paragraph now reads 'bought' — a text= query finds it inside the frame.
            await expectSelector(frame, 'text=bought').toBeVisible();
            await expectSelector(frame, 'testid=widget-buy').toBeVisible();
        });
    }, 60000);
});
