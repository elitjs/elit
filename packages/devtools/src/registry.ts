import type { ComponentAttr, ComponentDetail, ComponentNode, DevToolsBridge, PerfEvent } from './types';

export const DEVTOOLS_VERSION = 1;
export const DEFAULT_MAX_PERF_EVENTS = 200;
export const DEFAULT_POLL_INTERVAL_MS = 500;

let bridge: DevToolsBridge | null = null;

export function getBridge(): DevToolsBridge | null {
    return bridge;
}

export function ensureBridge(maxPerfEvents = DEFAULT_MAX_PERF_EVENTS): DevToolsBridge {
    if (bridge) {
        return bridge;
    }

    if (typeof window === 'undefined') {
        throw new Error('@elitjs/devtools requires a browser environment (window is undefined).');
    }

    const perfEvents: PerfEvent[] = [];

    const instance: DevToolsBridge = {
        version: DEVTOOLS_VERSION,
        states: new Map(),
        routers: new Map(),
        perfEvents,
        maxPerfEvents,
        pushPerfEvent(event: PerfEvent): void {
            perfEvents.push(event);
            if (perfEvents.length > maxPerfEvents) {
                perfEvents.splice(0, perfEvents.length - maxPerfEvents);
            }
        },
        snapshot() {
            const tree = captureComponentTree();
            return {
                version: DEVTOOLS_VERSION,
                timestamp: Date.now(),
                states: [...instance.states.values()].map((entry) => ({
                    name: entry.name,
                    subscriberCount: entry.subscriberCount,
                    updateCount: entry.updateCount,
                    lastUpdatedAt: entry.lastUpdatedAt,
                    createdAt: entry.createdAt,
                    initialValue: entry.initialValue,
                    value: safeSerialize(entry.peek()),
                    valuePreview: previewValue(entry.peek()),
                })),
                routers: [...instance.routers.values()].map((router) => ({
                    name: router.name,
                    current: router.current,
                    history: router.history,
                    navigationCount: router.navigationCount,
                    lastNavigatedAt: router.lastNavigatedAt,
                })),
                perfEvents: [...perfEvents],
                componentTree: tree,
                componentRoots: tree.length,
                picking: pickingState.active,
                pickedPath: pickingState.lastPickedPath,
            };
        },
        toggle() {
            togglePanel();
        },
        show() {
            showPanel();
        },
        hide() {
            hidePanel();
        },
        getElementByPath(path: number[]): Element | null {
            return resolveElementByPath(path);
        },
        highlightByPath(path: number[]): boolean {
            const el = resolveElementByPath(path);
            if (!el) return false;
            applyHighlight(el, 'select');
            return true;
        },
        hoverByPath(path: number[]): boolean {
            const el = resolveElementByPath(path);
            if (!el) return false;
            applyHighlight(el, 'hover');
            return true;
        },
        clearHighlight(): void {
            clearAllHighlights();
        },
        inspectByPath(path: number[]): ComponentDetail | null {
            const el = resolveElementByPath(path);
            if (!el) return null;
            return inspectElement(el, path);
        },
        startPicking(): boolean {
            return startPicking();
        },
        stopPicking(): boolean {
            return stopPicking();
        },
        clearPickedPath(): void {
            pickingState.lastPickedPath = null;
        },
    };

    window.__ELIT_DEVTOOLS__ = instance;
    bridge = instance;
    return instance;
}

let panelToggleFn: (() => void) | null = null;
let panelShowFn: (() => void) | null = null;
let panelHideFn: (() => void) | null = null;

export function registerPanelControls(toggle: () => void, show: () => void, hide: () => void): void {
    panelToggleFn = toggle;
    panelShowFn = show;
    panelHideFn = hide;
}

function togglePanel(): void {
    panelToggleFn?.();
}

function showPanel(): void {
    panelShowFn?.();
}

function hidePanel(): void {
    panelHideFn?.();
}

const TEXT_PREVIEW_MAX = 60;
const FULL_TEXT_MAX = 280;
const HTML_PREVIEW_MAX = 400;
const MAX_TREE_DEPTH = 12;
const MAX_CHILDREN_PER_NODE = 200;
const HIGHLIGHT_OVERLAY_ID = '__elit-devtools-overlay__';
const HOVER_OVERLAY_ID = '__elit-devtools-hover__';
const HIGHLIGHT_ATTR = 'data-elit-highlight';
const SKIPPED_ATTRS = new Set(['id', 'class', 'style', 'data-elit-highlight']);

