import type { Child, Props, VNode } from '../../core/types';
import { dom } from '../dom';

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
        for (const child of children) {
            dom.renderToDOM(child, fragment);
        }
    } else {
        dom.renderToDOM(content, fragment);
    }

    return fragment;
};

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
        } else if (value != null && value !== false) {
            element.setAttribute(key, String(value === true ? '' : value));
        } else {
            element.removeAttribute(key);
        }
    }
};