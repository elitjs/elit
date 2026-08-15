/**
 * ChatPage Component Unit Tests
 */

// CRITICAL: Set up ALL mocks BEFORE importing ChatPage component
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
  json: async () => ({ messages: [] })
};
const mockFetch = async () => mockFetchResponse;

// Mock WebSocket - prevent real connection attempts
class MockWebSocket {
  url: string;
  readyState: number = 3; // Start as closed to prevent connection attempts
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    // Immediately close to prevent hanging
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  send(data: string) {
    // Do nothing
    return;
  }

  close() {
    this.readyState = 3;
  }

  addEventListener(_type: string, _listener: any) {
    // Do nothing
  }

  removeEventListener(_type: string, _listener: any) {
    // Do nothing
  }
}

// Mock window.addEventListener
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

// Mock setInterval/clearInterval - don't actually run intervals in tests
let intervalId = 0;
const mockSetInterval = (_callback: () => void, _ms: number) => {
  return ++intervalId;
};

const mockClearInterval = (_id: number) => {
  // Do nothing
};

// Mock location
const mockLocation = {
  host: 'localhost:3000',
  hostname: 'localhost',
  port: '3000',
  protocol: 'http:',
  href: 'http://localhost:3000/',
  origin: 'http://localhost:3000'
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
(global as any).WebSocket = MockWebSocket;
(globalThis as any).WebSocket = MockWebSocket;
(global as any).window = {
  addEventListener: addEventListenerMock,
  removeEventListener: mockFn(),
  localStorage: localStorageMock,
  location: mockLocation
};
(globalThis as any).window = (global as any).window;
(global as any).location = mockLocation;
(globalThis as any).location = mockLocation;
(global as any).setInterval = mockSetInterval;
(globalThis as any).setInterval = mockSetInterval;
(global as any).clearInterval = mockClearInterval;
(globalThis as any).clearInterval = mockClearInterval;
(global as any).requestAnimationFrame = mockRequestAnimationFrame;
(global as any).cancelAnimationFrame = mockCancelAnimationFrame;
(globalThis as any).requestAnimationFrame = mockRequestAnimationFrame;
(globalThis as any).cancelAnimationFrame = mockCancelAnimationFrame;

// NOW import the component (after mocks are set up)
import { ChatPage } from './ChatPage';
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

describe('ChatPage Component', () => {
  // Clear REAL browser localStorage before any tests run
  beforeAll(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  beforeEach(() => {
    // Clear RAF callbacks
    rafCallbacks.clear();
    rafId = 0;

    // Clear localStorage before each test
    localStorageMock.clear();

    // Also clear REAL browser localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    // Reset mock router
    (mockRouter.push as any).mockClear();
    (mockRouter.replace as any).mockClear();

    // Reset fetch mock
    mockFetchResponse = {
      ok: true,
      json: async () => ({ messages: [] })
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

    // Clear REAL browser localStorage after each test
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('authentication', () => {
    it('should render page when authenticated', () => {
      // Set both token and user
      localStorageMock.setItem('token', 'fake-token');
      localStorageMock.setItem('user', JSON.stringify({ id: '123', name: 'Test User', email: 'test@example.com', bio: 'Test bio', avatar: '' }));

      const page = ChatPage(mockRouter as any);

      expect(page).toBeDefined();
      expect(page.tagName).toBe('div');
      expect(page.props?.className).toBe('chat-page');
    });

    it('should not redirect when authenticated', () => {
      localStorageMock.setItem('token', 'fake-token');
      localStorageMock.setItem('user', JSON.stringify({ id: '123', name: 'Test User', email: 'test@example.com', bio: 'Test bio', avatar: '' }));

      ChatPage(mockRouter as any);

      // Should not redirect when authenticated
      expect(mockRouter.push.calls.length).toBe(0);
    });

    it('should handle missing authentication gracefully', () => {
      // Clear authentication
      localStorageMock.clear();

      // Component should still render (may redirect, but shouldn't crash)
      const page = ChatPage(mockRouter as any);
      expect(page).toBeDefined();
    });
  });

  describe('page structure', () => {
    beforeEach(() => {
      localStorageMock.setItem('token', 'fake-token');
      localStorageMock.setItem('user', JSON.stringify({ id: '123', name: 'Test User', email: 'test@example.com', bio: 'Test bio', avatar: '' }));
    });

    it('should render chat-container', () => {
      const page = ChatPage(mockRouter as any);
      expect(page.props?.className).toBe('chat-page');

      // Find the chat-container child
      const children = page.children as VNode[];
      const container = children[0];
      expect(container?.props?.className).toBe('chat-container');
    });

    it('should render chat-header', () => {
      const page = ChatPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('chat-header');
    });

    it('should render page title', () => {
      const page = ChatPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('Chat Room');
    });

    it('should render messages area', () => {
      const page = ChatPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('chat-messages');
    });

    it('should render input area', () => {
      const page = ChatPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('chat-input-area');
      expect(html).toContain('chat-input');
    });

    it('should render send button', () => {
      const page = ChatPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('Send');
      expect(html).toContain('btn-primary');
    });

    it('should render back button', () => {
      const page = ChatPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('Back to Profile');
    });

    it('should have proper CSS classes', () => {
      const page = ChatPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('chat-page');
      expect(html).toContain('chat-container');
      expect(html).toContain('chat-header');
      expect(html).toContain('chat-title');
    });
  });

  describe('message loading', () => {
    beforeEach(() => {
      localStorageMock.setItem('token', 'fake-token');
      localStorageMock.setItem('user', JSON.stringify({ id: '123', name: 'Test User', email: 'test@example.com', bio: 'Test bio', avatar: '' }));
    });

    it('should show empty state when no messages', () => {
      (global as any).fetch = async () => ({
        ok: true,
        json: async () => ({ messages: [] })
      });

      const page = ChatPage(mockRouter as any);

      // Should render without errors
      expect(page).toBeDefined();
      const html = renderToString(page);
      expect(html).toContain('chat-messages');
    });

    it('should call fetch on mount', async () => {
      const fetchSpy = mockFn();
      (global as any).fetch = async () => {
        fetchSpy();
        return {
          ok: true,
          json: async () => ({ messages: [] })
        };
      };

      ChatPage(mockRouter as any);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 50));

      // Fetch should have been called
      expect(fetchSpy.calls.length).toBeGreaterThan(0);
    });
  });

  describe('input functionality', () => {
    beforeEach(() => {
      localStorageMock.setItem('token', 'fake-token');
      localStorageMock.setItem('user', JSON.stringify({ id: '123', name: 'Test User', email: 'test@example.com', bio: 'Test bio', avatar: '' }));
    });

    it('should render text input with correct attributes', () => {
      const page = ChatPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('type="text"');
      expect(html).toContain('chat-input');
      expect(html).toContain('Type your message...');
    });

    it('should have form element', () => {
      const page = ChatPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('<form');
      expect(html).toContain('chat-input-area');
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      localStorageMock.setItem('token', 'fake-token');
      localStorageMock.setItem('user', JSON.stringify({ id: '123', name: 'Test User', email: 'test@example.com', bio: 'Test bio', avatar: '' }));
    });

    it('should handle fetch error gracefully', async () => {
      (global as any).fetch = async () => ({
        ok: false,
        json: async () => ({ messages: [] })
      });

      const page = ChatPage(mockRouter as any);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should handle the error gracefully
      expect(page).toBeDefined();
    });

    it('should handle network error gracefully', async () => {
      (global as any).fetch = async () => {
        throw new Error('Network error');
      };

      const page = ChatPage(mockRouter as any);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should handle the error gracefully
      expect(page).toBeDefined();
    });
  });

  describe('navigation', () => {
    beforeEach(() => {
      localStorageMock.setItem('token', 'fake-token');
      localStorageMock.setItem('user', JSON.stringify({ id: '123', name: 'Test User', email: 'test@example.com', bio: 'Test bio', avatar: '' }));
    });

    it('should have back button that navigates to profile', () => {
      const page = ChatPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('Back to Profile');
      expect(html).toContain('btn-secondary');
    });
  });

  describe('user display', () => {
    beforeEach(() => {
      localStorageMock.setItem('token', 'fake-token');
      localStorageMock.setItem('user', JSON.stringify({ id: '123', name: 'Test User', email: 'test@example.com', bio: 'Test bio', avatar: '' }));
    });

    it('should display user name in header', () => {
      const page = ChatPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('Logged in as Test User');
    });

    it('should show logged in user name', () => {
      const page = ChatPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('Test User');
    });
  });

  describe('component consistency', () => {
    beforeEach(() => {
      localStorageMock.setItem('token', 'fake-token');
      localStorageMock.setItem('user', JSON.stringify({ id: '123', name: 'Test User', email: 'test@example.com', bio: 'Test bio', avatar: '' }));
    });

    it('should always return the same structure', () => {
      const page1 = ChatPage(mockRouter as any);
      const page2 = ChatPage(mockRouter as any);

      expect(page1.tagName).toBe(page2.tagName);
      expect(page1.props?.className).toBe(page2.props?.className);
    });

    it('should render without errors', () => {
      expect(() => {
        const page = ChatPage(mockRouter as any);
        renderToString(page);
      }).not.toThrow();
    });
  });

  describe('shared state integration', () => {
    beforeEach(() => {
      localStorageMock.setItem('token', 'fake-token');
      localStorageMock.setItem('user', JSON.stringify({ id: '123', name: 'Test User', email: 'test@example.com', bio: 'Test bio', avatar: '' }));
    });

    it('should initialize shared state for messages', () => {
      // Mock location to return correct host
      (global as any).location = mockLocation;
      (globalThis as any).location = mockLocation;

      const page = ChatPage(mockRouter as any);

      // Should create shared state without crashing
      expect(page).toBeDefined();
    });
  });
});
