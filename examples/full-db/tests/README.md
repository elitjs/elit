# Full-DB Example Tests

This directory contains unit tests and E2E tests for the full-db example application using the `elit/test` library.

## Test Files

### Unit Tests

- **`src/main.test.ts`** - Component and UI tests
  - Basic component rendering (Header, Footer)
  - Navigation with authentication state
  - Form handling and validation
  - State management (createState, reactive)
  - Router functionality
  - Authentication state
  - Chat components
  - User profiles
  - Loading states
  - Error handling

- **`src/server.test.ts`** - Server API tests
  - User registration
  - User login/authentication
  - User profile management
  - User listing and pagination
  - Chat functionality
  - API response formats
  - Token generation
  - Rate limiting
  - Input validation and sanitization

### E2E Tests

- **`src/app.e2e.test.ts`** - End-to-end user flow tests
  - Complete registration flow
  - Complete login flow with redirect
  - Chat message flow (send/receive)
  - Navigation between pages

## Running Tests

### Run all tests once
```bash
elit test --run
```

### Run tests in watch mode
```bash
elit test --watch
```

### Run only unit tests
```bash
elit test --run
```

### Run only E2E tests
```bash
elit test --e2e --run
```

### Run with coverage
```bash
elit test --coverage
```

### Run with silent output (dot reporter)
```bash
elit test --run --silent
```

## Test Configuration

Tests are configured in `elit.config.ts`:

```typescript
test: {
  include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  exclude: ['node_modules', 'dist', 'benchmark', 'docs'],
  testTimeout: 5000,
  bail: false,
  globals: true,
  watch: true,
  reporter: 'verbose'
}
```

## Writing Tests

### Basic Test Structure

```typescript
import { div, button } from '@elitjs/el';
import { createState } from '@elitjs/state';
import elitTest from '@elitjs/test';

describe('My Component', () => {
  beforeEach(() => {
    elitTest.setup();
  });

  afterEach(() => {
    elitTest.cleanup();
  });

  it('should render correctly', () => {
    const count = createState(0);

    const Counter = () => div(
      { 'data-testid': 'counter' },
      div({ 'data-testid': 'display' }, String(count.value)),
      button({
        'data-testid': 'increment',
        onclick: () => { count.value++; }
      }, '+')
    );

    elitTest.render(Counter());

    const display = elitTest.screen.getByTestId('display');
    expect(display.textContent).toBe('0');
  });
});
```

### Testing User Interactions

```typescript
it('should handle button clicks', () => {
  let clicked = false;

  const Button = () => button({
    'data-testid': 'btn',
    onclick: () => { clicked = true; }
  }, 'Click me');

  elitTest.render(Button());

  const btn = elitTest.screen.getByTestId('btn');
  elitTest.click(btn);

  expect(clicked).toBe(true);
});
```

### Testing Forms

```typescript
it('should handle form input', () => {
  const email = createState('');

  const EmailInput = () => input({
    'data-testid': 'email',
    type: 'email',
    value: email.value,
    oninput: (e: Event) => {
      email.value = (e.target as HTMLInputElement).value;
    }
  });

  elitTest.render(EmailInput());

  const inputEl = elitTest.screen.getByTestId('email') as HTMLInputElement;
  elitTest.input(inputEl, 'test@example.com');

  expect(email.value).toBe('test@example.com');
});
```

### Async Testing

```typescript
it('should wait for async updates', async () => {
  const data = createState<string | null>(null);

  const loadData = async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    data.value = 'Loaded!';
  };

  const Component = () => div(
    { 'data-testid': 'component' },
    data.value || 'Loading...'
  );

  elitTest.render(Component());

  loadData();

  await elitTest.waitFor(() => {
    expect(data.value).toBe('Loaded!');
  });
});
```

## Query Methods

The `elitTest.screen` object provides various query methods:

- `getByTestId(id)` - Find element by data-testid attribute
- `getByText(text|regex)` - Find element by text content
- `getByClassName(class)` - Find element by class name
- `getById(id)` - Find element by id attribute
- `getBySelector(selector)` - Find element by CSS selector
- `queryByText(text|regex)` - Query without throwing (returns null if not found)

## Assertions

Available assertions via `expect()`:

- `toBe(value)` - Strict equality
- `toEqual(value)` - Deep equality
- `toBeTruthy()` / `toBeFalsy()` - Boolean check
- `toBeNull()` / `toBeUndefined()` / `toBeDefined()`
- `toBeGreaterThan(number)` / `toBeLessThan(number)`
- `toContain(value)` - Array contains or string contains
- `toHaveLength(number)` - Array/string length
- `toThrow(error)` - Function throws error
- `toMatch(regex)` - String matches regex
- `toBeInstanceOf(class)` - Instance check
- `not.toBe()` - Negated assertions

## Mock Utilities

```typescript
// Mock function
const mockFn = elitTest.mockFn<(x: number) => number>();
mockFn.mockReturnValue(42);
expect(mockFn(5)).toBe(42);

// Mock state
const mockState = elitTest.mockState(0);
expect(mockState._calls).toHaveLength(0);
```

## Best Practices

1. **Always cleanup** - Use `beforeEach` and `afterEach` to setup and cleanup
2. **Use testids** - Add `data-testid` attributes for reliable element selection
3. **Test user behavior** - Test what users see and do, not implementation details
4. **Keep tests simple** - Each test should verify one thing
5. **Use descriptive names** - Test names should describe what is being tested
6. **Mock external dependencies** - Use mocks for APIs, databases, etc.
7. **Test edge cases** - Don't just test the happy path

## Troubleshooting

### Tests not found
Make sure test files match the include pattern in `elit.config.ts`:
```typescript
include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}']
```

### Timeout errors
Increase the timeout in `elit.config.ts`:
```typescript
testTimeout: 10000  // 10 seconds
```

### Element not found errors
- Check that elements have `data-testid` attributes
- Ensure elements are rendered before querying
- Use `await elitTest.waitFor()` for async operations
