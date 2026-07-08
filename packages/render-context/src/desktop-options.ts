import { DESKTOP_RENDER_OPTIONS_KEY } from './constants';
import { getGlobalRenderScope } from './globals';
import type { DesktopRenderOptions } from './types';

export function setDesktopRenderOptions(options: DesktopRenderOptions): void {
    const globalScope = getGlobalRenderScope();
    globalScope[DESKTOP_RENDER_OPTIONS_KEY] = {
        ...(globalScope[DESKTOP_RENDER_OPTIONS_KEY] ?? {}),
        ...options,
    };
}

export function getDesktopRenderOptions(): DesktopRenderOptions | undefined {
    return getGlobalRenderScope()[DESKTOP_RENDER_OPTIONS_KEY];
}

export function clearDesktopRenderOptions(): void {
    delete getGlobalRenderScope()[DESKTOP_RENDER_OPTIONS_KEY];
}