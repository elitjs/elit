# @elitjs/e2e

End-to-end test helpers for [Elit](https://elitjs.github.io/elit/). Start a real HTTP server around your `ServerRouter` and exercise it over the wire with a Playwright-style API — designed to run inside [`@elitjs/test`](../test) suites.

## Install

```bash
npm install @elitjs/e2e @elitjs/test
```

## Playwright-style (recommended)

### `e2eTest()` — test factory with fixtures

```ts
import { e2eTest, expectResponse } from '@elitjs/e2e';
import { createTodoRouter } from './src/server';

const test = e2eTest(() => createTodoRouter());

test('creates a todo', async ({ app, request }) => {
    const res = await request.post('/api/todos', { data: { title: 'buy milk' } });

    expectResponse(res).toBeOK();
    expectResponse(res).toHaveStatus(201);
    await expectResponse(res).toHaveJSONBody({ id: 'todo_1', title: 'buy milk', done: false });
});

test.describe('grouped', () => {
    test('every test gets a fresh server', async ({ request }) => {
        const res = await request.get('/api/todos');
        await expectResponse(res).toHaveJSONBody({ todos: [] });
    });
});
```

Every test receives `{ app, request }` fixtures; the server starts before the test and closes after it — pass or fail. Pass a `ServerRouter` instead of a factory to reuse the same router across tests.

### `app.request` — APIRequestContext

Bound to the running server's URL, mirroring Playwright's `APIRequestContext`:

```ts
await request.get('/api/todos', { params: { page: 2 }, headers: { authorization: 'Bearer x' } });
await request.post('/api/todos', { data: { title: 'buy milk' } });
await request.put('/api/todos/todo_1');
await request.patch('/api/todos/todo_1', { data: { done: true } });
await request.delete('/api/todos/todo_1');
await request.head('/api/todos');
await request.fetch('/api/todos', { method: 'OPTIONS' });
```

### Response — method-style like `APIResponse`

```ts
const res = await request.get('/api/todos');

res.status();        // 200
res.ok();            // true when 2xx
res.statusText();    // 'OK'
res.url();           // full request url
res.headers();       // { ... }
res.headerValue('content-type');
await res.text();
await res.json();
await res.body();    // Buffer
```

### `expectResponse()` — response assertions

```ts
expectResponse(res).toBeOK();
expectResponse(res).toHaveStatus(201);
expectResponse(res).toHaveHeader('content-type', 'application/json');
await expectResponse(res).toHaveJSONBody({ todos: [] });
```

## Browser testing with screenshots

### CDP page — zero dependencies

`@elitjs/e2e` drives the Chrome/Edge/Chromium already installed on the machine over the Chrome DevTools Protocol — no extra install:

```ts
import { withE2EPage } from '@elitjs/e2e';

await withE2EPage(router, async (page) => {
    await page.goto('/');
    expect(await page.textContent('h1')).toBe('Todos');

    await page.click('#add');
    await page.fill('#title', 'buy milk');

    const png = await page.screenshot({ path: 'home.png' }); // Buffer + written to disk
});
```

The page API mirrors Playwright where it matters: `goto`, `screenshot`, `click`, `fill`, `textContent`, `evaluate`. Browser resolution order: `$ELIT_E2E_BROWSER` → Chrome → Edge → Chromium. `openE2EPage(appOrUrl, options)` is the manual-lifecycle form.

### Auto-waiting, locators, and web-first assertions

Actions auto-wait for their element (default 10s) — no manual sleeps for async rendering:

```ts
await page.click('#add');            // waits until #add is visible, then clicks
const title = page.locator('h1');    // locator form, same auto-waiting
expect(await title.textContent()).toBe('Todos');
```

### Playwright-style selector engine

Beyond CSS, locators and string selectors understand semantic queries:

```ts
await page.getByRole('button', { name: 'Save changes' }).click();   // ARIA role + accessible name
await page.getByText('Welcome back').waitFor();                     // visible text (prefers deepest match)
await page.getByTestId('delete-btn').fill('yes');                   // data-testid
await page.getByRole('textbox', { name: 'Nickname' }).fill('elit'); // inputs by aria-label

// Same queries as prefixed selector strings, anywhere a selector is accepted:
await page.click('role=button[name="Save changes"]');
await expectSelector(page, 'text=Welcome back').toBeVisible();
await page.waitForSelector('testid=delete-btn');
```

The role engine resolves implicit ARIA roles (`button`, `a[href]` → link, headings, `input[type=…]`, lists, …) plus explicit `role` attributes, and matches names from `aria-label`, `aria-labelledby`, text content, input values, or `title`.

### Mouse: hover, dblclick, press

```ts
await page.hover('#menu-item');      // real mouse move (Input domain)
await page.dblclick('#card');        // full double-click sequence
await page.press('#search', 'Enter');
```

### Dialogs (alert / confirm / prompt)

The page freezes until a dialog is handled — register a handler before triggering it; without one, dialogs auto-accept:

```ts
await page.onDialog(async (dialog) => {
    expect(dialog.message()).toBe('Delete this item?');
    await dialog.accept();           // or dialog.dismiss(), or accept('prompt answer')
});
await page.getByRole('button', { name: 'Confirm delete' }).click();
```

### Iframes

Locators and assertions can be scoped to an iframe's document:

```ts
const frame = await page.frame({ url: '/widget' });   // or { name: 'widget' }
await frame.getByRole('button', { name: 'Buy now' }).click();
await expectSelector(frame, '#widget-status').toHaveText('bought');

const frames = await page.frames();                   // { id, url, name }[]
```

### Multiple pages & popups

Tabs share one browser process — open more with `newPage()`, capture `window.open` popups with `waitForPopup()`:

```ts
const second = await page.newPage();          // fresh tab, same base URL
await second.goto('/report');

const popupPromise = page.waitForPopup();     // set up before the click
await page.getByRole('link', { name: 'Open' }).click();
const popup = await popupPromise;
await expectSelector(popup, 'h1').toHaveText('Popup page');
```

Closing the page that spawned the browser (`withE2EPage`'s page) closes every sibling; closing a sibling leaves the rest running. Main-frame clicks are real mouse events, so `target="_blank"` links and other user-activation-gated behavior work like a real user.

Waiting primitives:

```ts
await page.waitForSelector('#result');                    // visible by default
await page.waitForSelector('#spinner', { state: 'hidden' });
await page.waitForURL('/dashboard');
await page.waitForLoadState('networkidle');
const res = await page.waitForResponse('/api/data');      // { url, status }
```

Auto-retrying DOM assertions — they poll (default 5s) instead of failing on the first miss:

```ts
import { expectSelector } from '@elitjs/e2e';

await expectSelector(page, '.item').toBeVisible();
await expectSelector(page, '#count').toHaveText('Clicked 2 times');
await expectSelector(page, 'input[name=q]').toHaveValue('elit');
await expectSelector(page, '.todo').toHaveCount(3);
```

Screenshots beyond the viewport or clipped to an element:

```ts
await page.screenshot({ fullPage: true });       // whole page, not just the viewport
await page.screenshot({ element: '.chart' });    // clipped to the selector's box
```

### Network interception

Mock, abort, or inspect any request — patterns are globs (`**` crosses `/`, `*` does not):

```ts
await page.route('**/api/data', (route) =>
    route.fulfill({ status: 200, body: { ok: true, source: 'mocked' } }),
);

await page.route('**/flaky', (route) => route.abort());

await page.route('**/api/*', async (route) => {
    console.log(route.request.method, route.request.url, route.request.postData);
    await route.continue();                       // pass through unchanged
});

await page.unroute('**/api/data');                // restore the real network
```

### Keyboard & typing

```ts
await page.press('#search', 'Enter');             // focuses the element, then presses
await page.type('#search', 'elit js', { delay: 50 }); // one keystroke at a time
```

### Device emulation

Pass options when opening the page — no separate context objects:

```ts
await withE2EPage(router, async (page) => {
    // assertions run against the emulated device
}, {
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
    colorScheme: 'dark',
    userAgent: 'MyBot/1.0',
    geolocation: { latitude: 13.7563, longitude: 100.5018 }, // + page.grantPermissions(['geolocation'])
    mobile: { width: 390, height: 844, pixelRatio: 3 },      // touch + mobile viewport
});
```

### Storage state & file upload

```ts
const state = await page.storageState();          // cookies + localStorage snapshot
await page.setStorageState(state);                // restore (login once, reuse across pages)

await page.setInputFiles('#avatar', './avatar.png'); // local file onto <input type="file">
```

### Multipart form-data

```ts
const res = await app.request.post('/upload', { multipart: { name: 'elit', role: 'dev' } });
```

### Cookie sessions on the request context

`app.request` and `app.client` share a cookie jar — `Set-Cookie` responses are replayed automatically, so login flows keep their session:

```ts
await app.request.post('/login', { data: { user: 'elit', pass: '…' } });
const me = await app.request.get('/me');          // session cookie already attached
```

### Browser adapter — full browser matrix via Playwright

Already using Playwright? Bridge your elit server to it with `attachE2E` (playwright itself is an optional peer — `@elitjs/e2e` never imports it):

```ts
import { chromium } from 'playwright'; // you install this
import { attachE2E, withE2EServer } from '@elitjs/e2e';

await withE2EServer(router, async (app) => {
    const browser = await chromium.launch();
    const pw = await attachE2E(app, browser); // baseURL = app.url

    await pw.goto('/');
    await pw.page.screenshot({ path: 'home.png' });

    await pw.close();
    await browser.close();
});
```

## Lower-level API

`startE2EServer` / `withE2EServer` for manual or one-shot lifecycles:

```ts
const app = await startE2EServer(router);   // { port, url, client, request, server, close() }
await app.close();

await withE2EServer(router, async (app) => {
    const data = await app.client.getJson('/api/todos');
});
```

`app.client` keeps JSON-in/JSON-out helpers (`getJson/post/put/patch/delete`) plus `webSocket(path)` which resolves once a WebSocket connection is open.

Run with the Elit CLI — `elit e2e` discovers e2e files by convention (`*.e2e.test.ts` or anything under `e2e/`):

```bash
elit e2e                       # run all e2e tests
elit e2e --file ./tests/todos.e2e.test.ts
elit e2e --retries 2 --workers 4
```

`elit test --e2e` routes to the same command; explicit files also work with `elit test`.

### Video recording

Record a screencast of a page as a playable `.webm` (VP8 frames from Chrome's screencast, muxed in-process — no ffmpeg needed):

```ts
await page.startVideo();
// ... interact ...
const videoPath = await page.stopVideo({ path: 'recording.webm' });

// or auto-record for the whole page lifetime:
await withE2EPage(router, async (page) => { /* ... */ }, { video: { dir: 'e2e-videos' } });
```

From the CLI, every page opened during the run gets recorded:

```bash
elit e2e --video            # default dir: e2e-videos/
elit e2e --video artifacts  # custom dir
```

### Tracing on failure

`--trace` records every page action with a screenshot after each step; when a test fails, the steps land in `e2e-traces/` as a self-contained HTML viewer (step list + screenshot stage + arrow-key navigation):

```bash
elit e2e --trace
elit e2e show-trace e2e-traces/trace-<timestamp>.html
```

Passing tests write nothing. In code, the same via options:

```ts
await withE2EPage(router, fn, { trace: true });
const test = e2eTest(createRouter, { trace: true });   // fixtures gain { page } while tracing
```

### Codegen — record a test by using the app

```bash
elit e2e codegen http://localhost:5180 --output recorded.test.ts
```

Opens a visible browser, records your clicks/fills/Enter presses, and writes a runnable test. Selectors follow the engine's priority: `data-testid` > element id > `role=` with accessible name > `text=`. Close the browser window to finish recording.

## License

MIT
