import { mkdirSync, writeFileSync } from '@elitjs/fs';
import { join } from '@elitjs/path';

import type { TestResult } from '../runtime';
import type { TestReporterLifecycle } from '../test/reporter-factory';

/**
 * Writes a self-contained HTML report (default ./e2e-report/index.html) —
 * open it directly or via `elit e2e show-report`.
 */
export class HtmlReporter implements TestReporterLifecycle {
    constructor(private readonly outputDir: string = 'e2e-report') {}

    onRunEnd(results: TestResult[]): void {
        const passed = results.filter((result) => result.status === 'pass').length;
        const failed = results.filter((result) => result.status === 'fail').length;
        const skipped = results.filter((result) => result.status === 'skip').length + results.filter((result) => result.status === 'todo').length;
        const duration = results.reduce((sum, result) => sum + result.duration, 0);

        const payload = results.map((result) => ({
            status: result.status,
            name: result.name,
            suite: result.suite,
            file: result.file,
            duration: result.duration,
            error: result.error ? { message: result.error.message, stack: result.error.stack } : undefined,
        }));

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Elit Test Report</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 0; background: #0f172a; color: #e2e8f0; }
  header { padding: 24px 32px; border-bottom: 1px solid #1e293b; display: flex; gap: 32px; align-items: baseline; }
  h1 { font-size: 20px; margin: 0; }
  .stat { font-size: 14px; }
  .ok { color: #4ade80; } .bad { color: #f87171; } .skip { color: #facc15; }
  ul { list-style: none; margin: 0; padding: 0; }
  li { padding: 10px 32px; border-bottom: 1px solid #1e293b; display: flex; gap: 12px; align-items: baseline; }
  li .name { flex: 1; }
  li .meta { color: #64748b; font-size: 12px; }
  details { margin: 0 32px 12px 60px; }
  pre { background: #1e293b; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; }
</style>
</head>
<body>
<header>
  <h1>Elit Test Report</h1>
  <span class="stat ok">${passed} passed</span>
  <span class="stat bad">${failed} failed</span>
  <span class="stat skip">${skipped} skipped</span>
  <span class="stat">${(duration / 1000).toFixed(1)}s</span>
</header>
<ul id="results"></ul>
<script>
const results = ${JSON.stringify(payload)};
const icons = { pass: '\\u2705', fail: '\\u274c', skip: '\\u26a0\\ufe0f', todo: '\\u23f3' };
const list = document.getElementById('results');
for (const item of results) {
  const li = document.createElement('li');
  li.innerHTML = '<span>' + (icons[item.status] || '') + '</span>'
    + '<span class="name">' + (item.name || '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    + (item.suite ? ' <span class="meta">' + item.suite + '</span>' : '') + '</span>'
    + '<span class="meta">' + (item.duration || 0) + 'ms</span>';
  list.appendChild(li);
  if (item.error) {
    const details = document.createElement('details');
    details.innerHTML = '<summary>' + (item.error.message || 'failed').replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</summary><pre>'
      + ((item.error.stack || '')).replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</pre>';
    list.appendChild(details);
  }
}
</script>
</body>
</html>
`;

        mkdirSync(this.outputDir, { recursive: true });
        writeFileSync(join(this.outputDir, 'index.html'), html);
        console.log(`\n HTML report written to ${join(this.outputDir, 'index.html')}\n`);
    }
}
