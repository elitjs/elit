import type { State, StateOptions, VirtualListController, VNode } from '../../core/types';
import { renderToDOM } from './dom-render';

export function createState<T>(initialValue: T, options: StateOptions = {}): State<T> {
    let value = initialValue;
    const listeners = new Set<(value: T) => void>();
    let updateTimer: NodeJS.Timeout | null = null;
    const { throttle = 0, deep = false } = options;

    const notify = () => listeners.forEach((listener) => listener(value));

    const scheduleUpdate = () => {
        if (throttle > 0) {
            if (!updateTimer) {
                updateTimer = setTimeout(() => {
                    updateTimer = null;
                    notify();
                }, throttle);
            }
        } else {
            notify();
        }
    };

    return {
        get value() {
            return value;
        },
        set value(newValue: T) {
            const changed = deep ? JSON.stringify(value) !== JSON.stringify(newValue) : value !== newValue;
            if (changed) {
                value = newValue;
                scheduleUpdate();
            }
        },
        subscribe(fn: (value: T) => void) {
            listeners.add(fn);
            return () => listeners.delete(fn);
        },
        destroy() {
            listeners.clear();
            if (updateTimer) {
                clearTimeout(updateTimer);
            }
        },
    };
}

export function computed<T extends any[], R>(states: { [K in keyof T]: State<T[K]> }, computeFn: (...values: T) => R): State<R> {
    const values = states.map((state) => state.value) as unknown as T;
    const result = createState(computeFn(...values));

    states.forEach((state, index) => {
        state.subscribe((newValue: any) => {
            values[index] = newValue;
            result.value = computeFn(...values);
        });
    });

    return result;
}

export function effect(stateFn: () => void): void {
    stateFn();
}

export function createVirtualList<T>(
    container: HTMLElement,
    items: T[],
    renderItem: (item: T, index: number) => VNode,
    itemHeight = 50,
    bufferSize = 5,
): VirtualListController {
    const viewportHeight = container.clientHeight;
    const totalHeight = items.length * itemHeight;
    let scrollTop = 0;

    const getVisibleRange = (): { start: number; end: number } => {
        const start = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
        const end = Math.min(items.length, Math.ceil((scrollTop + viewportHeight) / itemHeight) + bufferSize);
        return { start, end };
    };

    const render = (): void => {
        const { start, end } = getVisibleRange();
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `height:${totalHeight}px;position:relative`;

        for (let i = start; i < end; i++) {
            const itemEl = document.createElement('div');
            itemEl.style.cssText = `position:absolute;top:${i * itemHeight}px;height:${itemHeight}px;width:100%`;
            renderToDOM(renderItem(items[i], i), itemEl);
            wrapper.appendChild(itemEl);
        }

        container.innerHTML = '';
        container.appendChild(wrapper);
    };

    const scrollHandler = (): void => {
        scrollTop = container.scrollTop;
        requestAnimationFrame(render);
    };

    container.addEventListener('scroll', scrollHandler);
    render();

    return {
        render,
        destroy: () => {
            container.removeEventListener('scroll', scrollHandler);
            container.innerHTML = '';
        },
    };
}

export function lazy<T extends any[], R>(loadFn: () => Promise<(...args: T) => R>): (...args: T) => Promise<R | VNode> {
    let component: ((...args: T) => R) | null = null;
    let loading = false;

    return async (...args: T): Promise<R | VNode> => {
        if (!component && !loading) {
            loading = true;
            component = await loadFn();
            loading = false;
        }

        return component
            ? component(...args)
            : { tagName: 'div', props: { class: 'loading' }, children: ['Loading...'] };
    };
}