import type { NativePropValue } from '../types';

export function resolveComposeTextDecoration(value: NativePropValue | undefined): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const normalized = value.trim().toLowerCase();
    if (normalized.includes('underline') && normalized.includes('line-through')) {
        return 'TextDecoration.combine(listOf(TextDecoration.Underline, TextDecoration.LineThrough))';
    }
    if (normalized.includes('underline')) {
        return 'TextDecoration.Underline';
    }
    if (normalized.includes('line-through')) {
        return 'TextDecoration.LineThrough';
    }

    return undefined;
}

export function resolveSwiftTextDecoration(value: NativePropValue | undefined): { underline: boolean; strikethrough: boolean } | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const normalized = value.trim().toLowerCase();
    const underline = normalized.includes('underline');
    const strikethrough = normalized.includes('line-through');
    return underline || strikethrough ? { underline, strikethrough } : undefined;
}