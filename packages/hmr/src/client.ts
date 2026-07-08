import type { HMRClient, HMRMessage } from './types';
import { createHmrWebSocketUrl, getHmrSkipReason, isBrowserRuntime } from './utils';

export class ElitHMR implements HMRClient {
  enabled = false;
  private ws: WebSocket | null = null;
  private acceptCallbacks: (() => void)[] = [];
  private disposeCallbacks: (() => void)[] = [];
  private declined = false;
  private targetWindow: Window | undefined;

  constructor(targetWindow: Window | undefined = isBrowserRuntime() ? window : undefined) {
    this.targetWindow = targetWindow;

    if (!this.targetWindow) {
      return;
    }

    const skipReason = getHmrSkipReason(this.targetWindow);
    if (skipReason === 'file') {
      console.log('[Elit HMR] Disabled for file:// protocol');
      return;
    }

    if (skipReason === 'preview') {
      return;
    }

    this.connect();
  }

  private connect(): void {
    if (!this.targetWindow) {
      return;
    }

    this.ws = new WebSocket(createHmrWebSocketUrl(this.targetWindow));

    this.ws.onopen = () => {
      this.enabled = true;
      console.log('[Elit HMR] Connected ✓');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(String(event.data)) as HMRMessage;
        this.handleMessage(data);
      } catch (error) {
        console.error('[Elit HMR] Error parsing message:', error);
      }
    };

    this.ws.onclose = () => {
      this.enabled = false;
      console.log('[Elit HMR] Disconnected - HMR disabled until manual refresh');
    };

    this.ws.onerror = (error) => {
      console.error('[Elit HMR] WebSocket error:', error);
    };
  }

  private handleMessage(data: HMRMessage): void {
    switch (data.type) {
      case 'connected':
        console.log('[Elit HMR] Ready');
        break;

      case 'update':
        console.log(`[Elit HMR] Update detected: ${data.path}`);

        if (this.declined) {
          this.reload();
          return;
        }

        this.disposeCallbacks.forEach((callback) => callback());
        this.disposeCallbacks = [];

        if (this.acceptCallbacks.length > 0) {
          this.acceptCallbacks.forEach((callback) => callback());
          console.log('[Elit HMR] Update accepted via callback');
        } else {
          console.log('[Elit HMR] Update detected - manually refresh to see changes');
        }
        break;

      case 'reload':
        console.log('[Elit HMR] Full reload requested - manually refresh to see changes');
        break;

      case 'error':
        console.error('[Elit HMR] Server error:', data.error);
        break;
    }
  }

  reload(): void {
    this.targetWindow?.location.reload();
  }

  accept(callback?: () => void): void {
    if (callback) {
      this.acceptCallbacks.push(callback);
    }

    this.declined = false;
  }

  decline(): void {
    this.declined = true;
  }

  dispose(callback: () => void): void {
    this.disposeCallbacks.push(callback);
  }
}