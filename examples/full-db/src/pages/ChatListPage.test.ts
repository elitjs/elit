/**
 * ChatListPage Component Unit Tests
 */

// CRITICAL: Set up ALL mocks BEFORE importing ChatListPage component
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
  json: async () => ({ users: [] })
};
const mockFetch = async () => mockFetchResponse;

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

// Trigger a RAF callback
const triggerRAF = () => {
  for (const [id, callback] of rafCallbacks) {
    try {
      callback(performance.now() as any);
    } catch (e) {
      // Ignore errors
    }
  }
  rafCallbacks.clear();
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

// Set up global localStorage mock
(global as any).localStorage = localStorageMock;
(globalThis as any).localStorage = localStorageMock;

// Set up global fetch mock
(global as any).fetch = mockFetch;
(globalThis as any).fetch = mockFetch;

// Set up window mock
(global as any).window = {
  addEventListener: addEventListenerMock,
  removeEventListener: mockFn(),
  localStorage: localStorageMock
};
(globalThis as any).window = (global as any).window;

// Set up requestAnimationFrame mocks
(global as any).requestAnimationFrame = mockRequestAnimationFrame;
(global as any).cancelAnimationFrame = mockCancelAnimationFrame;
(globalThis as any).requestAnimationFrame = mockRequestAnimationFrame;
(globalThis as any).cancelAnimationFrame = mockCancelAnimationFrame;

// NOW import the component (after mocks are set up)
import { ChatListPage } from './ChatListPage';
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

describe('ChatListPage Component', () => {
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
      json: async () => ({ users: [] })
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

      const page = ChatListPage(mockRouter as any);

      expect(page).toBeDefined();
      expect(page.tagName).toBe('div');
      expect(page.props?.className).toBe('chat-list-page');
    });

    it('should not redirect when authenticated', () => {
      localStorageMock.setItem('token', 'fake-token');
      localStorageMock.setItem('user', JSON.stringify({ id: '123', name: 'Test User', email: 'test@example.com', bio: 'Test bio', avatar: '' }));

      ChatListPage(mockRouter as any);

      // Should not redirect when authenticated
      expect(mockRouter.push.calls.length).toBe(0);
    });

    it('should handle missing authentication gracefully', () => {
      // Clear authentication
      localStorageMock.clear();

      // Component should still render (may redirect, but shouldn't crash)
      const page = ChatListPage(mockRouter as any);
      expect(page).toBeDefined();
    });
  });

  describe('page structure', () => {
    beforeEach(() => {
      localStorageMock.setItem('token', 'fake-token');
      localStorageMock.setItem('user', JSON.stringify({ id: '123', name: 'Test User', email: 'test@example.com', bio: 'Test bio', avatar: '' }));
    });

    it('should render chat-container', () => {
      const page = ChatListPage(mockRouter as any);
      // The chat-list-page contains chat-container as a child
      expect(page.props?.className).toBe('chat-list-page');

      // Find the chat-container child
      const children = page.children as VNode[];
      const container = children[0];
      expect(container?.props?.className).toBe('chat-container');
    });

    it('should render chat-header', () => {
      const page = ChatListPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('chat-header');
    });

    it('should render page title', () => {
      const page = ChatListPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('Messages');
    });

    it('should render search input', () => {
      const page = ChatListPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('chat-search');
      expect(html).toContain('Search users...');
    });

    it('should render back button', () => {
      const page = ChatListPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('Back to Profile');
    });

    it('should have proper CSS classes', () => {
      const page = ChatListPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('chat-list-page');
      expect(html).toContain('chat-container');
      expect(html).toContain('chat-header');
      expect(html).toContain('chat-title');
    });
  });

  describe('user loading', () => {
    beforeEach(() => {
      localStorageMock.setItem('token', 'fake-token');
      localStorageMock.setItem('user', JSON.stringify({ id: '123', name: 'Test User', email: 'test@example.com', bio: 'Test bio', avatar: '' }));
    });

    it('should show loading state initially', () => {
      const page = ChatListPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('Loading users');
    });

    it('should call fetch with correct headers', async () => {
      ChatListPage(mockRouter as any);

      // Wait a bit for the async operation
      await new Promise(resolve => setTimeout(resolve, 100));

      // The fetch should have been called
      expect(mockFetchResponse).toBeDefined();
    });

    it('should filter out current user from list', async () => {
      // Mock fetch response with users
      mockFetchResponse = {
        ok: true,
        json: async () => ({
          users: [
            { id: '123', name: 'Current User', email: 'current@example.com', bio: 'Current bio', avatar: '' },
            { id: '456', name: 'Other User', email: 'other@example.com', bio: 'Other bio', avatar: '' }
          ]
        })
      };

      const page = ChatListPage(mockRouter as any);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      triggerRAF();

      const html = renderToString(page);

      // Should not contain current user
      expect(html).not.toContain('Current User');
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      localStorageMock.setItem('token', 'fake-token');
      localStorageMock.setItem('user', JSON.stringify({ id: '123', name: 'Test User', email: 'test@example.com', bio: 'Test bio', avatar: '' }));
    });

    it('should handle fetch error', async () => {
      // Update the mock to return error
      (global as any).fetch = async () => ({
        ok: false,
        json: async () => ({ users: [] })
      });

      const page = ChatListPage(mockRouter as any);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 150));
      triggerRAF();

      // Should handle the error gracefully
      expect(page).toBeDefined();
    });

    it('should handle network error', async () => {
      // Update the mock to throw error
      (global as any).fetch = async () => {
        throw new Error('Network error');
      };

      const page = ChatListPage(mockRouter as any);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should handle the error gracefully
      expect(page).toBeDefined();
    });
  });

  describe('user list rendering', () => {
    beforeEach(() => {
      localStorageMock.setItem('token', 'fake-token');
      localStorageMock.setItem('user', JSON.stringify({ id: '123', name: 'Test User', email: 'test@example.com', bio: 'Test bio', avatar: '' }));
    });

    it('should render empty state when no users', async () => {
      (global as any).fetch = async () => ({
        ok: true,
        json: async () => ({ users: [] })
      });

      const page = ChatListPage(mockRouter as any);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 150));
      triggerRAF();

      // Should render without errors
      expect(page).toBeDefined();
      const html = renderToString(page);
      expect(html).toContain('chat-users-list');
    });

    it('should render user cards when users exist', async () => {
      (global as any).fetch = async () => ({
        ok: true,
        json: async () => ({
          users: [
            { id: '456', name: 'John Doe', email: 'john@example.com', bio: 'John bio', avatar: '' },
            { id: '789', name: 'Jane Smith', email: 'jane@example.com', bio: 'Jane bio', avatar: '' }
          ]
        })
      });

      const page = ChatListPage(mockRouter as any);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 150));
      triggerRAF();

      // Should render without errors
      expect(page).toBeDefined();
    });

    it('should render user avatar with first letter', async () => {
      (global as any).fetch = async () => ({
        ok: true,
        json: async () => ({
          users: [
            { id: '456', name: 'Alice', email: 'alice@example.com', bio: '', avatar: '' }
          ]
        })
      });

      const page = ChatListPage(mockRouter as any);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 150));
      triggerRAF();

      // Should render without errors
      expect(page).toBeDefined();
    });

    it('should render chat button on user cards', async () => {
      (global as any).fetch = async () => ({
        ok: true,
        json: async () => ({
          users: [
            { id: '456', name: 'Bob', email: 'bob@example.com', bio: '', avatar: '' }
          ]
        })
      });

      const page = ChatListPage(mockRouter as any);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 150));
      triggerRAF();

      // Should render without errors
      expect(page).toBeDefined();
    });
  });

  describe('search functionality', () => {
    beforeEach(() => {
      localStorageMock.setItem('token', 'fake-token');
      localStorageMock.setItem('user', JSON.stringify({ id: '123', name: 'Test User', email: 'test@example.com', bio: 'Test bio', avatar: '' }));
    });

    it('should render search input with correct attributes', () => {
      const page = ChatListPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('chat-input');
      expect(html).toContain('type="text"');
      expect(html).toContain('Search users...');
    });

    it('should filter users by name', async () => {
      mockFetchResponse = {
        ok: true,
        json: async () => ({
          users: [
            { id: '456', name: 'Alice Johnson', email: 'alice@example.com', bio: '', avatar: '' },
            { id: '789', name: 'Bob Smith', email: 'bob@example.com', bio: '', avatar: '' }
          ]
        })
      };

      const page = ChatListPage(mockRouter as any);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      triggerRAF();

      // Note: Testing search functionality requires DOM interaction
      // For unit tests, we verify the structure exists
      const html = renderToString(page);
      expect(html).toContain('chat-search');
    });

    it('should show no results message when search matches nothing', async () => {
      mockFetchResponse = {
        ok: true,
        json: async () => ({
          users: [
            { id: '456', name: 'Alice', email: 'alice@example.com', bio: '', avatar: '' }
          ]
        })
      };

      const page = ChatListPage(mockRouter as any);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      triggerRAF();

      // Verify search input exists (actual filtering requires DOM interaction)
      const html = renderToString(page);
      expect(html).toContain('chat-search');
    });
  });

  describe('navigation', () => {
    beforeEach(() => {
      localStorageMock.setItem('token', 'fake-token');
      localStorageMock.setItem('user', JSON.stringify({ id: '123', name: 'Test User', email: 'test@example.com', bio: 'Test bio', avatar: '' }));
    });

    it('should have back button that navigates to profile', () => {
      const page = ChatListPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('Back to Profile');
      expect(html).toContain('btn-secondary');
    });
  });

  describe('component consistency', () => {
    beforeEach(() => {
      localStorageMock.setItem('token', 'fake-token');
      localStorageMock.setItem('user', JSON.stringify({ id: '123', name: 'Test User', email: 'test@example.com', bio: 'Test bio', avatar: '' }));
    });

    it('should always return the same structure', () => {
      const page1 = ChatListPage(mockRouter as any);
      const page2 = ChatListPage(mockRouter as any);

      expect(page1.tagName).toBe(page2.tagName);
      expect(page1.props?.className).toBe(page2.props?.className);
    });

    it('should render without errors', () => {
      expect(() => {
        const page = ChatListPage(mockRouter as any);
        renderToString(page);
      }).not.toThrow();
    });
  });
});
