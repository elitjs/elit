/**
 * Trace recording: every page action captured with a screenshot, dumped as a
 * self-contained HTML viewer when a test fails. Open via `elit e2e show-trace`.
 */

export interface E2ETraceStep {
  /** Action name: goto / click / fill / press / hover / dblclick / start. */
  action: string;
  /** Selector or URL detail for the action. */
  detail?: string;
  /** Milliseconds since tracing started. */
  timestamp: number;
  /** Base64 PNG screenshot taken right after the action. */
  screenshot?: string;
}

export interface E2ETrace {
  name: string;
  url: string;
  startedAt: number;
  steps: E2ETraceStep[];
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Builds a single-file HTML viewer: step list + screenshot stage + arrow navigation. */
export function buildTraceViewerHtml(trace: E2ETrace): string {
  const stepsJson = JSON.stringify(trace.steps);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Elit Trace — ${escapeHtml(trace.name)}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 0; background: #0f172a; color: #e2e8f0; display: flex; height: 100vh; }
  aside { width: 300px; border-right: 1px solid #1e293b; overflow-y: auto; }
  aside h1 { font-size: 14px; padding: 16px; margin: 0; border-bottom: 1px solid #1e293b; color: #94a3b8; }
  .step { padding: 10px 16px; border-bottom: 1px solid #1e293b; cursor: pointer; display: flex; gap: 8px; align-items: baseline; }
  .step:hover { background: #1e293b; }
  .step.active { background: #334155; border-left: 3px solid #38bdf8; }
  .step .action { font-weight: 600; color: #38bdf8; }
  .step .detail { color: #94a3b8; font-size: 12px; word-break: break-all; }
  .step .time { margin-left: auto; color: #64748b; font-size: 11px; }
  main { flex: 1; display: flex; flex-direction: column; }
  .stage { flex: 1; display: flex; align-items: center; justify-content: center; background: #020617; overflow: auto; }
  .stage img { max-width: 100%; max-height: 100%; }
  nav { display: flex; gap: 12px; align-items: center; padding: 12px 24px; border-top: 1px solid #1e293b; }
  nav button { background: #1e293b; color: #e2e8f0; border: 1px solid #334155; border-radius: 6px; padding: 6px 14px; cursor: pointer; }
  nav button:hover { background: #334155; }
  #label { color: #94a3b8; font-size: 13px; }
  .missing { color: #64748b; font-style: italic; }
</style>
</head>
<body>
<aside>
  <h1>${escapeHtml(trace.name)}<br><span style="font-weight:400">${escapeHtml(trace.url)}</span></h1>
  <div id="list"></div>
</aside>
<main>
  <div class="stage"><img id="shot" alt="step screenshot"></div>
  <nav>
    <button id="prev">&larr; Prev</button>
    <button id="next">Next &rarr;</button>
    <span id="label"></span>
  </nav>
</main>
<script>
const steps = ${stepsJson};
let current = Math.max(0, steps.length - 1);
const list = document.getElementById('list');
const shot = document.getElementById('shot');
const label = document.getElementById('label');

steps.forEach((step, index) => {
  const row = document.createElement('div');
  row.className = 'step';
  row.innerHTML = '<span class="action">' + step.action + '</span>'
    + '<span class="detail">' + (step.detail || '') + '</span>'
    + '<span class="time">' + step.timestamp + 'ms</span>';
  row.addEventListener('click', () => select(index));
  list.appendChild(row);
});

function select(index) {
  current = Math.max(0, Math.min(steps.length - 1, index));
  const step = steps[current];
  for (const row of list.children) row.classList.remove('active');
  if (list.children[current]) list.children[current].classList.add('active');
  if (step.screenshot) {
    shot.src = 'data:image/png;base64,' + step.screenshot;
    shot.style.display = '';
  } else {
    shot.style.display = 'none';
  }
  label.textContent = (current + 1) + ' / ' + steps.length + ' — ' + step.action + (step.detail ? ' ' + step.detail : '');
  if (list.children[current]) list.children[current].scrollIntoView({ block: 'nearest' });
}

document.getElementById('prev').addEventListener('click', () => select(current - 1));
document.getElementById('next').addEventListener('click', () => select(current + 1));
document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') select(current - 1);
  if (event.key === 'ArrowRight') select(current + 1);
});

select(current);
</script>
</body>
</html>
`;
}
