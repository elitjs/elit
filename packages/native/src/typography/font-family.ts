import type { NativePropValue } from '../types';

export function resolveComposeFontFamily(value: NativePropValue | undefined): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const normalized = value.toLowerCase();
    if (normalized.includes('sans-serif') || normalized.includes('sans') || normalized.includes('avenir') || normalized.includes('trebuchet') || normalized.includes('arial')) {
        return 'FontFamily.SansSerif';
    }
    if (normalized.includes('serif') || normalized.includes('georgia') || normalized.includes('times new roman')) {
        return 'FontFamily.Serif';
    }
    if (normalized.includes('monospace') || normalized.includes('courier') || normalized.includes('mono')) {
        return 'FontFamily.Monospace';
    }
    if (normalized.includes('cursive')) {
        return 'FontFamily.Cursive';
    }

    return undefined;
}

export function resolveSwiftFontDesign(value: NativePropValue | undefined): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const normalized = value.toLowerCase();
    if (normalized.includes('sans-serif') || normalized.includes('sans') || normalized.includes('avenir') || normalized.includes('trebuchet') || normalized.includes('arial')) {
        return undefined;
    }
    if (normalized.includes('serif') || normalized.includes('georgia') || normalized.includes('times new roman')) {
        return '.serif';
    }
    if (normalized.includes('monospace') || normalized.includes('courier') || normalized.includes('mono')) {
        return '.monospaced';
    }
    if (normalized.includes('rounded')) {
        return '.rounded';
    }

    return undefined;
}