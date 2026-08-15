/// <reference path="../../packages/test/src/globals.d.ts" />

import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ServerRouter } from '../../packages/server/src';
import { openE2EPage, startE2EServer, withE2EPage } from '../../packages/e2e/src';
import { buildTraceViewerHtml } from '../../packages/e2e/src/trace';

function createRouter(): ServerRouter {
    const router = new ServerRouter();
    router.get('/', (_req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.end(`<!DOCTYPE html>
            <html>
              <body>
                <h1>Trace page</h1>
                <input id="field">
                <button id="act" onclick="document.getElementById('out').textContent='done'">Act</button>
                <p id="out">idle</p>
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

describe('trace viewer html (unit)', () => {
    it('embeds steps and screenshots into a self-contained page', () => {
        const html = buildTraceViewerHtml({
            name: 'my test',
            url: 'http://localhost/x',
            startedAt: 0,
            steps: [
                { action: 'start', timestamp: 0, screenshot: 'AAAA' },
                { action: 'click', detail: '#btn', timestamp: 12, screenshot: 'BBBB' },
            ],
        });
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('my test');
        expect(html).toContain('AAAA');
        expect(html).toContain('BBBB');
        expect(html).toContain('ArrowLeft');
    });
});

const runBrowserTests = browserAvailable ? describe : describe.skip;

runBrowserTests('trace recording', () => {
    it('records goto/click/fill steps with screenshots', async () => {
        const app = await startE2EServer(createRouter());
        const page = await openE2EPage(app);
        try {
            await page.goto('/');
            await page.startTracing('demo flow');
            await page.click('#act');
            await page.fill('#field', 'traced');

            const trace = await page.stopTracing();
            expect(trace).not.toBe(null);
            const actions = trace!.steps.map((step) => step.action);
            expect(actions).toContain('start');
            expect(actions).toContain('click');
            expect(actions).toContain('fill');
            // every step carries a base64 png screenshot
            for (const step of trace!.steps) {
                expect(step.screenshot).toBeTruthy();
            }
        } finally {
            await page.close();
            await app.close();
        }
    }, 60000);

    it('withE2EPage dumps a trace viewer when the test fails', async () => {
        const traceDir = mkdtempSync(join(tmpdir(), 'elit-trace-'));
        let sawError = '';

        try {
            await withE2EPage(createRouter, async (page) => {
                await page.goto('/');
                await page.click('#act');
                sawError = 'boom';
                throw new Error('boom');
            }, { port: 0, trace: true } as any);
        } catch (error) {
            expect((error as Error).message).toBe('boom');
        }

        // The trace must have been written into e2e-traces/ (cwd) — copy check via side effect.
        const tracesDir = 'e2e-traces';
        expect(existsSync(tracesDir)).toBe(true);
        const files = readdirSync(tracesDir) as string[];
        expect(files.some((file) => file.endsWith('.html'))).toBe(true);
        const html = readFileSync(join(tracesDir, files.find((f) => f.endsWith('.html'))!), 'utf-8') as string;
        expect(html).toContain('click');
        expect(html).toContain('data:image/png;base64');
        rmSync(tracesDir, { recursive: true, force: true });
        rmSync(traceDir, { recursive: true, force: true });
    }, 60000);

    it('no trace is written when the test passes', async () => {
        rmSync('e2e-traces', { recursive: true, force: true });
        await withE2EPage(createRouter, async (page) => {
            await page.goto('/');
            await page.click('#act');
        }, { port: 0, trace: true } as any);
        expect(existsSync('e2e-traces')).toBe(false);
    }, 60000);
});
