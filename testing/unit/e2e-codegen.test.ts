/// <reference path="../../packages/test/src/globals.d.ts" />

import { existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ServerRouter } from '../../packages/server/src';
import { startE2EServer } from '../../packages/e2e/src';
import { generateCode, startRecording } from '../../packages/e2e/src/codegen';

function createRouter(): ServerRouter {
    const router = new ServerRouter();

    router.get('/', (_req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.end(`<!DOCTYPE html>
            <html>
              <body>
                <button id="save" data-testid="save-btn">Save changes</button>
                <input id="nickname" aria-label="Nickname">
                <a href="#" id="link">Other page</a>
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

runBrowserTests('codegen recorder', () => {
    it('records clicks and fills into generated test code', async () => {
        const app = await startE2EServer(createRouter());
        const recording = await startRecording({ url: app.url, headless: true });
        try {
            // Drive the recorded page the way a user would.
            await recording.page.click('#save');
            await recording.page.fill('#nickname', 'elit');

            expect(recording.actions.length).toBeGreaterThanOrEqual(2);
            expect(recording.actions.some((action) => action.type === 'click')).toBe(true);
            expect(recording.actions.some((action) => action.type === 'fill' && action.value === 'elit')).toBe(true);
        } finally {
            const code = await recording.stop();
            // The generated code must be runnable-shaped @elitjs/e2e source.
            expect(code).toContain("import { openE2EPage } from '@elitjs/e2e'");
            expect(code).toContain('page.click(');
            expect(code).toContain('page.fill(');
            expect(code).toContain(JSON.stringify(app.url));
            await app.close();
        }
    }, 60000);

    it('prefers data-testid, then element ids', async () => {
        const app = await startE2EServer(createRouter());
        const recording = await startRecording({ url: app.url, headless: true });
        try {
            await recording.page.click('#save'); // has data-testid="save-btn" — beats the id
            await recording.page.click('#link'); // no testid — falls back to the element id

            const clickSelectors = recording.actions.filter((action) => action.type === 'click').map((action) => action.selector);
            expect(clickSelectors).toContain('testid=save-btn');
            expect(clickSelectors).toContain('#link');
        } finally {
            await recording.stop();
            await app.close();
        }
    }, 60000);

    it('writes the generated test to --output', async () => {
        const outputPath = join(tmpdir(), `elit-codegen-${Date.now()}.test.ts`);
        const app = await startE2EServer(createRouter());
        const recording = await startRecording({ url: app.url, headless: true, output: outputPath });
        try {
            await recording.page.click('#save');
        } finally {
            await recording.stop();
            await app.close();
        }
        expect(existsSync(outputPath)).toBe(true);
        expect(readFileSync(outputPath, 'utf-8') as string).toContain('page.click(');
        rmSync(outputPath, { force: true });
    }, 60000);

    it('generateCode emits valid code with no interactions', () => {
        const code = generateCode('http://localhost:3000', []);
        expect(code).toContain('openE2EPage');
        expect(code).toContain('(no interactions were recorded)');
    });
});
