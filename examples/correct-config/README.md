# Correct Config Example

This example demonstrates the correct way to configure an Elit full-stack application with:

- ✅ **TypeScript Configuration** - Using `elit.config.ts` with proper imports from local source files
- ✅ **Server-Side Rendering (SSR)** - Dynamic HTML generation with `ssr: () => client`
- ✅ **API Routes** - REST endpoints with `ServerRouter` in the `api` property
- ✅ **Client-Specific Configuration** - Using the `clients` array for multi-app support
- ✅ **TypeScript Import Rewriting** - Write `import './file.ts'` naturally, auto-rewritten to `.js`
- ✅ **Hot Module Replacement (HMR)** - Instant development feedback with WebSocket
- ✅ **Production Build** - Optimized build with minification and source maps
- ✅ **Modular Imports** - Import from `elit/el`, `elit/state`, `elit/dom`, `elit/server`, `elit/style`

## Project Structure

```
correct-config/
├── src/
│   ├── client.ts       # SSR template (HTML structure)
│   ├── server.ts       # API routes (ServerRouter)
│   ├── main.ts         # Client-side application
│   └── styles.ts       # CSS-in-JS styles
├── public/
│   └── index.html      # Production HTML template
├── elit.config.ts      # Elit configuration
└── package.json
```

## Configuration Highlights

### 1. TypeScript Configuration File

The config file uses TypeScript (`.ts` extension) and imports from local source files:

```typescript
// elit.config.ts
import { server } from './src/server';
import { client } from './src/client';

export default {
  dev: {
    port: 3003,
    host: '0.0.0.0',
    open: false,
    logging: true,
    clients: [{
      root: '.',
      basePath: '',
      ssr: () => client,  // SSR template function
      api: server,        // ServerRouter instance
      ws: [{
        path: '/ws',
        handler: ({ ws }) => {
          ws.on('message', (message) => ws.send(message.toString()));
        }
      }]
    }]
  },
  build: [{
    entry: './src/main.ts',
    outDir: './dist',
    outFile: 'main.js',
    format: 'esm',
    minify: true,
    sourcemap: true,
    target: 'es2020',
    copy: [
      { from: './public/index.html', to: './index.html' }
    ]
  }],
  preview: {
    port: 3000,
    host: '0.0.0.0',
    open: false,
    logging: true,
    root: './dist',
    basePath: '',
    index: './index.html'
  }
};
```

### 2. Server-Side Rendering (SSR)

The `client.ts` file exports an SSR template using modular imports from `elit/el`:

```typescript
// src/client.ts
import { div, html, head, body, title, link, script, meta } from 'elit/el';

export const client = html(
  head(
    title('Elit - Full-Stack TypeScript Framework'),
    link({ rel: 'icon', type: 'image/svg+xml', href: 'favicon.svg' }),
    meta({ charset: 'UTF-8' }),
    meta({ name: 'viewport', content: 'width=device-width, initial-scale=1.0' }),
    meta({ name: 'description', content: 'Elit - Full-stack TypeScript framework' })
  ),
  body(
    div({ id: 'root' }),
    script({ type: 'module', src: '/src/main.js' })  // Auto-rewritten from .ts
  )
);
```

**Key Points:**
- Uses modular import `elit/el` instead of importing from main package
- Returns HTML string that's served on every request
- The `script` tag references `/src/main.js` (TypeScript imports are auto-rewritten)
- SSR template is executed via `ssr: () => client` in config

### 3. API Routes with ServerRouter

The `server.ts` file defines REST endpoints using modular import from `elit/server`:

```typescript
// src/server.ts
import { ServerRouter } from 'elit/server';

export const router = new ServerRouter();

router.get('/api/hello', async (ctx) => {
  ctx.res.setHeader('Content-Type', 'text/html; charset=UTF-8');
  ctx.res.end("Hello from Elit ServerRouter!");
});

export const server = router;
```

**Key Points:**
- Uses modular import `elit/server` for ServerRouter
- Export as `server` to use in config: `api: server`
- The router is attached to each client in the `clients` array
- Routes are handled before file serving
- Context (`ctx`) provides `req`, `res`, `params`, `query`, `body`

### 4. Client-Side Application with Modular Imports

The `main.ts` file uses modular imports from `elit/el`, `elit/state`, and `elit/dom`:

```typescript
// src/main.ts
import { div, h1, h2, button, p } from 'elit/el';
import { createState, reactive } from 'elit/state';
import { render } from 'elit/dom';
import './styles.ts';  // TypeScript import - automatically rewritten to .js

export const count = createState(0);

export const app = div({ className: 'container' },
  div({ className: 'card' },
    h1('Welcome to Elit! 🚀'),
    p('A lightweight TypeScript framework with reactive state management'),

    div({ className: 'counter' },
      h2('Counter Example'),
      reactive(count, (value) =>
        div({ className: 'count-display' }, `Count: ${value}`)
      ),
      div({ className: 'button-group' },
        button({ onclick: () => count.value--, className: 'btn btn-secondary' }, '- Decrement'),
        button({ onclick: () => count.value = 0, className: 'btn btn-secondary' }, 'Reset'),
        button({ onclick: () => count.value++, className: 'btn btn-primary' }, '+ Increment')
      )
    )
  )
);

render('root', app);
console.log('[Main] App rendered');
```

