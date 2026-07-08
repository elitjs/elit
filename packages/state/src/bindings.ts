import type { Props, State } from '../../core/types';

export type NativeBindingKind = 'value' | 'checked';

export interface NativeBindingMetadata<T = unknown> {
    kind: NativeBindingKind;
    state: State<T>;
}

export const ELIT_NATIVE_BINDING = Symbol.for('elit.native.binding');

export function bindValue<T extends string | number | string[]>(state: State<T>): Props {
    const props = {
        value: state.value,
        onInput: (event: Event) => {
            const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
            if (!target) {
                return;
            }

            if (target instanceof HTMLSelectElement && target.multiple) {
                state.value = Array.from(target.selectedOptions).map((option) => option.value) as T;
                return;
            }

            const nextValue = typeof state.value === 'number'
                ? Number(target.value)
                : target.value;

            state.value = (typeof state.value === 'number' && Number.isNaN(nextValue))
                ? state.value
                : nextValue as T;
        },
    } as Props & { [ELIT_NATIVE_BINDING]: NativeBindingMetadata<T> };

    props[ELIT_NATIVE_BINDING] = {
        kind: 'value',
        state,
    };

    return props;
}

export function bindChecked(state: State<boolean>): Props {
    const props = {
        checked: state.value,
        onInput: (event: Event) => {
            const target = event.target as HTMLInputElement | null;
            if (!target) {
                return;
            }

            state.value = Boolean(target.checked);
        },
    } as Props & { [ELIT_NATIVE_BINDING]: NativeBindingMetadata<boolean> };

    props[ELIT_NATIVE_BINDING] = {
        kind: 'checked',
        state,
    };

    return props;
}