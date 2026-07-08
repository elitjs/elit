import type { State, StateOptions, VNode, VirtualListController } from '../../core/types';
import { dom } from '../dom';

export const createState = <T>(initial: T, options?: StateOptions): State<T> =>
    dom.createState(initial, options);

export const computed = <T extends any[], R>(
    states: { [K in keyof T]: State<T[K]> },
    fn: (...values: T) => R,
): State<R> => dom.computed(states, fn);

export const effect = (fn: () => void): void => dom.effect(fn);

export const batchRender = (container: string | HTMLElement, vNodes: VNode[]): HTMLElement =>
    dom.batchRender(container, vNodes);

export const renderChunked = (
    container: string | HTMLElement,
    vNodes: VNode[],
    chunkSize?: number,
    onProgress?: (current: number, total: number) => void,
): HTMLElement => dom.renderChunked(container, vNodes, chunkSize, onProgress);

export const createVirtualList = <T>(
    container: HTMLElement,
    items: T[],
    renderItem: (item: T, index: number) => VNode,
    itemHeight?: number,
    bufferSize?: number,
): VirtualListController => dom.createVirtualList(container, items, renderItem, itemHeight, bufferSize);

export const lazy = <T extends any[], R>(loadFn: () => Promise<(...args: T) => R>) =>
    dom.lazy(loadFn);

export const cleanupUnused = (root: HTMLElement): number =>
    dom.cleanupUnusedElements(root);