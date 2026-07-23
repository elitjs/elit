import type { Child, Props, State, VNode } from '@elitjs/core';
import { dom } from '@elitjs/dom';

export const scheduleRAFUpdate = (rafId: number | null, updateFn: () => void): number => {
    if (rafId) {
        cancelAnimationFrame(rafId);
    }

    return requestAnimationFrame(() => {
        updateFn();
    });
};

export const renderToFragment = (content: VNode | Child | Child[], isVNode?: boolean): DocumentFragment => {
    const fragment = document.createDocumentFragment();

    if (Array.isArray(content)) {
        for (const child of content) {
            dom.renderToDOM(child, fragment);
        }
    } else if (isVNode && content && typeof content === 'object' && 'tagName' in content) {
        const { children } = content as VNode;
        for (const child of children ?? []) {
            dom.renderToDOM(child, fragment);
        }
    } else {
        dom.renderToDOM(content, fragment);
    }

    return fragment;
};

const isFormControl = (el: any): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
    el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;

const isStateValue = (value: any): value is State<any> =>
    value && typeof value === 'object' && 'value' in value && 'subscribe' in value && typeof value.subscribe === 'function';

const isVNodeValue = (value: any): value is VNode =>
    value && typeof value === 'object' && 'tagName' in value && typeof value.tagName === 'string';

export const updateElementProps = (element: HTMLElement | SVGElement, props: Props): void => {
    for (const key in props) {
        const value = props[key];
        if (key === 'ref') {
            continue;
        }

        if (key === 'class' || key === 'className') {
            (element as HTMLElement).className = Array.isArray(value) ? value.join(' ') : (value || '');
        } else if (key === 'style' && typeof value === 'object') {
            const style = (element as HTMLElement).style;
            for (const styleKey in value) {
                (style as any)[styleKey] = value[styleKey];
            }
        } else if (key.startsWith('on')) {
            (element as any)[key.toLowerCase()] = value;
        } else if (key === 'value' && isFormControl(element)) {
            const next = value == null ? '' : String(value);
            if (element.value !== next) {
                element.value = next;
            }
        } else if (key === 'checked' && element instanceof HTMLInputElement) {
            const next = Boolean(value);
            if (element.checked !== next) {
                element.checked = next;
            }
        } else if (value != null && value !== false) {
            element.setAttribute(key, String(value === true ? '' : value));
        } else {
            element.removeAttribute(key);
        }
    }
};

const flattenChildren = (children: Child[]): Child[] => {
    const result: Child[] = [];
    for (const child of children) {
        if (child == null || child === false || child === true) continue;
        if (Array.isArray(child)) {
            const nested = flattenChildren(child);
            for (const n of nested) result.push(n);
        } else {
            result.push(child);
        }
    }
    return result;
};

const resolveTextValue = (child: Child): string => {
    if (isStateValue(child as any)) return String((child as any).value ?? '');
    return String(child);
};

const patchNode = (parent: Node, existing: Node, newChild: Child): void => {
    const childIsState = isStateValue(newChild as any);

    if (typeof newChild !== 'object' || newChild === null || childIsState) {
        const text = resolveTextValue(newChild);
        if (existing.nodeType === Node.TEXT_NODE) {
            if (existing.textContent !== text) {
                existing.textContent = text;
            }
        } else {
            const textNode = document.createTextNode(text);
            parent.replaceChild(textNode, existing);
        }
        return;
    }

    if (isVNodeValue(newChild)) {
        const newTag = (newChild.tagName || '').toLowerCase();
        if (existing.nodeType === Node.ELEMENT_NODE && (existing as Element).tagName.toLowerCase() === newTag) {
            updateElementProps(existing as HTMLElement | SVGElement, newChild.props ?? {});
            reconcileChildren(existing as HTMLElement | SVGElement, newChild.children ?? []);
        } else {
            const fragment = document.createDocumentFragment();
            dom.renderToDOM(newChild, fragment);
            parent.replaceChild(fragment, existing);
        }
        return;
    }

    const text = String(newChild);
    if (existing.nodeType === Node.TEXT_NODE) {
        if (existing.textContent !== text) {
            existing.textContent = text;
        }
    } else {
        const textNode = document.createTextNode(text);
        parent.replaceChild(textNode, existing);
    }
};

export const reconcileChildren = (parent: HTMLElement | SVGElement, children: Child[]): void => {
    const flat = flattenChildren(children);

    const existing: Node[] = [];
    const childNodes = parent.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
        const node = childNodes[i];
        if (node.nodeType === Node.COMMENT_NODE) continue;
        existing.push(node);
    }

    const newLen = flat.length;
    const oldLen = existing.length;
    const minLen = Math.min(newLen, oldLen);

    for (let i = 0; i < minLen; i++) {
        patchNode(parent, existing[i], flat[i]);
    }

    for (let i = oldLen - 1; i >= minLen; i--) {
        parent.removeChild(existing[i]);
    }

    if (newLen > oldLen) {
        const fragment = document.createDocumentFragment();
        for (let i = oldLen; i < newLen; i++) {
            dom.renderToDOM(flat[i], fragment);
        }
        parent.appendChild(fragment);
    }
};