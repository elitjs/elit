# Elit E2E Example

End-to-end testing an Elit server API with [`@elitjs/e2e`](../../packages/e2e) and [`@elitjs/test`](../../packages/test), using the Playwright-style API.

`@elitjs/e2e` starts your real `ServerRouter` on an ephemeral port and hands every test `{ app, request }` fixtures — assertions exercise the full HTTP round trip: routing, params, query, JSON body parsing, status codes.

## Layout

```
src/server.ts               Todo API — ServerRouter with CRUD routes + an HTML page
tests/todos.e2e.test.ts     API e2e suite — e2eTest fixtures + expectResponse
tests/browser.e2e.test.ts   Browser suite — real Chrome via CDP, with screenshots
```

## Run

```bash
npm install
npm run test:run        # everything via elit test
elit e2e                # only e2e files (*.e2e.test.ts), with e2e defaults
```

## Playwright-style fixtures

```ts
const test = e2eTest(() => createTodoRouter());

test('creates a todo', async ({ request }) => {
    const res = await request.post('/api/todos', { data: { title: 'buy milk' } });

    expectResponse(res).toBeOK();
    expectResponse(res).toHaveStatus(201);
});
```

Every test gets a fresh server that closes automatically. Requests mirror Playwright's `APIRequestContext` (`get/post/put/patch/delete/head/fetch` with `params`, `headers`, `data`), and responses are method-style: `res.status()`, `res.ok()`, `res.json()`.

## Manual lifecycle

When a suite should share one server:

```ts
const app = await startE2EServer(createTodoRouter());
// ... multiple tests against app.request ...
await app.close();
```

## Browser + screenshots

`withE2EPage` opens a real browser (the Chrome/Edge on the machine, via CDP — zero extra installs) alongside the server:

```ts
await withE2EPage(createTodoRouter, async (page) => {
    await page.goto('/');
    expect(await page.textContent('h1')).toBe('Elit E2E Example');
    await page.screenshot({ path: 'home.png' });
});
```

See [tests/browser.e2e.test.ts](tests/browser.e2e.test.ts). For the full Playwright browser matrix, use the `attachE2E` adapter (also exported from `@elitjs/e2e` — see the [package README](../../packages/e2e/README.md#playwright-adapter--full-browser-matrix)).

See a full runnable suite in [tests/todos.e2e.test.ts](tests/todos.e2e.test.ts).
