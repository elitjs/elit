import { writeFile } from 'node:fs/promises';

import { openE2EPage, type E2EPage } from './browser';

/**
 * Minimal codegen recorder: drives a real (headed) browser through the CDP
 * primitives on E2EPage, records click/fill/press interactions, and emits a
 * ready-to-run @elitjs/e2e test.
 */

export interface CodegenAction {
    type: 'click' | 'fill' | 'press';
    selector: string;
    value?: string;
    key?: string;
}

export interface CodegenOptions {
    /** Page to record against. */
    url: string;
    /** Where to write the generated test (also printed to stdout). */
    output?: string;
    /** Headed by default — headless exists for automated tests of the recorder itself. */
    headless?: boolean;
}

export interface E2ERecording {
    /** The live page — drive it manually in headless tests. */
    page: E2EPage;
    /** Actions recorded so far. */
    readonly actions: CodegenAction[];
    /** Stops the browser and returns the generated test source. */
    stop(): Promise<string>;
}

// Injected before page scripts on every navigation. Uses the same selector
// strategy as the test engine: data-testid > id > role+name > text.
const RECORDER_SCRIPT = `(function () {
  if (window.__elitCodegenInstalled) return;
  window.__elitCodegenInstalled = true;

  function roleOf(el) {
    const explicit = el.getAttribute && el.getAttribute('role');
    if (explicit) return explicit.toLowerCase();
    const tag = el.tagName ? el.tagName.toLowerCase() : '';
    const type = ((el.getAttribute && el.getAttribute('type')) || '').toLowerCase();
    if (tag === 'button') return 'button';
    if ((tag === 'a' || tag === 'area') && el.hasAttribute('href')) return 'link';
    if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') return 'heading';
    if (tag === 'img') return 'img';
    if (tag === 'textarea') return 'textbox';
    if (tag === 'input') {
      if (type === 'checkbox') return 'checkbox';
      if (type === 'radio') return 'radio';
      if (type === 'button' || type === 'submit' || type === 'reset') return 'button';
      return 'textbox';
    }
    return null;
  }

  function accessibleName(el) {
    const aria = el.getAttribute && el.getAttribute('aria-label');
    if (aria) return aria.trim();
    const text = (el.textContent || '').trim();
    if (text) return text.slice(0, 60);
    const value = el.value;
    if (typeof value === 'string' && value) return value.slice(0, 60);
    return '';
  }

  function selectorFor(el) {
    const testid = el.getAttribute && el.getAttribute('data-testid');
    if (testid) return 'testid=' + testid;
    if (el.id) return '#' + el.id;
    const role = roleOf(el);
    const name = accessibleName(el);
    if (role && name) return 'role=' + role + '[name="' + name + '"]';
    if (role) return 'role=' + role;
    const text = (el.textContent || '').trim().slice(0, 40);
    if (text) return 'text=' + text;
    return el.tagName ? el.tagName.toLowerCase() : 'body';
  }

  function report(action) {
    if (window.__elitCodegen) window.__elitCodegen(JSON.stringify(action));
  }

  document.addEventListener('click', function (event) {
    const target = event.target.closest ? event.target.closest('button, a, input, select, textarea, [role], [data-testid]') : event.target;
    if (target) report({ type: 'click', selector: selectorFor(target) });
  }, true);

  document.addEventListener('change', function (event) {
    const el = event.target;
    if (!el || !el.tagName) return;
    const tag = el.tagName.toLowerCase();
    const type = ((el.getAttribute && el.getAttribute('type')) || '').toLowerCase();
    const isText = tag === 'textarea' || (tag === 'input' && !['checkbox', 'radio', 'file', 'submit', 'button', 'reset', 'image'].includes(type));
    if (isText && el.value) report({ type: 'fill', selector: selectorFor(el), value: el.value });
  }, true);

  document.addEventListener('keydown', function (event) {
    const el = event.target;
    if (event.key === 'Enter' && el && el.tagName && /INPUT|TEXTAREA/.test(el.tagName)) {
      report({ type: 'press', selector: selectorFor(el), key: 'Enter' });
    }
  }, true);
})();`;

/** Serializes recorded actions into a runnable test file. */
export function generateCode(url: string, actions: CodegenAction[]): string {
  const lines = actions.map((action) => {
    switch (action.type) {
      case 'click':
        return `    await page.click(${JSON.stringify(action.selector)});`;
      case 'fill':
        return `    await page.fill(${JSON.stringify(action.selector)}, ${JSON.stringify(action.value ?? '')});`;
      case 'press':
        return `    await page.press(${JSON.stringify(action.selector)}, ${JSON.stringify(action.key ?? 'Enter')});`;
    }
  });

  return `import { openE2EPage } from '@elitjs/e2e';

describe('recorded flow', () => {
    it('walks the recorded steps', async () => {
        const page = await openE2EPage(${JSON.stringify(url)});
        try {
            await page.goto(${JSON.stringify(url)});
${lines.length ? lines.map((line) => '        ' + line).join('\n') : '            // (no interactions were recorded)'}
        } finally {
            await page.close();
        }
    }, 60000);
});
`;
}

/** Starts a recording session — returns the live page plus a stop() that yields the generated test. */
export async function startRecording(options: CodegenOptions): Promise<E2ERecording> {
    const headless = options.headless ?? false;
    const page = await openE2EPage(options.url, { headless });
    const actions: CodegenAction[] = [];

    await page.exposeBinding('__elitCodegen', (payload) => {
        const action = payload as CodegenAction;
        actions.push(action);
        const label = action.type === 'fill' ? `${action.selector} ← "${action.value}"` : `${action.selector}`;
        console.log(`  recorded ${action.type}: ${label}`);
    });
    await page.addInitScript(RECORDER_SCRIPT);

    await page.goto(options.url);

    return {
        page,
        actions,
        stop: async () => {
            // Let in-flight binding events (clicks right before stop) land.
            await new Promise((resolvePromise) => setTimeout(resolvePromise, 200));
            const code = generateCode(options.url, actions);
            await page.close();
            if (options.output) {
                await writeFile(options.output, code);
                console.log(`\nTest written to ${options.output}`);
            }
            return code;
        },
    };
}

/** Records until the user closes the (headed) browser, then emits the generated test. */
export async function recordCodegen(options: CodegenOptions): Promise<string> {
    const recording = await startRecording(options);
    console.log(`Recording ${options.url} — interact with the page, then close the browser to finish.`);
    await recording.page.waitForExit();
    const code = generateCode(options.url, recording.actions);
    if (options.output) {
        await writeFile(options.output, code);
        console.log(`\nTest written to ${options.output}`);
    } else {
        console.log('\n' + code);
    }
    return code;
}
