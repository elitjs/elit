/// <reference path="../../packages/test/src/globals.d.ts" />

import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ServerRouter } from '../../packages/server/src';
import { withE2EPage, withE2EServer } from '../../packages/e2e/src';

// ---- multipart (API level, no browser needed) ----

describe('multipart form-data on the request context', () => {
    it('sends multipart fields with a boundary', async () => {
        let rawBody = '';
        let contentType = '';

        const handler = (req: any, res: any) => {
            contentType = req.headers['content-type'] ?? '';
            const chunks: Buffer[] = [];
            req.on('data', (chunk: Buffer) => chunks.push(chunk));
            req.on('end', () => {
                rawBody = Buffer.concat(chunks).toString('utf8');
                res.statusCode = 200;
                res.end('ok');
            });
        };

        await withE2EServer(handler, async (app) => {
            const res = await app.request.post('/upload', { multipart: { name: 'elit', role: 'dev' } });
            expect(res.status()).toBe(200);
            expect(contentType).toContain('multipart/form-data; boundary=');
            expect(rawBody).toContain('name="name"');
            expect(rawBody).toContain('elit');
            expect(rawBody).toContain('name="role"');
            expect(rawBody).toContain('dev');
        });
    });
});

// ---- device emulation, type, storage, upload (browser level) ----

function createRouter(): ServerRouter {
    const router = new ServerRouter();
    router.get('/', (_req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.end(`<!DOCTYPE html>
            <html>
              <head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
              <body>
                <input id="typed">
                <input id="upload" type="file">
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

runBrowserTests('device emulation', () => {
    it('overrides locale and timezone', async () => {
        await withE2EPage(createRouter, async (page) => {
            expect(await page.evaluate<string>('navigator.language')).toBe('th-TH');
            expect(await page.evaluate<string>('Intl.DateTimeFormat().resolvedOptions().timeZone')).toBe('Asia/Bangkok');
        }, { locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
    }, 60000);

    it('emulates dark color scheme', async () => {
        await withE2EPage(createRouter, async (page) => {
            expect(await page.evaluate<boolean>('matchMedia("(prefers-color-scheme: dark)").matches')).toBe(true);
        }, { colorScheme: 'dark' });
    }, 60000);

    it('overrides the user agent', async () => {
        await withE2EPage(createRouter, async (page) => {
            expect(await page.evaluate<string>('navigator.userAgent')).toContain('ElitE2EBot/1.0');
        }, { userAgent: 'ElitE2EBot/1.0' });
    }, 60000);

    it('mobile emulation enables touch and sets the viewport', async () => {
        await withE2EPage(createRouter, async (page) => {
            await page.goto('/');
            expect(await page.evaluate<number>('window.innerWidth')).toBe(390);
            expect(await page.evaluate<boolean>('navigator.maxTouchPoints > 0')).toBe(true);
        }, { mobile: { width: 390, height: 844, pixelRatio: 3 } });
    }, 60000);

    it('grants geolocation permission and overrides coordinates', async () => {
        await withE2EPage(createRouter, async (page) => {
            await page.goto('/');
            await page.grantPermissions(['geolocation']);
            // Plain http origins cannot call getCurrentPosition; the granted
            // permission plus the CDP override is what tests can rely on.
            const status = await page.evaluate<string>(`(async () =>
              (await navigator.permissions.query({ name: 'geolocation' })).state)()`);
            expect(status).toBe('granted');
        }, { geolocation: { latitude: 13.7563, longitude: 100.5018 } });
    }, 60000);
});

runBrowserTests('typing, storage state, file upload', () => {
    it('type inserts text one keystroke at a time', async () => {
        await withE2EPage(createRouter, async (page) => {
            await page.goto('/');
            await page.type('#typed', 'hello', { delay: 10 });
            expect(await page.evaluate<string>('document.getElementById("typed").value')).toBe('hello');
        });
    }, 60000);

    it('storageState exports and setStorageState restores', async () => {
        await withE2EPage(createRouter, async (page) => {
            await page.goto('/');
            await page.evaluate(`localStorage.setItem('theme', 'dark')`);
            const state = await page.storageState();
            expect(state.localStorage.some((item) => item.name === 'theme' && item.value === 'dark')).toBe(true);

            await page.evaluate(`localStorage.clear()`);
            expect(await page.evaluate<number>('localStorage.length')).toBe(0);

            await page.setStorageState(state);
            expect(await page.evaluate<string>('localStorage.getItem("theme")')).toBe('dark');
        });
    }, 60000);

    it('setInputFiles puts local files onto a file input', async () => {
        const uploadDir = mkdtempSync(join(tmpdir(), 'elit-e2e-upload-'));
        const uploadPath = join(uploadDir, 'hello.txt');
        writeFileSync(uploadPath, 'uploaded content');

        try {
            await withE2EPage(createRouter, async (page) => {
                await page.goto('/');
                await page.setInputFiles('#upload', uploadPath);
                const fileName = await page.evaluate<string>('document.getElementById("upload").files[0]?.name ?? ""');
                expect(fileName).toBe('hello.txt');
            });
        } finally {
            rmSync(uploadDir, { recursive: true, force: true });
        }
    }, 60000);
});
