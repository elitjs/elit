import type { NativeElementNode, NativePropValue } from '../types';

export function createNativeGridPlaceholderNode(): NativeElementNode {
    return {
        kind: 'element',
        component: 'View',
        sourceTag: 'div',
        props: {},
        events: [],
        children: [],
    };
}

export function isWrapEnabled(style: Record<string, NativePropValue> | undefined): boolean {
    if (!style || typeof style.flexWrap !== 'string') {
        return false;
    }

    const flexWrap = style.flexWrap.trim().toLowerCase();
    return flexWrap === 'wrap' || flexWrap === 'wrap-reverse';
}

export function isRowFlexLayout(style: Record<string, NativePropValue> | undefined): boolean {
    if (!style) {
        return false;
    }

    if (typeof style.flexDirection === 'string') {
        return style.flexDirection.trim().toLowerCase() === 'row';
    }

    if (typeof style.display !== 'string') {
        return false;
    }

    const display = style.display.trim().toLowerCase();
    return display === 'flex' || display === 'inline-flex';
}

export function resolveNativeGridAutoFlow(value: NativePropValue | undefined): { axis: 'row' | 'column'; dense: boolean } {
    if (typeof value !== 'string') {
        return { axis: 'row', dense: false };
    }

    const tokens = value
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);

    return {
        axis: tokens.includes('column') ? 'column' : 'row',
        dense: tokens.includes('dense'),
    };
}