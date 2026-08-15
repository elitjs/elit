/**
 * Playwright-style selector engine — CSS by default, plus `text=`, `role=`,
 * and `testid=` queries that also back page.getByRole/getByText/getByTestId.
 */

export interface E2ETextQuery {
  kind: 'text';
  value: string;
  exact?: boolean;
}

export interface E2ERoleQuery {
  kind: 'role';
  role: string;
  name?: string;
  exact?: boolean;
}

export interface E2ETestIdQuery {
  kind: 'testid';
  value: string;
}

export interface E2ECssQuery {
  kind: 'css';
  value: string;
}

export type E2ESelectorQuery = E2ETextQuery | E2ERoleQuery | E2ETestIdQuery | E2ECssQuery;

/**
 * Parses a selector string. Plain strings stay CSS; `text=Hello`, `role=button`,
 * `role=button[name="Submit"]`, and `testid=submit` map to engine queries.
 */
export function parseSelector(selector: string): E2ESelectorQuery {
  if (selector.startsWith('text=')) {
    return { kind: 'text', value: selector.slice('text='.length) };
  }
  if (selector.startsWith('testid=')) {
    return { kind: 'testid', value: selector.slice('testid='.length) };
  }
  if (selector.startsWith('role=')) {
    const rolePart = selector.slice('role='.length);
    const nameMatch = rolePart.match(/^([^\[]+)\[name="(.*)"\]$/);
    if (nameMatch) {
      return { kind: 'role', role: nameMatch[1].trim(), name: nameMatch[2] };
    }
    return { kind: 'role', role: rolePart.trim() };
  }
  return { kind: 'css', value: selector };
}

/**
 * Serializes a query into a self-contained JS expression that evaluates to the
 * array of matching elements (empty array when nothing matches). Runs against
 * `document` in whichever execution context it is evaluated in — main frame or iframe.
 */
export function matcherSource(query: E2ESelectorQuery): string {
  return `(function () {
  const q = ${JSON.stringify(query)};
  function roleOf(el) {
    const explicit = el.getAttribute && el.getAttribute('role');
    if (explicit) return explicit.toLowerCase();
    const tag = el.tagName ? el.tagName.toLowerCase() : '';
    const type = ((el.getAttribute && el.getAttribute('type')) || '').toLowerCase();
    if (tag === 'button') return 'button';
    if (tag === 'a' && el.hasAttribute('href')) return 'link';
    if (tag === 'area' && el.hasAttribute('href')) return 'link';
    if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') return 'heading';
    if (tag === 'img') return 'img';
    if (tag === 'ul' || tag === 'ol') return 'list';
    if (tag === 'li') return 'listitem';
    if (tag === 'nav') return 'navigation';
    if (tag === 'main') return 'main';
    if (tag === 'header') return 'banner';
    if (tag === 'footer') return 'contentinfo';
    if (tag === 'form') return 'form';
    if (tag === 'table') return 'table';
    if (tag === 'textarea') return 'textbox';
    if (tag === 'select') return 'combobox';
    if (tag === 'option') return 'option';
    if (tag === 'input') {
      if (type === 'checkbox') return 'checkbox';
      if (type === 'radio') return 'radio';
      if (type === 'button' || type === 'submit' || type === 'reset' || type === 'image') return 'button';
      return 'textbox';
    }
    return null;
  }
  function accessibleName(el) {
    const labelledBy = el.getAttribute && el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labels = labelledBy.split(/\\s+/)
        .map((id) => document.getElementById(id))
        .filter(Boolean)
        .map((node) => (node.textContent || '').trim())
        .join(' ');
      if (labels) return labels;
    }
    const aria = el.getAttribute && el.getAttribute('aria-label');
    if (aria) return aria.trim();
    const text = (el.textContent || '').trim();
    if (text) return text;
    const value = el.value;
    if (typeof value === 'string' && value) return value.trim();
    const title = el.getAttribute && el.getAttribute('title');
    if (title) return title.trim();
    return '';
  }
  function matches(el) {
    if (q.kind === 'testid') {
      return Boolean(el.getAttribute && el.getAttribute('data-testid')) && el.getAttribute('data-testid') === q.value;
    }
    if (q.kind === 'text') {
      const text = (el.textContent || '').trim();
      return q.exact ? text === q.value.trim() : text.includes(q.value.trim());
    }
    if (q.kind === 'role') {
      if (roleOf(el) !== q.role.toLowerCase()) return false;
      if (q.name !== undefined) {
        const name = accessibleName(el);
        return q.exact ? name === q.name : name.toLowerCase().includes(q.name.toLowerCase());
      }
      return true;
    }
    return false;
  }
  let matched;
  if (q.kind === 'css') {
    matched = Array.from(document.querySelectorAll(q.value));
  } else if (q.kind === 'testid') {
    matched = Array.from(document.querySelectorAll('[data-testid]')).filter(matches);
  } else {
    matched = Array.from(document.querySelectorAll('*')).filter(matches);
    if (q.kind === 'text') {
      matched = matched.filter((el) => !matched.some((other) => other !== el && el.contains(other)));
    }
  }
  return matched;
})()`;
}
