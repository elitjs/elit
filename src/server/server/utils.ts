import { existsSync, realpath, stat } from '../fs';
import { join, resolve, sep } from '../path';
import { normalizeSmtpServerConfigs } from '../smtp-server';
import type { IncomingMessage, ServerResponse } from '../http';
import type { ResolvedElitSMTPServerConfig } from '../smtp-server';
import type { Child } from '../../core/types';
import type { DevServerOptions, WebSocketEndpointConfig } from '../types';

import type { ServerRouter } from './router';

function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '{{STAR}}')
    .replace(/\?/g, '{{QMARK}}');

  const regexStr = escaped
    .split('{{GLOBSTAR}}')
    .map((segment) =>
      segment
        .split('{{STAR}}')
        .map((s) => s.split('{{QMARK}}').join('[^/]').replace(/[/\\]/g, '[/\\\\]'))
        .join('[^/\\\\]*'),
    )
    .join('.*');

  return new RegExp(`(?:^|[/\\\\])${regexStr}$`, 'i');
}

const defaultBlockPatterns = [
  '.env',
  '.env.*',
  '*.pem',
  '*.key',
  '*.p12',
  '*.pfx',
  '.git/**',
  '.htaccess',
  'docker-compose.yml',
  'docker-compose.yaml',
  'Dockerfile',
  'elit.config.*',
];

export function shouldBlockFile(normalizedUrlPath: string, blockFiles: string[] | undefined): boolean {
  const patterns = blockFiles ?? defaultBlockPatterns;
  const cleanPath = normalizedUrlPath.replace(/^[/\\]+/, '').replace(/\\/g, '/');
  const fileName = cleanPath.split('/').pop() || cleanPath;

  for (const pattern of patterns) {
    if (!pattern.includes('*') && !pattern.includes('?')) {
      if (pattern.includes('/')) {
        const regex = globToRegex(pattern);
        if (regex.test(cleanPath)) return true;
      } else {
        if (cleanPath === pattern || fileName === pattern) return true;
      }
    } else {
      const regex = globToRegex(pattern);
      if (regex.test(cleanPath)) return true;
    }
  }

  return false;
}

export interface ImportMapEntry {
  [importName: string]: string;
}

export interface TransformCacheEntry {
  content: Buffer;
  mimeType: string;
  mtimeMs: number;
  size: number;
}

export interface NormalizedWebSocketEndpoint {
  path: string;
  handler: WebSocketEndpointConfig['handler'];
}

export interface NormalizedClient {
  root: string;
  fallbackRoot?: string;
  basePath: string;
  index?: string;
  ssr?: () => Child | string;
  api?: ServerRouter;
  ws: NormalizedWebSocketEndpoint[];
  proxyHandler?: (req: IncomingMessage, res: ServerResponse) => Promise<boolean>;
  mode: 'dev' | 'preview';
}

export const defaultOptions: Omit<Required<DevServerOptions>, 'api' | 'clients' | 'root' | 'fallbackRoot' | 'basePath' | 'ssr' | 'proxy' | 'index' | 'env' | 'domain' | 'ws' | 'smtp'> = {
  port: 3000,
  host: 'localhost',
  https: false,
  open: true,
  standalone: false,
  outDir: 'dev-dist',
  outFile: 'index.js',
  watch: ['**/*.ts', '**/*.js', '**/*.html', '**/*.css'],
  ignore: ['node_modules/**', 'dist/**', '.git/**', '**/*.d.ts'],
  blockFiles: ['.env', '.env.*', '*.pem', '*.key', '*.p12', '*.pfx', '.git/**', '.htaccess', 'docker-compose.yml', 'docker-compose.yaml', 'Dockerfile'],
  logging: true,
  worker: [],
  mode: 'dev',
};

export const ELIT_INTERNAL_WS_PATH = '/__elit_ws';

export const createHMRScript = (port: number): string =>
  `<script>(function(){let ws;let retries=0;let maxRetries=5;const protocol=window.location.protocol==='https:'?'wss://':'ws://';function connect(){ws=new WebSocket(protocol+window.location.hostname+':${port}${ELIT_INTERNAL_WS_PATH}');ws.onopen=()=>{console.log('[Elit HMR] Connected');retries=0};ws.onmessage=(e)=>{const d=JSON.parse(e.data);if(d.type==='update'){console.log('[Elit HMR] File updated:',d.path);window.location.reload()}else if(d.type==='reload'){console.log('[Elit HMR] Reloading...');window.location.reload()}else if(d.type==='error')console.error('[Elit HMR] Error:',d.error)};ws.onclose=()=>{if(retries<maxRetries){retries++;setTimeout(connect,1000*retries)}else if(retries===maxRetries){console.log('[Elit HMR] Connection closed. Start dev server to reconnect.')}};ws.onerror=()=>{ws.close()}}connect()})();</script>`;

