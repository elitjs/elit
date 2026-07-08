import type { NativePropValue } from '../types';

export type NativeTextTransform = 'uppercase' | 'lowercase' | 'capitalize';

export function resolveTextTransform(value: NativePropValue | undefined): NativeTextTransform | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const normalized = value.trim().toLowerCase();
    if (normalized === 'uppercase' || normalized === 'lowercase' || normalized === 'capitalize') {
        return normalized;
    }

    return undefined;
}

export function applyTextTransform(text: string, transform: NativeTextTransform | undefined): string {
    if (!transform) {
        return text;
    }

    if (transform === 'uppercase') {
        return text.toUpperCase();
    }

    if (transform === 'lowercase') {
        return text.toLowerCase();
    }

    return text.replace(/\b\p{L}/gu, (char) => char.toUpperCase());
}