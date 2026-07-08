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

export function createHmrWebSocketUrl(targetWindow: Window): string {
  const protocol = targetWindow.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = targetWindow.location.hostname;
  const port = targetWindow.location.port || '3000';

  return `${protocol}//${host}:${port}`;
}