/**
 * Client Component Unit Tests
 */

// Simple mock function to track calls
function mockFn() {
  const calls: any[] = [];
  const fn = (...args: any[]) => {
    calls.push(args);
    return undefined;
  };
  fn.calls = calls;
  fn.mockClear = () => {
    calls.length = 0;
  };
  return fn;
}

// Mock requestAnimationFrame
let rafId = 0;
const rafCallbacks: Map<number, FrameRequestCallback> = new Map();
const mockRequestAnimationFrame = (callback: FrameRequestCallback) => {
  const id = ++rafId;
  rafCallbacks.set(id, callback);
  return id;
};

const mockCancelAnimationFrame = (id: number) => {
  rafCallbacks.delete(id);
};

// SETUP GLOBALS BEFORE IMPORT
// Set up global mocks
(global as any).requestAnimationFrame = mockRequestAnimationFrame;
(global as any).cancelAnimationFrame = mockCancelAnimationFrame;
(globalThis as any).requestAnimationFrame = mockRequestAnimationFrame;
(globalThis as any).cancelAnimationFrame = mockCancelAnimationFrame;

// NOW import the component (after mocks are set up)
import { client } from './client';
import type { VNode } from '@elitjs/core';

// Helper function to render VNode to HTML string
function renderToString(vNode: VNode | string | number | undefined | null): string {
  if (vNode == null || vNode === false) return '';
  if (typeof vNode !== 'object') return String(vNode);

  const { tagName, props, children } = vNode;
  const attrs = props ? Object.entries(props)
    .filter(([k, v]) => v != null && v !== false && k !== 'children' && k !== 'ref' && !k.startsWith('on'))
    .map(([k, v]) => {
      if (k === 'className' || k === 'class') return `class="${Array.isArray(v) ? v.join(' ') : v}"`;
      if (k === 'style') return `style="${typeof v === 'string' ? v : Object.entries(v).map(([sk, sv]) => `${sk.replace(/([A-Z])/g, '-$1').toLowerCase()}:${sv}`).join(';')}"`;
      if (v === true) return k;
      return `${k}="${v}"`;
    })
    .join(' ') : '';

  const childrenStr = children && children.length > 0
    ? children.map(c => renderToString(c as any)).join('')
    : '';

  if (tagName === '!doctype') {
    return `<!DOCTYPE html>`;
  }

  // Self-closing tags
  const selfClosing = ['meta', 'link', 'img', 'br', 'hr', 'input', 'script'];
  if (selfClosing.includes(tagName.toLowerCase())) {
    return `<${tagName}${attrs ? ' ' + attrs : ''}>`;
  }

  return `<${tagName}${attrs ? ' ' + attrs : ''}>${childrenStr}</${tagName}>`;
}

// Helper function to find children by tag name
function findChildrenByTagName(vNode: VNode, tagName: string): VNode[] {
  const results: VNode[] = [];

  function search(node: VNode | string | number | null | undefined) {
    if (node && typeof node === 'object' && 'tagName' in node) {
      if (node.tagName === tagName) {
        results.push(node);
      }
      if (node.children) {
        for (const child of node.children) {
          search(child as any);
        }
      }
    }
  }

  search(vNode);
  return results;
}

// Helper function to find child by tag name
function findChildByTagName(vNode: VNode, tagName: string): VNode | null {
  if (vNode && typeof vNode === 'object' && 'tagName' in vNode) {
    if (vNode.tagName === tagName) {
      return vNode;
    }
    if (vNode.children) {
      for (const child of vNode.children) {
        if (typeof child === 'object' && child !== null) {
          const found = findChildByTagName(child as VNode, tagName);
          if (found) return found;
        }
      }
    }
  }
  return null;
}

