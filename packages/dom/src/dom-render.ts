import { captureRenderedVNode, detectRenderRuntimeTarget } from '@elitjs/render-context';
import type { Child, Children, Props, VNode } from '@elitjs/core';
import { ensureElement, hasDocumentApi, isState, resolveElement, resolveTextareaValue, shouldSkipChild } from './helpers';
import packageJson from './package.json';

const ELIT_VERSION = packageJson.version;

export const prevPropsMap = new WeakMap<HTMLElement | SVGElement, Props>();

// True for `{}`-style literals and `Object.create(null)` objects. We only shallow-clone
// these plus arrays; anything else (Date, RegExp, Map, Set, class instances) keeps its
// reference because spreading them would silently strip internal state.
const isPlainObject = (v: unknown): v is Record<string, unknown> => {
    if (!v || typeof v !== 'object') return false;
    const proto = Object.getPrototypeOf(v);
    return proto === null || proto === Object.prototype;
};

// Shallow-clone a single prop value so prev-props snapshots are insulated from in-place
// mutation of the caller's object (e.g. `delete sharedStyle.fontSize`). Only plain objects
// and arrays are cloned; other object kinds keep their reference. One level is enough for
// Elit's surface (`style`, `class`/`className` arrays, `dangerouslySetInnerHTML` all carry
// primitive leaves). If we ever introduce deeply-nested prop shapes that callers are likely
// to mutate, switch to a per-key deep clone or move to value-equality diffing.
const snapshotPropValue = (v: unknown): unknown => {
    if (Array.isArray(v)) return [...v];
    if (isPlainObject(v)) return { ...v };
    return v;
};

export const snapshotProps = (props: Props): Props => {
    const out: Props = {};
    for (const key of Object.keys(props)) {
        if (key === 'ref') continue;
        const value = props[key];
        if (isState(value)) continue;
        out[key] = snapshotPropValue(value) as any;
    }
    return out;
};

function markElitVersion(el: HTMLElement): void {
    el.setAttribute('elit-version', ELIT_VERSION);
}

function isSvgElement(tagName: string, parent: HTMLElement | SVGElement | DocumentFragment): boolean {
    return tagName === 'svg'
        || (tagName[0] === 's' && tagName[1] === 'v' && tagName[2] === 'g')
        || (parent as SVGElement).namespaceURI === 'http://www.w3.org/2000/svg';
}

function applyProp(el: HTMLElement | SVGElement, key: string, value: any, textareaValue: string | undefined): void {
    if (value == null || value === false) return;

    const c = key.charCodeAt(0);

    if (c === 99 && (key.length < 6 || key[5] === 'N')) {
        const classValue = Array.isArray(value) ? value.join(' ') : String(value);
        if (el instanceof SVGElement) {
            el.setAttribute('class', classValue);
        } else {
            el.className = classValue;
        }
    }
    else if (c === 115 && key.length === 5) {
        if (typeof value === 'string') {
            (el as HTMLElement).style.cssText = value;
        } else {
            const style = (el as HTMLElement).style;
            for (const styleKey in value) {
                (style as any)[styleKey] = value[styleKey];
            }
        }
    }
    else if (c === 111 && key.charCodeAt(1) === 110) {
        (el as any)[key.toLowerCase()] = value;
    }
    else if (c === 100 && key.length > 20) {
        (el as HTMLElement).innerHTML = (value as { __html: string }).__html;
    }
    else if (c === 114 && key === 'ref') {
        setTimeout(() => {
            if (typeof value === 'function') {
                value(el as HTMLElement);
            } else {
                (value as { current?: HTMLElement }).current = el as HTMLElement;
            }
        }, 0);
    }
    else if (textareaValue !== undefined && key === 'value') {
        return;
    }
    else if (key === 'value' && el instanceof HTMLInputElement) {
        (el as HTMLInputElement).value = String(value);
    }
    else {
        el.setAttribute(key, value === true ? '' : String(value));
    }
}

function applyProps(el: HTMLElement | SVGElement, props: Props, textareaValue: string | undefined): void {
    for (const key in props) {
        const value = props[key];

        if (isState(value)) {
            applyProp(el, key, value.value, textareaValue);
            value.subscribe((newValue: any) => {
                applyProp(el, key, newValue, textareaValue);
            });
            continue;
        }

        applyProp(el, key, value, textareaValue);
    }

    prevPropsMap.set(el, snapshotProps(props));
}

function renderChildren(children: Children, target: HTMLElement | SVGElement | DocumentFragment): void {
    const len = children.length;

    for (let i = 0; i < len; i++) {
        const child = children[i];
        if (shouldSkipChild(child)) continue;

        if (Array.isArray(child)) {
            for (let j = 0, childLen = child.length; j < childLen; j++) {
                const nestedChild = child[j];
                if (!shouldSkipChild(nestedChild)) {
                    renderToDOM(nestedChild, target);
                }
            }
        } else {
            renderToDOM(child, target);
        }
    }
}

