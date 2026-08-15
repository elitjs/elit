/**
 * Simple desktop example.
 *
 * Run with:
 *   npx elit desktop ./examples/desktop-simple-example.ts
 */

import { createWindow, onMessage, windowQuit, windowSetTitle } from '@elitjs/desktop';

const WINDOW_TITLE = 'Elit Desktop Simple';

onMessage((message) => {
    if (message === 'desktop:ping') {
        windowSetTitle(`${WINDOW_TITLE} - IPC OK`);
        return;
    }

    if (message === 'desktop:quit') {
        windowQuit();
    }
});

createWindow({
    title: WINDOW_TITLE,
    width: 780,
    height: 520,
    center: true,
    html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${WINDOW_TITLE}</title>
  <style>
    :root {
      color-scheme: light;
      font-family: "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at top, #d9f3ff 0%, rgba(217, 243, 255, 0) 38%),
        linear-gradient(160deg, #f7fbfd 0%, #dfeaf0 100%);
      color: #13222d;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 32px;
    }

    .card {
      width: min(100%, 560px);
      padding: 32px;
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.82);
      border: 1px solid rgba(19, 34, 45, 0.08);
      box-shadow: 0 24px 64px rgba(19, 34, 45, 0.12);
      backdrop-filter: blur(14px);
    }

    .eyebrow {
      margin: 0 0 12px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #0f6e8c;
    }

    h1 {
      margin: 0 0 12px;
      font-size: 34px;
      line-height: 1.1;
    }

    .copy {
      margin: 0;
      font-size: 16px;
      line-height: 1.6;
      color: #38505f;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 24px;
    }

    button {
      border: 0;
      border-radius: 999px;
      padding: 12px 18px;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
      color: white;
      background: #0f6e8c;
      transition: transform 120ms ease, opacity 120ms ease;
    }

    button.secondary {
      background: #d8e4ea;
      color: #13222d;
    }

    button:hover {
      transform: translateY(-1px);
      opacity: 0.96;
    }
  </style>
</head>
<body>
  <main class="card">
    <p class="eyebrow">Elit desktop</p>
    <h1>Hello from a simple desktop window</h1>
    <p class="copy">
      This example uses <code>createWindow(...)</code> with inline HTML and a tiny IPC bridge.
      Click the first button to send a message back to the desktop runtime.
    </p>
    <div class="actions">
      <button type="button" onclick="window.ipc?.postMessage('desktop:ping')">Ping desktop runtime</button>
      <button type="button" class="secondary" onclick="window.ipc?.postMessage('desktop:quit')">Close window</button>
    </div>
  </main>
</body>
</html>`,
});