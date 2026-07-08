import type { Child, State } from '../../core/types';

export type ReactiveNodeEntry = {
    node: Text | null;
    renderFn: (value: any) => Child;
};

export type ReactiveNodes = Map<State<any>, ReactiveNodeEntry>;

export function createReactiveChild(
    state: State<any>,
    reactiveNodes: ReactiveNodes,
    renderFn: (value: any) => Child,
): Child {
    const currentValue = renderFn(state.value);

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const entry: ReactiveNodeEntry = { node: null, renderFn };
        reactiveNodes.set(state, entry);

        state.subscribe(() => {
            if (entry.node && entry.node.parentNode) {
                const newValue = renderFn(state.value);
                entry.node.textContent = String(newValue ?? '');
            }
        });
    }

    return currentValue;
}