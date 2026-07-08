import type { NativeGridItemAlignment, NativePropValue } from '../types';
import { resolveCrossAlignmentKeyword, resolveSelfAlignmentKeyword } from './alignment';

function resolveNativeGridItemAlignmentKeyword(value: NativePropValue | undefined): NativeGridItemAlignment | undefined {
    const alignment = resolveCrossAlignmentKeyword(value);
    return alignment === 'baseline' ? undefined : alignment;
}

function resolveNativePlaceAlignment(value: NativePropValue | undefined): { align?: NativeGridItemAlignment; justify?: NativeGridItemAlignment } | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const tokens = value.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) {
        return undefined;
    }

    const align = resolveNativeGridItemAlignmentKeyword(tokens[0]);
    const justify = resolveNativeGridItemAlignmentKeyword(tokens[1] ?? tokens[0]);
    return align || justify
        ? {
            ...(align ? { align } : {}),
            ...(justify ? { justify } : {}),
        }
        : undefined;
}

export function resolveNativeGridItemHorizontalAlignment(
    style: Record<string, NativePropValue> | undefined,
    containerStyle: Record<string, NativePropValue> | undefined,
): NativeGridItemAlignment | undefined {
    const selfPlaceAlignment = resolveNativePlaceAlignment(style?.placeSelf);
    const containerPlaceAlignment = resolveNativePlaceAlignment(containerStyle?.placeItems);

    return resolveNativeGridItemAlignmentKeyword(style?.justifySelf)
        ?? selfPlaceAlignment?.justify
        ?? resolveNativeGridItemAlignmentKeyword(containerStyle?.justifyItems)
        ?? containerPlaceAlignment?.justify;
}

export function resolveNativeGridItemVerticalAlignment(
    style: Record<string, NativePropValue> | undefined,
    containerStyle: Record<string, NativePropValue> | undefined,
): NativeGridItemAlignment | undefined {
    const selfPlaceAlignment = resolveNativePlaceAlignment(style?.placeSelf);
    const containerPlaceAlignment = resolveNativePlaceAlignment(containerStyle?.placeItems);

    return resolveSelfAlignmentKeyword(style?.alignSelf)
        ?? selfPlaceAlignment?.align
        ?? resolveSelfAlignmentKeyword(containerStyle?.alignItems)
        ?? containerPlaceAlignment?.align;
}

export function resolveNativeGridCellAlignmentFromStyle(
    style: Record<string, NativePropValue> | undefined,
    containerStyle: Record<string, NativePropValue> | undefined,
): { horizontal?: NativeGridItemAlignment; vertical?: NativeGridItemAlignment } {
    const horizontal = resolveNativeGridItemHorizontalAlignment(style, containerStyle);
    const vertical = resolveNativeGridItemVerticalAlignment(style, containerStyle);

    return {
        ...(horizontal ? { horizontal } : {}),
        ...(vertical ? { vertical } : {}),
    };
}