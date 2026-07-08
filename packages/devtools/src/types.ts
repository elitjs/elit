import type { State } from '@elitjs/core';

export interface StateEntry<T = unknown> {
    name: string;
    state: State<T>;
    subscriberCount: number;
    updateCount: number;
    lastUpdatedAt: number;
    createdAt: number;
    initialValue: T;
    peek(): T;
}

export interface RouteSnapshot {
    name?: string;
    path: string;
    params?: Record<string, string>;
    query?: Record<string, string>;
    hash?: string;
}

export interface RouterEntry {
    name: string;
    current: RouteSnapshot;
    history: RouteSnapshot[];
    navigationCount: number;
    lastNavigatedAt: number;
    destroy(): void;
}

export interface RouterLike {
    currentRoute: State<RouteSnapshot>;
    mode?: string;
    navigate?(path: string, replace?: boolean): void;
    push?(path: string): void;
    replace?(path: string): void;
    destroy?(): void;
}

export interface PerfEvent {
    type: 'state-update' | 'router-nav' | 'render';
    name: string;
    timestamp: number;
    duration?: number;
}

export interface ComponentAttr {
    name: string;
    value: string;
}

export interface ComponentBox {
    width: number;
    height: number;
    top: number;
    left: number;
}

export interface ComponentNode {
    tag: string;
    id?: string;
    classList?: string[];
    attributes?: ComponentAttr[];
    textPreview?: string;
    fullText?: string;
    childElementCount: number;
    descendantCount: number;
    depth: number;
    path: number[];
    box?: ComponentBox;
    visible: boolean;
    children?: ComponentNode[];
}

export interface ComponentDetail extends ComponentNode {
    outerHTMLPreview: string;
    innerHTMLPreview: string;
    stateBindings?: string[];
}

export interface DevToolsSnapshot {
    version: number;
    timestamp: number;
    states: Array<Omit<StateEntry, 'state' | 'peek'> & { value: unknown; valuePreview: string }>;
    routers: Array<Omit<RouterEntry, 'destroy'> & { current: RouteSnapshot }>;
    perfEvents: PerfEvent[];
    componentTree: ComponentNode[];
    componentRoots: number;
    picking: boolean;
    pickedPath: number[] | null;
}

export interface DevToolsBridge {
    version: number;
    snapshot(): DevToolsSnapshot;
    toggle(): void;
    show(): void;
    hide(): void;
    highlightByPath(path: number[]): boolean;
    hoverByPath(path: number[]): boolean;
    clearHighlight(): void;
    inspectByPath(path: number[]): ComponentDetail | null;
    getElementByPath(path: number[]): Element | null;
    startPicking(): boolean;
    stopPicking(): boolean;
    clearPickedPath(): void;
    states: Map<string, StateEntry>;
    routers: Map<string, RouterEntry>;
    perfEvents: PerfEvent[];
    readonly maxPerfEvents: number;
    pushPerfEvent(event: PerfEvent): void;
}

export interface DevToolsInstallOptions {
    router?: RouterLike;
    routerName?: string;
    hotkey?: string | false;
    showPanel?: boolean;
    maxPerfEvents?: number;
    pollIntervalMs?: number;
    autoTrack?: boolean;
}

declare global {
    interface Window {
        __ELIT_DEVTOOLS__?: DevToolsBridge;
    }
}