function captureComponentTree(): ComponentNode[] {
    if (typeof document === 'undefined') return [];
    const roots = collectRoots();
    const result: ComponentNode[] = [];
    roots.forEach((root, idx) => {
        const node = captureNode(root, 0, [idx], new WeakSet<Element>());
        if (node) result.push(node);
    });
    return result;
}

function collectRoots(): Element[] {
    const candidates: Element[] = [];
    const app = document.querySelector('#app');
    if (app) {
        const direct = Array.from(app.children);
        if (direct.length > 0) {
            candidates.push(...direct);
        } else {
            candidates.push(app);
        }
        return candidates;
    }
    const bodyChildren = Array.from(document.body?.children ?? []);
    for (const child of bodyChildren) {
        if (child.id === '__elit-devtools-panel__') continue;
        candidates.push(child);
    }
    return candidates;
}

function captureNode(element: Element, depth: number, path: number[], seen: WeakSet<Element>): ComponentNode | null {
    if (depth > MAX_TREE_DEPTH) return null;
    if (seen.has(element)) return null;
    seen.add(element);
    if (element.id === '__elit-devtools-panel__') return null;
    if (element.hasAttribute(HIGHLIGHT_ATTR)) return null;

    const tag = element.tagName.toLowerCase();
    const rect = element.getBoundingClientRect();
    const node: ComponentNode = {
        tag,
        childElementCount: element.childElementCount,
        descendantCount: countDescendants(element, MAX_TREE_DEPTH - depth),
        depth,
        path,
        visible: rect.width > 0 && rect.height > 0,
    };

    if (element.id) node.id = element.id;
    const classList = Array.from(element.classList).filter((c) => c && !c.startsWith('__elit'));
    if (classList.length > 0) node.classList = classList.slice(0, 6);

    const attrs = captureAttributes(element);
    if (attrs.length > 0) node.attributes = attrs;

    if (rect.width > 0 || rect.height > 0) {
        node.box = {
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            top: Math.round(rect.top),
            left: Math.round(rect.left),
        };
    }

    const text = extractTextPreview(element);
    if (text) {
        node.textPreview = text.short;
        node.fullText = text.full;
    }

    const childNodes: ComponentNode[] = [];
    let idx = 0;
    for (const child of element.children) {
        if (idx >= MAX_CHILDREN_PER_NODE) break;
        const childNode = captureNode(child, depth + 1, [...path, idx], seen);
        if (childNode) childNodes.push(childNode);
        idx += 1;
    }
    if (childNodes.length > 0) node.children = childNodes;

    return node;
}

function captureAttributes(element: Element): ComponentAttr[] {
    const attrs: ComponentAttr[] = [];
    for (const attr of Array.from(element.attributes)) {
        if (SKIPPED_ATTRS.has(attr.name)) continue;
        if (attr.name.startsWith('data-elit')) continue;
        const value = attr.value.length > 80 ? `${attr.value.slice(0, 80)}…` : attr.value;
        attrs.push({ name: attr.name, value });
        if (attrs.length >= 8) break;
    }
    return attrs;
}

function countDescendants(element: Element, maxDepth: number): number {
    if (maxDepth <= 0) return 0;
    let total = 0;
    const walk = (el: Element, depth: number): void => {
        if (depth <= 0) return;
        total += el.childElementCount;
        if (total > 9999) return;
        for (const child of el.children) {
            walk(child, depth - 1);
        }
    };
    walk(element, maxDepth);
    return total;
}

function extractTextPreview(element: Element): { short: string; full: string } | undefined {
    if (element.childElementCount > 0) return undefined;
    const raw = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (!raw) return undefined;
    const short = raw.length > TEXT_PREVIEW_MAX ? `${raw.slice(0, TEXT_PREVIEW_MAX)}…` : raw;
    const full = raw.length > FULL_TEXT_MAX ? `${raw.slice(0, FULL_TEXT_MAX)}…` : raw;
    return { short, full };
}

