import { type NativeStyleResolveOptions } from '../../client/style';
import type { NativeColorValue, NativePropValue, NativeShadowValue } from '../types';
import { formatFloat, getNativeStyleResolveOptions, splitCssFunctionArguments, toScaledUnitNumber } from '../units';
import { extractColorToken, getDefaultCurrentColor } from './base';
import { parseCssColor } from './parsing';

export function parseSingleBoxShadow(
    value: string,
    currentColor: NativeColorValue = getDefaultCurrentColor(),
): NativeShadowValue | undefined {
    if (/\binset\b/i.test(value)) {
        return undefined;
    }

    const colorToken = extractColorToken(value);
    const color = parseCssColor(colorToken ?? value, currentColor);
    if (!color) {
        return undefined;
    }

    const dimensionSource = colorToken ? value.replace(colorToken, ' ').trim() : value.trim();
    const lengths = dimensionSource.match(/-?\d+(?:\.\d+)?(?:px|dp|pt)?/g) ?? [];
    if (lengths.length < 2) {
        return undefined;
    }

    const offsetX = Number.parseFloat(lengths[0]!);
    const offsetY = Number.parseFloat(lengths[1]!);
    const blur = lengths[2] ? Number.parseFloat(lengths[2]) : Math.max(Math.abs(offsetX), Math.abs(offsetY));
    const spread = lengths[3] ? Number.parseFloat(lengths[3]) : 0;

    if ([offsetX, offsetY, blur, spread].some((entry) => Number.isNaN(entry))) {
        return undefined;
    }

    return {
        offsetX,
        offsetY,
        blur: Math.max(0, blur + Math.max(0, spread)),
        color,
    };
}

export function parseBoxShadowList(
    value: NativePropValue | undefined,
    currentColor: NativeColorValue = getDefaultCurrentColor(),
): NativeShadowValue[] {
    if (typeof value !== 'string') {
        return [];
    }

    return splitCssFunctionArguments(value)
        .map((entry) => parseSingleBoxShadow(entry.trim(), currentColor))
        .filter((entry): entry is NativeShadowValue => entry !== undefined);
}

export function toComposeShadowElevation(shadow: NativeShadowValue): string {
    const elevation = Math.max(1, Math.abs(shadow.offsetY), shadow.blur / 4);
    return `${formatFloat(elevation)}.dp`;
}

export function toSwiftShadowRadius(shadow: NativeShadowValue): string {
    const radius = Math.max(1, shadow.blur / 2);
    return formatFloat(radius);
}

export function parseBlurFilterRadius(
    value: NativePropValue | undefined,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): number | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const match = value.match(/blur\(([^()]*)\)/i);
    if (!match) {
        return undefined;
    }

    const radius = toScaledUnitNumber(match[1].trim(), styleResolveOptions);
    return radius !== undefined && radius > 0 ? radius : undefined;
}

export function resolveBackdropBlurRadius(
    style: Record<string, NativePropValue>,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): number | undefined {
    return parseBlurFilterRadius(style.backdropFilter, styleResolveOptions);
}