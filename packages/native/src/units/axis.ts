import { type NativeStyleResolveOptions } from '../../client/style';
import type { NativePropValue, NativeRenderHints } from '../types';
import { formatFloat, getNativeStyleResolveOptions } from './base';
import { parsePercentageValue } from './parsing';
import { toScaledUnitNumber } from './scaling';

export function resolveAxisReferenceLength(
    axis: 'horizontal' | 'vertical',
    hints: NativeRenderHints | undefined,
    styleResolveOptions: NativeStyleResolveOptions,
): number {
    if (axis === 'horizontal') {
        return hints?.availableWidth ?? styleResolveOptions.viewportWidth ?? 390;
    }

    return hints?.availableHeight ?? styleResolveOptions.viewportHeight ?? 844;
}

export function resolveAxisUnitNumber(
    value: NativePropValue | undefined,
    axis: 'horizontal' | 'vertical',
    hints: NativeRenderHints | undefined,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): number | undefined {
    const percentage = parsePercentageValue(value);
    if (percentage !== undefined) {
        return resolveAxisReferenceLength(axis, hints, styleResolveOptions) * (percentage / 100);
    }

    return toScaledUnitNumber(value, styleResolveOptions);
}

export function toAxisDpLiteral(
    value: NativePropValue | undefined,
    axis: 'horizontal' | 'vertical',
    hints: NativeRenderHints | undefined,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): string | undefined {
    const resolved = resolveAxisUnitNumber(value, axis, hints, styleResolveOptions);
    return resolved !== undefined ? `${formatFloat(resolved)}.dp` : undefined;
}

export function toAxisPointLiteral(
    value: NativePropValue | undefined,
    axis: 'horizontal' | 'vertical',
    hints: NativeRenderHints | undefined,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): string | undefined {
    const resolved = resolveAxisUnitNumber(value, axis, hints, styleResolveOptions);
    return resolved !== undefined ? formatFloat(resolved) : undefined;
}