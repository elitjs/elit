/// <reference types="@elitjs/test/globals" />

import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { withE2EPage } from '@elitjs/e2e';
import { createTodoRouter } from '../src/server';

// Browser tests use the Chrome/Edge already installed on the machine (CDP).
// Skip automatically when no browser is available (e.g. minimal CI images).
const browserAvailable = Boolean(
    process.env.ELIT_E2E_BROWSER ||
    [
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium',
    ].some((candidate) => existsSync(candidate)),
);

(browserAvailable ? describe : describe.skip)('browser page (real Chrome via CDP)', () => {
    it('renders the page in a real browser', async () => {
        await withE2EPage(createTodoRouter, async (page) => {
            await page.goto('/');
            expect(await page.textContent('h1')).toBe('Elit E2E Example');
        });
    }, 60000);

    it('captures a screenshot', async () => {
        const path = join(tmpdir(), `elit-example-${Date.now()}.png`);
        await withE2EPage(createTodoRouter, async (page) => {
            await page.goto('/');
            const png = await page.screenshot({ path });
            expect(png.length).toBeGreaterThan(1000);
        });
    }, 60000);
});
