import {
    CAPTURED_RENDER_KEY,
    DESKTOP_RENDER_OPTIONS_KEY,
    RUNTIME_TARGET_KEY,
} from './constants';
import type { CapturedRenderState, DesktopRenderOptions, RenderRuntimeTarget } from './types';

export type GlobalRenderScope = typeof globalThis & {
    [RUNTIME_TARGET_KEY]?: RenderRuntimeTarget;
    [CAPTURED_RENDER_KEY]?: CapturedRenderState;
    [DESKTOP_RENDER_OPTIONS_KEY]?: DesktopRenderOptions;
    createWindow?: unknown;
    document?: Document;
    process?: {
        argv?: string[];
        env?: Record<string, string | undefined>;
    };
    window?: Window & typeof globalThis;
};

export function getGlobalRenderScope(): GlobalRenderScope {
    return globalThis as GlobalRenderScope;
}