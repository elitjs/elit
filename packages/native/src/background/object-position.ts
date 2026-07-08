import type { NativePropValue, NativeVideoPosterFit, NativeVideoPosterPosition } from '../types';

type NativePositionToken = 'leading' | 'center' | 'trailing' | 'top' | 'bottom';

export function resolveNativeObjectFitStyle(style: Record<string, NativePropValue> | undefined): NativeVideoPosterFit {
    const rawValue = typeof style?.objectFit === 'string' ? style.objectFit.trim().toLowerCase() : '';

    switch (rawValue) {
        case 'contain':
        case 'fill':
        case 'none':
        case 'scale-down':
            return rawValue;
        default:
            return 'cover';
    }
}

export function normalizeNativePositionToken(value: string): NativePositionToken | undefined {
    const normalized = value.trim().toLowerCase();

    switch (normalized) {
        case 'left':
        case '0%':
            return 'leading';
        case 'right':
        case '100%':
            return 'trailing';
        case 'top':
            return 'top';
        case 'bottom':
            return 'bottom';
        case 'center':
        case '50%':
            return 'center';
        default:
            return undefined;
    }
}

function resolveNativePositionValue(tokens: NativePositionToken[]): NativeVideoPosterPosition {
    if (tokens.length === 0) {
        return 'center';
    }

    let horizontal: 'leading' | 'center' | 'trailing' = 'center';
    let vertical: 'top' | 'center' | 'bottom' = 'center';

    for (const token of tokens) {
        if (token === 'leading' || token === 'trailing') {
            horizontal = token;
        } else if (token === 'top' || token === 'bottom') {
            vertical = token;
        } else if (tokens.length === 1) {
            horizontal = 'center';
            vertical = 'center';
        }
    }

    if (horizontal === 'center' && vertical === 'center') {
        return 'center';
    }

    if (horizontal === 'center') {
        return vertical;
    }

    if (vertical === 'center') {
        return horizontal;
    }

    return `${vertical}-${horizontal}` as NativeVideoPosterPosition;
}

export function resolveNativeObjectPositionStyle(style: Record<string, NativePropValue> | undefined): NativeVideoPosterPosition {
    if (typeof style?.objectPosition !== 'string' || !style.objectPosition.trim()) {
        return 'center';
    }

    const tokens = style.objectPosition
        .trim()
        .split(/\s+/)
        .map(normalizeNativePositionToken)
        .filter((value): value is NativePositionToken => Boolean(value));

    return resolveNativePositionValue(tokens);
}

export function normalizeNativeBackgroundPositionValue(rawPosition: string | undefined): string | undefined {
    if (!rawPosition) {
        return undefined;
    }

    const positionTokens = rawPosition
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => normalizeNativePositionToken(token) !== undefined);

    return positionTokens.length > 0 ? positionTokens.join(' ') : undefined;
}

export function resolveNativeBackgroundImagePositionValue(rawPosition: string | undefined): NativeVideoPosterPosition {
    const normalizedPosition = normalizeNativeBackgroundPositionValue(rawPosition);
    if (!normalizedPosition) {
        return 'center';
    }

    const tokens = normalizedPosition
        .split(/\s+/)
        .map(normalizeNativePositionToken)
        .filter((value): value is NativePositionToken => Boolean(value));

    return resolveNativePositionValue(tokens);
}