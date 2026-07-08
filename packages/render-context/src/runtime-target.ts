import { RUNTIME_TARGET_ENV, RUNTIME_TARGET_KEY } from './constants';
import { getGlobalRenderScope } from './globals';
import type { RenderRuntimeTarget } from './types';

function isRenderRuntimeTarget(value: unknown): value is RenderRuntimeTarget {
    return value === 'web' || value === 'desktop' || value === 'mobile' || value === 'unknown';
}

export function detectRenderRuntimeTarget(): RenderRuntimeTarget {
    const globalScope = getGlobalRenderScope();
    const explicitTarget = globalScope[RUNTIME_TARGET_KEY] ?? globalScope.process?.env?.[RUNTIME_TARGET_ENV];

    if (isRenderRuntimeTarget(explicitTarget)) {
        return explicitTarget;
    }

    if (typeof globalScope.document !== 'undefined' && typeof globalScope.window !== 'undefined') {
        return 'web';
    }

    if (typeof globalScope.createWindow === 'function') {
        return 'desktop';
    }

    const argvValues = globalScope.process?.argv;
    const argv = Array.isArray(argvValues)
        ? argvValues.join(' ')
        : '';

    if (/\bdesktop\b/i.test(argv)) {
        return 'desktop';
    }

    if (/\b(mobile|native)\b/i.test(argv)) {
        return 'mobile';
    }

    return 'unknown';
}

export function setRenderRuntimeTarget(target: RenderRuntimeTarget): RenderRuntimeTarget | undefined {
    const globalScope = getGlobalRenderScope();
    const previousTarget = globalScope[RUNTIME_TARGET_KEY];
    globalScope[RUNTIME_TARGET_KEY] = target;
    return previousTarget;
}

export function restoreRenderRuntimeTarget(target?: RenderRuntimeTarget): void {
    const globalScope = getGlobalRenderScope();

    if (target === undefined) {
        delete globalScope[RUNTIME_TARGET_KEY];
        return;
    }

    globalScope[RUNTIME_TARGET_KEY] = target;
}