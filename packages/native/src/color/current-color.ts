import type { NativeColorValue, NativePropValue } from '../types';
import {
    cloneNativeColor,
    getDefaultCurrentColor,
    isCurrentColorKeyword,
    nativeColorToCssColorLiteral,
} from './base';
import { parseCssColor } from './parsing';

export function resolveStyleCurrentColor(
    style: Record<string, NativePropValue> | undefined,
    inheritedColor?: NativeColorValue,
): NativeColorValue {
    const fallbackColor = cloneNativeColor(inheritedColor) ?? getDefaultCurrentColor();
    const resolvedColor = parseCssColor(style?.color, fallbackColor);
    return resolvedColor ?? fallbackColor;
}

export function normalizeResolvedCurrentTextColor(
    style: Record<string, NativePropValue> | undefined,
    inheritedColor?: NativeColorValue,
): Record<string, NativePropValue> | undefined {
    if (!style || !isCurrentColorKeyword(style.color)) {
        return style;
    }

    return {
        ...style,
        color: nativeColorToCssColorLiteral(resolveStyleCurrentColor(style, inheritedColor)),
    };
}