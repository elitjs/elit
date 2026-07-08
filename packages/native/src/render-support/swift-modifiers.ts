import type { NativeChunkedRow } from '../types';
import { formatFloat } from '../units';
import { indent } from './shared';

export function buildSwiftChunkedRowModifiers(row: NativeChunkedRow): string[] {
    if (row.height === undefined && row.minHeight === undefined && row.maxHeight === undefined && row.trackWeight === undefined) {
        return [];
    }

    const frameArgs = ['maxWidth: .infinity'];
    if (row.height !== undefined) {
        frameArgs.push(`height: ${formatFloat(row.height)}`);
    } else {
        if (row.minHeight !== undefined) {
            frameArgs.push(`minHeight: ${formatFloat(row.minHeight)}`);
        }
        if (row.maxHeight !== undefined) {
            frameArgs.push(`maxHeight: ${formatFloat(row.maxHeight)}`);
        }
    }

    if (row.trackWeight !== undefined && !frameArgs.includes('maxHeight: .infinity')) {
        frameArgs.push('maxHeight: .infinity');
    }

    frameArgs.push('alignment: .topLeading');

    return [
        `.frame(${frameArgs.join(', ')})`,
        ...(row.trackWeight !== undefined ? [`.layoutPriority(${formatFloat(row.trackWeight)})`] : []),
    ];
}

export function appendSwiftUIModifiers(lines: string[], modifiers: string[], level: number): string[] {
    if (modifiers.length === 0) {
        return lines;
    }

    return [
        ...lines,
        ...modifiers.map((modifier) => `${indent(level + 1)}${modifier}`),
    ];
}

export function appendSwiftUIOverlays(lines: string[], overlays: string[][], level: number): string[] {
    if (overlays.length === 0) {
        return lines;
    }

    const result = [...lines];
    for (const overlayLines of overlays) {
        result.push(`${indent(level + 1)}.overlay(alignment: .topLeading) {`);
        result.push(...overlayLines);
        result.push(`${indent(level + 1)}}`);
    }

    return result;
}