export const rewriteRelativePaths = (html: string, basePath: string): string => {
  if (!basePath) return html;
  let rewritten = html.replace(/(<script[^>]+src=["'])(?!https?:\/\/|\/)(\.\/)?([^"']+)(["'])/g, `$1${basePath}/$3$4`);
  rewritten = rewritten.replace(/(<link[^>]+href=["'])(?!https?:\/\/|\/)(\.\/)?([^"']+)(["'])/g, `$1${basePath}/$3$4`);
  return rewritten;
};

export const normalizeBasePath = (basePath?: string): string => basePath && basePath !== '/' ? basePath : '';

export function normalizeWebSocketPath(path: string): string {
  let normalizedPath = path.trim();

  if (!normalizedPath) {
    return '/';
  }

  if (!normalizedPath.startsWith('/')) {
    normalizedPath = `/${normalizedPath}`;
  }

  if (normalizedPath.length > 1 && normalizedPath.endsWith('/')) {
    normalizedPath = normalizedPath.slice(0, -1);
  }

  return normalizedPath;
}

export function getRequestPath(url: string): string {
  const [pathname = '/'] = url.split('?');
  return pathname || '/';
}

export function parseRequestQuery(url: string): Record<string, string> {
  const query: Record<string, string> = {};
  const queryString = url.split('?')[1];

  if (!queryString) {
    return query;
  }

  for (const entry of queryString.split('&')) {
    if (!entry) {
      continue;
    }

    const [rawKey, rawValue = ''] = entry.split('=');
    if (!rawKey) {
      continue;
    }

    query[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue);
  }

  return query;
}

export function normalizeWebSocketEndpoints(endpoints: WebSocketEndpointConfig[] | undefined, basePath: string = ''): NormalizedWebSocketEndpoint[] {
  const normalizedBasePath = normalizeBasePath(basePath);

  return (endpoints || []).map((endpoint) => {
    const normalizedPath = normalizeWebSocketPath(endpoint.path);
    const fullPath = !normalizedBasePath
      ? normalizedPath
      : normalizedPath === normalizedBasePath || normalizedPath.startsWith(`${normalizedBasePath}/`)
        ? normalizedPath
        : normalizedPath === '/'
          ? normalizedBasePath
          : `${normalizedBasePath}${normalizedPath}`;

    return {
      path: fullPath,
      handler: endpoint.handler,
    };
  });
}

export function requestAcceptsGzip(acceptEncoding: string | string[] | undefined): boolean {
  if (Array.isArray(acceptEncoding)) {
    return acceptEncoding.some((value) => /\bgzip\b/i.test(value));
  }

  return typeof acceptEncoding === 'string' && /\bgzip\b/i.test(acceptEncoding);
}

export async function findSpecialDir(startDir: string, targetDir: string): Promise<string | null> {
  let currentDir = startDir;
  const maxLevels = 5;

  for (let index = 0; index < maxLevels; index++) {
    const targetPath = resolve(currentDir, targetDir);
    try {
      const stats = await stat(targetPath);
      if (stats.isDirectory()) {
        return currentDir;
      }
    } catch {
      // Directory doesn't exist, try parent.
    }

    const parentDir = resolve(currentDir, '..');
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
  }

  return null;
}

export function createSmtpBindingKey(config: Pick<ResolvedElitSMTPServerConfig, 'host' | 'port'>): string {
  return `${config.host}:${config.port}`;
}

export function createSmtpServerLabel(config: ResolvedElitSMTPServerConfig): string {
  return config.label || createSmtpBindingKey(config);
}

export function formatSmtpServerAddress(address: { address: string; port: number } | string | null, fallback: Pick<ResolvedElitSMTPServerConfig, 'host' | 'port'>): string {
  if (typeof address === 'string') {
    return address;
  }

  if (address) {
    return `${address.address}:${address.port}`;
  }

  return createSmtpBindingKey(fallback);
}

export function collectSmtpServerConfigs(config: DevServerOptions, usesClientArray: boolean): ResolvedElitSMTPServerConfig[] {
  const modeLabel = config.mode || 'dev';
  const smtpConfigs = normalizeSmtpServerConfigs(config.smtp).map((smtpConfig, index) => ({
    ...smtpConfig,
    label: smtpConfig.label || `${modeLabel}.smtp[${index}]`,
  }));

  if (!usesClientArray || !config.clients) {
    return smtpConfigs;
  }

  for (let clientIndex = 0; clientIndex < config.clients.length; clientIndex += 1) {
    const client = config.clients[clientIndex];
    const clientDescriptor = client.basePath || client.root;
    const clientPrefix = clientDescriptor
      ? `${modeLabel}.clients[${clientIndex}] (${clientDescriptor})`
      : `${modeLabel}.clients[${clientIndex}]`;

    smtpConfigs.push(...normalizeSmtpServerConfigs(client.smtp).map((smtpConfig, smtpIndex) => ({
      ...smtpConfig,
      label: smtpConfig.label || `${clientPrefix}.smtp[${smtpIndex}]`,
    })));
  }

  return smtpConfigs;
}

