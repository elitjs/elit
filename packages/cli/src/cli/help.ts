import packageJson from '../../package.json';

export function printHelp(): void {
    console.log(`
Elit - Modern Web Development Toolkit

Usage:
  elit <command> [options]
  elit --version
  elit -v

Commands:
  dev       Start development server
  build     Build for production
  build-dev Build production output and emit a standalone development server bundle
  build-preview Build production output and emit a standalone preview server bundle
  preview   Preview production build
  test      Run tests
  desktop   Run or build a native desktop app
  mobile    Run native mobile workflow commands
  native    Generate native target code from an Elit entry
  pm        Manage background processes and packaged apps
  wapk      Pack, inspect, extract, or run a .wapk app
  version   Show version number
  help      Show this help message

Global Flags:
  -v, --version          Show version number

Dev Options:
  -p, --port <number>    Port to run server on (default: 3000)
  -h, --host <string>    Host to bind to (default: localhost)
  -r, --root <path>      Root directory to serve
  --no-open              Don't open browser automatically
  --silent               Disable logging

Build Options:
  -e, --entry <file>     Entry file to build (required)
  -o, --out-dir <dir>    Output directory (default: dist)
  -f, --format <format>  Output format: esm, cjs, iife (default: esm)
  --no-minify            Disable minification
  --sourcemap            Generate sourcemap
  --silent               Disable logging

Standalone Build Commands:
  elit build-dev         Build production output and emit a standalone development server bundle
  elit build-dev --dev-out-file server.js
  elit build-preview     Build production output and emit a standalone preview server bundle
  elit build-preview --preview-out-file server.js

Desktop Options:
  elit desktop [entry]                      Run an Elit desktop entry using the resolved desktop mode
  elit desktop run [entry]                  Explicit run alias for the desktop runtime
  elit desktop build [entry]                Build a standalone desktop executable
  elit desktop wapk <file.wapk>             Run a packaged app in the desktop shell
  elit desktop --runtime node src/main.ts   Run with Node.js backend runtime
  elit desktop run --mode native            Run with desktop.native.entry or an explicit native entry
  elit desktop build --release src/main.ts  Build a release desktop executable

Mobile Options:
  elit mobile init [dir]                    Initialize native mobile config files
  elit mobile doctor [--json]               Validate native mobile toolchain and project setup
  elit mobile sync                          Sync web assets to native mobile projects
  elit mobile open android|ios              Open platform project in native IDE
  elit mobile run android|ios               Run app on device or emulator
  elit mobile build android|ios             Build native app artifacts

Native Options:
  elit native generate android <entry>      Emit Jetpack Compose from an Elit entry
  elit native generate ios <entry>          Emit SwiftUI from an Elit entry
  elit native generate ir <entry>           Emit native IR JSON from an Elit entry
  elit native generate ... --out <file>     Write output to a file
  elit native generate ... --name <name>    Set Compose function or SwiftUI struct name
  elit native generate android ... --package <name>  Set Kotlin package name
  elit native generate ... --export <name>  Select a specific module export

WAPK Options:
  elit wapk [file.wapk]                     Run a packaged app or the configured default archive
  elit wapk gdrive://<fileId>               Run a packaged app directly from Google Drive
  elit wapk gdrive://<fileId> --online      Host a Google Drive WAPK on Elit Run
  elit wapk run [file.wapk]                 Run a packaged app or the configured default archive
  elit wapk run --google-drive-file-id <id> Run a packaged app directly from Google Drive
  elit wapk pack [directory]                Pack a directory into a .wapk archive
  elit wapk patch <file.wapk> --from <patch.wapk>  Apply a manifest-driven patch archive
  elit wapk inspect <file.wapk>             Inspect a .wapk archive
  elit wapk extract <file.wapk>             Extract a .wapk archive
  elit wapk --runtime node|bun|deno [file]  Override the packaged runtime

PM Options:
  elit pm start --script "npm start" -n my-app   Start a shell command in the background
  elit pm start ./app.ts -n my-app               Start a file with inferred runtime
  elit pm start --wapk ./app.wapk -n my-app      Start a WAPK app through the manager
  elit pm start --wapk gdrive://<fileId> -n my-app  Start a Google Drive WAPK app through the manager
  elit pm start --google-drive-file-id <id> -n my-app  Start a Google Drive WAPK app without a positional source
  elit pm start my-app --watch                   Start one configured app with file watching enabled
  elit pm start                                   Start all pm.apps[] entries from elit.config.*
  elit pm start my-app                            Start one configured app by name
  elit pm list                                    Show managed process status
  elit pm list --json                             Show managed process status as JSON
  elit pm show <name>                             Show full metadata for one managed process
  elit pm describe <name> --json                  Show one managed process as JSON
  elit pm stop <name|all>                         Stop one or all managed processes
  elit pm restart <name|all>                      Restart one or all managed processes
  elit pm delete <name|all>                       Remove process metadata and logs
  elit pm save                                    Persist the running process list to pm.dumpFile
  elit pm resurrect                               Restart the last saved process list
  elit pm logs <name> --lines 100                 Show recent stdout/stderr logs

Note: Build configuration supports both single and multiple builds:
      - Single build: build: { entry: 'src/app.ts', outDir: 'dist' }
      - Multiple builds: build: [{ entry: 'src/app1.ts' }, { entry: 'src/app2.ts' }]
      When using array, all builds run sequentially.
  Desktop commands can read desktop.entry or desktop.native.entry from elit.config.ts when [entry] is omitted, depending on desktop.mode.
  PM commands read pm.apps[], pm.dataDir, and pm.dumpFile from elit.config.* when present.

Preview Options:
  -p, --port <number>      Port to run server on (default: 4173)
  -h, --host <string>      Host to bind to (default: localhost)
  -r, --root <dir>         Root directory to serve (default: dist or build.outDir)
  -b, --base-path <path>   Base path for the application
  --no-open                Don't open browser automatically
  --silent                 Disable logging

Note: Preview mode has full feature parity with dev mode:
      - Single root and multi-client configurations (use clients[] in config)
      - REST API endpoints (use api option in config)
  - WebSocket endpoints (use ws option in config)
      - Proxy forwarding and Web Workers
      - HTTPS support, custom middleware, and SSR

Test Options:
  -r, --run               Run all tests once (default, same as no flags)
  -w, --watch             Run in watch mode
  -f, --file <files>      Run specific files (comma-separated), e.g.: --file ./test1.test.ts,./test2.spec.ts
  -d, --describe <name>   Run only tests matching describe name, e.g.: --describe "Footer Component"
  -t, --it <name>         Run only tests matching test name, e.g.: --it "should create"
  -c, --coverage          Generate coverage report
  -cr, --coverage-reporter <reporters>  Coverage reporter formats (comma-separated): text, html, lcov, json, coverage-final.json, clover

Note: Test command behaviors:
      - elit test                     Run all tests once (default)
      - elit test --run               Run all tests once (same as default)
      - elit test -f ./test.ts        Run specific file(s) once
      - elit test -d "Footer"         Run only tests in describe blocks matching "Footer"
      - elit test -t "should create"  Run only tests matching "should create"
      - elit test --watch             Run in watch mode
      - elit test --coverage          Run with coverage report

Config File:
  Create elit.config.ts, elit.config.mts, elit.config.js, elit.config.mjs, elit.config.cjs, or elit.config.json in project root

Proxy Configuration:
  Configure proxy in the config file to forward requests to backend servers.
  Supports both global proxy (applies to all clients) and client-specific proxy.

  Options:
    - context: Path prefix to match (required, e.g., '/api', '/graphql')
    - target: Backend server URL (required, e.g., 'http://localhost:8080')
    - changeOrigin: Change the origin header to match target (default: false)
    - pathRewrite: Rewrite request paths (e.g., { '^/api': '/v1/api' })
    - headers: Add custom headers to proxied requests
    - ws: Enable WebSocket proxying (default: false)

  Proxy Priority:
    1. Client-specific proxy (defined in clients[].proxy)
    2. Global proxy (defined in dev.proxy)
    The first matching proxy configuration will be used.

Worker Configuration:
  Configure Web Workers in the config file for background processing.
  Supports both global workers (applies to all clients) and client-specific workers.

  Options:
    - path: Worker script path relative to root directory (required)
    - name: Worker name/identifier (optional, defaults to filename)
    - type: Worker type - 'module' (ESM) or 'classic' (default: 'module')

  Worker Priority:
    1. Client-specific workers (defined in clients[].worker)
    2. Global workers (defined in dev.worker or preview.worker)
    Both global and client-specific workers will be loaded.

API Configuration:
  Configure REST API endpoints per client or globally.
  Supports both global configuration and client-specific configuration.

  Client-specific API:
    - Each client can have its own API router (clients[].api)
    - Client-specific configuration is isolated to that client's routes
    - API paths are automatically prefixed with the client's basePath
      Example: If basePath is '/app1' and route is '/api/health',
               the full path will be '/app1/api/health'

  Priority:
    1. Client-specific API routes are matched first (defined in clients[].api)
    2. Global API routes are matched second (defined in dev.api or preview.api)

WebSocket Configuration:
  Configure WebSocket endpoints per client or globally.
  Supports both global configuration and client-specific configuration.

  Options:
    - path: Upgrade path to match (required, e.g., '/ws', '/chat')
    - handler: Connection handler invoked with { ws, req, path, query, headers }

  Priority:
    1. Client-specific endpoints are prefixed with the client's basePath (defined in clients[].ws)
    2. Global endpoints listen exactly as configured (defined in dev.ws or preview.ws)

Examples:
  elit dev
  elit dev --port 8080
  elit build --entry src/app.ts
  elit build-dev
  elit build-preview
  elit preview
  elit preview --port 5000
  elit native generate android src/native-screen.ts --name HomeScreen

Config file example (elit.config.ts):
  export default {
    dev: {
      port: 3000,
      clients: [
        {
          root: './app1',
          basePath: '/app1',
          proxy: [
            {
              context: '/api',
              target: 'http://localhost:8080',
              changeOrigin: true
            }
          ],
          worker: [
            {
              path: 'workers/data-processor.js',
              name: 'dataProcessor',
              type: 'module'
            }
          ],
          // API routes are prefixed with basePath
          // This route becomes: /app1/api/health
          api: router()
            .get('/api/health', (req, res) => {
              res.json({ status: 'ok', app: 'app1' });
            }),
          middleware: [
            (req, res, next) => {
              console.log('App1 middleware:', req.url);
              next();
            }
          ]
        },
        {
          root: './app2',
          basePath: '/app2',
          proxy: [
            {
              context: '/graphql',
              target: 'http://localhost:4000',
              changeOrigin: true
            }
          ],
          worker: [
            {
              path: 'workers/image-worker.js',
              type: 'module'
            }
          ],
          // API routes are prefixed with basePath
          // This route becomes: /app2/api/status
          api: router()
            .get('/api/status', (req, res) => {
              res.json({ status: 'running', app: 'app2' });
            }),
          middleware: [
            (req, res, next) => {
              console.log('App2 middleware:', req.url);
              next();
            }
          ]
        }
      ],
      // Global proxy (applies to all clients)
      proxy: [
        {
          context: '/shared-api',
          target: 'http://localhost:9000',
          changeOrigin: true
        }
      ],
      // Global workers (applies to all clients)
      worker: [
        {
          path: 'workers/shared-worker.js',
          name: 'sharedWorker',
          type: 'module'
        }
      ]
    },
    // Single build configuration
    build: {
      entry: 'src/app.ts',
      outDir: 'dist',
      format: 'esm'
    },
    // Alternative: Multiple builds
    // build: [
    //   {
    //     entry: 'src/app1.ts',
    //     outDir: 'dist/app1',
    //     outFile: 'app1.js',
    //     format: 'esm',
    //     minify: true
    //   },
    //   {
    //     entry: 'src/app2.ts',
    //     outDir: 'dist/app2',
    //     outFile: 'app2.js',
    //     format: 'esm',
    //     minify: true
    //   },
    //   {
    //     entry: 'src/worker.ts',
    //     outDir: 'dist/workers',
    //     outFile: 'worker.js',
    //     format: 'esm',
    //     platform: 'browser'
    //   }
    // ],
    preview: {
      port: 4173,
      // Single client preview
      root: 'dist',
      basePath: '/app',
      https: false,
      // API router (import from elit/server)
      api: router()
        .get('/api/data', (req, res) => {
          res.json({ message: 'Hello from preview API' });
        }),
      // Custom middleware
      middleware: [
        (req, res, next) => {
          console.log('Preview request:', req.url);
          next();
        }
      ],
      // SSR render function
      ssr: () => '<h1>Server-rendered content</h1>',
      proxy: [
        {
          context: '/api',
          target: 'http://localhost:8080'
        }
      ],
      worker: [
        {
          path: 'workers/cache-worker.js',
          type: 'module'
        }
      ]
      // Multi-client preview (alternative)
      // clients: [
      //   {
      //     root: './dist/app1',
      //     basePath: '/app1',
      //     proxy: [
      //       {
      //         context: '/api',
      //         target: 'http://localhost:8080'
      //       }
      //     ],
      //     worker: [
      //       {
      //         path: 'workers/app1-worker.js',
      //         type: 'module'
      //       }
      //     ],
      //     api: router()
      //       .get('/api/health', (req, res) => {
      //         res.json({ status: 'ok', app: 'app1' });
      //       }),
      //     middleware: [
      //       (req, res, next) => {
      //         console.log('App1 request:', req.url);
      //         next();
      //       }
      //     ]
      //   },
      //   {
      //     root: './dist/app2',
      //     basePath: '/app2',
      //     worker: [
      //       {
      //         path: 'workers/app2-worker.js',
      //         type: 'module'
      //       }
      //     ],
      //     api: router()
      //       .get('/api/status', (req, res) => {
      //         res.json({ status: 'running', app: 'app2' });
      //       }),
      //     middleware: [
      //       (req, res, next) => {
      //         console.log('App2 request:', req.url);
      //         next();
      //       }
      //     ]
      //   }
      // ]
    }
  }
  `);
}

export function printVersion(): void {
    console.log(`elit v${packageJson.version ?? 'unknown'}`);
}