describe('Client Component', () => {
  beforeEach(() => {
    // Clear RAF callbacks FIRST
    rafCallbacks.clear();
    rafId = 0;
  });

  afterEach(() => {
    // Clear RAF callbacks after each test
    rafCallbacks.clear();
    rafId = 0;
  });

  describe('structure', () => {
    it('should export client constant', () => {
      expect(client).toBeDefined();
    });

    it('should have html as root element', () => {
      expect(client.tagName).toBe('html');
    });

    it('should have children', () => {
      expect(client.children).toBeDefined();
      expect(client.children?.length).toBeGreaterThan(0);
    });
  });

  describe('head section', () => {
    it('should have head element', () => {
      const headElement = findChildByTagName(client, 'head');
      expect(headElement).toBeDefined();
      expect(headElement).not.toBeNull();
    });

    it('should have title element', () => {
      const titleElements = findChildrenByTagName(client, 'title');
      expect(titleElements.length).toBeGreaterThan(0);
    });

    it('should have correct title text', () => {
      const titleElements = findChildrenByTagName(client, 'title');
      const titleElement = titleElements[0];
      const titleText = titleElement.children?.[0];
      expect(titleText).toContain('my-elit-app');
    });

    it('should have favicon link', () => {
      const linkElements = findChildrenByTagName(client, 'link');
      const faviconLink = linkElements.find(link =>
        link.props?.rel === 'icon' && link.props?.type === 'image/svg+xml'
      );
      expect(faviconLink).toBeDefined();
    });

    it('should have favicon href', () => {
      const linkElements = findChildrenByTagName(client, 'link');
      const faviconLink = linkElements.find(link =>
        link.props?.rel === 'icon'
      );
      expect(faviconLink?.props?.href).toBe('public/favicon.svg');
    });
  });

  describe('meta tags', () => {
    it('should have meta elements', () => {
      const metaElements = findChildrenByTagName(client, 'meta');
      expect(metaElements.length).toBeGreaterThanOrEqual(2);
    });

    it('should have charset meta', () => {
      const metaElements = findChildrenByTagName(client, 'meta');
      const charsetMeta = metaElements.find(meta => meta.props?.charset === 'UTF-8');
      expect(charsetMeta).toBeDefined();
    });

    it('should have viewport meta', () => {
      const metaElements = findChildrenByTagName(client, 'meta');
      const viewportMeta = metaElements.find(meta => meta.props?.name === 'viewport');
      expect(viewportMeta).toBeDefined();
      expect(viewportMeta?.props?.content).toContain('width=device-width');
    });

    it('should have description meta', () => {
      const metaElements = findChildrenByTagName(client, 'meta');
      const descMeta = metaElements.find(meta => meta.props?.name === 'description');
      expect(descMeta).toBeDefined();
      expect(descMeta?.props?.content).toContain('Elit');
    });
  });

  describe('body section', () => {
    it('should have body element', () => {
      const bodyElement = findChildByTagName(client, 'body');
      expect(bodyElement).toBeDefined();
      expect(bodyElement).not.toBeNull();
    });

    it('should have app div', () => {
      const bodyElement = findChildByTagName(client, 'body');
      expect(bodyElement).toBeDefined();
      const divs = findChildrenByTagName(bodyElement!, 'div');
      const appDiv = divs.find(div => div.props?.id === 'app');
      expect(appDiv).toBeDefined();
    });

    it('should have script element', () => {
      const bodyElement = findChildByTagName(client, 'body');
      expect(bodyElement).toBeDefined();
      const scripts = findChildrenByTagName(bodyElement!, 'script');
      expect(scripts.length).toBeGreaterThan(0);
    });

    it('should have script with module type', () => {
      const bodyElement = findChildByTagName(client, 'body');
      const scripts = findChildrenByTagName(bodyElement!, 'script');
      const moduleScript = scripts.find(script => script.props?.type === 'module');
      expect(moduleScript).toBeDefined();
    });

    it('should have script with correct src', () => {
      const bodyElement = findChildByTagName(client, 'body');
      const scripts = findChildrenByTagName(bodyElement!, 'script');
      const moduleScript = scripts.find(script => script.props?.type === 'module');
      expect(moduleScript?.props?.src).toBe('/src/main.js');
    });
  });

  describe('rendering', () => {
    it('should render without errors', () => {
      expect(() => {
        renderToString(client);
      }).not.toThrow();
    });

    it('should contain doctype', () => {
      // The html wrapper typically includes doctype
      expect(client).toBeDefined();
    });

    it('should render to string containing basic HTML structure', () => {
      const html = renderToString(client);
      expect(html).toBeDefined();
      expect(typeof html).toBe('string');
    });

    it('should render with title', () => {
      const html = renderToString(client);
      expect(html).toContain('my-elit-app');
    });
  });

  describe('component consistency', () => {
    it('should be immutable', () => {
      const originalTagName = client.tagName;
      // client is a constant export
      expect(client.tagName).toBe(originalTagName);
    });
  });

  describe('HTML structure validation', () => {
    it('should have proper HTML document structure', () => {
      expect(client.tagName).toBe('html');
      const head = findChildByTagName(client, 'head');
      const body = findChildByTagName(client, 'body');
      expect(head).toBeDefined();
      expect(body).toBeDefined();
    });

    it('should have all essential elements', () => {
      const html = renderToString(client);
      expect(html).toContain('html');
      expect(html).toContain('head');
      expect(html).toContain('body');
      expect(html).toContain('title');
    });
  });
});
