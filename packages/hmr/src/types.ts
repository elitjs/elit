export interface HMRClient {
  enabled: boolean;
  reload: () => void;
  accept: (callback?: () => void) => void;
  decline: () => void;
  dispose: (callback: () => void) => void;
}

export type HMRMessage =
  | { type: 'connected' }
  | { type: 'update'; path?: string }
  | { type: 'reload' }
  | { type: 'error'; error?: unknown }
  | { type: string; [key: string]: unknown };

declare global {
  interface Window {
    __ELIT_HMR__: HMRClient;
  }
}