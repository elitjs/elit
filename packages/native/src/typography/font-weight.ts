import type { NativePropValue } from '../types';

export function resolveComposeFontWeight(value: NativePropValue | undefined): string | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return `FontWeight.W${Math.min(900, Math.max(100, Math.round(value / 100) * 100))}`;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim().toLowerCase();
        if (/^\d+$/.test(trimmed)) {
            return `FontWeight.W${Math.min(900, Math.max(100, Math.round(Number(trimmed) / 100) * 100))}`;
        }
        if (trimmed === 'bold') return 'FontWeight.Bold';
        if (trimmed === 'semibold') return 'FontWeight.SemiBold';
        if (trimmed === 'medium') return 'FontWeight.Medium';
        if (trimmed === 'normal') return 'FontWeight.Normal';
    }

    return undefined;
}

export function resolveSwiftFontWeight(value: NativePropValue | undefined): string | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
        if (value >= 700) return '.bold';
        if (value >= 600) return '.semibold';
        if (value >= 500) return '.medium';
        return '.regular';
    }

    if (typeof value === 'string') {
        const trimmed = value.trim().toLowerCase();
        if (/^\d+$/.test(trimmed)) {
            return resolveSwiftFontWeight(Number(trimmed));
        }
        if (trimmed === 'bold') return '.bold';
        if (trimmed === 'semibold') return '.semibold';
        if (trimmed === 'medium') return '.medium';
        if (trimmed === 'normal') return '.regular';
    }

    return undefined;
}