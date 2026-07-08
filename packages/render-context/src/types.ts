import type { VNode } from '@elitjs/core';

export type RenderRuntimeTarget = 'web' | 'desktop' | 'mobile' | 'unknown';

export interface DesktopInteractionOutputOptions {
    file?: string;
    stdout?: boolean;
    emitReady?: boolean;
}

export interface DesktopRenderOptions {
    title?: string;
    width?: number;
    height?: number;
    center?: boolean;
    icon?: string;
    autoClose?: boolean;
    interactionOutput?: DesktopInteractionOutputOptions;
}

export interface CapturedRenderState {
    rootElement: string | unknown;
    target: RenderRuntimeTarget;
    vNode: VNode;
}