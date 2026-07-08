# @elitjs/devtools

Browser DevTools panel for Elit applications. Inspect live State instances, router transitions, and re-render performance from a floating in-page panel.

## Install

```bash
npm install @elitjs/devtools
```

## Usage

Call `installDevTools()` once in your client entry, before mounting the app:

```ts
import { installDevTools, trackState } from '@elitjs/devtools';
import { createState } from '@elitjs/state';
import { createRouter } from '@elitjs/router';

const router = createRouter({ routes: [...] });
const count = trackState('count', createState(0));

installDevTools({
  router,
  hotkey: 'Ctrl+Shift+E',
  showPanel: true,
});
```

Toggle the panel with `Ctrl+Shift+E` (default) or `window.__ELIT_DEVTOOLS__.toggle()`.

## API

- `installDevTools(options)` — install the panel and bridge
- `trackState(name, state)` — register a State instance for inspection
- `untrackState(name)` — remove a tracked state
- `trackRouter(name, router)` — register a router
- `createState(name, initial)` — convenience wrapper that tracks automatically

## Bridge

The bridge lives on `window.__ELIT_DEVTOOLS__` and exposes:

- `toggle()` — show/hide the panel
- `snapshot()` — read current telemetry
- `states` — Map of tracked states
- `routers` — Map of tracked routers
- `version` — devtools protocol version
