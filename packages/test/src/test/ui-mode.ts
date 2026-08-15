import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

import { findTestFiles } from './discovery';
import { runJestTests } from './run-jest';
import type { TestOptions } from './types';
import type { TestReporterLifecycle } from './reporter-factory';
import type { TestResult } from '../runtime';

/**
 * UI mode (`elit e2e --ui` / `elit test --ui`): a local server + HTML page that
 * lists test files, runs or re-runs them on demand from the browser, and shows
 * live pass/fail status per test via polling endpoints.
 */

export interface UiTestResult {
    name: string;
    status: 'pass' | 'fail' | 'skip' | 'todo';
    duration: number;
    suite: string;
    file: string | undefined;
    error?: string;
}

export interface UiState {
    running: boolean;
    files: string[];
    results: UiTestResult[];
    lastStartedAt: number | undefined;
    lastFinishedAt: number | undefined;
    lastSummary: { passed: number; failed: number; total: number } | undefined;
}

export interface UiModeHandle {
    url: string;
    port: number;
    server: Server;
    state: UiState;
    close(): Promise<void>;
}

async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
        chunks.push(chunk as Buffer);
    }
    if (chunks.length === 0) return {};
    try {
        return JSON.parse(Buffer.concat(chunks).toString('utf-8')) as Record<string, unknown>;
    } catch {
        return {};
    }
}

function buildUiHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Elit E2E UI</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 0; background: #0f172a; color: #e2e8f0; }
  header { padding: 16px 24px; border-bottom: 1px solid #1e293b; display: flex; gap: 16px; align-items: center; }
  h1 { font-size: 18px; margin: 0; }
  button { background: #1e293b; color: #e2e8f0; border: 1px solid #334155; border-radius: 6px; padding: 8px 18px; cursor: pointer; font-size: 14px; }
  button:hover { background: #334155; }
  button:disabled { opacity: .5; cursor: default; }
  button.primary { background: #0369a1; border-color: #0284c7; }
  #status { color: #94a3b8; font-size: 13px; }
  main { display: flex; gap: 0; height: calc(100vh - 61px); }
  aside { width: 340px; border-right: 1px solid #1e293b; overflow-y: auto; padding: 12px 0; }
  aside h2 { font-size: 12px; color: #64748b; padding: 8px 24px; margin: 0; text-transform: uppercase; letter-spacing: .08em; }
  .file { padding: 8px 24px; display: flex; gap: 10px; align-items: center; font-size: 13px; }
  .file label { flex: 1; word-break: break-all; cursor: pointer; }
  .file .rerun { font-size: 11px; padding: 3px 10px; }
  section { flex: 1; overflow-y: auto; }
  .result { padding: 10px 24px; border-bottom: 1px solid #1e293b; display: flex; gap: 10px; align-items: baseline; }
  .result .name { flex: 1; }
  .result .meta { color: #64748b; font-size: 12px; }
  .pass { color: #4ade80; } .fail { color: #f87171; } .skip { color: #facc15; } .todo { color: #64748b; }
  details { margin: 0 24px 12px 44px; }
  pre { background: #1e293b; padding: 12px; border-radius: 6px; font-size: 12px; overflow-x: auto; }
  .spinner { display: inline-block; animation: pulse 1s infinite; }
  @keyframes pulse { 50% { opacity: .35; } }
</style>
</head>
<body>
<header>
  <h1>Elit E2E UI</h1>
  <button id="run" class="primary">Run selected</button>
  <span id="status">idle</span>
</header>
<main>
  <aside>
    <h2>Files</h2>
    <div id="files"></div>
  </aside>
  <section id="results"></section>
</main>
<script>
let state = { running: false, files: [], results: [], lastSummary: undefined };

function icon(status) {
  return { pass: '\\u2705', fail: '\\u274c', skip: '\\u26a0\\ufe0f', todo: '\\u23f3' }[status] || '\\u2753';
}

function esc(value) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

function renderFiles() {
  const container = document.getElementById('files');
  container.innerHTML = '';
  for (const file of state.files) {
    const row = document.createElement('div');
    row.className = 'file';
    const short = file.split(/[\\\\/]/).slice(-2).join('/');
    row.innerHTML = '<input type="checkbox" checked data-file="' + esc(file) + '">'
      + '<label>' + esc(short) + '</label>'
      + '<button class="rerun" data-file="' + esc(file) + '">re-run</button>';
    row.querySelector('.rerun').addEventListener('click', () => run([file]));
    container.appendChild(row);
  }
}

function renderResults() {
  const container = document.getElementById('results');
  container.innerHTML = '';
  for (const item of state.results) {
    const row = document.createElement('div');
    row.className = 'result';
    const suite = item.suite ? item.suite + ' &gt; ' : '';
    row.innerHTML = '<span class="' + item.status + '">' + icon(item.status) + '</span>'
      + '<span class="name">' + esc(suite + item.name) + '</span>'
      + '<span class="meta">' + (item.duration || 0) + 'ms</span>';
    container.appendChild(row);
    if (item.error) {
      const details = document.createElement('details');
      details.innerHTML = '<summary class="fail">' + esc(item.error.split('\\n')[0]) + '</summary><pre>' + esc(item.error) + '</pre>';
      container.appendChild(details);
    }
  }
}

function renderStatus() {
  const el = document.getElementById('status');
  const run = document.getElementById('run');
  run.disabled = state.running;
  if (state.running) {
    el.innerHTML = '<span class="spinner">running\\u2026</span> ' + state.results.length + ' done';
  } else if (state.lastSummary) {
    const s = state.lastSummary;
    el.innerHTML = '<span class="' + (s.failed ? 'fail' : 'pass') + '">' + s.passed + ' passed</span>'
      + (s.failed ? ' <span class="fail">' + s.failed + ' failed</span>' : '')
      + ' / ' + s.total;
  } else {
    el.textContent = 'idle';
  }
}

async function refresh() {
  const response = await fetch('/api/state');
  const next = await response.json();
  const filesChanged = JSON.stringify(next.files) !== JSON.stringify(state.files);
  state = next;
  if (filesChanged) renderFiles();
  renderResults();
  renderStatus();
}

async function run(files) {
  if (state.running) return;
  await fetch('/api/run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ files }) });
  refresh();
}

document.getElementById('run').addEventListener('click', () => {
  const files = [...document.querySelectorAll('#files input:checked')].map((input) => input.dataset.file);
  run(files);
});

refresh();
setInterval(refresh, 500);
</script>
</body>
</html>
`;
}

/** Starts the UI mode server. Resolves once listening; close() shuts it down. */
export async function startUiMode(options: TestOptions & { port?: number; host?: string } = {}): Promise<UiModeHandle> {
    const { port = 0, host = '127.0.0.1' } = options;

    const files = options.files ?? findTestFiles(process.cwd(), options.include, options.exclude ?? ['**/node_modules/**', '**/dist/**', '**/coverage/**']);

    const state: UiState = {
        running: false,
        files,
        results: [],
        lastStartedAt: undefined,
        lastFinishedAt: undefined,
        lastSummary: undefined,
    };

    const collector: TestReporterLifecycle = {
        onTestResult: (result: TestResult) => {
            state.results.push({
                name: result.name,
                status: result.status as UiTestResult['status'],
                duration: result.duration,
                suite: result.suite,
                file: result.file,
                error: result.error?.message,
            });
        },
    };

    const sendJson = (res: ServerResponse, payload: unknown): void => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(payload));
    };

    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
        void (async () => {
            const url = (req.url ?? '/').split('?')[0];

            if (req.method === 'GET' && url === '/') {
                res.writeHead(200, { 'content-type': 'text/html' });
                res.end(buildUiHtml());
                return;
            }

            if (req.method === 'GET' && url === '/api/state') {
                sendJson(res, state);
                return;
            }

            if (req.method === 'POST' && url === '/api/run') {
                if (state.running) {
                    sendJson(res, { started: false, reason: 'already running' });
                    return;
                }
                const body = await readJsonBody(req);
                const requested = Array.isArray(body.files) ? (body.files as string[]) : undefined;
                const chosen = requested && requested.length > 0 ? requested : state.files;

                state.running = true;
                state.results = [];
                state.lastStartedAt = Date.now();
                state.lastFinishedAt = undefined;
                state.lastSummary = undefined;
                sendJson(res, { started: true, files: chosen });

                void runJestTests({
                    ...options,
                    files: chosen,
                    reporter: collector,
                    // Keep the host process's globals (a UI run can be nested in
                    // an outer test); the runner still sets globals per file.
                    globals: false,
                }).then((summary) => {
                    state.running = false;
                    state.lastFinishedAt = Date.now();
                    state.lastSummary = { passed: summary.passed, failed: summary.failed, total: summary.total };
                }).catch(() => {
                    state.running = false;
                    state.lastFinishedAt = Date.now();
                });
                return;
            }

            res.writeHead(404, { 'content-type': 'text/plain' });
            res.end('Not Found');
        })();
    });

    await new Promise<void>((resolvePromise) => {
        server.listen(port, host, resolvePromise);
    });

    const address = server.address();
    const boundPort = address && typeof address === 'object' ? address.port : port;

    return {
        url: `http://${host}:${boundPort}`,
        port: boundPort,
        server,
        state,
        close: () =>
            new Promise<void>((resolvePromise) => {
                server.close(() => resolvePromise());
                setTimeout(resolvePromise, 1500);
            }),
    };
}
