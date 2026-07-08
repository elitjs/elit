import { type NativeStyleResolveOptions } from '../../client/style';
import type { NativePropValue } from '../types';
import { getNativeStyleResolveOptions, toScaledUnitNumber } from '../units';
import { resolveNumericDirectionalSpacing } from './directional';

export function estimateHorizontalPadding(
    style: Record<string, NativePropValue> | undefined,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): number {
    if (!style) {
        return 0;
    }

    const spacing = resolveNumericDirectionalSpacing(style, 'padding', styleResolveOptions);
    if (spacing.left !== undefined || spacing.right !== undefined) {
        return (spacing.left ?? 0) + (spacing.right ?? 0);
    }

    const horizontal = toScaledUnitNumber(style.paddingHorizontal, styleResolveOptions);
    if (horizontal !== undefined) {
        return horizontal * 2;
    }

    const padding = toScaledUnitNumber(style.padding, styleResolveOptions);
    return padding !== undefined ? padding * 2 : 0;
}

export function estimateVerticalPadding(
    style: Record<string, NativePropValue> | undefined,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): number {
    if (!style) {
        return 0;
    }

    const spacing = resolveNumericDirectionalSpacing(style, 'padding', styleResolveOptions);
    if (spacing.top !== undefined || spacing.bottom !== undefined) {
        return (spacing.top ?? 0) + (spacing.bottom ?? 0);
    }

    const vertical = toScaledUnitNumber(style.paddingVertical, styleResolveOptions);
    if (vertical !== undefined) {
        return vertical * 2;
    }

    const padding = toScaledUnitNumber(style.padding, styleResolveOptions);
    return padding !== undefined ? padding * 2 : 0;
}