import { ServerRouter } from '@elitjs/http';
import { Dom } from '@elitjs/dom';
import { div, h1, h2, p, pre, script, span, style } from '@elitjs/el';

const dom = new Dom();

/** Renders the test page server-side and returns the full HTML */
function renderPage(): string {
  // --- Test cases ---

  // 1. Inline script with single-quotes, ampersands, and angle brackets
  const inlineScript = script(`
(function () {
  var a = 'hello';
  var b = 'world';
  if (a && b) {
    document.getElementById('result-1').textContent = a + ' & ' + b;
  }
}());
`);

  // 2. Template-literal script with comparison operators
  const comparisonScript = script(`
(function () {
  var x = 1;
  var y = 2;
  var el = document.getElementById('result-2');
  if (x < y && y > 0) {
    el.textContent = 'x=' + x + ' < y=' + y + ' ✓';
  }
}());
`);

  // 3. Inline style — should also not be escaped
  const inlineStyle = style(`
body { font-family: sans-serif; padding: 2rem; }
h1 { color: #1a1a1a; }
.card { border: 1px solid #ccc; padding: 1rem; margin: 1rem 0; border-radius: 6px; }
.label { font-weight: bold; color: #555; }
.pass { color: green; }
.fail { color: red; }
pre { background: #f4f4f4; padding: 1rem; border-radius: 4px; white-space: pre-wrap; }
`);

  // 4. Verify-email style URL with = chars (matches the original bug report)
  const urlScript = script(`
(function () {
  var token = '3D3e2ede5eb7194f50b256813ab8c793354120c3578a187c88ee7aa86d594c37d2';
  var url = 'http://localhost:4177/api/auth/verify-email?token=' + token;
  var el = document.getElementById('result-3');
  if (url.indexOf('&#x27;') === -1 && url.indexOf('&amp;') === -1) {
    el.textContent = url + ' ✓';
    el.className = 'pass';
  } else {
    el.textContent = 'ESCAPED: ' + url;
    el.className = 'fail';
  }
}());
`);

  const page = dom.renderToString(
    div(
      inlineStyle,
      h1('script() / style() raw-text rendering test'),
      p('Each card shows a test. Green ✓ = raw text preserved. Red = escaped (bug).'),

      div({ class: 'card' },
        h2('Test 1 — single quotes & ampersand in script'),
        p({ class: 'label' }, "Expected: hello & world"),
        span({ id: 'result-1', class: 'fail' }, 'waiting…'),
        inlineScript,
      ),

      div({ class: 'card' },
        h2('Test 2 — comparison operators < > in script'),
        p({ class: 'label' }, "Expected: x=1 < y=2 ✓"),
        span({ id: 'result-2', class: 'fail' }, 'waiting…'),
        comparisonScript,
      ),

      div({ class: 'card' },
        h2('Test 3 — URL with = token (original bug)'),
        p({ class: 'label' }, "Expected: URL displayed without &#x27; / &amp; escaping"),
        span({ id: 'result-3', class: 'fail' }, 'waiting…'),
        urlScript,
      ),

      div({ class: 'card' },
        h2('Source snapshot (renderToString output)'),
        p('Raw HTML sent to browser — inspect for escaped chars:'),
        pre({ id: 'source-out' }),
        script(`
(function () {
  var pre = document.getElementById('source-out');
  if (pre) pre.textContent = document.documentElement.outerHTML.slice(0, 3000);
}());
`),
      ),
    )
  );

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>script() test</title></head><body>${page}</body></html>`;
}

export const server = new ServerRouter();

server.get('/', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(renderPage());
});

server.get('/api/raw', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(renderPage());
});
