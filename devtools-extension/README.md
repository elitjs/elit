# @elitjs/devtools-extension

Chrome DevTools extension that inspects `@elitjs/devtools` tracked state, routers, and perf events.

## Load it (dev)

1. Open `chrome://extensions`
2. Toggle **Developer mode** (top-right)
3. Click **Load unpacked**
4. Select this folder (`devtools-extension`)
5. Open DevTools (F12) on any page that calls `installDevTools()` — a new **Elit** tab appears.

## How it works

The panel polls the active tab every 500ms via `chrome.scripting.executeScript({ world: 'MAIN' })`, reading `window.__ELIT_DEVTOOLS__` (or `window.t` in production where `mangleProps: /^_/` rewrites the property) and calling `snapshot()`. No content script, no background worker — just the devtools page + panel.

## Files

- `manifest.json` — MV3 manifest, declares `devtools_page` and `scripting` permission
- `devtools.html` / `devtools.js` — registers the **Elit** panel
- `panel.html` / `panel.js` / `panel.css` — panel UI (State / Router / Perf tabs)

No build step. Load the folder directly.
