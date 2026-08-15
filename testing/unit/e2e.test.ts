/// <reference path="../../packages/test/src/globals.d.ts" />

import { ServerRouter } from '../../packages/server/src';
import {
    e2eTest,
    expectResponse,
    startE2EServer,
    withE2EServer,
} from '../../packages/e2e/src';

function createRouter(): ServerRouter {
    const router = new ServerRouter();

    router.get('/api/hello', (_req, res) => {
        res.json({ hello: 'world' });
    });

    router.get('/api/echo/:id', (req, res) => {
        res.json({ id: req.params.id });
    });

    router.post('/api/echo', (req, res) => {
        res.status(201).json({ received: req.body });
    });

    router.delete('/api/item/:id', (req, res) => {
        res.json({ deleted: req.params.id });
    });

    router.head('/api/hello', (_req, res) => {
        res.status(200).end();
    });

    return router;
}

describe('e2e server with @elitjs/test', () => {
    it('serves a ServerRouter over real http', async () => {
        await withE2EServer(createRouter(), async (app) => {
            const data = await app.client.getJson('/api/hello');
            expect(data).toEqual({ hello: 'world' });
        });
    });

    it('binds an ephemeral port and reports the url', async () => {
        const app = await startE2EServer(createRouter());
        try {
            expect(app.port).toBeGreaterThan(0);
            expect(app.url).toBe(`http://127.0.0.1:${app.port}`);

            const res = await app.client.get('/api/hello');
            expect(res.status()).toBe(200);
        } finally {
            await app.close();
        }
    });

    it('posts a JSON body and parses the JSON response', async () => {
        await withE2EServer(createRouter(), async (app) => {
            const data = await app.client.post('/api/echo', { name: 'elit' });
            expect(data).toEqual({ received: { name: 'elit' } });
        });
    });

    it('exposes route params and query strings', async () => {
        await withE2EServer(createRouter(), async (app) => {
            const data = await app.client.getJson('/api/echo/42', { query: { extra: 'yes' } });
            expect(data).toEqual({ id: '42' });
        });
    });

    it('sends DELETE requests with the correct method', async () => {
        await withE2EServer(createRouter(), async (app) => {
            const data = await app.client.delete('/api/item/7');
            expect(data).toEqual({ deleted: '7' });
        });
    });

    it('falls back to 404 when no route matches', async () => {
        await withE2EServer(createRouter(), async (app) => {
            const res = await app.client.get('/api/missing');
            expect(res.status()).toBe(404);
        });
    });

    it('closes the server after withE2EServer', async () => {
        await withE2EServer(createRouter(), () => undefined);
        const second = await startE2EServer(createRouter());
        expect(second.port).toBeGreaterThan(0);
        await second.close();
    });
});

describe('playwright-style request context', () => {
    it('request.get returns a method-style response', async () => {
        await withE2EServer(createRouter(), async (app) => {
            const res = await app.request.get('/api/hello');

            expect(res.ok()).toBe(true);
            expect(res.status()).toBe(200);
            expect(await res.json()).toEqual({ hello: 'world' });
            expect(res.headerValue('content-type')).toContain('application/json');
        });
    });

    it('request.post sends data and params are appended as query', async () => {
        await withE2EServer(createRouter(), async (app) => {
            const res = await app.request.post('/api/echo', { data: { name: 'elit' } });
            expect(res.status()).toBe(201);
            expect(await res.json()).toEqual({ received: { name: 'elit' } });

            const withParams = await app.request.get('/api/echo/42', { params: { extra: 'yes' } });
            expect(await withParams.json()).toEqual({ id: '42' });
        });
    });

    it('request.head sends HEAD requests', async () => {
        await withE2EServer(createRouter(), async (app) => {
            const res = await app.request.head('/api/hello');
            expect(res.status()).toBe(200);
        });
    });

    it('request.delete deletes', async () => {
        await withE2EServer(createRouter(), async (app) => {
            const res = await app.request.delete('/api/item/3');
            expect(await res.json()).toEqual({ deleted: '3' });
        });
    });

    it('expectResponse assertions pass and fail correctly', async () => {
        await withE2EServer(createRouter(), async (app) => {
            const ok = await app.request.get('/api/hello');
            expectResponse(ok).toBeOK();
            expectResponse(ok).toHaveStatus(200);
            expectResponse(ok).toHaveHeader('content-type', 'application/json');
            await expectResponse(ok).toHaveJSONBody({ hello: 'world' });

            const missing = await app.request.get('/api/missing');
            expectResponse(missing).toHaveStatus(404);

            let threw = false;
            try {
                expectResponse(missing).toBeOK();
            } catch {
                threw = true;
            }
            expect(threw).toBe(true);
        });
    });
});

describe('e2eTest fixtures', () => {
    const test = e2eTest(createRouter);

    test.describe('with { app, request } fixtures', () => {
        test('injects a running app', async ({ app, request }) => {
            expect(app.url).toBe(`http://127.0.0.1:${app.port}`);
            const res = await request.get('/api/hello');
            expectResponse(res).toBeOK();
        });

        test('gives every test a fresh server', async ({ request }) => {
            const res = await request.get('/api/hello');
            expect(await res.json()).toEqual({ hello: 'world' });
        });
    });
});
