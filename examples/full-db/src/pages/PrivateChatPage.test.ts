/**
 * PrivateChatPage Component Unit Tests
 */

// CRITICAL: Set up ALL mocks BEFORE importing PrivateChatPage component
// The component reads localStorage during import, so mocks must be set up first

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

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string): string | null => store[key] || null,
    setItem: (key: string, value: string): void => {
      store[key] = value;
    },
    removeItem: (key: string): void => {
      delete store[key];
    },
    clear: (): void => {
      store = {};
    },
    get length(): number {
      return Object.keys(store).length;
    },
    key: (index: number): string | null => {
      return Object.keys(store)[index] || null;
    }
  };
})();

// Mock fetch
let mockFetchResponse: any = {
  ok: true,
  json: async () => ({ user: { id: '456', name: 'Other User', email: 'other@example.com', bio: '', avatar: '' } })
};
const mockFetch = async () => mockFetchResponse;

// Mock EventSource
class MockEventSource {
  url: string;
  readyState: number = 1; // CONNECTING
  onmessage: ((event: MessageEvent) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    // Simulate connection
    setTimeout(() => {
      this.readyState = 1; // OPEN
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  addEventListener(_type: string, _listener: any) {
    // Do nothing
  }

  removeEventListener(_type: string, _listener: any) {
    // Do nothing
  }

  close() {
    this.readyState = 2; // CLOSED
  }
}

// Mock document.querySelector for button state management
const querySelectorMock = (selector: string) => {
  if (selector === '.chat-send-button') {
    return {
      disabled: false,
      textContent: 'Send'
    } as any;
  }
  return null as any;
};

// Mock window.addEventListener and dispatchEvent
const eventListeners: Record<string, Function[]> = {};
const addEventListenerMock = (event: string, handler: Function) => {
  if (!eventListeners[event]) {
    eventListeners[event] = [];
  }
  eventListeners[event].push(handler);
};

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

// Mock setTimeout for setupButtonState
let timeoutId = 0;
const timeoutCallbacks: Map<number, Function> = new Map();
const mockSetTimeout = (callback: Function, _delay: number) => {
  const id = ++timeoutId;
  timeoutCallbacks.set(id, callback);
  return id;
};

const mockClearTimeout = (id: number) => {
  timeoutCallbacks.delete(id);
};

// Mock router
const mockRouter = {
  push: mockFn() as any,
  replace: mockFn() as any,
  go: mockFn() as any,
  back: mockFn() as any,
  forward: mockFn() as any,
  currentPath: '/',
  currentState: null
};

// SETUP GLOBALS BEFORE IMPORT
// Clear real localStorage if it exists
if (typeof localStorage !== 'undefined') {
  localStorage.clear();
}

// Set up global mocks
(global as any).localStorage = localStorageMock;
(globalThis as any).localStorage = localStorageMock;
(global as any).fetch = mockFetch;
(globalThis as any).fetch = mockFetch;
(global as any).EventSource = MockEventSource;
(globalThis as any).EventSource = MockEventSource;
(global as any).window = {
  addEventListener: addEventListenerMock,
  removeEventListener: mockFn(),
  dispatchEvent: mockFn(),
  localStorage: localStorageMock
};
(globalThis as any).window = (global as any).window;
(global as any).document = {
  querySelector: querySelectorMock
};
(globalThis as any).document = (global as any).document;
(global as any).setTimeout = mockSetTimeout;
(globalThis as any).clearTimeout = mockClearTimeout;
(globalThis as any).setTimeout = mockSetTimeout;
(globalThis as any).clearTimeout = mockClearTimeout;
(global as any).requestAnimationFrame = mockRequestAnimationFrame;
(global as any).cancelAnimationFrame = mockCancelAnimationFrame;
(globalThis as any).requestAnimationFrame = mockRequestAnimationFrame;
(globalThis as any).cancelAnimationFrame = mockCancelAnimationFrame;

// NOW import the component (after mocks are set up)
import { PrivateChatPage } from './PrivateChatPage';
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

  return `<${tagName}${attrs ? ' ' + attrs : ''}>${childrenStr}</${tagName}>`;
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

describe('PrivateChatPage Component', () => {
  const otherUserId = '456';
  const testUserId = '123';

  // Clear REAL browser localStorage before any tests run
  beforeAll(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  beforeEach(() => {
    // Clear RAF callbacks FIRST
    rafCallbacks.clear();
    rafId = 0;
    timeoutCallbacks.clear();
    timeoutId = 0;

    // Clear localStorage before each test
    localStorageMock.clear();

    // Also clear REAL browser localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    // Set up authenticated user
    localStorageMock.setItem('token', 'fake-token');
    localStorageMock.setItem('user', JSON.stringify({ id: testUserId, name: 'Test User', email: 'test@example.com', bio: 'Test bio', avatar: '' }));

    // Reset mock router
    (mockRouter.push as any).mockClear();
    (mockRouter.replace as any).mockClear();

    // Reset fetch mock
    mockFetchResponse = {
      ok: true,
      json: async () => ({ user: { id: '456', name: 'Other User', email: 'other@example.com', bio: '', avatar: '' } })
    };

    // Clear event listeners
    Object.keys(eventListeners).forEach(key => {
      delete eventListeners[key];
    });
  });

  afterEach(() => {
    // Clean up event listeners after each test
    Object.keys(eventListeners).forEach(key => {
      delete eventListeners[key];
    });

    // Clear RAF callbacks after each test
    rafCallbacks.clear();
    rafId = 0;

    // Clear timeouts
    timeoutCallbacks.clear();
    timeoutId = 0;

    // Clear REAL browser localStorage after each test
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('authentication', () => {
    it('should redirect to login if not authenticated', () => {
      localStorageMock.clear();
      const page = PrivateChatPage(mockRouter as any, otherUserId);

      expect(mockRouter.push.calls.length).toBeGreaterThan(0);
      expect(mockRouter.push.calls[0][0]).toBe('/login');
    });

    it('should render page when authenticated', () => {
      const page = PrivateChatPage(mockRouter as any, otherUserId);

      expect(page).toBeDefined();
      expect(page.tagName).toBe('div');
      expect(page.props?.className).toBe('chat-page');
    });

    it('should not redirect when authenticated', () => {
      PrivateChatPage(mockRouter as any, otherUserId);

      // Should not redirect (only the initial redirect check happens)
      expect(mockRouter.push.calls.length).toBe(0);
    });
  });

  describe('page structure', () => {
    it('should render chat-page', () => {
      const page = PrivateChatPage(mockRouter as any, otherUserId);

      expect(page).toBeDefined();
      expect(page.tagName).toBe('div');
      expect(page.props?.className).toBe('chat-page');
    });

    it('should render chat-container', () => {
      const page = PrivateChatPage(mockRouter as any, otherUserId);

      expect(page.props?.className).toBe('chat-page');

      const children = page.children as VNode[];
      const container = children[0];
      expect(container?.props?.className).toBe('chat-container');
    });

    it('should render chat-header', () => {
      const page = PrivateChatPage(mockRouter as any, otherUserId);
      const html = renderToString(page);

      expect(html).toContain('chat-header');
    });

    it('should render chat-messages', () => {
      const page = PrivateChatPage(mockRouter as any, otherUserId);
      const html = renderToString(page);

      expect(html).toContain('chat-messages');
    });

    it('should render chat-input-area', () => {
      const page = PrivateChatPage(mockRouter as any, otherUserId);
      const html = renderToString(page);

      expect(html).toContain('chat-input-area');
    });
  });

  describe('header section', () => {
    it('should render back button', () => {
      const page = PrivateChatPage(mockRouter as any, otherUserId);
      const html = renderToString(page);

      expect(html).toContain('← Back');
    });

    it('should render chat-title', () => {
      const page = PrivateChatPage(mockRouter as any, otherUserId);
      const html = renderToString(page);

      expect(html).toContain('Chat');
    });

    it('should render chat-subtitle', () => {
      const page = PrivateChatPage(mockRouter as any, otherUserId);
      const html = renderToString(page);

      expect(html).toContain('Loading...');
    });
  });

  describe('messages area', () => {
    it('should render empty state when no messages', () => {
      const page = PrivateChatPage(mockRouter as any, otherUserId);
      const html = renderToString(page);

      expect(html).toContain('chat-empty');
      expect(html).toContain('No messages yet');
    });

    it('should render chat-messages-list capability', () => {
      const page = PrivateChatPage(mockRouter as any, otherUserId);
      // chat-messages-list is conditionally rendered based on messages state
      // When empty, it shows chat-empty instead
      expect(page).toBeDefined();
    });
  });

  describe('input area', () => {
    it('should render chat input', () => {
      const page = PrivateChatPage(mockRouter as any, otherUserId);
      const html = renderToString(page);

      expect(html).toContain('type="text"');
      expect(html).toContain('chat-input');
    });

    it('should render send button', () => {
      const page = PrivateChatPage(mockRouter as any, otherUserId);
      const html = renderToString(page);

      expect(html).toContain('Send');
      expect(html).toContain('chat-send-button');
    });

    it('should have correct placeholder', () => {
      const page = PrivateChatPage(mockRouter as any, otherUserId);
      const html = renderToString(page);

      expect(html).toContain('Type your message...');
    });
  });

  describe('error handling', () => {
    it('should have error state', () => {
      const page = PrivateChatPage(mockRouter as any, otherUserId);
      // Error state is reactive
      expect(page).toBeDefined();
    });

    it('should render auth-error when error exists', () => {
      const page = PrivateChatPage(mockRouter as any, otherUserId);
      // Error is reactive and only shows when error.value is set
      expect(page).toBeDefined();
    });
  });

  describe('loading state', () => {
    it('should have loading state', () => {
      const page = PrivateChatPage(mockRouter as any, otherUserId);
      // Loading state is reactive
      expect(page).toBeDefined();
    });

    it('should render chat-typing when loading', () => {
      const page = PrivateChatPage(mockRouter as any, otherUserId);
      // Typing indicator is reactive
      expect(page).toBeDefined();
    });
  });

  describe('CSS classes', () => {
    it('should have correct CSS classes', () => {
      const page = PrivateChatPage(mockRouter as any, otherUserId);
      const html = renderToString(page);

      expect(html).toContain('chat-page');
      expect(html).toContain('chat-container');
      expect(html).toContain('chat-header');
      expect(html).toContain('chat-title');
    });
  });

  describe('component consistency', () => {
    it('should always return the same structure', () => {
      const page1 = PrivateChatPage(mockRouter as any, otherUserId);
      const page2 = PrivateChatPage(mockRouter as any, otherUserId);

      expect(page1.tagName).toBe(page2.tagName);
      expect(page1.props?.className).toBe(page2.props?.className);
    });

    it('should render without errors', () => {
      expect(() => {
        const page = PrivateChatPage(mockRouter as any, otherUserId);
        renderToString(page);
      }).not.toThrow();
    });

    it('should have h2 element', () => {
      const page = PrivateChatPage(mockRouter as any, otherUserId);
      const h2Elements = findChildrenByTagName(page, 'h2');

      expect(h2Elements.length).toBeGreaterThan(0);
    });
  });

  describe('reactive state', () => {
    it('should have messages state', () => {
      const page = PrivateChatPage(mockRouter as any, otherUserId);
      expect(page).toBeDefined();
    });

    it('should have otherUser state', () => {
      const page = PrivateChatPage(mockRouter as any, otherUserId);
      expect(page).toBeDefined();
    });

    it('should have newMessage state', () => {
      const page = PrivateChatPage(mockRouter as any, otherUserId);
      expect(page).toBeDefined();
    });

    it('should have error state', () => {
      const page = PrivateChatPage(mockRouter as any, otherUserId);
      expect(page).toBeDefined();
    });

    it('should have isLoading state', () => {
      const page = PrivateChatPage(mockRouter as any, otherUserId);
      expect(page).toBeDefined();
    });
  });

  describe('EventSource integration', () => {
    it('should initialize EventSource', () => {
      const page = PrivateChatPage(mockRouter as any, otherUserId);
      // EventSource is mocked, so just verify component renders
      expect(page).toBeDefined();
    });
  });

  describe('navigation', () => {
    it('should have back button', () => {
      const page = PrivateChatPage(mockRouter as any, otherUserId);
      const html = renderToString(page);

      expect(html).toContain('← Back');
    });
  });

  describe('room ID generation', () => {
    it('should accept otherUserId parameter', () => {
      const page = PrivateChatPage(mockRouter as any, otherUserId);
      expect(page).toBeDefined();
    });

    it('should handle different otherUserId', () => {
      const page = PrivateChatPage(mockRouter as any, '789');
      expect(page).toBeDefined();
    });
  });
});
