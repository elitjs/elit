import { type NativeStyleResolveOptions } from '../../client/style';
import type { NativePropValue } from '../types';
import { getNativeStyleResolveOptions, toScaledUnitNumber } from '../units';

function parseSpacingShorthand(
    value: NativePropValue | undefined,
    unitParser: (value: NativePropValue | undefined) => string | undefined,
): { top?: string; right?: string; bottom?: string; left?: string } | undefined {
    if (value === undefined) return undefined;

    const rawValues = typeof value === 'string'
        ? value.trim().split(/\s+/).filter(Boolean)
        : [value];

    if (rawValues.length === 0 || rawValues.length > 4) {
        return undefined;
    }

    const parsed = rawValues.map((item) => unitParser(item));
    if (parsed.some((item) => !item)) {
        return undefined;
    }

    const [first, second = first, third = first, fourth = second] = parsed as string[];

    switch (parsed.length) {
        case 1:
            return { top: first, right: first, bottom: first, left: first };
        case 2:
            return { top: first, right: second, bottom: first, left: second };
        case 3:
            return { top: first, right: second, bottom: third, left: second };
        case 4:
            return { top: first, right: second, bottom: third, left: fourth };
        default:
            return undefined;
    }
}

export function resolveDirectionalSpacing(
    style: Record<string, NativePropValue>,
    prefix: 'padding' | 'margin',
    unitParser: (value: NativePropValue | undefined) => string | undefined,
): { top?: string; right?: string; bottom?: string; left?: string } {
    const shorthand = parseSpacingShorthand(style[prefix], unitParser);

    return {
        top: shorthand?.top ?? unitParser(style[`${prefix}Top`]),
        right: shorthand?.right ?? unitParser(style[`${prefix}Right`] ?? style[`${prefix}End`]),
        bottom: shorthand?.bottom ?? unitParser(style[`${prefix}Bottom`]),
        left: shorthand?.left ?? unitParser(style[`${prefix}Left`] ?? style[`${prefix}Start`]),
    };
}

function toNumericSpacingValue(value: string | undefined): number | undefined {
    if (value === undefined) {
        return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

export function resolveNumericDirectionalSpacing(
    style: Record<string, NativePropValue>,
    prefix: 'padding' | 'margin',
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): { top?: number; right?: number; bottom?: number; left?: number } {
    const shorthand = parseSpacingShorthand(style[prefix], (spacingValue) => {
        const resolved = toScaledUnitNumber(spacingValue, styleResolveOptions);
        return resolved !== undefined ? String(resolved) : undefined;
    });

    return {
        top: toNumericSpacingValue(shorthand?.top) ?? toScaledUnitNumber(style[`${prefix}Top`], styleResolveOptions),
        right: toNumericSpacingValue(shorthand?.right) ?? toScaledUnitNumber(style[`${prefix}Right`] ?? style[`${prefix}End`], styleResolveOptions),
        bottom: toNumericSpacingValue(shorthand?.bottom) ?? toScaledUnitNumber(style[`${prefix}Bottom`], styleResolveOptions),
        left: toNumericSpacingValue(shorthand?.left) ?? toScaledUnitNumber(style[`${prefix}Left`] ?? style[`${prefix}Start`], styleResolveOptions),
    };
}