import { type NativeStyleResolveOptions } from '../../client/style';
import type { NativePropValue } from '../types';
import { formatFloat, getNativeStyleResolveOptions, parseCssUnitValue, toScaledUnitNumber } from '../units';

export function resolveComposeLineHeight(
    value: NativePropValue | undefined,
    fontSize: NativePropValue | undefined,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): string | undefined {
    const parsed = parseCssUnitValue(value);
    const baseFontSize = toScaledUnitNumber(fontSize, styleResolveOptions) ?? 16;
    const lineHeight = parsed?.unit === '' && parsed.value > 0 && parsed.value <= 4
        ? baseFontSize * parsed.value
        : toScaledUnitNumber(value, styleResolveOptions);

    return lineHeight !== undefined ? `${formatFloat(lineHeight)}.sp` : undefined;
}

export function resolveSwiftLineSpacing(
    value: NativePropValue | undefined,
    fontSize: NativePropValue | undefined,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): string | undefined {
    const parsed = parseCssUnitValue(value);
    const baseFontSize = toScaledUnitNumber(fontSize, styleResolveOptions) ?? 17;
    const lineHeight = parsed?.unit === '' && parsed.value > 0 && parsed.value <= 4
        ? baseFontSize * parsed.value
        : toScaledUnitNumber(value, styleResolveOptions);
    if (lineHeight === undefined) {
        return undefined;
    }

    const spacing = lineHeight - baseFontSize;
    return spacing > 0 ? formatFloat(spacing) : undefined;
}