import type { NativePropValue } from '../types';

export function parsePlainNumericValue(value: NativePropValue | undefined): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(trimmed)) {
        return undefined;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseNativeSvgNumber(value: NativePropValue | undefined): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    const match = trimmed.match(/^(-?(?:\d+(?:\.\d*)?|\.\d+))(?:px)?$/i);
    if (!match) {
        return undefined;
    }

    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : undefined;
}

export function parsePercentageValue(value: NativePropValue | undefined): number | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const match = value.trim().match(/^(-?(?:\d+(?:\.\d*)?|\.\d+))%$/);
    if (!match) {
        return undefined;
    }

    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseCssUnitValue(value: NativePropValue | undefined): { value: number; unit: string } | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return { value, unit: '' };
    }

    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    const match = trimmed.match(/^(-?\d+(?:\.\d+)?)(px|dp|pt|sp|rem|em|vh|vw|vmin|vmax)?$/i);
    if (!match) {
        return undefined;
    }

    return {
        value: Number(match[1]),
        unit: (match[2] ?? '').toLowerCase(),
    };
}