export function assertUniqueSmtpServerBindings(configs: ResolvedElitSMTPServerConfig[]): void {
  const seenBindings = new Map<string, string>();

  for (const smtpConfig of configs) {
    if (smtpConfig.port === 0) {
      continue;
    }

    const bindingKey = createSmtpBindingKey(smtpConfig);
    const currentLabel = createSmtpServerLabel(smtpConfig);
    const previousLabel = seenBindings.get(bindingKey);

    if (previousLabel) {
      throw new Error(`Duplicate SMTP server binding "${bindingKey}" configured for ${previousLabel} and ${currentLabel}`);
    }

    seenBindings.set(bindingKey, currentLabel);
  }
}

export function shouldUseClientFallbackRoot(primaryRoot: string, fallbackRoot: string | undefined, indexPath?: string): boolean {
  if (!fallbackRoot) {
    return false;
  }

  const resolvedPrimaryRoot = resolve(primaryRoot);
  const resolvedFallbackRoot = resolve(fallbackRoot);

  if (!existsSync(resolvedFallbackRoot)) {
    return false;
  }

  const normalizedIndexPath = (indexPath || '/index.html').replace(/^\//, '');
  const primaryHasRuntimeSources = existsSync(join(resolvedPrimaryRoot, 'src'))
    || existsSync(join(resolvedPrimaryRoot, 'public'))
    || existsSync(join(resolvedPrimaryRoot, normalizedIndexPath));

  return !primaryHasRuntimeSources;
}

export function isPathWithinRoot(filePath: string, rootDir: string): boolean {
  return filePath === rootDir || filePath.startsWith(rootDir.endsWith(sep) ? rootDir : `${rootDir}${sep}`);
}

export async function getAllowedClientRoots(client: Pick<NormalizedClient, 'root' | 'fallbackRoot'>): Promise<string[]> {
  const allowedRoots: string[] = [];

  for (const candidateRoot of [client.root, client.fallbackRoot]) {
    if (!candidateRoot) {
      continue;
    }

    try {
      const resolvedRoot = await realpath(resolve(candidateRoot));
      if (!allowedRoots.includes(resolvedRoot)) {
        allowedRoots.push(resolvedRoot);
      }
    } catch {
      // Ignore unavailable fallback roots.
    }
  }

  return allowedRoots;
}

export async function getClientBaseDirs(
  client: Pick<NormalizedClient, 'root' | 'fallbackRoot'>,
  isDistRequest: boolean,
  isNodeModulesRequest: boolean,
): Promise<string[]> {
  const baseDirs: string[] = [];

  for (const candidateRoot of [client.root, client.fallbackRoot]) {
    if (!candidateRoot) {
      continue;
    }

    try {
      const resolvedRoot = await realpath(resolve(candidateRoot));
      let baseDir = resolvedRoot;

      if (isDistRequest || isNodeModulesRequest) {
        const targetDir = isDistRequest ? 'dist' : 'node_modules';
        const foundDir = await findSpecialDir(candidateRoot, targetDir);
        baseDir = foundDir ? await realpath(foundDir) : resolvedRoot;
      }

      if (!baseDirs.includes(baseDir)) {
        baseDirs.push(baseDir);
      }
    } catch {
      // Ignore unavailable fallback roots.
    }
  }

  return baseDirs;
}

export async function resolveClientPathFromBaseDir(baseDir: string, normalizedPath: string): Promise<string | undefined> {
  const tryRealpathWithinBaseDir = async (relativePath: string): Promise<string | undefined> => {
    const unresolvedPath = resolve(join(baseDir, relativePath));
    if (!isPathWithinRoot(unresolvedPath, baseDir)) {
      return undefined;
    }

    try {
      return await realpath(unresolvedPath);
    } catch {
      return undefined;
    }
  };

  const exactPath = await tryRealpathWithinBaseDir(normalizedPath);
  if (exactPath) {
    return exactPath;
  }

  if (normalizedPath.endsWith('.js')) {
    const tsPath = await tryRealpathWithinBaseDir(normalizedPath.replace(/\.js$/, '.ts'));
    if (tsPath) {
      return tsPath;
    }
  }

  if (normalizedPath.includes('.')) {
    return undefined;
  }

  for (const candidatePath of [
    `${normalizedPath}.ts`,
    `${normalizedPath}.js`,
    join(normalizedPath, 'index.ts'),
    join(normalizedPath, 'index.js'),
  ]) {
    const resolvedPath = await tryRealpathWithinBaseDir(candidatePath);
    if (resolvedPath) {
      return resolvedPath;
    }
  }

  return undefined;
}

export function toBuffer(content: string | Buffer): Buffer {
  return typeof content === 'string' ? Buffer.from(content) : content;
}

export function createTransformCacheKey(filePath: string, mode: 'dev' | 'preview', query: string): string {
  return `${mode}:${query}:${filePath}`;
}

export function getValidTransformCacheEntry(
  transformCache: Map<string, TransformCacheEntry>,
  cacheKey: string,
  stats: { mtimeMs: number; size: number },
): TransformCacheEntry | undefined {
  const entry = transformCache.get(cacheKey);
  if (!entry) {
    return undefined;
  }

  if (entry.mtimeMs === stats.mtimeMs && entry.size === stats.size) {
    return entry;
  }

  transformCache.delete(cacheKey);
  return undefined;
}