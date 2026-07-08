import type { WindowOptions } from './types';
import {
  DESKTOP_RENDER_TRACKED_KEY,
  DESKTOP_WINDOW_CREATED_KEY,
} from './constants';
import { getDesktopAutoRenderGlobals } from './globals';

export function installDesktopRenderTracking(): void {
  const globalScope = getDesktopAutoRenderGlobals();
  globalScope[DESKTOP_WINDOW_CREATED_KEY] = false;

  if (globalScope[DESKTOP_RENDER_TRACKED_KEY] || typeof globalScope.createWindow !== 'function') {
    return;
  }

  const originalCreateWindow = globalScope.createWindow.bind(globalScope);
  globalScope.createWindow = (options: WindowOptions) => {
    globalScope[DESKTOP_WINDOW_CREATED_KEY] = true;
    return originalCreateWindow(options);
  };
  globalScope[DESKTOP_RENDER_TRACKED_KEY] = true;
}