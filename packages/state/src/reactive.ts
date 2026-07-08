import type { Child, Props, State, VNode } from '../../core/types';
import { dom } from '../dom';
import { renderToFragment, scheduleRAFUpdate, updateElementProps } from './reactive-utils';

export const reactive = <T>(state: State<T>, renderFn: (value: T) => VNode | Child | Child[]): VNode => {
    let rafId: number | null = null;
    let elementRef: HTMLElement | SVGElement | null = null;
    let placeholder: Comment | null = null;
    let isInDOM = true;

    const initialResult = renderFn(state.value);
    const isVNodeResult = initialResult && typeof initialResult === 'object' && 'tagName' in initialResult;
    const initialIsNull = initialResult == null || initialResult === false;

    const updateElement = () => {
        if (!elementRef && !placeholder) {
            return;
        }

        const newResult = renderFn(state.value);
        const resultIsNull = newResult == null || newResult === false;

        if (resultIsNull) {
            if (isInDOM && elementRef) {
                placeholder = document.createComment('reactive');
                elementRef.parentNode?.replaceChild(placeholder, elementRef);
                isInDOM = false;
            }
        } else {
            if (!isInDOM && placeholder && elementRef) {
                placeholder.parentNode?.replaceChild(elementRef, placeholder);
                placeholder = null;
                isInDOM = true;
            }

            if (elementRef) {
                const isCurrentVNode = !!(isVNodeResult && newResult && typeof newResult === 'object' && 'tagName' in newResult);
                if (isCurrentVNode) {
                    const { props } = newResult as VNode;
                    updateElementProps(elementRef, props);
                }

                const fragment = renderToFragment(newResult as any, isCurrentVNode);
                elementRef.textContent = '';
                elementRef.appendChild(fragment);
                dom.getElementCache().set(elementRef, true);
            }
        }
    };

    state.subscribe(() => {
        rafId = scheduleRAFUpdate(rafId, () => {
            updateElement();
            rafId = null;
        });
    });

    const refCallback = (el: HTMLElement | SVGElement) => {
        elementRef = el;
        if (initialIsNull && el.parentNode) {
            placeholder = document.createComment('reactive');
            el.parentNode.replaceChild(placeholder, el);
            isInDOM = false;
        }
    };

    if (isVNodeResult) {
        const vnode = initialResult as VNode;
        return {
            tagName: vnode.tagName,
            props: { ...vnode.props, ref: refCallback },
            children: vnode.children,
        };
    }

    const initialChildren = Array.isArray(initialResult) ? initialResult : [initialResult];
    return { tagName: 'span', props: { ref: refCallback, style: { display: 'contents' } }, children: initialChildren };
};

export const reactiveAs = <T>(
    tagName: string,
    state: State<T>,
    renderFn: (value: T) => VNode | Child | Child[],
    props: Props = {},
): VNode => {
    let rafId: number | null = null;
    let elementRef: HTMLElement | SVGElement | null = null;

    state.subscribe(() => {
        rafId = scheduleRAFUpdate(rafId, () => {
            if (elementRef) {
                const newResult = renderFn(state.value);

                if (newResult == null || newResult === false) {
                    (elementRef as HTMLElement).style.display = 'none';
                    elementRef.textContent = '';
                } else {
                    (elementRef as HTMLElement).style.display = '';
                    const fragment = renderToFragment(newResult as any, false);
                    elementRef.textContent = '';
                    elementRef.appendChild(fragment);
                }

                dom.getElementCache().set(elementRef, true);
            }

            rafId = null;
        });
    });

    const refCallback = (el: HTMLElement | SVGElement) => {
        elementRef = el;
    };

    const initialResult = renderFn(state.value);
    const initialChildren = Array.isArray(initialResult) ? initialResult : [initialResult];

    return { tagName, props: { ...props, ref: refCallback }, children: initialChildren };
};

export const text = (state: State<any> | any): VNode | string =>
    (state && state.value !== undefined)
        ? reactive(state, (value) => ({ tagName: 'span', props: {}, children: [String(value)] }))
        : String(state);