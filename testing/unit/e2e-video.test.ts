/// <reference path="../../packages/test/src/globals.d.ts" />

import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ServerRouter } from '../../packages/server/src';
import { startE2EServer, openE2EPage, withE2EPage } from '../../packages/e2e/src';
import { extractVp8Frame, muxWebM } from '../../packages/e2e/src/video';

function createAnimatedRouter(): ServerRouter {
    const router = new ServerRouter();
    router.get('/', (_req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.end(`<!DOCTYPE html>
            <html>
              <body>
                <div id="box" style="width:100px;height:100px;background:red"></div>
                <script>
                    let hue = 0;
                    setInterval(() => {
                        hue = (hue + 30) % 360;
                        document.getElementById('box').style.background = 'hsl(' + hue + ', 90%, 50%)';
                    }, 100);
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

describe('webm muxer (unit)', () => {
    it('produces an EBML/WebM structure', () => {
        const fakeFrame = Buffer.from([0x30, 0x01, 0x00, 0x00, ...new Array(40).fill(0xab)]);
        const webm = muxWebM([{ data: fakeFrame, timestamp: 0 }, { data: fakeFrame, timestamp: 100 }], 640, 480);
        expect(webm.readUInt32BE(0)).toBe(0x1a45dfa3); // EBML magic
        expect(webm.indexOf('webm')).toBeGreaterThan(0); // doctype
        expect(webm.indexOf(Buffer.from('V_VP8'))).toBeGreaterThan(0); // codec id
        expect(webm.length).toBeGreaterThan(100);
    });

    it('extractVp8Frame rejects non-VP8 payloads', () => {
        expect(extractVp8Frame(Buffer.from('notawebp'))).toBe(null);
        const vp8L = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBPVP8L')]);
        expect(extractVp8Frame(vp8L)).toBe(null);
    });
});

const runBrowserTests = browserAvailable ? describe : describe.skip;

runBrowserTests('video recording', () => {
    it('records a screencast and writes a webm file', async () => {
        const outputDir = mkdtempSync(join(tmpdir(), 'elit-video-'));
        const app = await startE2EServer(createAnimatedRouter());
        const page = await openE2EPage(app);
        try {
            await page.goto('/');
            await page.startVideo();
            // Let the animation produce distinct frames.
            await new Promise((resolvePromise) => setTimeout(resolvePromise, 800));
            const videoPath = await page.stopVideo({ path: join(outputDir, 'recorded.webm') });

            expect(existsSync(videoPath)).toBe(true);
            const webm = readFileSync(videoPath) as Buffer;
            expect(webm.readUInt32BE(0)).toBe(0x1a45dfa3);
            expect(webm.length).toBeGreaterThan(2000);
        } finally {
            await page.close();
            await app.close();
            rmSync(outputDir, { recursive: true, force: true });
        }
    }, 60000);

    it('auto-records when the video option is set', async () => {
        const videoDir = mkdtempSync(join(tmpdir(), 'elit-video-auto-'));
        await withE2EPage(createAnimatedRouter, async (page) => {
            await page.goto('/');
            await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
        }, { video: { dir: videoDir } });

        const files = (await import('node:fs')).readdirSync(videoDir) as string[];
        const videos = files.filter((file) => file.endsWith('.webm'));
        expect(videos.length).toBe(1);
        const webm = readFileSync(join(videoDir, videos[0])) as Buffer;
        expect(webm.readUInt32BE(0)).toBe(0x1a45dfa3);
        rmSync(videoDir, { recursive: true, force: true });
    }, 60000);

    it('auto-records via ELIT_E2E_VIDEO env (the --video flag mechanism)', async () => {
        const videoDir = mkdtempSync(join(tmpdir(), 'elit-video-env-'));
        const previous = process.env.ELIT_E2E_VIDEO;
        process.env.ELIT_E2E_VIDEO = videoDir;
        try {
            await withE2EPage(createAnimatedRouter, async (page) => {
                await page.goto('/');
                await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
            });
        } finally {
            if (previous === undefined) delete process.env.ELIT_E2E_VIDEO;
            else process.env.ELIT_E2E_VIDEO = previous;
        }

        const videos = ((await import('node:fs')).readdirSync(videoDir) as string[]).filter((file) => file.endsWith('.webm'));
        expect(videos.length).toBe(1);
        rmSync(videoDir, { recursive: true, force: true });
    }, 60000);
});
