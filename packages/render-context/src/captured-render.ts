import type { VNode } from '../../core/types';

import { CAPTURED_RENDER_KEY, RUNTIME_TARGET_KEY } from './constants';
import { getGlobalRenderScope } from './globals';
import { detectRenderRuntimeTarget } from './runtime-target';
import type { CapturedRenderState } from './types';

export function captureRenderedVNode(
    rootElement: string | unknown,
    vNode: VNode,
    target = detectRenderRuntimeTarget(),
): void {
    const globalScope = getGlobalRenderScope();
    globalScope[RUNTIME_TARGET_KEY] = target;
    globalScope[CAPTURED_RENDER_KEY] = {
        rootElement,
        target,
        vNode,
    };
}

export function getCapturedRenderedVNode(): CapturedRenderState | undefined {
    return getGlobalRenderScope()[CAPTURED_RENDER_KEY];
}

export function clearCapturedRenderedVNode(): void {
    delete getGlobalRenderScope()[CAPTURED_RENDER_KEY];
}