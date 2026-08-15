/**
 * Desktop mode example.
 *
 * This opens a native WebView window, sends an IPC message from the page,
 * then closes itself so it can be used as a smoke test.
 */

import { createWindow, onMessage, windowQuit, windowSetTitle } from '@elitjs/desktop';

let appDir = '.';
try { if (typeof __dirname !== 'undefined') appDir = __dirname; } catch { }
try {
    if (appDir === '.' && typeof process !== 'undefined' && Array.isArray(process.argv) && process.argv[1]) {
        const scriptPath = String(process.argv[1]);
        const scriptDir = scriptPath.replace(/[/\\][^/\\]+$/, '');
        if (scriptDir !== scriptPath) appDir = scriptDir;
    }
} catch { }
try {
    if (appDir === '.' && typeof process !== 'undefined' && process.execPath)
        appDir = process.execPath.replace(/[/\\][^/\\]+$/, '');
} catch { }

// เลือก mode: 'html' | 'url' | 'counter' | 'icon' | 'transparent' | 'elit | 'custom' | 'ipc'
const EXAMPLE = String('url');


// ---------------------------------------------------------------------------
// 1. Inline HTML
// ---------------------------------------------------------------------------
if (EXAMPLE === 'html') {
    createWindow({
        title: 'ตัวอย่าง - Inline HTML',
        width: 600,
        height: 400,
        html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: sans-serif;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      height: 100vh; background: #111; color: #fff; gap: 16px;
    }
    h1 { font-size: 2rem; font-weight: 300; }
    p  { color: #888; font-size: .9rem; }
    button {
      padding: 10px 28px; border: 1px solid #555; border-radius: 6px;
      background: transparent; color: #fff; font-size: 1rem;
      cursor: pointer; transition: background .2s;
    }
    button:hover { background: #222; }
  </style>
</head>
<body>
  <h1>web-app-gui</h1>
  <p>Rust + WebView + Node.js</p>
  <button onclick="alert('Hello from WebView!')">คลิกฉัน</button>
</body>
</html>`,
    });
}

// ---------------------------------------------------------------------------
// 2. Load URL + DevTools
// ---------------------------------------------------------------------------
if (EXAMPLE === 'url') {
    createWindow({
        title: 'ตัวอย่าง - Load URL',
        width: 1280,
        height: 800,
        url: 'https://wapk.d-osc.com/',
        devtools: true,
    });
}

// ---------------------------------------------------------------------------
// 3. Counter app
// ---------------------------------------------------------------------------
if (EXAMPLE === 'counter') {
    createWindow({
        title: 'Counter',
        width: 400,
        height: 300,
        resizable: false,
        html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: sans-serif;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      height: 100vh; background: #1a1a2e; color: #eee;
      gap: 20px; user-select: none;
    }
    #count { font-size: 4rem; font-weight: bold; color: #e94560; }
    .btns  { display: flex; gap: 12px; }
    button {
      width: 50px; height: 50px; font-size: 1.5rem;
      border: none; border-radius: 50%; background: #16213e;
      color: #eee; cursor: pointer; transition: transform .1s;
    }
    button:active { transform: scale(.9); }
  </style>
</head>
<body>
  <div id="count">0</div>
  <div class="btns">
    <button onclick="update(-1)">−</button>
    <button onclick="update(1)">+</button>
  </div>
  <script>
    let n = 0;
    function update(d) {
      n += d;
      document.getElementById('count').textContent = n;
    }
  </script>
</body>
</html>`,
    });
}

// ---------------------------------------------------------------------------
// 4. Window Icon
//    รองรับ icon.ico, icon.png, icon.svg และ favicon.*
// ---------------------------------------------------------------------------
if (EXAMPLE === 'icon') {
    createWindow({
        title: 'ตัวอย่าง - Window Icon',
        width: 500,
        height: 350,
  icon: `${appDir}/favicon.svg`, // รองรับ SVG ได้แล้ว
        html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: sans-serif; margin: 0;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      height: 100vh; background: #18181b; color: #fff; gap: 12px;
    }
    h2 { font-weight: 400; }
    p  { color: #71717a; font-size: .85rem; }
  </style>
</head>
<body>
  <h2>Icon ถูกตั้งแล้ว</h2>
  <p>ดูที่ title bar และ taskbar</p>
</body>
</html>`,
    });
}

// ---------------------------------------------------------------------------
// 5. Transparent window
// ---------------------------------------------------------------------------
if (EXAMPLE === 'transparent') {
    createWindow({
        title: 'ตัวอย่าง - Transparent',
        width: 500,
        height: 350,
        transparent: true,
        resizable: false,
        html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    html, body { background: transparent; margin: 0; }
    body {
      font-family: sans-serif;
      display: flex; align-items: center; justify-content: center;
      height: 100vh;
    }
    .card {
      background: rgba(255,255,255,.15);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,.3);
      border-radius: 16px;
      padding: 40px 60px;
      color: #fff;
      text-align: center;
    }
    h2 { margin: 0 0 8px; font-weight: 300; font-size: 1.8rem; }
    p  { margin: 0; opacity: .7; font-size: .9rem; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Glassmorphism</h2>
    <p>Transparent + blur</p>
  </div>
</body>
</html>`,
    });
}

if (EXAMPLE === 'elit') {
    onMessage((message) => {
        if (message === 'desktop:ready') {
            windowSetTitle('Elit Desktop Example');
            windowQuit();
        }
    });

    createWindow({
        title: 'Elit Desktop Example',
        width: 900,
        height: 560,
        center: true,
        html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Elit Desktop Example</title>
  <style>
    :root {
      color-scheme: light;
      font-family: Georgia, 'Times New Roman', serif;
      background:
        radial-gradient(circle at top, #f3dfc8 0%, rgba(243, 223, 200, 0) 42%),
        linear-gradient(160deg, #f7f0e5 0%, #e8d8be 100%);
      color: #2f241c;
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

    article {
      max-width: 680px;
      padding: 32px;
      border: 1px solid rgba(47, 36, 28, 0.12);
      border-radius: 28px;
      background: rgba(255, 252, 247, 0.82);
      box-shadow: 0 24px 80px rgba(71, 43, 19, 0.12);
      backdrop-filter: blur(18px);
    }

    p {
      margin: 0;
      font-size: 18px;
      line-height: 1.7;
    }

    strong {
      display: block;
      margin-bottom: 12px;
      font-size: 14px;
      letter-spacing: 0.24em;
      text-transform: uppercase;
      color: #8b5e34;
    }
  </style>
</head>
<body>
  <article>
    <strong>Desktop Mode</strong>
    <p>
      This window is rendered by the Elit desktop runtime. It sends an IPC
      message back to the host when the page is ready, then exits cleanly.
    </p>
  </article>
  <script>
    window.addEventListener('DOMContentLoaded', () => {
      window.ipc.postMessage('desktop:ready');
    });
  </script>
</body>
</html>`,
    });
}

if (EXAMPLE === 'custom') {
    onMessage(msg => {
        const parsed = JSON.parse(msg);
        const cmd = parsed && typeof parsed.cmd === 'string' ? parsed.cmd : '';
        if (cmd === 'minimize') windowMinimize();
        if (cmd === 'maximize') windowMaximize();
        if (cmd === 'unmaximize') windowUnmaximize();
        if (cmd === 'close') windowQuit();
        if (cmd === 'alwaysOnTop') windowSetAlwaysOnTop(true);
    });

    createWindow({
        title: 'Custom Window',
        width: 700,
        height: 480,
        center: true,
        decorations: false,   // ← frameless: no OS titlebar
        transparent: true,
        resizable: true,
        html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }

    body {
      font-family: sans-serif;
      background: #111;
      color: #fff;
      height: 100vh;
      display: flex;
      flex-direction: column;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #2a2a2a;
    }

    /* ── Custom Titlebar ─────────────────────────────────────── */
    .titlebar {
      height: 38px;
      background: #1a1a1a;
      display: flex;
      align-items: center;
      padding: 0 12px;
      gap: 8px;
      flex-shrink: 0;
      cursor: default;
    }

    /* Draggable region — mousedown starts window drag */
    .titlebar-drag {
      flex: 1;
      height: 100%;
      display: flex;
      align-items: center;
      cursor: grab;
    }
    .titlebar-drag:active { cursor: grabbing; }

    .titlebar-title {
      font-size: .8rem;
      color: #666;
      letter-spacing: .05em;
    }

    /* Traffic-light style buttons */
    .win-btn {
      width: 13px; height: 13px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      transition: filter .15s;
    }
    .win-btn:hover { filter: brightness(1.3); }
    .btn-close    { background: #ff5f56; }
    .btn-minimize { background: #ffbd2e; }
    .btn-maximize { background: #27c93f; }

    /* ── Content ─────────────────────────────────────────────── */
    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 20px;
      padding: 24px;
      background: #0f0f0f;
    }

    h1 { font-weight: 300; font-size: 1.8rem; letter-spacing: .12em; }

    .actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
    .btn {
      padding: 8px 20px; border-radius: 6px; border: 1px solid #2a2a2a;
      background: #1a1a1a; color: #ccc; cursor: pointer; font-size: .85rem;
      transition: background .15s;
    }
    .btn:hover { background: #252525; color: #fff; }

    .hint { color: #333; font-size: .75rem; }
  </style>
</head>
<body>

  <!-- Custom titlebar -->
  <div class="titlebar">
    <button class="win-btn btn-close"    onclick="send('close')"     title="Close"></button>
    <button class="win-btn btn-minimize" onclick="send('minimize')"  title="Minimize"></button>
    <button class="win-btn btn-maximize" onclick="send('maximize')"  title="Maximize"></button>
    <div class="titlebar-drag" id="drag-region">
      <span class="titlebar-title">Custom Window</span>
    </div>
  </div>

  <!-- Content -->
  <div class="content">
    <h1>web-app-gui</h1>

    <div class="actions">
      <button class="btn" onclick="send('minimize')">Minimize</button>
      <button class="btn" onclick="send('maximize')">Maximize</button>
      <button class="btn" onclick="send('unmaximize')">Restore</button>
      <button class="btn" onclick="send('alwaysOnTop')">Always on Top</button>
      <button class="btn" onclick="send('close')">Close</button>
    </div>

    <p class="hint">Drag the titlebar to move the window</p>
  </div>

  <script>
    function send(cmd) {
      window.ipc.postMessage(JSON.stringify({ cmd }));
    }

    // Start window drag on mousedown of the drag region
    document.getElementById('drag-region').addEventListener('mousedown', e => {
      if (e.button === 0) send('drag');
    });
  </script>
</body>
</html>`,
    });
}

if (EXAMPLE === 'ipc') {

    interface GreetMessage {
        type: 'greet';
        name: string;
    }

    interface ColorMessage {
        type: 'color';
        value: string;
    }

    type IpcMessage = GreetMessage | ColorMessage;

    // ── รับ IPC จาก WebView ──────────────────────────────────────────────────────
    onMessage(msg => {
        // msg คือ string ที่ส่งมาจาก window.ipc.postMessage(...)
        const data = JSON.parse(msg) as IpcMessage;

        if (data.type === 'greet') {
            // ตอบกลับไปที่ WebView ด้วย windowEval
            windowEval(`
      document.getElementById('response').textContent =
        'Hello, ' + ${JSON.stringify(data.name)} + '! (from backend)';
    `);
        }

        if (data.type === 'color') {
            windowEval(`
      document.body.style.background = ${JSON.stringify(data.value)};
    `);
        }
    });

    // ── เปิด window ───────────────────────────────────────────────────────────────
    createWindow({
        title: 'IPC Demo',
        width: 600,
        height: 400,
        devtools: false,
        html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: sans-serif;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 16px;
      height: 100vh; background: #0f0f0f; color: #fff;
      transition: background .4s;
    }
    h2 { font-weight: 300; letter-spacing: .1em; }
    .row { display: flex; gap: 8px; }
    input {
      padding: 8px 12px; border-radius: 6px;
      border: 1px solid #333; background: #1a1a1a; color: #fff;
      outline: none;
    }
    button {
      padding: 8px 18px; border-radius: 6px; border: none;
      background: #2563eb; color: #fff; cursor: pointer;
    }
    button:hover { background: #1d4ed8; }
    .colors { display: flex; gap: 8px; }
    .swatch {
      width: 32px; height: 32px; border-radius: 50%; cursor: pointer;
      border: 2px solid transparent; transition: border-color .2s;
    }
    .swatch:hover { border-color: #fff; }
    #response { color: #4ade80; font-size: .9rem; min-height: 1.2em; }
  </style>
</head>
<body>
  <h2>IPC Demo</h2>

  <!-- Greet -->
  <div class="row">
    <input id="name" placeholder="Your name" value="World">
    <button onclick="greet()">Greet</button>
  </div>

  <p id="response"></p>

  <!-- Change background -->
  <p style="color:#666;font-size:.8rem">Change background:</p>
  <div class="colors">
    <div class="swatch" style="background:#0f0f0f" onclick="setBg('#0f0f0f')"></div>
    <div class="swatch" style="background:#1e3a5f" onclick="setBg('#1e3a5f')"></div>
    <div class="swatch" style="background:#3b1f2b" onclick="setBg('#3b1f2b')"></div>
    <div class="swatch" style="background:#1a2e1a" onclick="setBg('#1a2e1a')"></div>
    <div class="swatch" style="background:#2d2a1e" onclick="setBg('#2d2a1e')"></div>
  </div>

  <script>
    function greet() {
      const name = document.getElementById('name').value || 'World';
      window.ipc.postMessage(JSON.stringify({ type: 'greet', name }));
    }
    function setBg(color) {
      window.ipc.postMessage(JSON.stringify({ type: 'color', value: color }));
    }
  </script>
</body>
</html>`,
    });

}