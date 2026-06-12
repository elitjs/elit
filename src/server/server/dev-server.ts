import { dom } from '../../client/dom';
import { lookup } from '../../shares/mime-types';
import { isBun, isDeno } from '../../shares/runtime';
import type { VNode } from '../../core/types';
import type { DevServer, DevServerOptions, HMRMessage } from '../types';

import { watch } from '../chokidar';
import { readFile, realpath, stat } from '../fs';
import { createServer, type IncomingMessage, type ServerResponse } from '../http';
import { extname, join, normalize, relative, resolve, sep } from '../path';
import { createSmtpServer } from '../smtp-server';
import type { ElitSMTPServerHandle } from '../smtp-server';
import { CLOSE_CODES, ReadyState, WebSocket, WebSocketServer } from '../ws';

import { clearImportMapCache, createElitImportMap } from './import-map';
import { createProxyHandler } from './proxy';
import { send403, send404, send500 } from './responses';
import { StateManager } from './state';
import { transpileNodeBrowserModule } from './transpile';
import {
  assertUniqueSmtpServerBindings,
  collectSmtpServerConfigs,
  createHMRScript,
  createSmtpServerLabel,
  createTransformCacheKey,
  defaultOptions,
  ELIT_INTERNAL_WS_PATH,
  formatSmtpServerAddress,
  getAllowedClientRoots,
  getClientBaseDirs,
  getRequestPath,
  getValidTransformCacheEntry,
  isPathWithinRoot,
  normalizeBasePath,
  normalizeWebSocketEndpoints,
  parseRequestQuery,
  requestAcceptsGzip,
  resolveClientPathFromBaseDir,
  rewriteRelativePaths,
  shouldUseClientFallbackRoot,
  shouldBlockFile,
  toBuffer,
  type NormalizedClient,
  type TransformCacheEntry,
} from './utils';