function resolveElementByPath(path: number[]): Element | null {
    if (typeof document === 'undefined') return null;
    if (!Array.isArray(path) || path.length === 0) return null;
    const roots = collectRoots();
    let current: Element | null = roots[path[0]] ?? null;
    for (let i = 1; i < path.length; i++) {
        if (!current) return null;
        current = current.children[path[i]] ?? null;
    }
    return current;
}

function ensureOverlay(id: string, borderColor: string, bg: string): HTMLDivElement | null {
    if (typeof document === 'undefined') return null;
    let existing = document.getElementById(id) as HTMLDivElement | null;
    if (existing) return existing;
    const overlay = document.createElement('div');
    overlay.id = id;
    overlay.setAttribute(HIGHLIGHT_ATTR, 'true');
    overlay.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 2147483647;
        border: 2px solid ${borderColor};
        background: ${bg};
        transition: all 80ms ease-out;
        box-shadow: 0 0 0 2px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3);
    `;
    const label = document.createElement('div');
    label.setAttribute(HIGHLIGHT_ATTR, 'true');
    label.style.cssText = `
        position: absolute;
        top: -22px;
        left: -2px;
        padding: 2px 6px;
        background: ${borderColor};
        color: #1a1d28;
        font: 600 11px/1.4 ui-monospace, Menlo, monospace;
        border-radius: 3px;
        white-space: nowrap;
        max-width: 240px;
        overflow: hidden;
        text-overflow: ellipsis;
    `;
    overlay.appendChild(label);
    document.body.appendChild(overlay);
    return overlay;
}

function positionOverlay(overlay: HTMLDivElement, element: Element, color: string): void {
    const rect = element.getBoundingClientRect();
    overlay.style.top = `${rect.top}px`;
    overlay.style.left = `${rect.left}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    const label = overlay.firstChild as HTMLDivElement;
    if (label) {
        const tag = element.tagName.toLowerCase();
        const id = element.id ? `#${element.id}` : '';
        const cls = element.classList.length > 0 ? `.${element.classList[0]}` : '';
        const dim = `${Math.round(rect.width)}×${Math.round(rect.height)}`;
        label.textContent = `${tag}${id}${cls}  ${dim}`;
        label.style.background = color;
    }
}

