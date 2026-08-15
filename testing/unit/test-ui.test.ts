/// <reference path="../../packages/test/src/globals.d.ts" />

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { startUiMode } from '../../packages/test/src/test/ui-mode';

async function getState(url: string) {
    const response = await fetch(`${url}/api/state`);
    return response.json() as Promise<{
        running: boolean;
        files: string[];
        results: Array<{ name: string; status: string; error?: string }>;
        lastSummary?: { passed: number; failed: number; total: number };
    }>;
}

async function startRun(url: string, files: string[]): Promise<void> {
    const response = await fetch(`${url}/api/run`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ files }),
    });
    const body = await response.json() as { started: boolean };
    expect(body.started).toBe(true);
}

async function waitForIdle(url: string, timeoutMs = 30000): Promise<Awaited<ReturnType<typeof getState>>> {
    const start = Date.now();
    let state = await getState(url);
    // A run that finished before the first poll still reports a summary.
    while (Date.now() - start < timeoutMs) {
        if (!state.running && state.lastSummary !== undefined) return state;
        await new Promise((resolvePromise) => setTimeout(resolvePromise, 150));
        state = await getState(url);
    }
    throw new Error('UI run never finished');
}

describe('UI mode', () => {
    let workDir: string;
    let passingFile: string;
    let failingFile: string;

    beforeEach(() => {
        workDir = mkdtempSync(join(tmpdir(), 'elit-ui-'));
        passingFile = join(workDir, 'good.test.ts');
        failingFile = join(workDir, 'bad.test.ts');
        writeFileSync(passingFile, `
            describe('good suite', () => {
                it('passes', () => {});
                it('also passes', () => {});
            });
        `);
        writeFileSync(failingFile, `
            describe('bad suite', () => {
                it('fails loudly', () => { throw new Error('ui-mode failure'); });
            });
        `);
    });

    afterEach(() => {
        rmSync(workDir, { recursive: true, force: true });
    });

    it('serves the UI page and lists files', async () => {
        const ui = await startUiMode({ files: [passingFile, failingFile] });
        try {
            const page = await fetch(ui.url).then((response) => response.text());
            expect(page).toContain('Elit E2E UI');
            expect(page).toContain('/api/state');

            const state = await getState(ui.url);
            expect(state.files).toContain(passingFile);
            expect(state.files).toContain(failingFile);
            expect(state.running).toBe(false);
        } finally {
            await ui.close();
        }
    }, 30000);

    it('runs selected files with live status and captures failures', async () => {
        const ui = await startUiMode({ files: [passingFile, failingFile] });
        try {
            await startRun(ui.url, [passingFile]);
            const afterPass = await waitForIdle(ui.url);

            expect(afterPass.lastSummary).toEqual({ passed: 2, failed: 0, total: 2 });
            expect(afterPass.results.filter((item) => item.status === 'pass').length).toBe(2);

            // Re-run just the failing file — the error message must surface.
            await startRun(ui.url, [failingFile]);
            const afterFail = await waitForIdle(ui.url);

            expect(afterFail.lastSummary).toEqual({ passed: 0, failed: 1, total: 1 });
            const failed = afterFail.results.find((item) => item.status === 'fail');
            expect(failed?.error).toContain('ui-mode failure');
        } finally {
            await ui.close();
        }
    }, 60000);

    it('rejects concurrent runs', async () => {
        const slowFile = join(workDir, 'slow.test.ts');
        writeFileSync(slowFile, `
            describe('slow', () => {
                it('waits', async () => { await new Promise((resolvePromise) => setTimeout(resolvePromise, 700)); });
            });
        `);
        const ui = await startUiMode({ files: [slowFile] });
        try {
            await startRun(ui.url, [slowFile]);
            const second = await fetch(`${ui.url}/api/run`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ files: [slowFile] }),
            }).then((response) => response.json() as Promise<{ started: boolean; reason?: string }>);

            expect(second.started).toBe(false);
            expect(second.reason).toContain('already running');
            await waitForIdle(ui.url);
        } finally {
            await ui.close();
        }
    }, 60000);
});