export function createDevServer(options: DevServerOptions): DevServer {
  const config = { ...defaultOptions, ...options };
  const wsClients = new Set<WebSocket>();
  const stateManager = new StateManager();
  const transformCache = new Map<string, TransformCacheEntry>();

  if (config.mode === 'dev') {
    clearImportMapCache();
  }

  const usesClientArray = Boolean(config.clients?.length);
  const clientsToNormalize = usesClientArray
    ? config.clients!
    : config.root
      ? [{ root: config.root, fallbackRoot: config.fallbackRoot, basePath: config.basePath || '', index: config.index, ssr: config.ssr, api: config.api, proxy: config.proxy, ws: config.ws, mode: config.mode }]
      : null;

  if (!clientsToNormalize) {
    throw new Error('DevServerOptions must include either "clients" array or "root" directory');
  }

  const normalizedClients: NormalizedClient[] = clientsToNormalize.map((client) => {
    let basePath = client.basePath || '';
    if (basePath) {
      while (basePath.startsWith('/')) basePath = basePath.slice(1);
      while (basePath.endsWith('/')) basePath = basePath.slice(0, -1);
      basePath = basePath ? `/${basePath}` : '';
    }

    let indexPath = client.index;
    if (indexPath) {
      indexPath = indexPath.replace(/^\.\//, '/');
      if (!indexPath.startsWith('/')) {
        indexPath = `/${indexPath}`;
      }
    }

    const useFallbackRoot = shouldUseClientFallbackRoot(client.root, client.fallbackRoot, indexPath);
    const activeRoot = useFallbackRoot ? (client.fallbackRoot || client.root) : client.root;

    return {
      root: activeRoot,
      fallbackRoot: useFallbackRoot ? undefined : client.fallbackRoot,
      basePath,
      index: useFallbackRoot ? undefined : indexPath,
      ssr: useFallbackRoot ? undefined : client.ssr,
      api: client.api,
      ws: normalizeWebSocketEndpoints(client.ws, basePath),
      proxyHandler: client.proxy ? createProxyHandler(client.proxy) : undefined,
      mode: client.mode || 'dev',
    };
  });

  const globalWebSocketEndpoints = usesClientArray ? normalizeWebSocketEndpoints(config.ws) : [];
  const normalizedWebSocketEndpoints = [...normalizedClients.flatMap((client) => client.ws), ...globalWebSocketEndpoints];
  const seenWebSocketPaths = new Set<string>();
  const smtpServerConfigs = collectSmtpServerConfigs(config, usesClientArray);

  for (const endpoint of normalizedWebSocketEndpoints) {
    if (endpoint.path === ELIT_INTERNAL_WS_PATH) {
      throw new Error(`WebSocket path "${ELIT_INTERNAL_WS_PATH}" is reserved for Elit internals`);
    }

    if (seenWebSocketPaths.has(endpoint.path)) {
      throw new Error(`Duplicate WebSocket endpoint path: ${endpoint.path}`);
    }

    seenWebSocketPaths.add(endpoint.path);
  }

  assertUniqueSmtpServerBindings(smtpServerConfigs);

  const smtpServers: ElitSMTPServerHandle[] = smtpServerConfigs.map((smtpConfig) => {
    const smtpServer = createSmtpServer(smtpConfig);
    const smtpLabel = createSmtpServerLabel(smtpServer.config);

    smtpServer.server.on('error', (error) => {
      console.error(`[SMTP] ${smtpLabel} error:`, error);
    });

    if (config.logging) {
      smtpServer.server.server.once('listening', () => {
        console.log(`[SMTP] ${smtpLabel} listening on ${formatSmtpServerAddress(smtpServer.address() as any, smtpServer.config)}`);
      });
    }

    smtpServer.listen();
    return smtpServer;
  });

  const globalProxyHandler = config.proxy ? createProxyHandler(config.proxy) : null;

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const originalUrl = req.url || '/';
    const hostHeader = req.headers.host;
    const hostName = hostHeader ? (Array.isArray(hostHeader) ? hostHeader[0] : hostHeader).split(':')[0] : '';

    if (config.domain && hostName === (config.host || 'localhost')) {
      const redirectUrl = `http://${config.domain}${originalUrl}`;
      if (config.logging) {
        console.log(`[Domain Map] ${hostName}:${config.port}${originalUrl} -> ${redirectUrl}`);
      }
      res.writeHead(302, { Location: redirectUrl });
      res.end();
      return;
    }

    const matchedClient = normalizedClients.find((client) => client.basePath && originalUrl.startsWith(client.basePath)) || normalizedClients.find((client) => !client.basePath);
    if (!matchedClient) {
      return send404(res, '404 Not Found');
    }

    if (matchedClient.proxyHandler) {
      try {
        const proxied = await matchedClient.proxyHandler(req, res);
        if (proxied) {
          if (config.logging) console.log(`[Proxy] ${req.method} ${originalUrl} -> proxied (client-specific)`);
          return;
        }
      } catch (error) {
        console.error('[Proxy] Error (client-specific):', error);
      }
    }

    if (globalProxyHandler) {
      try {
        const proxied = await globalProxyHandler(req, res);
        if (proxied) {
          if (config.logging) console.log(`[Proxy] ${req.method} ${originalUrl} -> proxied (global)`);
          return;
        }
      } catch (error) {
        console.error('[Proxy] Error (global):', error);
      }
    }

    const url = matchedClient.basePath ? (originalUrl.slice(matchedClient.basePath.length) || '/') : originalUrl;

    if (matchedClient.api) {
      if (matchedClient.basePath) req.url = url;
      const handled = await matchedClient.api.handle(req, res);
      if (matchedClient.basePath) req.url = originalUrl;
      if (handled) return;
    }

    if (config.api) {
      const handled = await config.api.handle(req, res);
      if (handled) return;
    }

    if ((matchedClient.api || config.api) && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method || '')) {
      if (!res.headersSent) {
        if (config.logging) console.log(`[405] ${req.method} ${url} - Method not allowed`);
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method Not Allowed', message: 'No API route found for this request' }));
      }
      return;
    }

    let filePath: string;
    if (url === '/' && config.mode !== 'preview' && matchedClient.ssr && !matchedClient.index) {
      return await serveSSR(res, matchedClient);
    }

    filePath = url === '/' ? (matchedClient.index || '/index.html') : url;
    filePath = filePath.split('?')[0];

    if (config.logging && filePath === '/src/pages') {
      console.log('[DEBUG] Request for /src/pages received');
    }

    if (filePath.includes('\0')) {
      if (config.logging) console.log(`[403] Rejected path with null byte: ${filePath}`);
      return send403(res, '403 Forbidden');
    }

    const isDistRequest = filePath.startsWith('/dist/');
    const isNodeModulesRequest = filePath.startsWith('/node_modules/');
    const normalizedPath = normalize(filePath).replace(/\\/g, '/').replace(/^\/+/, '');

    if (normalizedPath.includes('..')) {
      if (config.logging) console.log(`[403] Path traversal attempt: ${filePath}`);
      return send403(res, '403 Forbidden');
    }

    if (shouldBlockFile(normalizedPath, config.blockFiles)) {
      if (config.logging) console.log(`[403] Blocked file: ${filePath}`);
      return send403(res, '403 Forbidden');
    }

    let fullPath: string | undefined;
    const baseDirs = await getClientBaseDirs(matchedClient, isDistRequest, isNodeModulesRequest);

    for (const baseDir of baseDirs) {
      fullPath = await resolveClientPathFromBaseDir(baseDir, normalizedPath);
      if (fullPath) {
        if (config.logging && filePath === '/src/pages') {
          console.log(`[DEBUG] Initial resolve succeeded: ${fullPath}`);
        }
        break;
      }
    }

    if (!fullPath) {
      if (!res.headersSent) {
        if (filePath === '/index.html' && matchedClient.ssr) {
          return await serveSSR(res, matchedClient);
        }
        if (config.logging) console.log(`[404] ${filePath}`);
        return send404(res, '404 Not Found');
      }
      return;
    }

    try {
      const stats = await stat(fullPath);
      if (stats.isDirectory()) {
        if (config.logging) console.log(`[DEBUG] Path is directory: ${fullPath}, trying index files...`);
        let indexPath: string | undefined;

        try {
          indexPath = await realpath(resolve(join(fullPath, 'index.ts')));
          if (config.logging) console.log('[DEBUG] Found index.ts in directory');
        } catch {
          try {
            indexPath = await realpath(resolve(join(fullPath, 'index.js')));
            if (config.logging) console.log('[DEBUG] Found index.js in directory');
          } catch {
            if (config.logging) console.log('[DEBUG] No index file found in directory');
            if (matchedClient.ssr) {
              return await serveSSR(res, matchedClient);
            }
            return send404(res, '404 Not Found');
          }
        }

        fullPath = indexPath;
      }
    } catch {
      if (config.logging) console.log(`[404] ${filePath}`);
      return send404(res, '404 Not Found');
    }

    try {
      const allowedRoots = await getAllowedClientRoots(matchedClient);
      const stats = await stat(fullPath);

      if (stats.isDirectory()) {
        try {
          const indexPath = await realpath(resolve(join(fullPath, 'index.html')));
          if (!isPathWithinRoot(indexPath, fullPath) && !allowedRoots.some((rootDir) => isPathWithinRoot(indexPath, rootDir))) {
            return send403(res, '403 Forbidden');
          }

          await stat(indexPath);
          return serveFile(indexPath, req, res, matchedClient, isDistRequest || isNodeModulesRequest);
        } catch {
          return send404(res, '404 Not Found');
        }
      }

      await serveFile(fullPath, req, res, matchedClient, isDistRequest || isNodeModulesRequest);
    } catch {
      if (!res.headersSent) {
        if (config.logging) console.log(`[404] ${filePath}`);
        send404(res, '404 Not Found');
      }
    }
  });

  async function serveFile(filePath: string, req: IncomingMessage, res: ServerResponse, client: NormalizedClient, isNodeModulesOrDist: boolean = false) {
    function escapeForTemplateLiteral(input: string): string {
      return input
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$\{/g, '\\${');
    }

    try {
      const allowedRoots = await getAllowedClientRoots(client);
      const rootDir = allowedRoots[0] || await realpath(resolve(client.root));
      const unresolvedPath = resolve(filePath);

      if (!isNodeModulesOrDist) {
        if (!allowedRoots.some((allowedRoot) => isPathWithinRoot(unresolvedPath, allowedRoot))) {
          if (config.logging) console.log(`[403] Attempted to serve file outside allowed directories: ${filePath}`);
          return send403(res, '403 Forbidden');
        }
      }

      let resolvedPath: string;
      try {
        resolvedPath = await realpath(unresolvedPath);

        if (isNodeModulesOrDist && resolvedPath && config.logging && !resolvedPath.startsWith(rootDir + sep)) {
          console.log(`[DEBUG] Serving symlinked file: ${resolvedPath}`);
        }
      } catch {
        if (filePath.endsWith('index.html') && client.ssr) {
          return await serveSSR(res, client);
        }
        return send404(res, '404 Not Found');
      }

      const ext = extname(resolvedPath);
      const urlQuery = req.url?.split('?')[1] || '';
      const isInlineCSS = urlQuery.includes('inline');
      const cacheableTransform = ext === '.ts' || ext === '.tsx' || (ext === '.css' && isInlineCSS);
      const resolvedStats = cacheableTransform ? await stat(resolvedPath) : undefined;
      let mimeType = lookup(resolvedPath) || 'application/octet-stream';
      let content: Buffer;

      if (cacheableTransform && resolvedStats) {
        const cacheKey = createTransformCacheKey(resolvedPath, config.mode, urlQuery);
        const cachedTransform = getValidTransformCacheEntry(transformCache, cacheKey, resolvedStats);

        if (cachedTransform) {
          content = cachedTransform.content;
          mimeType = cachedTransform.mimeType;
        } else {
          const sourceContent = toBuffer(await readFile(resolvedPath));

          if (ext === '.css' && isInlineCSS) {
            const cssContent = escapeForTemplateLiteral(sourceContent.toString());
            const jsModule = `
const css = \`${cssContent}\`;
const style = document.createElement('style');
style.setAttribute('data-file', '${filePath}');
style.textContent = css;
document.head.appendChild(style);
export default css;
`;
            content = Buffer.from(jsModule);
            mimeType = 'application/javascript';
          } else {
            try {
              let transpiled: string;

              if (isDeno) {
                // @ts-ignore
                const result = await Deno.emit(resolvedPath, {
                  check: false,
                  compilerOptions: {
                    sourceMap: config.mode !== 'preview',
                    inlineSourceMap: config.mode !== 'preview',
                    target: 'ES2020',
                    module: 'esnext',
                  },
                  sources: {
                    [resolvedPath]: sourceContent.toString(),
                  },
                });

                transpiled = result.files[resolvedPath.replace(/\.tsx?$/, '.js')] || '';
              } else if (isBun) {
                // @ts-ignore
                const transpiler = new Bun.Transpiler({
                  loader: ext === '.tsx' ? 'tsx' : 'ts',
                  target: 'browser',
                });

                // @ts-ignore
                transpiled = transpiler.transformSync(sourceContent.toString());
              } else {
                transpiled = await transpileNodeBrowserModule(sourceContent.toString(), {
                  filename: resolvedPath,
                  loader: ext === '.tsx' ? 'tsx' : 'ts',
                  mode: config.mode,
                });
              }

              transpiled = transpiled.replace(/from\s+["']([^"']+)\.ts(x?)["']/g, (_, importPath, tsx) => `from "${importPath}.js${tsx}"`);
              transpiled = transpiled.replace(/import\s+["']([^"']+)\.ts(x?)["']/g, (_, importPath, tsx) => `import "${importPath}.js${tsx}"`);
              transpiled = transpiled.replace(/import\s+["']([^"']+\.css)["']/g, (_, importPath) => `import "${importPath}?inline"`);
              transpiled = transpiled.replace(/from\s+["']([^"']+\.css)["']/g, (_, importPath) => `from "${importPath}?inline"`);

              content = Buffer.from(transpiled);
              mimeType = 'application/javascript';
            } catch (error) {
              if (config.logging) console.error('[500] TypeScript compilation error:', error);
              return send500(res, `TypeScript compilation error:\n${error}`);
            }
          }

          transformCache.set(cacheKey, {
            content,
            mimeType,
            mtimeMs: resolvedStats.mtimeMs,
            size: resolvedStats.size,
          });
        }
      } else {
        content = toBuffer(await readFile(resolvedPath));
      }

      if (ext === '.html') {
        const hmrScript = config.mode !== 'preview' ? createHMRScript(config.port) : '';
        let html = content.toString();

        let ssrStyles = '';
        if (client.ssr) {
          try {
            const result = client.ssr();
            let ssrHtml: string;

            if (typeof result === 'string') {
              ssrHtml = result;
            } else if (typeof result === 'object' && result !== null && 'tagName' in result) {
              ssrHtml = dom.renderToString(result as VNode);
            } else {
              ssrHtml = String(result);
            }

            const styleMatches = ssrHtml.match(/<style[^>]*>[\s\S]*?<\/style>/g);
            if (styleMatches) {
              ssrStyles = styleMatches.join('\n');
            }
          } catch (error) {
            if (config.logging) console.error('[Warning] Failed to extract styles from SSR:', error);
          }
        }

        const basePath = normalizeBasePath(client.basePath);
        html = rewriteRelativePaths(html, basePath);

        if (client.basePath && client.basePath !== '/') {
          const baseTag = `<base href="${client.basePath}/">`;
          if (!html.includes('<base')) {
            if (html.includes('<meta name="viewport"')) {
              html = html.replace(/<meta name="viewport"[^>]*>/, (match) => `${match}\n  ${baseTag}`);
            } else if (html.includes('<head>')) {
              html = html.replace('<head>', `<head>\n  ${baseTag}`);
            }
          }
        }

        const elitImportMap = await createElitImportMap(client.root, basePath, client.mode);
        const modeScript = config.mode === 'preview' ? '<script>window.__ELIT_MODE__=\'preview\';</script>' : '';
        const headInjection = `${modeScript}${ssrStyles ? `\n${ssrStyles}` : ''}\n${elitImportMap}`;
        html = html.includes('</head>') ? html.replace('</head>', `${headInjection}</head>`) : html;
        html = html.includes('</body>') ? html.replace('</body>', `${hmrScript}</body>`) : html + hmrScript;
        content = Buffer.from(html);
      }

      const cacheControl = ext === '.html' || ext === '.ts' || ext === '.tsx'
        ? 'no-cache, no-store, must-revalidate'
        : 'public, max-age=31536000, immutable';

      const headers: Record<string, string | number> = {
        'Content-Type': mimeType,
        'Cache-Control': cacheControl,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      };

      const compressible = /^(text\/|application\/(javascript|json|xml))/.test(mimeType);
      const acceptsGzip = requestAcceptsGzip(req.headers['accept-encoding']);

      if (compressible) {
        headers.Vary = 'Accept-Encoding';
      }

      if (!isBun && acceptsGzip && compressible && content.length > 1024) {
        const { gzipSync } = require('zlib');
        const compressed = gzipSync(content);
        headers['Content-Encoding'] = 'gzip';
        headers['Content-Length'] = compressed.length;
        res.writeHead(200, headers);
        res.end(compressed);
      } else {
        res.writeHead(200, headers);
        res.end(content);
      }

      if (config.logging) console.log(`[200] ${relative(client.root, filePath)}`);
    } catch (error) {
      if (config.logging) console.error('[500] Error reading file:', error);
      send500(res, '500 Internal Server Error');
    }
  }

  async function serveSSR(res: ServerResponse, client: NormalizedClient) {
    try {
      if (!client.ssr) {
        return send500(res, 'SSR function not configured');
      }

      const result = client.ssr();
      let html: string;

      if (typeof result === 'string') {
        html = result;
      } else if (typeof result === 'object' && result !== null && 'tagName' in result) {
        const vnode = result as VNode;
        if (vnode.tagName === 'html') {
          html = dom.renderToString(vnode);
        } else {
          html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body>${dom.renderToString(vnode)}</body></html>`;
        }
      } else {
        html = String(result);
      }

      const basePath = normalizeBasePath(client.basePath);
      html = rewriteRelativePaths(html, basePath);

      const hmrScript = config.mode !== 'preview' ? createHMRScript(config.port) : '';
      const elitImportMap = await createElitImportMap(client.root, basePath, client.mode);
      const modeScript = config.mode === 'preview' ? '<script>window.__ELIT_MODE__=\'preview\';</script>\n' : '';
      html = html.includes('</head>') ? html.replace('</head>', `${modeScript}${elitImportMap}</head>`) : html;
      html = html.includes('</body>') ? html.replace('</body>', `${hmrScript}</body>`) : html + hmrScript;

      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      });
      res.end(html);

      if (config.logging) console.log('[200] SSR rendered');
    } catch (error) {
      if (config.logging) console.error('[500] SSR Error:', error);
      send500(res, '500 SSR Error');
    }
  }

  const wss = new WebSocketServer({ server, path: ELIT_INTERNAL_WS_PATH });
  const webSocketServers: WebSocketServer[] = [wss];

  if (config.logging) {
    console.log(`[WebSocket] Internal server initialized at ${ELIT_INTERNAL_WS_PATH}`);
  }

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    wsClients.add(ws);

    const message: HMRMessage = { type: 'connected', timestamp: Date.now() };
    ws.send(JSON.stringify(message));

    if (config.logging) {
      console.log('[WebSocket] Internal client connected from', req.socket.remoteAddress);
    }

    ws.on('message', (data: string) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'state:subscribe') {
          stateManager.subscribe(msg.key, ws);
          if (config.logging) console.log(`[State] Client subscribed to "${msg.key}"`);
        } else if (msg.type === 'state:unsubscribe') {
          stateManager.unsubscribe(msg.key, ws);
          if (config.logging) console.log(`[State] Client unsubscribed from "${msg.key}"`);
        } else if (msg.type === 'state:change') {
          stateManager.handleStateChange(msg.key, msg.value);
          if (config.logging) console.log(`[State] Client updated "${msg.key}"`);
        }
      } catch (error) {
        if (config.logging) console.error('[WebSocket] Message parse error:', error);
      }
    });

    ws.on('close', () => {
      wsClients.delete(ws);
      stateManager.unsubscribeAll(ws);
      if (config.logging) console.log('[WebSocket] Internal client disconnected');
    });
  });

  for (const endpoint of normalizedWebSocketEndpoints) {
    const endpointServer = new WebSocketServer({ server, path: endpoint.path });
    webSocketServers.push(endpointServer);

    if (config.logging) {
      console.log(`[WebSocket] Endpoint ready at ${endpoint.path}`);
    }

    endpointServer.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const requestUrl = req.url || endpoint.path;
      const ctx = {
        ws,
        req,
        path: getRequestPath(requestUrl),
        query: parseRequestQuery(requestUrl),
        headers: req.headers as Record<string, string | string[] | undefined>,
      };

      void Promise.resolve(endpoint.handler(ctx)).catch((error) => {
        if (config.logging) {
          console.error(`[WebSocket] Endpoint error at ${endpoint.path}:`, error);
        }

        try {
          ws.close(CLOSE_CODES.INTERNAL_ERROR, 'Internal Server Error');
        } catch {
          // Ignore close errors while reporting endpoint failures.
        }
      });
    });
  }

  let watcher: any = null;
  if (config.mode !== 'preview') {
    const watchPaths = normalizedClients.flatMap((client) => config.watch.map((pattern) => join(client.root, pattern)));

    watcher = watch(watchPaths, {
      ignored: (path: string) => config.ignore.some((pattern) => path.includes(pattern.replace('/**', '').replace('**/', ''))),
      ignoreInitial: true,
      persistent: true,
    });

    watcher.on('change', (path: string) => {
      if (config.logging) console.log(`[HMR] File changed: ${path}`);
      const message = JSON.stringify({ type: 'update', path, timestamp: Date.now() } as HMRMessage);
      wsClients.forEach((client) => {
        if (client.readyState === ReadyState.OPEN) {
          client.send(message, {}, (err?: Error) => {
            const code = (err as any)?.code;
            if (code === 'ECONNABORTED' || code === 'ECONNRESET' || code === 'EPIPE' || code === 'WS_NOT_OPEN') {
              return;
            }
          });
        }
      });
    });

    watcher.on('add', (path: string) => {
      if (config.logging) console.log(`[HMR] File added: ${path}`);
      const message = JSON.stringify({ type: 'update', path, timestamp: Date.now() } as HMRMessage);
      wsClients.forEach((client) => {
        if (client.readyState === ReadyState.OPEN) client.send(message, {});
      });
    });

    watcher.on('unlink', (path: string) => {
      if (config.logging) console.log(`[HMR] File removed: ${path}`);
      const message = JSON.stringify({ type: 'reload', path, timestamp: Date.now() } as HMRMessage);
      wsClients.forEach((client) => {
        if (client.readyState === ReadyState.OPEN) client.send(message, {});
      });
    });
  }

  server.setMaxListeners(20);
  server.listen(config.port, config.host, () => {
    if (config.logging) {
      console.log('\n🚀 Elit Dev Server');
      console.log(`\n  ➜ Local:   http://${config.host}:${config.port}`);

      if (normalizedClients.length > 1) {
        console.log('  ➜ Clients:');
        normalizedClients.forEach((client) => {
          const clientUrl = `http://${config.host}:${config.port}${client.basePath}`;
          console.log(`     - ${clientUrl} → ${client.root}`);
        });
      } else {
        const client = normalizedClients[0]!;
        console.log(`  ➜ Root:    ${client.root}`);
        if (client.basePath) {
          console.log(`  ➜ Base:    ${client.basePath}`);
        }
      }

      if (config.mode !== 'preview') console.log('\n[HMR] Watching for file changes...\n');
    }

    if (config.open && normalizedClients.length > 0) {
      const firstClient = normalizedClients[0]!;
      const url = `http://${config.host}:${config.port}${firstClient.basePath}`;

      const open = async () => {
        const { default: openBrowser } = await import('open');
        await openBrowser(url);
      };

      open().catch(() => {
        // Fail silently if open package is not available.
      });
    }
  });

  let isClosing = false;
  const close = async () => {
    if (isClosing) return;
    isClosing = true;
    if (config.logging) console.log('\n[Server] Shutting down...');
    transformCache.clear();
    if (watcher) await watcher.close();

    if (smtpServers.length > 0) {
      await Promise.all(smtpServers.map(async (smtpServer) => {
        try {
          await smtpServer.close();
        } catch (error) {
          console.error(`[SMTP] ${createSmtpServerLabel(smtpServer.config)} close error:`, error);
        }
      }));
    }

    if (webSocketServers.length > 0) {
      webSocketServers.forEach((wsServer) => wsServer.close());
      wsClients.clear();
    }

    return new Promise<void>((resolveClose) => {
      server.close(() => {
        if (config.logging) console.log('[Server] Closed');
        resolveClose();
      });
    });
  };

  const primaryClient = normalizedClients[0]!;
  const primaryUrl = `http://${config.host}:${config.port}${primaryClient.basePath}`;

  return {
    server: server as any,
    wss: wss as any,
    smtpServers,
    url: primaryUrl,
    state: stateManager,
    close,
  };
}