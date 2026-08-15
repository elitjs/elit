import { body, div, h1, h2, head, html, meta, p, pre, script, span, style, title } from '@elitjs/el';

const inlineStyle = style(`
body { font-family: sans-serif; padding: 2rem; max-width: 860px; margin: 0 auto; }
h1 { color: #1a1a1a; }
h2 { font-size: 1rem; margin: 0 0 0.5rem; }
.card { border: 1px solid #ddd; padding: 1rem 1.25rem; margin: 1rem 0; border-radius: 8px; background: #fff; }
.label { color: #555; margin: 0.25rem 0; }
.pass { color: green; font-weight: bold; }
.fail { color: red; font-weight: bold; }
pre { background: #f4f4f4; padding: 1rem; border-radius: 6px; white-space: pre-wrap; word-break: break-all; font-size: 0.8rem; }
`);

const test1Script = script(`
(function () {
  var a = 'hello';
  var b = 'world';
  var el = document.getElementById('result-1');
  if (a && b) {
    el.textContent = a + ' & ' + b + ' ✓';
    el.className = 'pass';
  }
}());
`);

const test2Script = script(`
(function () {
  var x = 1;
  var y = 2;
  var el = document.getElementById('result-2');
  if (x < y && y > 0) {
    el.textContent = 'x=' + x + ' < y=' + y + ' ✓';
    el.className = 'pass';
  }
}());
`);

const test3Script = script(`
(function () {
  var token = '3D3e2ede5eb7194f50b256813ab8c793354120c3578a187c88ee7aa86d594c37d2';
  var url = 'http://localhost:4177/api/auth/verify-email?token=' + token;
  var el = document.getElementById('result-3');
  var raw = document.getElementById('raw-3').textContent;
  if (raw.indexOf('&#x27;') === -1 && raw.indexOf('&amp;') === -1 && raw.indexOf('&lt;') === -1) {
    el.textContent = url + ' ✓';
    el.className = 'pass';
  } else {
    el.textContent = 'ESCAPED (bug): ' + raw;
    el.className = 'fail';
  }
}());
`);

const sourceScript = script(`
(function () {
  var pre = document.getElementById('source-out');
  if (pre) pre.textContent = document.documentElement.outerHTML.slice(0, 4000);
}());
`);

export const page = html(
  head(
    title('script() / style() SSR test — elit'),
    meta({ charset: 'UTF-8' }),
    meta({ name: 'viewport', content: 'width=device-width, initial-scale=1.0' }),
    inlineStyle,
  ),
  body(
    h1('script() / style() raw-text SSR rendering test'),
    p('Green ✓ = content preserved. Red = HTML-escaped (bug).'),

    div({ class: 'card' },
      h2('Test 1 — single quotes & ampersand in script'),
      p({ class: 'label' }, 'Expected: hello & world ✓'),
      span({ id: 'result-1', class: 'fail' }, 'waiting…'),
      test1Script,
    ),

    div({ class: 'card' },
      h2('Test 2 — comparison operators < > in script'),
      p({ class: 'label' }, 'Expected: x=1 < y=2 ✓'),
      span({ id: 'result-2', class: 'fail' }, 'waiting…'),
      test2Script,
    ),

    div({ class: 'card' },
      h2('Test 3 — verify-email URL with = token (original bug)'),
      p({ class: 'label' }, 'Expected: full URL with no & / \' escaping'),
      span({ id: 'result-3', class: 'fail' }, 'waiting…'),
      // Hidden element holds raw source text for inspection
      pre({ id: 'raw-3', style: 'display:none' },
        `http://localhost:4177/api/auth/verify-email?token=3D3e2ede5eb7194f50b256813ab8c793354120c3578a187c88ee7aa86d594c37d2`,
      ),
      test3Script,
    ),

    div({ class: 'card' },
      h2('Source snapshot'),
      p({ class: 'label' }, 'Raw HTML sent by SSR — inspect for any escaped characters:'),
      pre({ id: 'source-out' }),
      sourceScript,
    ),
  ),
);
