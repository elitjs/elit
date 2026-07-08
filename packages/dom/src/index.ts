/**
 * Elit - DomNode Core Class
 */

import type { VNode, Child, Children, Props, State, StateOptions, VirtualListController, JsonNode, VNodeJson } from '../../core/types';
import { addLink, addMeta, addStyle, batchRender, cleanupUnusedElements, render as renderDom, renderChunked, renderToDOM, renderToHead, setTitle } from './dom-render';
import { jsonToVNode, renderJson, renderJsonToString, renderVNode, renderVNodeToString, vNodeJsonToVNode } from './json';
import type { ReactiveNodes } from './reactive';
import { renderToHTMLDocument, renderToString as renderToStringDom } from './string-render';
import { computed, createState, createVirtualList, effect, lazy } from './state-utils';

export class DomNode {
    private elementCache = new WeakMap<Element, boolean>();
    private reactiveNodes: ReactiveNodes = new Map();

    createElement(tagName: string, props: Props = {}, children: Children = []): VNode {
        return { tagName, props, children };
    }

    renderToDOM(vNode: Child, parent: HTMLElement | SVGElement | DocumentFragment): void {
        return renderToDOM(vNode, parent);
    }

    render(rootElement: string | HTMLElement, vNode: VNode): HTMLElement {
        return renderDom(rootElement, vNode);
    }

    batchRender(rootElement: string | HTMLElement, vNodes: VNode[]): HTMLElement {
        return batchRender(rootElement, vNodes);
    }

    renderChunked(
        rootElement: string | HTMLElement,
        vNodes: VNode[],
        chunkSize = 5000,
        onProgress?: (current: number, total: number) => void
    ): HTMLElement {
        return renderChunked(rootElement, vNodes, chunkSize, onProgress);
    }

    renderToHead(...vNodes: Array<VNode | VNode[]>): HTMLHeadElement | null {
        return renderToHead(...vNodes);
    }

    addStyle(cssText: string): HTMLStyleElement {
        return addStyle(cssText);
    }

    addMeta(attrs: Record<string, string>): HTMLMetaElement {
        return addMeta(attrs);
    }

    addLink(attrs: Record<string, string>): HTMLLinkElement {
        return addLink(attrs);
    }

    setTitle(text: string): string {
        return setTitle(text);
    }

    // Reactive State Management
    createState<T>(initialValue: T, options: StateOptions = {}): State<T> {
        return createState(initialValue, options);
    }

    computed<T extends any[], R>(states: { [K in keyof T]: State<T[K]> }, computeFn: (...values: T) => R): State<R> {
        return computed(states, computeFn);
    }

    effect(stateFn: () => void): void {
        effect(stateFn);
    }

    // Virtual scrolling helper for large lists
    createVirtualList<T>(
        container: HTMLElement,
        items: T[],
        renderItem: (item: T, index: number) => VNode,
        itemHeight = 50,
        bufferSize = 5
    ): VirtualListController {
        return createVirtualList(container, items, renderItem, itemHeight, bufferSize);
    }

    // Lazy load components
    lazy<T extends any[], R>(loadFn: () => Promise<(...args: T) => R>): (...args: T) => Promise<R | VNode> {
        return lazy(loadFn);
    }

    // Memory management - cleanup unused elements
    cleanupUnusedElements(root: HTMLElement): number {
        return cleanupUnusedElements(root, this.elementCache);
    }

    // Server-Side Rendering - convert VNode to HTML string
    renderToString(vNode: Child, options: { pretty?: boolean; indent?: number } = {}): string {
        return renderToStringDom(vNode, options);
    }

    jsonToVNode(json: JsonNode | string | number | boolean | null | undefined | State<any>): Child {
        return jsonToVNode(json, this.reactiveNodes);
    }

    vNodeJsonToVNode(json: VNodeJson | State<any>): Child {
        return vNodeJsonToVNode(json, this.reactiveNodes);
    }

    renderJson(rootElement: string | HTMLElement, json: JsonNode): HTMLElement {
        return renderJson(rootElement, json, this.reactiveNodes);
    }

    renderVNode(rootElement: string | HTMLElement, json: VNodeJson): HTMLElement {
        return renderVNode(rootElement, json, this.reactiveNodes);
    }

    renderJsonToString(json: JsonNode, options: { pretty?: boolean; indent?: number } = {}): string {
        return renderJsonToString(json, this.reactiveNodes, options);
    }

    renderVNodeToString(json: VNodeJson, options: { pretty?: boolean; indent?: number } = {}): string {
        return renderVNodeToString(json, this.reactiveNodes, options);
    }


    // Generate complete HTML document as string (for SSR)
    renderToHTMLDocument(vNode: Child, options: {
        title?: string;
        meta?: Array<Record<string, string>>;
        links?: Array<Record<string, string>>;
        scripts?: Array<{ src?: string; content?: string; async?: boolean; defer?: boolean; type?: string }>;
        styles?: Array<{ href?: string; content?: string }>;
        lang?: string;
        head?: string;
        bodyAttrs?: Record<string, string>;
        pretty?: boolean;
    } = {}): string {
        return renderToHTMLDocument(vNode, options);
    }

    // Expose elementCache for reactive updates
    getElementCache(): WeakMap<Element, boolean> {
        return this.elementCache;
    }
}

export const dom = new DomNode();

// Export helper functions for convenience
export const render = dom.render.bind(dom);
export const renderToString = dom.renderToString.bind(dom);
export const mount = render; // alias for render
