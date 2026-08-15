/// <reference types="@elitjs/test/globals" />

import { e2eTest, expectResponse, startE2EServer } from '@elitjs/e2e';
import { createTodoRouter } from '../src/server';

// Playwright-style test factory — every test gets { app, request } fixtures
// and a fresh server that closes automatically, pass or fail.
const test = e2eTest(() => createTodoRouter());

test.describe('todos api (e2e)', () => {
    test('starts with an empty list', async ({ request }) => {
        const res = await request.get('/api/todos');

        expectResponse(res).toBeOK();
        await expectResponse(res).toHaveJSONBody({ todos: [] });
    });

    test('rejects a todo without a title', async ({ request }) => {
        const res = await request.post('/api/todos', { data: {} });

        expectResponse(res).toHaveStatus(400);
        await expectResponse(res).toHaveJSONBody({ error: 'title is required' });
    });

    test('creates, toggles, and deletes a todo over real http', async ({ request }) => {
        // create
        const created = await request.post('/api/todos', { data: { title: 'write e2e tests' } });
        expectResponse(created).toBeOK();
        expectResponse(created).toHaveStatus(201);
        await expectResponse(created).toHaveJSONBody({ id: 'todo_1', title: 'write e2e tests', done: false });

        // toggle done
        const toggled = await request.put('/api/todos/todo_1');
        await expectResponse(toggled).toHaveJSONBody({ id: 'todo_1', title: 'write e2e tests', done: true });

        // delete
        const deleted = await request.delete('/api/todos/todo_1');
        await expectResponse(deleted).toHaveJSONBody({ deleted: 'todo_1' });

        // gone
        const missing = await request.get('/api/todos/todo_1');
        expectResponse(missing).toHaveStatus(404);
    });

    test('filters with params like Playwright', async ({ request }) => {
        const res = await request.get('/api/todos', { params: { page: 2 } });
        expectResponse(res).toBeOK();
    });

    test('returns 404 for unknown routes', async ({ request }) => {
        const res = await request.get('/api/unknown');
        expectResponse(res).toHaveStatus(404);
    });
});

// Prefer manual control? startE2EServer gives you the same request context.
describe('manual server lifecycle', () => {
    it('exposes the url, port, and request context while running', async () => {
        const app = await startE2EServer(createTodoRouter());
        try {
            expect(app.url).toBe(`http://127.0.0.1:${app.port}`);

            const res = await app.request.get('/api/todos');
            expectResponse(res).toBeOK();
            expect(res.ok()).toBe(true);
            expect(await res.json()).toEqual({ todos: [] });
        } finally {
            await app.close();
        }
    });
});
