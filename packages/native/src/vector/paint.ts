import type { NativeColorValue, NativeElementNode, NativePropObject, NativePropValue } from '../types';
import { parseNativeSvgNumber } from '../units';
import { cloneNativeColor, getDefaultCurrentColor, parseCssColor } from '../color';

export function resolveNativeDefaultFillColor(sourceTag: string): NativeColorValue | undefined {
    return sourceTag === 'circle'
        || sourceTag === 'rect'
        || sourceTag === 'ellipse'
        || sourceTag === 'path'
        || sourceTag === 'polyline'
        || sourceTag === 'polygon'
        ? getDefaultCurrentColor()
        : undefined;
}

export function resolveNativeVectorPaintColor(
    value: NativePropValue | undefined,
    fallback?: NativeColorValue,
): NativeColorValue | undefined {
    if (typeof value === 'string' && value.trim().toLowerCase() === 'none') {
        return undefined;
    }

    if (value === undefined) {
        return cloneNativeColor(fallback);
    }

    return parseCssColor(value, fallback ?? getDefaultCurrentColor()) ?? cloneNativeColor(fallback);
}

export function resolveNativeVectorStrokeWidth(node: NativeElementNode): number | undefined {
    return parseNativeSvgNumber(node.props.strokeWidth) ?? undefined;
}

export function isNativePropObjectValue(value: NativePropValue | undefined): value is NativePropObject {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function resolveNativeCanvasFillFallback(kind: string): NativeColorValue | undefined {
    return kind === 'rect'
        || kind === 'circle'
        || kind === 'ellipse'
        || kind === 'polygon'
        || kind === 'path'
        ? getDefaultCurrentColor()
        : undefined;
}

export function resolveNativeCanvasStrokeFallback(kind: string): NativeColorValue | undefined {
    return kind === 'line' || kind === 'polyline'
        ? getDefaultCurrentColor()
        : undefined;
}

export function parseNativeCanvasStrokeWidth(op: NativePropObject): number | undefined {
    return parseNativeSvgNumber(op.strokeWidth ?? op.lineWidth) ?? undefined;
}