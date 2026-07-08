import type { NativeFlexStyleValues, NativePropValue } from '../types';
import { parsePlainNumericValue } from './parsing';

export function parseFlexShorthand(value: NativePropValue | undefined): NativeFlexStyleValues | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return { grow: value, shrink: 1, basis: 0 };
    }

    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return undefined;
    }

    const normalized = trimmed.toLowerCase();
    if (normalized === 'none') {
        return { grow: 0, shrink: 0, basis: 'auto' };
    }

    if (normalized === 'auto') {
        return { grow: 1, shrink: 1, basis: 'auto' };
    }

    if (normalized === 'initial') {
        return { grow: 0, shrink: 1, basis: 'auto' };
    }

    const numericValue = parsePlainNumericValue(trimmed);
    if (numericValue !== undefined) {
        return { grow: numericValue, shrink: 1, basis: 0 };
    }

    const tokens = trimmed.split(/\s+/).filter(Boolean);
    if (tokens.length === 1) {
        return { grow: 1, shrink: 1, basis: tokens[0] };
    }

    if (tokens.length === 2) {
        const grow = parsePlainNumericValue(tokens[0]);
        if (grow === undefined) {
            return undefined;
        }

        const shrink = parsePlainNumericValue(tokens[1]);
        return shrink !== undefined
            ? { grow, shrink, basis: 0 }
            : { grow, shrink: 1, basis: tokens[1] };
    }

    if (tokens.length === 3) {
        const grow = parsePlainNumericValue(tokens[0]);
        const shrink = parsePlainNumericValue(tokens[1]);
        if (grow === undefined || shrink === undefined) {
            return undefined;
        }

        return { grow, shrink, basis: tokens[2] };
    }

    return undefined;
}

export function resolveFlexStyleValues(style: Record<string, NativePropValue> | undefined): NativeFlexStyleValues {
    const shorthand = parseFlexShorthand(style?.flex);
    return {
        grow: parsePlainNumericValue(style?.flexGrow) ?? shorthand?.grow,
        shrink: parsePlainNumericValue(style?.flexShrink) ?? shorthand?.shrink,
        basis: style?.flexBasis ?? shorthand?.basis,
    };
}

export function resolveOpacityValue(value: NativePropValue | undefined): number | undefined {
    const opacity = parsePlainNumericValue(value);
    if (opacity === undefined) {
        return undefined;
    }

    return Math.min(1, Math.max(0, opacity));
}

export function resolveAspectRatioValue(value: NativePropValue | undefined): number | undefined {
    const direct = parsePlainNumericValue(value);
    if (direct !== undefined) {
        return direct > 0 ? direct : undefined;
    }

    if (typeof value !== 'string') {
        return undefined;
    }

    const ratioMatch = value.trim().match(/^(-?(?:\d+(?:\.\d*)?|\.\d+))\s*\/\s*(-?(?:\d+(?:\.\d*)?|\.\d+))$/);
    if (!ratioMatch) {
        return undefined;
    }

    const numerator = Number(ratioMatch[1]);
    const denominator = Number(ratioMatch[2]);
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
        return undefined;
    }

    const ratio = numerator / denominator;
    return ratio > 0 ? ratio : undefined;
}

export function isHiddenOverflowValue(value: NativePropValue | undefined): boolean {
    if (typeof value !== 'string') {
        return false;
    }

    const normalized = value.trim().toLowerCase();
    return normalized === 'hidden' || normalized === 'clip';
}

export function shouldClipNativeOverflow(style: Record<string, NativePropValue> | undefined): boolean {
    if (!style) {
        return false;
    }

    return isHiddenOverflowValue(style.overflow)
        || isHiddenOverflowValue(style.overflowX)
        || isHiddenOverflowValue(style.overflowY);
}