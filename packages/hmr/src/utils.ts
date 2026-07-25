export function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined';
}

export function getHmrSkipReason(targetWindow: Window): 'file' | 'preview' | null {
  if (targetWindow.location.protocol === 'file:') {
    return 'file';
  }

  if ((targetWindow as any).__ELIT_MODE__ === 'preview') {
    return 'preview';
  }

  return null;
}

const ELIT_INTERNAL_WS_PATH = '/__elit_ws';

export function createHmrWebSocketUrl(targetWindow: Window): string {
  const protocol = targetWindow.location.protocol === 'https:' ? 'wss:' : 'ws:';

  // Connect back to the same origin the page was served from. `location.host`
  // omits the port for default 80/443 and includes it otherwise, which keeps
  // this correct behind TLS-terminating proxies (e.g. Cloudflare) where the
  // public port differs from the dev server's port. Hardcoding the dev
  // server's port would send the socket to a port the proxy doesn't serve.
  return `${protocol}//${targetWindow.location.host}${ELIT_INTERNAL_WS_PATH}`;
}