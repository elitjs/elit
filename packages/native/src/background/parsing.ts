import type {
    NativeBackgroundLayerMetadata,
    NativeBackgroundRepeat,
    NativeColorValue,
    NativePropValue,
    NativeVideoPosterFit,
} from '../types';
import { parseCssColor, parseLinearGradient } from '../color';
import { splitCssFunctionArguments } from '../units';
import { normalizeNativeBackgroundPositionValue } from './object-position';

export function extractCssUrlValue(value: string): string | undefined {
    const match = value.match(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s"'()]+))\s*\)/i);
    const resolved = match?.[1] ?? match?.[2] ?? match?.[3];
    return resolved?.trim() || undefined;
}

function extractCssFunctionValue(value: string, functionName: string): string | undefined {
    const lowerValue = value.toLowerCase();
    const lowerFunctionName = functionName.toLowerCase();
    const needle = `${lowerFunctionName}(`;
    let searchIndex = 0;

    while (searchIndex < value.length) {
        const matchIndex = lowerValue.indexOf(needle, searchIndex);
        if (matchIndex < 0) {
            return undefined;
        }

        const previousChar = matchIndex > 0 ? lowerValue[matchIndex - 1] : undefined;
        if (previousChar && /[a-z0-9-]/.test(previousChar)) {
            searchIndex = matchIndex + lowerFunctionName.length;
            continue;
        }

        let depth = 0;
        for (let index = matchIndex + lowerFunctionName.length; index < value.length; index += 1) {
            const char = value[index];
            if (char === '(') {
                depth += 1;
            } else if (char === ')' && depth > 0) {
                depth -= 1;
                if (depth === 0) {
                    return value.slice(matchIndex, index + 1);
                }
            }
        }

        return undefined;
    }

    return undefined;
}

function stripCssFunctionValue(value: string, functionName: string): string {
    const functionValue = extractCssFunctionValue(value, functionName);
    return functionValue ? value.replace(functionValue, ' ') : value;
}

export function splitNativeBackgroundLayers(value: NativePropValue | undefined): string[] {
    if (typeof value !== 'string' || !value.trim()) {
        return [];
    }

    return splitCssFunctionArguments(value)
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function normalizeNativeBackgroundRepeat(value: string | undefined): NativeBackgroundRepeat | undefined {
    switch (value?.trim().toLowerCase()) {
        case 'repeat':
        case 'repeat-x':
        case 'repeat-y':
        case 'no-repeat':
            return value.trim().toLowerCase() as NativeBackgroundRepeat;
        default:
            return undefined;
    }
}

function normalizeNativeBackgroundSizeValue(rawSize: string | undefined): string | undefined {
    const sizeCandidate = rawSize?.trim().toLowerCase();
    return sizeCandidate?.startsWith('100% 100%')
        ? '100% 100%'
        : sizeCandidate?.startsWith('auto auto')
            ? 'auto auto'
            : sizeCandidate?.startsWith('scale-down')
                ? 'scale-down'
                : sizeCandidate?.match(/^(contain|cover|fill|none|auto)\b/i)?.[1]?.toLowerCase();
}

export function parseNativeBackgroundLayerMetadata(
    layer: string,
    currentColor: NativeColorValue,
): NativeBackgroundLayerMetadata | undefined {
    const sourceToken = extractCssFunctionValue(layer, 'url');
    const gradientToken = extractCssFunctionValue(layer, 'linear-gradient');
    const source = sourceToken ? extractCssUrlValue(sourceToken) : undefined;
    const gradient = gradientToken ? parseLinearGradient(gradientToken, currentColor) : undefined;

    let remainder = stripCssFunctionValue(stripCssFunctionValue(layer, 'url'), 'linear-gradient');

    const repeatMatch = remainder.match(/\b(no-repeat|repeat-[xy]|repeat)\b/i);
    const repeat = normalizeNativeBackgroundRepeat(repeatMatch?.[1]);
    if (repeatMatch) {
        remainder = `${remainder.slice(0, repeatMatch.index)} ${remainder.slice((repeatMatch.index ?? 0) + repeatMatch[0].length)}`.trim();
    }

    const [rawPosition, rawSize] = remainder.split('/', 2).map((entry) => entry.trim()) as [string, string | undefined];
    const position = normalizeNativeBackgroundPositionValue(rawPosition);
    const size = normalizeNativeBackgroundSizeValue(rawSize);
    const color = parseCssColor(remainder, currentColor);

    if (!source && !gradient && !color) {
        return undefined;
    }

    return {
        ...(source ? { source } : {}),
        ...(gradient ? { gradient } : {}),
        ...(color ? { color } : {}),
        ...(repeat ? { repeat } : {}),
        ...(size ? { size } : {}),
        ...(position ? { position } : {}),
    };
}

export function resolveNativeBackgroundShorthandColor(
    value: NativePropValue | undefined,
    currentColor: NativeColorValue,
): NativeColorValue | undefined {
    if (typeof value !== 'string' || !value.trim()) {
        return undefined;
    }

    let color: NativeColorValue | undefined;
    for (const layer of splitNativeBackgroundLayers(value)) {
        color = parseNativeBackgroundLayerMetadata(layer, currentColor)?.color ?? color;
    }

    return color;
}

export function resolveNativeBackgroundShorthandLayers(
    value: NativePropValue | undefined,
    currentColor: NativeColorValue,
): NativeBackgroundLayerMetadata[] {
    if (typeof value !== 'string' || !value.trim()) {
        return [];
    }

    return splitNativeBackgroundLayers(value)
        .map((layer) => parseNativeBackgroundLayerMetadata(layer, currentColor))
        .filter((layer): layer is NativeBackgroundLayerMetadata => Boolean(layer));
}

export function pickNativeBackgroundLayerValue(layers: string[], index: number): string | undefined {
    if (layers.length === 0) {
        return undefined;
    }

    return layers[index % layers.length];
}

export function resolveNativeBackgroundRepeatValue(value: string | undefined): NativeBackgroundRepeat {
    return normalizeNativeBackgroundRepeat(value) ?? 'no-repeat';
}

export function resolveNativeBackgroundImageFitValue(rawSize: string | undefined, repeat: NativeBackgroundRepeat): NativeVideoPosterFit {
    const normalizedSize = normalizeNativeBackgroundSizeValue(rawSize) ?? '';

    switch (normalizedSize) {
        case 'contain':
        case 'cover':
        case 'fill':
        case 'none':
        case 'scale-down':
            return normalizedSize;
        case '100% 100%':
            return 'fill';
        case 'auto':
        case 'auto auto':
            return repeat !== 'no-repeat' ? 'none' : 'cover';
        default:
            return repeat !== 'no-repeat' ? 'none' : 'cover';
    }
}