**Key Points:**
- Modular imports: `elit/el`, `elit/state`, `elit/dom` (not from main package)
- TypeScript imports with `.ts` extension: `import './styles.ts'`
- Auto-rewritten to `.js` for browser: `import './styles.js'`
- `render('root', app)` mounts the app to `#root` element

### 5. CSS-in-JS with Style Module

The `styles.ts` file uses the modular import from `elit/style`:

```typescript
// src/styles.ts
import styles from 'elit/style';

// Global styles
styles.addTag('*', {
  margin: 0,
  padding: 0,
  boxSizing: 'border-box'
});

styles.addTag('body', {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem'
});

// Class styles
styles.addClass('container', {
  width: '100%',
  maxWidth: '600px'
});

// Pseudo-class styles
styles.addPseudoClass('hover', {
  transform: 'translateY(-2px)',
  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
}, '.btn-primary');

// Inject styles into DOM
styles.inject('global-styles');
export default styles;
```

**Key Points:**
- Default import: `import styles from 'elit/style'`
- No need to instantiate with `new CreateStyle()` anymore
- Call `styles.inject('id')` to inject into DOM
- Supports `addTag`, `addClass`, `addPseudoClass` methods

## Running the Example

### Development

```bash
npm install
npm run dev
```

Visit:
- http://localhost:3003/ - Main application with SSR
- http://localhost:3003/api/hello - API endpoint

Features in dev mode:
- Hot Module Replacement (HMR)
- TypeScript compilation on-the-fly
- `.ts` import rewriting
- Server-Side Rendering
- API routes

### Build

```bash
npm run build
```

This creates optimized production files in `./dist/`:
- `main.js` - Bundled and minified application
- `main.js.map` - Source map for debugging
- `index.html` - Production HTML

### Preview

```bash
npm run preview
```

Visit http://localhost:3000/ to preview the production build.

## Key Features Demonstrated

### 1. Modular Imports

Elit uses modular imports for better tree-shaking and smaller bundle sizes:

- `elit/el` - Element builders (html, div, button, etc.)
- `elit/state` - State management (createState, reactive)
- `elit/dom` - DOM rendering (render)
- `elit/server` - Server utilities (ServerRouter)
- `elit/style` - CSS-in-JS styling

This allows bundlers to only include the code you actually use.

### 2. Client-Specific API Routes

Each client in the `clients` array can have its own API router:

```typescript
clients: [{
  root: '.',
  basePath: '',
  ssr: () => client,  // SSR function
  api: server         // ServerRouter instance
}]
```

This allows you to serve multiple applications with different API routes from the same server.

### 3. TypeScript Import Rewriting

The dev server automatically rewrites TypeScript imports for browser compatibility:

```typescript
// Your source code
import './styles.ts';

// Automatically served as
import './styles.js';
```

This happens during transpilation, so you can write natural TypeScript imports.

### 4. SSR with TypeScript

The SSR template is written in TypeScript using element builders:

```typescript
export const client = html(
  head(title('My App'), meta({ charset: 'UTF-8' })),
  body(div({ id: 'root' }), script({ type: 'module', src: '/src/main.js' }))
);
```

Full type safety and IntelliSense in your SSR templates.

### 5. Multi-Build Configuration

The `build` config is an array, allowing multiple build targets:

```typescript
build: [{
  entry: './src/main.ts',
  outDir: './dist',
  outFile: 'main.js',
  format: 'esm',
  minify: true,
  sourcemap: true,
  target: 'es2020',
  copy: [{ from: './public/index.html', to: './index.html' }]
}]
```

Build multiple apps or libraries from a single config.

### 6. Hot Module Replacement (HMR)

WebSocket-based HMR with instant feedback:

- File changes are detected via chokidar
- Changes are pushed to browser via WebSocket
- Modules are hot-reloaded without full page refresh
- State is preserved during HMR

## Common Patterns

### Adding More API Routes

```typescript
// src/server.ts
import { ServerRouter } from 'elit/server';

export const router = new ServerRouter();

// GET endpoint
router.get('/api/users', async (ctx) => {
  const users = [
    { id: 1, name: 'John' },
    { id: 2, name: 'Jane' }
  ];
  ctx.res.setHeader('Content-Type', 'application/json');
  ctx.res.end(JSON.stringify(users));
});

// POST endpoint with body parsing
router.post('/api/users', async (ctx) => {
  const newUser = ctx.body;
  // Handle user creation
  ctx.res.setHeader('Content-Type', 'application/json');
  ctx.res.end(JSON.stringify({ success: true, user: newUser }));
});

// Dynamic routes with params
router.get('/api/users/:id', async (ctx) => {
  const userId = ctx.params.id;
  ctx.res.setHeader('Content-Type', 'application/json');
  ctx.res.end(JSON.stringify({ id: userId, name: 'User ' + userId }));
});

export const server = router;
```

