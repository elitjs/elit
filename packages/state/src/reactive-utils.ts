import type { Child, Props, State, VNode } from '@elitjs/core';
import { dom, prevPropsMap, snapshotProps } from '@elitjs/dom';

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

const isDangerouslySetInnerHTMLKey = (key: string): boolean =>
    key.charCodeAt(0) === 100 && key.length > 20;

const removeProp = (element: HTMLElement | SVGElement, key: string): void => {
    if (key === 'class' || key === 'className') {
        if ((element as HTMLElement).className !== '') {
            (element as HTMLElement).className = '';
        }
    } else if (key === 'style') {
        (element as HTMLElement).style.cssText = '';
    } else if (key.startsWith('on')) {
        if ((element as any)[key.toLowerCase()] != null) {
            (element as any)[key.toLowerCase()] = null;
        }
    } else if (key === 'value' && isFormControl(element)) {
        if (element.value !== '') {
            element.value = '';
        }
    } else if (key === 'checked' && element instanceof HTMLInputElement) {
        if (element.checked) {
            element.checked = false;
        }
    } else if (element.hasAttribute(key)) {
        element.removeAttribute(key);
    }
};

export const updateElementProps = (element: HTMLElement | SVGElement, props: Props): void => {
    const prev = prevPropsMap.get(element);

    if (prev) {
        for (const key in prev) {
            if (key === 'ref') continue;
            if (!(key in props)) {
                removeProp(element, key);
            }
        }
    }

    for (const key in props) {
        const value = props[key];
        if (key === 'ref') {
            continue;
        }

        if (isStateValue(value)) {
            continue;
        }

        if (key === 'class' || key === 'className') {
            const next = Array.isArray(value) ? value.join(' ') : (value || '');
            if ((element as HTMLElement).className !== next) {
                (element as HTMLElement).className = next;
            }
        } else if (key === 'style') {
            const style = (element as HTMLElement).style;
            if (typeof value === 'string') {
                if (style.cssText !== value) {
                    style.cssText = value;
                }
            } else if (value && typeof value === 'object') {
                const prevStyle = prev && typeof (prev as any).style === 'object' ? (prev as any).style : null;
                if (prevStyle) {
                    for (const sk in prevStyle) {
                        if (!(sk in value)) (style as any)[sk] = '';
                    }
                }
                for (const sk in value) {
                    (style as any)[sk] = value[sk];
                }
            }
        } else if (key.startsWith('on')) {
            (element as any)[key.toLowerCase()] = value;
        } else if (isDangerouslySetInnerHTMLKey(key) && value && typeof value === 'object' && '__html' in value) {
            const html = String((value as any).__html);
            if ((element as HTMLElement).innerHTML !== html) {
                (element as HTMLElement).innerHTML = html;
            }
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
        } else if (value == null || value === false) {
            if (element.hasAttribute(key)) {
                element.removeAttribute(key);
            }
        } else {
            const next = String(value === true ? '' : value);
            if (element.getAttribute(key) !== next) {
                element.setAttribute(key, next);
            }
        }
    }

    prevPropsMap.set(element, snapshotProps(props));
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