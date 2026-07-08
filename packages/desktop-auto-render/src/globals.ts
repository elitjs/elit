import type { WindowOptions } from './types';
import {
  DESKTOP_MESSAGE_HANDLER_KEY,
  DESKTOP_RENDER_TRACKED_KEY,
  DESKTOP_WINDOW_CREATED_KEY,
} from './constants';

export type DesktopAutoRenderGlobals = typeof globalThis & {
  [DESKTOP_RENDER_TRACKED_KEY]?: boolean;
  [DESKTOP_WINDOW_CREATED_KEY]?: boolean;
  [DESKTOP_MESSAGE_HANDLER_KEY]?: boolean;
  createWindow?: (options: WindowOptions) => void;
  onMessage?: (handler: (message: string) => void) => void;
  windowQuit?: () => void;
  windowSetTitle?: (title: string) => void;
};

export function getDesktopAutoRenderGlobals(): DesktopAutoRenderGlobals {
  return globalThis as DesktopAutoRenderGlobals;
}