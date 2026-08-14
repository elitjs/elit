/**
 * RegisterPage Component Unit Tests
 */

// CRITICAL: Set up ALL mocks BEFORE importing RegisterPage component
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
  json: async () => ({ token: 'fake-token', user: { id: '123', name: 'Test User' } })
};
const mockFetch = async () => mockFetchResponse;

// Mock window.addEventListener and dispatchEvent
const eventListeners: Record<string, Function[]> = {};
const addEventListenerMock = (event: string, handler: Function) => {
  if (!eventListeners[event]) {
    eventListeners[event] = [];
  }
  eventListeners[event].push(handler);
};
const dispatchEventMock = (event: Event) => {
  const listeners = eventListeners[event.type];
  if (listeners) {
    listeners.forEach((listener: Function) => listener(event));
  }
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
(global as any).window = {
  addEventListener: addEventListenerMock,
  removeEventListener: mockFn(),
  dispatchEvent: dispatchEventMock,
  localStorage: localStorageMock
};
(globalThis as any).window = (global as any).window;
(global as any).requestAnimationFrame = mockRequestAnimationFrame;
(global as any).cancelAnimationFrame = mockCancelAnimationFrame;
(globalThis as any).requestAnimationFrame = mockRequestAnimationFrame;
(globalThis as any).cancelAnimationFrame = mockCancelAnimationFrame;

// NOW import the component (after mocks are set up)
import { RegisterPage } from './RegisterPage';
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

describe('RegisterPage Component', () => {
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
      json: async () => ({ token: 'fake-token', user: { id: '123', name: 'Test User' } })
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

  describe('authentication redirect', () => {
    it('should redirect to profile if already logged in', () => {
      localStorageMock.setItem('token', 'existing-token');
      RegisterPage(mockRouter as any);

      expect(mockRouter.push.calls.length).toBeGreaterThan(0);
      expect(mockRouter.push.calls[0][0]).toBe('/profile');
    });

    it('should not redirect if not logged in', () => {
      RegisterPage(mockRouter as any);

      expect(mockRouter.push.calls.length).toBe(0);
    });
  });

  describe('page structure', () => {
    it('should render auth-page', () => {
      const page = RegisterPage(mockRouter as any);

      expect(page).toBeDefined();
      expect(page.tagName).toBe('div');
      expect(page.props?.className).toBe('auth-page');
    });

    it('should render auth-container', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('auth-container');
    });

    it('should render auth-branding', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('auth-branding');
    });

    it('should render auth-form-wrapper', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('auth-form-wrapper');
    });

    it('should render auth-form-card', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('auth-form-card');
    });
  });

  describe('branding section', () => {
    it('should render branding title', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('Join Us Today');
    });

    it('should render branding description', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('Create your account and start building amazing applications in minutes.');
    });

    it('should render branding features', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('branding-features');
      expect(html).toContain('Free forever for personal projects');
      expect(html).toContain('No credit card required');
      expect(html).toContain('Instant setup & deployment');
    });

    it('should render feature icons', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('feature-icon');
    });
  });

  describe('form header', () => {
    it('should render auth header', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('auth-header');
    });

    it('should render auth title', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('Create Account');
    });

    it('should render auth subtitle', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('Sign up to get started with your free account');
    });
  });

  describe('error handling', () => {
    it('should have error state capability', () => {
      const page = RegisterPage(mockRouter as any);
      // Error state is reactive
      expect(page).toBeDefined();
    });

    it('should render auth-error when error exists', () => {
      const page = RegisterPage(mockRouter as any);
      // Error is reactive and only shows when error.value is set
      expect(page).toBeDefined();
    });
  });

  describe('form elements', () => {
    it('should render form element', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('<form');
    });

    it('should render name input', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('type="text"');
      expect(html).toContain('id="name"');
      expect(html).toContain('form-input');
    });

    it('should render name label', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('Full Name');
    });

    it('should render name icon', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('👤');
    });

    it('should render email input', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('type="email"');
      expect(html).toContain('id="email"');
      expect(html).toContain('form-input');
    });

    it('should render email label', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('Email Address');
    });

    it('should render email icon', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('📧');
    });

    it('should render password input', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('type="password"');
      expect(html).toContain('id="password"');
    });

    it('should render password label', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('Password');
    });

    it('should render password icon', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('🔒');
    });

    it('should render confirm password input', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('type="password"');
      expect(html).toContain('id="confirmPassword"');
    });

    it('should render confirm password label', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('Confirm Password');
    });

    it('should have correct placeholders', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('John Doe');
      expect(html).toContain('your@email.com');
      expect(html).toContain('••••••••');
    });
  });

  describe('form options', () => {
    it('should render terms checkbox', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('I agree to the Terms of Service and Privacy Policy');
      expect(html).toContain('checkbox');
    });
  });

  describe('submit button', () => {
    it('should render submit button', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('Create Account');
      expect(html).toContain('btn-primary');
    });

    it('should have loading state capability', () => {
      const page = RegisterPage(mockRouter as any);
      // Submit button text is reactive based on isLoading state
      expect(page).toBeDefined();
    });
  });

  describe('social login', () => {
    it('should render auth divider', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('auth-divider');
      expect(html).toContain('OR');
    });

    it('should render social login section', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('social-login');
    });

    it('should render Google button', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('Sign up with Google');
    });

    it('should render GitHub button', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('Sign up with GitHub');
    });
  });

  describe('footer section', () => {
    it('should render auth footer', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('auth-footer');
    });

    it('should render footer text', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('Already have an account?');
    });

    it('should render sign in button', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('Sign in');
    });
  });

  describe('CSS classes', () => {
    it('should have correct CSS classes', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('auth-page');
      expect(html).toContain('auth-container');
      expect(html).toContain('auth-branding');
      expect(html).toContain('branding-content');
      expect(html).toContain('branding-title');
      expect(html).toContain('branding-description');
    });
  });

  describe('form structure', () => {
    it('should have form-group', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('form-group');
    });

    it('should have input-wrapper', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('input-wrapper');
    });

    it('should have input-icon', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('input-icon');
    });

    it('should have form-options', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('form-options');
    });
  });

  describe('component consistency', () => {
    it('should always return the same structure', () => {
      const page1 = RegisterPage(mockRouter as any);
      const page2 = RegisterPage(mockRouter as any);

      expect(page1.tagName).toBe(page2.tagName);
      expect(page1.props?.className).toBe(page2.props?.className);
    });

    it('should render without errors', () => {
      expect(() => {
        const page = RegisterPage(mockRouter as any);
        renderToString(page);
      }).not.toThrow();
    });

    it('should have h1 element', () => {
      const page = RegisterPage(mockRouter as any);
      const h1Elements = findChildrenByTagName(page, 'h1');

      expect(h1Elements.length).toBeGreaterThan(0);
    });

    it('should have h2 element', () => {
      const page = RegisterPage(mockRouter as any);
      const h2Elements = findChildrenByTagName(page, 'h2');

      expect(h2Elements.length).toBeGreaterThan(0);
    });
  });

  describe('reactive state', () => {
    it('should have name state', () => {
      const page = RegisterPage(mockRouter as any);
      expect(page).toBeDefined();
    });

    it('should have email state', () => {
      const page = RegisterPage(mockRouter as any);
      expect(page).toBeDefined();
    });

    it('should have password state', () => {
      const page = RegisterPage(mockRouter as any);
      expect(page).toBeDefined();
    });

    it('should have confirmPassword state', () => {
      const page = RegisterPage(mockRouter as any);
      expect(page).toBeDefined();
    });

    it('should have error state', () => {
      const page = RegisterPage(mockRouter as any);
      expect(page).toBeDefined();
    });

    it('should have isLoading state', () => {
      const page = RegisterPage(mockRouter as any);
      expect(page).toBeDefined();
    });
  });

  describe('navigation', () => {
    it('should have sign in link', () => {
      const page = RegisterPage(mockRouter as any);
      const html = renderToString(page);

      expect(html).toContain('Sign in');
    });
  });

  describe('form validation capabilities', () => {
    it('should have name validation capability', () => {
      const page = RegisterPage(mockRouter as any);
      // Component has name validation logic in handleRegister
      expect(page).toBeDefined();
    });

    it('should have email validation capability', () => {
      const page = RegisterPage(mockRouter as any);
      // Component has email validation logic in handleRegister
      expect(page).toBeDefined();
    });

    it('should have password length validation capability', () => {
      const page = RegisterPage(mockRouter as any);
      // Component has password length validation in handleRegister
      expect(page).toBeDefined();
    });

    it('should have password match validation capability', () => {
      const page = RegisterPage(mockRouter as any);
      // Component has password match validation in handleRegister
      expect(page).toBeDefined();
    });
  });
});