### Using Multiple Clients

Serve multiple apps from one server, each with its own routes and API:

```typescript
// elit.config.ts
import { server as app1Server } from './app1/src/server';
import { client as app1Client } from './app1/src/client';
import { server as app2Server } from './app2/src/server';
import { client as app2Client } from './app2/src/client';

export default {
  dev: {
    port: 3003,
    clients: [
      {
        root: './app1',
        basePath: '/app1',
        ssr: () => app1Client,
        api: app1Server,
        ws: [
          {
            path: '/ws',
            handler: ({ ws }) => {
              ws.on('message', (message) => ws.send(`[app1] ${message.toString()}`));
            }
          }
        ]
      },
      {
        root: './app2',
        basePath: '/app2',
        ssr: () => app2Client,
        api: app2Server,
        ws: [
          {
            path: '/ws',
            handler: ({ ws }) => {
              ws.on('message', (message) => ws.send(`[app2] ${message.toString()}`));
            }
          }
        ]
      }
    ]
  }
};
```

Each client-specific `ws` path is prefixed with that client's `basePath`, so the endpoints above are available at `/app1/ws` and `/app2/ws`. Avoid `/__elit_ws`, because Elit reserves it for internal HMR and shared-state traffic.

Visit:
- `http://localhost:3003/app1/` - App 1 with its own SSR and API
- `http://localhost:3003/app2/` - App 2 with its own SSR and API

### Creating Reactive Components

```typescript
// src/components/counter.ts
import { div, button } from 'elit/el';
import { createState, reactive } from 'elit/state';

export function Counter() {
  const count = createState(0);

  return div({ className: 'counter' },
    reactive(count, (value) =>
      div({ className: 'display' }, `Count: ${value}`)
    ),
    button({
      onclick: () => count.value++,
      className: 'btn'
    }, 'Increment')
  );
}
```

```typescript
// src/main.ts
import { div } from 'elit/el';
import { render } from 'elit/dom';
import { Counter } from './components/counter.ts';
import './styles.ts';

const app = div({ className: 'app' },
  Counter(),
  Counter()  // Multiple independent instances
);

render('root', app);
```

### Dynamic Styling

```typescript
// src/theme.ts
import styles from 'elit/style';

export function applyTheme(isDark: boolean) {
  styles.addTag('body', {
    background: isDark ? '#1a1a1a' : '#ffffff',
    color: isDark ? '#ffffff' : '#000000'
  });
  styles.inject('theme-styles');
}
```

### Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:3003
VITE_APP_NAME=My Elit App
```

Access in code:

```typescript
const apiUrl = import.meta.env.VITE_API_URL;
const appName = import.meta.env.VITE_APP_NAME;
```

## Summary: Key Differences from Old Patterns

### ✅ DO (Modern Pattern)

```typescript
// Modular imports
import { div, button } from 'elit/el';
import { createState } from 'elit/state';
import { render } from 'elit/dom';
import styles from 'elit/style';
import { ServerRouter } from 'elit/server';

// TypeScript imports with .ts extension
import './styles.ts';
import { Counter } from './components/counter.ts';

// Style system
styles.addTag('body', { margin: 0 });
styles.inject('app-styles');

// Config imports from source
import { server } from './src/server';
import { client } from './src/client';
```

### ❌ DON'T (Old Pattern)

```typescript
// Importing from main package
import { div, button, createState, render } from 'elit';

// Old CreateStyle instantiation
import { CreateStyle } from 'elit';
const styles = new CreateStyle();

// Importing without .ts extension
import './styles';
import { Counter } from './components/counter';

// Using require() in config
const server = require('./src/server');
```

## Learn More

- [Elit Documentation](https://github.com/elitjs/elit)
- [ServerRouter API](https://github.com/elitjs/elit#serverrouter)
- [SSR Guide](https://github.com/elitjs/elit#server-side-rendering)
- [Configuration Options](https://github.com/elitjs/elit#configuration)

---

**Note:** This example demonstrates the **correct, modern way** to configure Elit. Always use:
- ✅ Modular imports (`elit/el`, `elit/state`, `elit/dom`, `elit/server`, `elit/style`)
- ✅ TypeScript config files (`elit.config.ts`)
- ✅ TypeScript imports with `.ts` extensions
- ✅ `import styles from 'elit/style'` (not `new CreateStyle()`)
- ✅ SSR templates with `ssr: () => client`
- ✅ Client-specific API routes with `api: server`