export function renderToDOM(vNode: Child, parent: HTMLElement | SVGElement | DocumentFragment): void {
    if (vNode == null || vNode === false) return;

    if (typeof vNode !== 'object') {
        parent.appendChild(document.createTextNode(String(vNode)));
        return;
    }

    if (isState(vNode)) {
        const textNode = document.createTextNode(String(vNode.value ?? ''));
        parent.appendChild(textNode);
        vNode.subscribe((newValue) => {
            textNode.textContent = String(newValue ?? '');
        });
        return;
    }

    if (Array.isArray(vNode)) {
        for (const child of vNode) {
            renderToDOM(child, parent);
        }
        return;
    }

    const { tagName, props, children } = vNode as VNode;
    const textareaValue = resolveTextareaValue(tagName ?? '', props ?? {});

    if (!tagName) {
        renderChildren(children ?? [], parent);
        return;
    }

    const el = isSvgElement(tagName, parent)
        ? document.createElementNS('http://www.w3.org/2000/svg', tagName.replace('svg', '').toLowerCase() || tagName)
        : document.createElement(tagName);

    applyProps(el, props ?? {}, textareaValue);

    const renderableChildren = textareaValue === undefined ? (children ?? []) : [];
    if (!renderableChildren.length) {
        if (textareaValue !== undefined) {
            (el as HTMLTextAreaElement).value = textareaValue;
        }
        parent.appendChild(el);
        return;
    }

    if (renderableChildren.length > 30) {
        const fragment = document.createDocumentFragment();
        renderChildren(renderableChildren, fragment);
        el.appendChild(fragment);
    } else {
        renderChildren(renderableChildren, el);
    }

    parent.appendChild(el);
}

export function render(rootElement: string | HTMLElement, vNode: VNode): HTMLElement {
    if (!hasDocumentApi()) {
        const runtimeTarget = detectRenderRuntimeTarget();

        if (runtimeTarget === 'desktop' || runtimeTarget === 'mobile') {
            captureRenderedVNode(rootElement, vNode, runtimeTarget);
            return {} as HTMLElement;
        }

        throw new Error('render() requires a DOM or an Elit desktop/mobile runtime target.');
    }

    const el = ensureElement(resolveElement(rootElement), rootElement);
    el.innerHTML = '';
    markElitVersion(el);

    if (vNode.children && vNode.children.length > 500) {
        const fragment = document.createDocumentFragment();
        renderToDOM(vNode, fragment);
        el.appendChild(fragment);
    } else {
        renderToDOM(vNode, el);
    }

    return el;
}

export function batchRender(rootElement: string | HTMLElement, vNodes: VNode[]): HTMLElement {
    const el = ensureElement(resolveElement(rootElement), rootElement);
    markElitVersion(el);
    const len = vNodes.length;

    if (len > 3000) {
        const fragment = document.createDocumentFragment();
        let processed = 0;
        const chunkSize = 1500;

        const processChunk = (): void => {
            const end = Math.min(processed + chunkSize, len);
            for (let i = processed; i < end; i++) {
                renderToDOM(vNodes[i], fragment);
            }
            processed = end;

            if (processed >= len) {
                el.appendChild(fragment);
            } else {
                requestAnimationFrame(processChunk);
            }
        };

        processChunk();
    } else {
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < len; i++) {
            renderToDOM(vNodes[i], fragment);
        }
        el.appendChild(fragment);
    }

    return el;
}

export function renderChunked(
    rootElement: string | HTMLElement,
    vNodes: VNode[],
    chunkSize = 5000,
    onProgress?: (current: number, total: number) => void,
): HTMLElement {
    const el = ensureElement(resolveElement(rootElement), rootElement);
    markElitVersion(el);
    const len = vNodes.length;
    let index = 0;

    const renderChunkFrame = (): void => {
        const end = Math.min(index + chunkSize, len);
        const fragment = document.createDocumentFragment();

        for (let i = index; i < end; i++) {
            renderToDOM(vNodes[i], fragment);
        }

        el.appendChild(fragment);
        index = end;

        if (onProgress) {
            onProgress(index, len);
        }

        if (index < len) {
            requestAnimationFrame(renderChunkFrame);
        }
    };

    requestAnimationFrame(renderChunkFrame);
    return el;
}

export function renderToHead(...vNodes: Array<VNode | VNode[]>): HTMLHeadElement | null {
    const head = document.head;
    if (head) {
        for (const vNode of vNodes.flat()) {
            if (vNode) {
                renderToDOM(vNode, head);
            }
        }
    }

    return head;
}

export function addStyle(cssText: string): HTMLStyleElement {
    const el = document.createElement('style');
    el.textContent = cssText;
    return document.head.appendChild(el);
}

export function addMeta(attrs: Record<string, string>): HTMLMetaElement {
    const el = document.createElement('meta');
    for (const key in attrs) {
        el.setAttribute(key, attrs[key]);
    }
    return document.head.appendChild(el);
}

export function addLink(attrs: Record<string, string>): HTMLLinkElement {
    const el = document.createElement('link');
    for (const key in attrs) {
        el.setAttribute(key, attrs[key]);
    }
    return document.head.appendChild(el);
}

export function setTitle(text: string): string {
    return document.title = text;
}

export function cleanupUnusedElements(root: HTMLElement, elementCache: WeakMap<Element, boolean>): number {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    const toRemove: Element[] = [];

    while (walker.nextNode()) {
        const node = walker.currentNode as Element;
        if (node.id && node.id.startsWith('r') && !elementCache.has(node)) {
            toRemove.push(node);
        }
    }

    toRemove.forEach((el) => el.remove());
    return toRemove.length;
}