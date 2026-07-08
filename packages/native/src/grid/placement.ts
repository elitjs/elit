import type { NativePropValue } from '../types';

export function parseNativeGridLineIndexValue(
    value: NativePropValue | undefined,
    lineNames?: Map<string, number[]>,
    explicitLineCount?: number,
): number | undefined {
    const resolveNumericLine = (lineIndex: number): number | undefined => {
        if (!Number.isInteger(lineIndex) || lineIndex === 0) {
            return undefined;
        }

        if (lineIndex > 0) {
            return lineIndex;
        }

        if (explicitLineCount === undefined || explicitLineCount <= 0) {
            return undefined;
        }

        const resolvedIndex = explicitLineCount + lineIndex + 1;
        return resolvedIndex >= 1 && resolvedIndex <= explicitLineCount ? resolvedIndex : undefined;
    };

    if (typeof value === 'number') {
        return resolveNumericLine(value);
    }

    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim().toLowerCase();
    if (!trimmed || trimmed === 'auto') {
        return undefined;
    }

    const match = trimmed.match(/^(-?\d+)$/);
    if (match) {
        return resolveNumericLine(Number(match[1]));
    }

    const namedLineMatch = trimmed.match(/^([_a-z][-_a-z0-9]*)(?:\s+(-?\d+))?$|^(-?\d+)\s+([_a-z][-_a-z0-9]*)$/i);
    if (!namedLineMatch) {
        return undefined;
    }

    const lineName = (namedLineMatch[1] ?? namedLineMatch[4])?.toLowerCase();
    const occurrence = Number(namedLineMatch[2] ?? namedLineMatch[3] ?? '1');
    if (!lineName || !Number.isFinite(occurrence) || occurrence === 0) {
        return undefined;
    }

    const namedLines = lineNames?.get(lineName);
    if (!namedLines || namedLines.length === 0) {
        return undefined;
    }

    if (occurrence > 0) {
        return namedLines.length >= occurrence ? namedLines[occurrence - 1] : undefined;
    }

    const reverseIndex = namedLines.length + occurrence;
    return reverseIndex >= 0 ? namedLines[reverseIndex] : undefined;
}

export function parseNativeGridSpanValue(value: NativePropValue | undefined): number | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const match = value.trim().toLowerCase().match(/^span\s+(\d+)$/);
    return match ? Math.max(1, Number(match[1])) : undefined;
}

export function resolveNativeGridPlacementValue(
    value: NativePropValue | undefined,
    lineNames?: Map<string, number[]>,
    explicitLineCount?: number,
): { start?: number; span: number } | undefined {
    const directStart = parseNativeGridLineIndexValue(value, lineNames, explicitLineCount);
    if (directStart !== undefined) {
        return { start: directStart, span: 1 };
    }

    const directSpan = parseNativeGridSpanValue(value);
    if (directSpan !== undefined) {
        return { span: directSpan };
    }

    if (typeof value !== 'string') {
        return undefined;
    }

    const tokens = value.split('/').map((entry) => entry.trim()).filter(Boolean);
    if (tokens.length === 0) {
        return undefined;
    }

    const firstStart = parseNativeGridLineIndexValue(tokens[0], lineNames, explicitLineCount);
    const firstSpan = parseNativeGridSpanValue(tokens[0]);
    const secondStart = tokens[1] ? parseNativeGridLineIndexValue(tokens[1], lineNames, explicitLineCount) : undefined;
    const secondSpan = tokens[1] ? parseNativeGridSpanValue(tokens[1]) : undefined;
    const start = firstStart ?? secondStart;
    const span = secondSpan
        ?? firstSpan
        ?? (firstStart !== undefined && secondStart !== undefined ? Math.max(1, secondStart - firstStart) : 1);

    return start !== undefined || span !== 1
        ? { ...(start !== undefined ? { start } : {}), span }
        : undefined;
}

export function resolveNativeGridAreaPlacement(
    value: NativePropValue | undefined,
    rowLineNames?: Map<string, number[]>,
    columnLineNames?: Map<string, number[]>,
    rowExplicitLineCount?: number,
    columnExplicitLineCount?: number,
): { rowPlacement?: { start?: number; span: number }; columnPlacement?: { start?: number; span: number } } | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const tokens = value.split('/').map((entry) => entry.trim()).filter(Boolean);
    if (tokens.length < 2) {
        return undefined;
    }

    const rowStart = parseNativeGridLineIndexValue(tokens[0], rowLineNames, rowExplicitLineCount);
    const columnStart = parseNativeGridLineIndexValue(tokens[1], columnLineNames, columnExplicitLineCount);
    const rowEnd = tokens[2] ? parseNativeGridLineIndexValue(tokens[2], rowLineNames, rowExplicitLineCount) : undefined;
    const rowSpan = tokens[2] ? parseNativeGridSpanValue(tokens[2]) : undefined;
    const columnEnd = tokens[3] ? parseNativeGridLineIndexValue(tokens[3], columnLineNames, columnExplicitLineCount) : undefined;
    const columnSpan = tokens[3] ? parseNativeGridSpanValue(tokens[3]) : undefined;

    const rowPlacement = rowStart !== undefined || rowEnd !== undefined || rowSpan !== undefined
        ? {
            ...(rowStart !== undefined ? { start: rowStart } : {}),
            span: rowSpan ?? (rowStart !== undefined && rowEnd !== undefined ? Math.max(1, rowEnd - rowStart) : 1),
        }
        : undefined;
    const columnPlacement = columnStart !== undefined || columnEnd !== undefined || columnSpan !== undefined
        ? {
            ...(columnStart !== undefined ? { start: columnStart } : {}),
            span: columnSpan ?? (columnStart !== undefined && columnEnd !== undefined ? Math.max(1, columnEnd - columnStart) : 1),
        }
        : undefined;

    return rowPlacement || columnPlacement
        ? {
            ...(rowPlacement ? { rowPlacement } : {}),
            ...(columnPlacement ? { columnPlacement } : {}),
        }
        : undefined;
}