function applyHighlight(element: Element, kind: 'select' | 'hover'): boolean {
    if (kind === 'select') {
        const overlay = ensureOverlay(HIGHLIGHT_OVERLAY_ID, '#a78bfa', 'rgba(167, 139, 250, 0.18)');
        if (overlay) {
            positionOverlay(overlay, element, '#a78bfa');
            element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
    } else {
        const overlay = ensureOverlay(HOVER_OVERLAY_ID, '#22d3ee', 'rgba(34, 211, 238, 0.12)');
        if (overlay) positionOverlay(overlay, element, '#22d3ee');
    }
    return true;
}

function clearAllHighlights(): void {
    if (typeof document === 'undefined') return;
    document.getElementById(HIGHLIGHT_OVERLAY_ID)?.remove();
    document.getElementById(HOVER_OVERLAY_ID)?.remove();
}

function inspectElement(element: Element, path: number[]): ComponentDetail | null {
    const node = captureNode(element, 0, path, new WeakSet<Element>());
    if (!node) return null;
    const outer = element.outerHTML ?? '';
    const inner = element.innerHTML ?? '';
    return {
        ...node,
        depth: path.length - 1,
        outerHTMLPreview: outer.length > HTML_PREVIEW_MAX ? `${outer.slice(0, HTML_PREVIEW_MAX)}…` : outer,
        innerHTMLPreview: inner.length > HTML_PREVIEW_MAX ? `${inner.slice(0, HTML_PREVIEW_MAX)}…` : inner,
    };
}

interface PickingState {
    active: boolean;
    lastPickedPath: number[] | null;
    handlers: {
        move: (e: MouseEvent) => void;
        click: (e: MouseEvent) => void;
        key: (e: KeyboardEvent) => void;
    } | null;
    styleEl: HTMLStyleElement | null;
}

const pickingState: PickingState = {
    active: false,
    lastPickedPath: null,
    handlers: null,
    styleEl: null,
};

const PICKING_STYLE_ID = '__elit-devtools-picking-style__';

function findPathOfElement(target: Element): number[] | null {
    const roots = collectRoots();
    const path: number[] = [];
    let current: Element | null = target;
    while (current) {
        if (current.id === '__elit-devtools-panel__') return null;
        if (current.hasAttribute(HIGHLIGHT_ATTR)) {
            current = current.parentElement;
            continue;
        }
        const rootIdx = roots.indexOf(current);
        if (rootIdx >= 0) {
            path.unshift(rootIdx);
            return path;
        }
        const parent = current.parentElement;
        if (!parent) return null;
        const childIdx = Array.prototype.indexOf.call(parent.children, current);
        if (childIdx < 0) return null;
        path.unshift(childIdx);
        current = parent;
    }
    return null;
}

function startPicking(): boolean {
    if (typeof document === 'undefined') return false;
    if (pickingState.active) return false;

    const move = (e: MouseEvent): void => {
        const target = e.target as Element | null;
        if (!target || target.id === '__elit-devtools-panel__') return;
        if (target.hasAttribute && target.hasAttribute(HIGHLIGHT_ATTR)) return;
        const path = findPathOfElement(target);
        if (path) applyHighlight(target, 'hover');
        else clearAllHighlights();
    };
    const click = (e: MouseEvent): void => {
        e.preventDefault();
        e.stopPropagation();
        const target = e.target as Element | null;
        if (target) {
            const path = findPathOfElement(target);
            if (path) pickingState.lastPickedPath = path;
        }
        stopPicking();
    };
    const key = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') stopPicking();
    };

    pickingState.handlers = { move, click, key };
    document.addEventListener('mousemove', move, true);
    document.addEventListener('click', click, true);
    document.addEventListener('keydown', key, true);

    let styleEl = document.getElementById(PICKING_STYLE_ID) as HTMLStyleElement | null;
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = PICKING_STYLE_ID;
        styleEl.setAttribute(HIGHLIGHT_ATTR, 'true');
        styleEl.textContent = 'body, body * { cursor: crosshair !important; }';
        document.head?.appendChild(styleEl);
    }
    pickingState.styleEl = styleEl;

    pickingState.active = true;
    return true;
}

function stopPicking(): boolean {
    if (!pickingState.handlers) {
        pickingState.active = false;
        return false;
    }
    const { move, click, key } = pickingState.handlers;
    document.removeEventListener('mousemove', move, true);
    document.removeEventListener('click', click, true);
    document.removeEventListener('keydown', key, true);
    pickingState.handlers = null;
    pickingState.styleEl?.remove();
    pickingState.styleEl = null;
    clearAllHighlights();
    pickingState.active = false;
    return true;
}

export function safeSerialize(value: unknown): unknown {
    if (value === undefined || value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'function') {
        return `[function ${value.name || 'anonymous'}]`;
    }

    if (typeof value === 'symbol') {
        return value.toString();
    }

    if (typeof value === 'bigint') {
        return `${value.toString()}n`;
    }

    try {
        const seen = new WeakSet<object>();
        return JSON.parse(JSON.stringify(value, (_key, val) => {
            if (val && typeof val === 'object') {
                if (seen.has(val)) {
                    return '[Circular]';
                }
                seen.add(val);
                if (val instanceof Error) {
                    return { name: val.name, message: val.message, stack: val.stack };
                }
                if (val instanceof Map) {
                    return [...val.entries()];
                }
                if (val instanceof Set) {
                    return [...val.values()];
                }
                if (val instanceof Date) {
                    return val.toISOString();
                }
            }
            return val;
        }));
    } catch {
        return String(value);
    }
}

export function previewValue(value: unknown, maxLength = 80): string {
    let text: string;

    if (value === undefined) {
        text = 'undefined';
    } else if (value === null) {
        text = 'null';
    } else if (typeof value === 'string') {
        text = JSON.stringify(value.length > maxLength ? `${value.slice(0, maxLength)}…` : value);
    } else if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
        text = String(value);
    } else if (typeof value === 'function') {
        text = `[function ${value.name || 'anonymous'}]`;
    } else {
        try {
            text = JSON.stringify(value);
            if (text && text.length > maxLength) {
                text = `${text.slice(0, maxLength)}…`;
            }
        } catch {
            text = '[unserializable]';
        }
    }

    return text;
}
