import type { NativeGridTemplateAreaPlacement, NativePropValue } from '../types';

function parseNativeGridTemplateAreas(value: NativePropValue | undefined): string[][] | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const rows = Array.from(value.matchAll(/"([^"]*)"/g))
        .map((match) => match[1].trim().split(/\s+/).filter(Boolean))
        .filter((row) => row.length > 0);
    if (rows.length === 0) {
        return undefined;
    }

    const columnCount = rows[0]?.length ?? 0;
    if (columnCount === 0 || rows.some((row) => row.length !== columnCount)) {
        return undefined;
    }

    return rows;
}

export function resolveNativeGridTemplateAreaPlacements(
    value: NativePropValue | undefined,
): Map<string, NativeGridTemplateAreaPlacement> | undefined {
    const rows = parseNativeGridTemplateAreas(value);
    if (!rows) {
        return undefined;
    }

    const bounds = new Map<string, { minRow: number; maxRow: number; minColumn: number; maxColumn: number }>();
    for (const [rowIndex, row] of rows.entries()) {
        for (const [columnIndex, areaName] of row.entries()) {
            if (areaName === '.') {
                continue;
            }

            const existing = bounds.get(areaName);
            if (existing) {
                existing.minRow = Math.min(existing.minRow, rowIndex);
                existing.maxRow = Math.max(existing.maxRow, rowIndex);
                existing.minColumn = Math.min(existing.minColumn, columnIndex);
                existing.maxColumn = Math.max(existing.maxColumn, columnIndex);
            } else {
                bounds.set(areaName, {
                    minRow: rowIndex,
                    maxRow: rowIndex,
                    minColumn: columnIndex,
                    maxColumn: columnIndex,
                });
            }
        }
    }

    const placements = new Map<string, NativeGridTemplateAreaPlacement>();
    for (const [areaName, bound] of bounds.entries()) {
        let isRectangular = true;
        for (let rowIndex = bound.minRow; rowIndex <= bound.maxRow && isRectangular; rowIndex += 1) {
            for (let columnIndex = bound.minColumn; columnIndex <= bound.maxColumn; columnIndex += 1) {
                if (rows[rowIndex]?.[columnIndex] !== areaName) {
                    isRectangular = false;
                    break;
                }
            }
        }

        if (!isRectangular) {
            continue;
        }

        placements.set(areaName, {
            rowPlacement: { start: bound.minRow + 1, span: (bound.maxRow - bound.minRow) + 1 },
            columnPlacement: { start: bound.minColumn + 1, span: (bound.maxColumn - bound.minColumn) + 1 },
        });
    }

    return placements.size > 0 ? placements : undefined;
}