import { type NativeStyleResolveOptions } from '../../client/style';
import type {
    NativeChunkedLayout,
    NativeChunkedRow,
    NativeElementNode,
    NativeGridColumnTrackSizeSpec,
    NativeGridTemplateAreaPlacement,
    NativeGridTrackSizeSpec,
    NativeNode,
    NativeRenderHints,
    NativeResolvedStyleMap,
} from '../types';
import {
    parsePlainNumericValue,
    resolveAxisReferenceLength,
    resolveAxisUnitNumber,
    resolveFlexStyleValues,
    toScaledUnitNumber,
    getNativeStyleResolveOptions,
} from '../units';
import { isFillValue } from '../color';
import {
    estimateNodePreferredWidth as estimateResolvedNodePreferredWidth,
    estimateNodePreferredHeight as estimateResolvedNodePreferredHeight,
} from '../estimation';
import { resolveNativeStretchChunkedRows } from '../render-support';
import { estimateHorizontalPadding } from '../spacing';
import {
    parseNativeGridTrackDefinition,
    parseGridTrackSizeSpec,
    parseGridColumnTrackSizeSpec,
    resolveGridTrackSizeSpecs,
    resolveGridColumnTrackSizeSpecs,
    isWrapEnabled,
    isRowFlexLayout,
    resolveGridTrackCount,
    resolveNativeGridTemplateAreaPlacements,
    resolveNativeGridAutoFlow,
    parseNativeGridLineIndexValue,
    parseNativeGridSpanValue,
    resolveNativeGridPlacementValue,
    resolveNativeGridAreaPlacement,
    createNativeGridPlaceholderNode,
} from '../grid';
import {
    resolveNativeAlignContent,
    resolvePositionMode,
    resolveCrossAlignmentKeyword,
    resolveBaselineAlignmentKeyword,
    resolveSelfAlignmentKeyword,
} from '../layout';
import { getStyleObject } from './style-resolve';

function resolveNativeItemOrder(
    node: NativeNode,
    resolvedStyles?: NativeResolvedStyleMap,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): number {
    if (node.kind !== 'element') {
        return 0;
    }

    return parsePlainNumericValue(getStyleObject(node, resolvedStyles, styleResolveOptions)?.order) ?? 0;
}

export function resolveNativeAvailableAxisSize(
    node: NativeElementNode,
    axis: 'horizontal' | 'vertical',
    resolvedStyles: NativeResolvedStyleMap | undefined,
    hints: NativeRenderHints | undefined,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): number {
    if (node.component === 'Screen') {
        return resolveAxisReferenceLength(axis, hints, styleResolveOptions);
    }

    const style = getStyleObject(node, resolvedStyles, styleResolveOptions);
    const sizeKey = axis === 'horizontal' ? 'width' : 'height';
    const minKey = axis === 'horizontal' ? 'minWidth' : 'minHeight';
    const maxKey = axis === 'horizontal' ? 'maxWidth' : 'maxHeight';

    if (style && isFillValue(style[sizeKey])) {
        return resolveAxisReferenceLength(axis, hints, styleResolveOptions);
    }

    return resolveAxisUnitNumber(style?.[sizeKey], axis, hints, styleResolveOptions)
        ?? resolveAxisUnitNumber(style?.[maxKey], axis, hints, styleResolveOptions)
        ?? resolveAxisUnitNumber(style?.[minKey], axis, hints, styleResolveOptions)
        ?? resolveAxisReferenceLength(axis, hints, styleResolveOptions);
}

export function resolveNativeFlexContainerLayout(
    node: NativeElementNode | undefined,
    resolvedStyles?: NativeResolvedStyleMap,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): 'Row' | 'Column' | undefined {
    if (!node) {
        return undefined;
    }

    const style = getStyleObject(node, resolvedStyles, styleResolveOptions);
    if (!style) {
        return undefined;
    }

    if (typeof style.flexDirection === 'string') {
        return style.flexDirection.trim().toLowerCase() === 'row' ? 'Row' : 'Column';
    }

    const display = typeof style.display === 'string' ? style.display.trim().toLowerCase() : undefined;
    if (display === 'flex' || display === 'inline-flex') {
        return 'Row';
    }

    return undefined;
}

function hasExplicitNativeAxisSize(
    node: NativeElementNode,
    axis: 'horizontal' | 'vertical',
    resolvedStyles?: NativeResolvedStyleMap,
    hints?: NativeRenderHints,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): boolean {
    if (node.component === 'Screen') {
        return true;
    }

    const style = getStyleObject(node, resolvedStyles, styleResolveOptions);
    if (!style) {
        return false;
    }

    const sizeKey = axis === 'horizontal' ? 'width' : 'height';
    const minKey = axis === 'horizontal' ? 'minWidth' : 'minHeight';
    const maxKey = axis === 'horizontal' ? 'maxWidth' : 'maxHeight';

    if (isFillValue(style[sizeKey])) {
        return true;
    }

    return resolveAxisUnitNumber(style[sizeKey], axis, hints, styleResolveOptions) !== undefined
        || resolveAxisUnitNumber(style[minKey], axis, hints, styleResolveOptions) !== undefined
        || resolveAxisUnitNumber(style[maxKey], axis, hints, styleResolveOptions) !== undefined;
}

export function shouldStretchFlexChildCrossAxis(
    child: NativeNode,
    parentFlexLayout: 'Row' | 'Column' | undefined,
    parentNode: NativeElementNode | undefined,
    parentHints: NativeRenderHints | undefined,
    resolvedStyles?: NativeResolvedStyleMap,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): boolean {
    if (!parentFlexLayout || child.kind !== 'element' || !parentNode) {
        return false;
    }

    const childStyle = getStyleObject(child, resolvedStyles, styleResolveOptions);
    const childAlignSelf = resolveSelfAlignmentKeyword(childStyle?.alignSelf);
    const childBaselineAlignSelf = resolveBaselineAlignmentKeyword(childStyle?.alignSelf);
    if (childAlignSelf === 'stretch') {
        return true;
    }

    if (childAlignSelf || childBaselineAlignSelf) {
        return false;
    }

    const parentStyle = getStyleObject(parentNode, resolvedStyles, styleResolveOptions);
    const parentAlignItems = resolveCrossAlignmentKeyword(parentStyle?.alignItems);
    if (parentAlignItems !== undefined) {
        return parentAlignItems === 'stretch';
    }

    return parentFlexLayout === 'Column'
        || (parentFlexLayout === 'Row' && hasExplicitNativeAxisSize(parentNode, 'vertical', resolvedStyles, parentHints, styleResolveOptions));
}

function resolveNativeFlexMainAxisGap(
    node: NativeElementNode,
    layout: 'Row' | 'Column',
    resolvedStyles?: NativeResolvedStyleMap,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): number {
    const style = getStyleObject(node, resolvedStyles, styleResolveOptions);
    if (!style) {
        return 0;
    }

    return toScaledUnitNumber(
        style.gap ?? (layout === 'Row' ? style.columnGap : style.rowGap) ?? style.gap,
        styleResolveOptions,
    ) ?? 0;
}

export function resolveNativeFlexShrinkTargets(
    parentNode: NativeElementNode | undefined,
    orderedNodes: NativeNode[],
    parentFlexLayout: 'Row' | 'Column' | undefined,
    availableWidth: number | undefined,
    availableHeight: number | undefined,
    parentHints: NativeRenderHints | undefined,
    resolvedStyles?: NativeResolvedStyleMap,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): WeakMap<NativeElementNode, number> {
    const targets = new WeakMap<NativeElementNode, number>();

    if (!parentNode || !parentFlexLayout || !orderedNodes.every((child) => child.kind === 'element')) {
        return targets;
    }

    const mainAxis = parentFlexLayout === 'Row' ? 'horizontal' : 'vertical';
    const availableMainSize = parentFlexLayout === 'Row' ? availableWidth : availableHeight;
    if (availableMainSize === undefined) {
        return targets;
    }

    if (!hasExplicitNativeAxisSize(parentNode, mainAxis, resolvedStyles, parentHints, styleResolveOptions)) {
        return targets;
    }

    const availableItemsSize = Math.max(
        0,
        availableMainSize - (resolveNativeFlexMainAxisGap(parentNode, parentFlexLayout, resolvedStyles, styleResolveOptions) * Math.max(0, orderedNodes.length - 1)),
    );
    const childHints: NativeRenderHints = {
        availableWidth,
        availableHeight,
    };
    const sizeKey = mainAxis === 'horizontal' ? 'width' : 'height';
    const minSizeKey = mainAxis === 'horizontal' ? 'minWidth' : 'minHeight';
    const maxSizeKey = mainAxis === 'horizontal' ? 'maxWidth' : 'maxHeight';
    const shrinkableItems: Array<{
        node: NativeElementNode;
        baseSize: number;
        remainingSize: number;
        shrinkWeight: number;
        minSize: number;
    }> = [];
    let occupiedSize = 0;

    for (const child of orderedNodes) {
        const elementChild = child as NativeElementNode;
        const childStyle = getStyleObject(elementChild, resolvedStyles, styleResolveOptions);
        if (!childStyle) {
            continue;
        }

        const flexStyle = resolveFlexStyleValues(childStyle);
        const minSize = resolveAxisUnitNumber(childStyle[minSizeKey], mainAxis, childHints, styleResolveOptions) ?? 0;
        const maxSize = resolveAxisUnitNumber(childStyle[maxSizeKey], mainAxis, childHints, styleResolveOptions);
        let baseSize = resolveAxisUnitNumber(flexStyle.basis, mainAxis, childHints, styleResolveOptions)
            ?? resolveAxisUnitNumber(childStyle[sizeKey], mainAxis, childHints, styleResolveOptions);
        if (baseSize === undefined || baseSize <= 0.0001) {
            continue;
        }

        if (maxSize !== undefined) {
            baseSize = Math.min(baseSize, maxSize);
        }
        baseSize = Math.max(baseSize, minSize);

        const shrink = flexStyle.shrink ?? 1;
        if (shrink === 0) {
            occupiedSize += baseSize;
            continue;
        }

        shrinkableItems.push({
            node: elementChild,
            baseSize,
            remainingSize: baseSize,
            shrinkWeight: baseSize * Math.max(shrink, 0),
            minSize,
        });
        occupiedSize += baseSize;
    }

    const overflow = occupiedSize - availableItemsSize;
    if (overflow <= 0.0001 || shrinkableItems.length === 0) {
        return targets;
    }

    let remainingOverflow = overflow;
    let activeItems = [...shrinkableItems];
    while (remainingOverflow > 0.0001 && activeItems.length > 0) {
        const totalShrinkWeight = activeItems.reduce((total, item) => total + item.shrinkWeight, 0);
        if (totalShrinkWeight <= 0.0001) {
            break;
        }

        let clampedThisPass = false;
        for (const item of activeItems) {
            const proportionalReduction = remainingOverflow * (item.shrinkWeight / totalShrinkWeight);
            const nextSize = item.remainingSize - proportionalReduction;
            if (nextSize > item.minSize + 0.0001) {
                continue;
            }

            remainingOverflow -= Math.max(0, item.remainingSize - item.minSize);
            item.remainingSize = item.minSize;
            clampedThisPass = true;
        }

        if (clampedThisPass) {
            activeItems = activeItems.filter((item) => item.remainingSize > item.minSize + 0.0001);
            continue;
        }

        for (const item of activeItems) {
            const proportionalReduction = remainingOverflow * (item.shrinkWeight / totalShrinkWeight);
            item.remainingSize = Math.max(item.minSize, item.remainingSize - proportionalReduction);
        }
        remainingOverflow = 0;
    }

    for (const item of shrinkableItems) {
        if (item.remainingSize < item.baseSize - 0.0001) {
            targets.set(item.node, item.remainingSize);
        }
    }

    return targets;
}

function isAbsolutelyPositionedNode(
    node: NativeNode,
    resolvedStyles?: NativeResolvedStyleMap,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): boolean {
    if (node.kind !== 'element') {
        return false;
    }

    return resolvePositionMode(getStyleObject(node, resolvedStyles, styleResolveOptions)?.position) === 'absolute';
}

function isFixedPositionedNode(
    node: NativeNode,
    resolvedStyles?: NativeResolvedStyleMap,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): boolean {
    if (node.kind !== 'element') {
        return false;
    }

    return resolvePositionMode(getStyleObject(node, resolvedStyles, styleResolveOptions)?.position) === 'fixed';
}

export function splitAbsolutePositionedChildren(
    nodes: NativeNode[],
    resolvedStyles?: NativeResolvedStyleMap,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): { flowChildren: NativeNode[]; absoluteChildren: NativeElementNode[] } {
    const flowChildren: NativeNode[] = [];
    const absoluteChildren: NativeElementNode[] = [];

    for (const node of nodes) {
        if (isAbsolutelyPositionedNode(node, resolvedStyles, styleResolveOptions)) {
            absoluteChildren.push(node as NativeElementNode);
            continue;
        }

        flowChildren.push(node);
    }

    return { flowChildren, absoluteChildren };
}

export function splitFixedPositionedChildren(
    nodes: NativeNode[],
    resolvedStyles?: NativeResolvedStyleMap,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): { flowChildren: NativeNode[]; fixedChildren: NativeElementNode[] } {
    const flowChildren: NativeNode[] = [];
    const fixedChildren: NativeElementNode[] = [];

    for (const node of nodes) {
        if (isFixedPositionedNode(node, resolvedStyles, styleResolveOptions)) {
            fixedChildren.push(node as NativeElementNode);
            continue;
        }

        flowChildren.push(node);
    }

    return { flowChildren, fixedChildren };
}

function shouldApplyNativeItemOrdering(
    parentNode: NativeElementNode,
    resolvedStyles?: NativeResolvedStyleMap,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): boolean {
    const style = getStyleObject(parentNode, resolvedStyles, styleResolveOptions);
    const display = typeof style?.display === 'string'
        ? style.display.trim().toLowerCase()
        : undefined;

    return display === 'flex'
        || display === 'inline-flex'
        || display === 'grid'
        || display === 'inline-grid'
        || typeof style?.flexDirection === 'string';
}

export function getOrderedNativeChildren(
    parentNode: NativeElementNode,
    nodes: NativeNode[],
    resolvedStyles?: NativeResolvedStyleMap,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): NativeNode[] {
    if (!shouldApplyNativeItemOrdering(parentNode, resolvedStyles, styleResolveOptions)) {
        return nodes;
    }

    const orderedEntries = nodes.map((node, index) => ({
        node,
        index,
        order: resolveNativeItemOrder(node, resolvedStyles, styleResolveOptions),
    }));

    if (!orderedEntries.some((entry) => entry.order !== 0)) {
        return nodes;
    }

    return [...orderedEntries]
        .sort((left, right) => left.order - right.order || left.index - right.index)
        .map((entry) => entry.node);
}

function estimateNodePreferredWidth(
    node: NativeNode,
    resolvedStyles: NativeResolvedStyleMap | undefined,
    styleResolveOptions: NativeStyleResolveOptions,
): number {
    const style = node.kind === 'element'
        ? getStyleObject(node, resolvedStyles, styleResolveOptions)
        : undefined;
    return estimateResolvedNodePreferredWidth(node, style, styleResolveOptions);
}

function estimateNodePreferredHeight(
    node: NativeNode,
    resolvedStyles: NativeResolvedStyleMap | undefined,
    styleResolveOptions: NativeStyleResolveOptions,
): number | undefined {
    const style = node.kind === 'element'
        ? getStyleObject(node, resolvedStyles, styleResolveOptions)
        : undefined;
    return estimateResolvedNodePreferredHeight(node, style, styleResolveOptions);
}

function resolveNativeGridChildPlacement(
    node: NativeNode,
    resolvedStyles: NativeResolvedStyleMap | undefined,
    styleResolveOptions: NativeStyleResolveOptions,
    templateAreaPlacements?: Map<string, NativeGridTemplateAreaPlacement>,
    columnLineNames?: Map<string, number[]>,
    rowLineNames?: Map<string, number[]>,
    columnExplicitLineCount?: number,
    rowExplicitLineCount?: number,
): { columnStart?: number; columnSpan: number; rowStart?: number; rowSpan: number } {
    if (node.kind !== 'element') {
        return { columnSpan: 1, rowSpan: 1 };
    }

    const style = getStyleObject(node, resolvedStyles, styleResolveOptions);
    const areaPlacement = resolveNativeGridAreaPlacement(style?.gridArea, rowLineNames, columnLineNames, rowExplicitLineCount, columnExplicitLineCount)
        ?? (() => {
            if (typeof style?.gridArea !== 'string' || !templateAreaPlacements) {
                return undefined;
            }

            return templateAreaPlacements.get(style.gridArea.trim());
        })();
    const columnPlacement = resolveNativeGridPlacementValue(style?.gridColumn, columnLineNames, columnExplicitLineCount)
        ?? areaPlacement?.columnPlacement
        ?? (() => {
            const start = parseNativeGridLineIndexValue(style?.gridColumnStart, columnLineNames, columnExplicitLineCount);
            const end = parseNativeGridLineIndexValue(style?.gridColumnEnd, columnLineNames, columnExplicitLineCount);
            const span = parseNativeGridSpanValue(style?.gridColumnEnd);
            if (start !== undefined || end !== undefined || span !== undefined) {
                return { ...(start !== undefined ? { start } : {}), span: span ?? (start !== undefined && end !== undefined ? Math.max(1, end - start) : 1) };
            }
            return undefined;
        })();
    const rowPlacement = resolveNativeGridPlacementValue(style?.gridRow, rowLineNames, rowExplicitLineCount)
        ?? areaPlacement?.rowPlacement
        ?? (() => {
            const start = parseNativeGridLineIndexValue(style?.gridRowStart, rowLineNames, rowExplicitLineCount);
            const end = parseNativeGridLineIndexValue(style?.gridRowEnd, rowLineNames, rowExplicitLineCount);
            const span = parseNativeGridSpanValue(style?.gridRowEnd);
            if (start !== undefined || end !== undefined || span !== undefined) {
                return { ...(start !== undefined ? { start } : {}), span: span ?? (start !== undefined && end !== undefined ? Math.max(1, end - start) : 1) };
            }
            return undefined;
        })();

    return {
        ...(columnPlacement?.start !== undefined ? { columnStart: columnPlacement.start } : {}),
        columnSpan: Math.max(1, columnPlacement?.span ?? 1),
        ...(rowPlacement?.start !== undefined ? { rowStart: rowPlacement.start } : {}),
        rowSpan: Math.max(1, rowPlacement?.span ?? 1),
    };
}

interface NativeGridPlacementCell {
    node?: NativeNode;
    columnSpan?: number;
    coveredInline?: boolean;
    occupiedByRowSpan?: boolean;
}

function chunkNodesIntoGridRows(
    nodes: NativeNode[],
    explicitColumnSizing: Array<NativeGridColumnTrackSizeSpec | undefined>,
    minimumRowCount: number,
    autoFlow: { axis: 'row' | 'column'; dense: boolean },
    rowGap: number,
    columnGap: number,
    explicitRowSizing: Array<NativeGridTrackSizeSpec | undefined>,
    autoRowSizing: NativeGridTrackSizeSpec | undefined,
    autoColumnSizing: NativeGridColumnTrackSizeSpec | undefined,
    resolvedStyles: NativeResolvedStyleMap | undefined,
    styleResolveOptions: NativeStyleResolveOptions,
    templateAreaPlacements?: Map<string, NativeGridTemplateAreaPlacement>,
    columnLineNames?: Map<string, number[]>,
    rowLineNames?: Map<string, number[]>,
    columnExplicitLineCount?: number,
    rowExplicitLineCount?: number,
): NativeChunkedRow[] {
    const defaultAutoColumnSizing = autoColumnSizing ? { ...autoColumnSizing } : { trackWeight: 1 };
    const placementColumnSizing = explicitColumnSizing.length > 0
        ? explicitColumnSizing.map((spec) => spec ? { ...spec } : { trackWeight: 1 })
        : [{ ...defaultAutoColumnSizing }];
    const placementRows: NativeGridPlacementCell[][] = [];
    const placements: Array<{ node: NativeNode; rowIndex: number; rowSpan: number; columnIndex: number; columnSpan: number }> = [];
    const canUseColumnAutoFlow = autoFlow.axis === 'column' && minimumRowCount > 0;

    const getColumnCount = (): number => Math.max(1, placementColumnSizing.length);

    const ensurePlacementColumns = (count: number): void => {
        while (placementColumnSizing.length < count) {
            placementColumnSizing.push({ ...defaultAutoColumnSizing });
        }

        for (const placementRow of placementRows) {
            while (placementRow.length < getColumnCount()) {
                placementRow.push({});
            }
        }
    };

    const ensurePlacementRows = (count: number): void => {
        while (placementRows.length < count) {
            placementRows.push(Array.from({ length: getColumnCount() }, () => ({})));
        }
    };

    const isPlacementCellOccupied = (cell: NativeGridPlacementCell | undefined): boolean => {
        return Boolean(cell && (cell.node || cell.coveredInline || cell.occupiedByRowSpan));
    };

    const canPlaceNodeAt = (rowIndex: number, columnIndex: number, columnSpan: number, rowSpan: number): boolean => {
        if (columnIndex < 0 || columnIndex + columnSpan > getColumnCount()) {
            return false;
        }

        ensurePlacementRows(rowIndex + rowSpan);
        for (let targetRow = rowIndex; targetRow < rowIndex + rowSpan; targetRow += 1) {
            for (let targetColumn = columnIndex; targetColumn < columnIndex + columnSpan; targetColumn += 1) {
                if (isPlacementCellOccupied(placementRows[targetRow]?.[targetColumn])) {
                    return false;
                }
            }
        }

        return true;
    };

    const markNodePlacement = (node: NativeNode, rowIndex: number, columnIndex: number, columnSpan: number, rowSpan: number): void => {
        ensurePlacementRows(rowIndex + rowSpan);
        placementRows[rowIndex]![columnIndex] = { node, columnSpan };

        for (let coveredColumn = columnIndex + 1; coveredColumn < columnIndex + columnSpan; coveredColumn += 1) {
            placementRows[rowIndex]![coveredColumn] = { coveredInline: true };
        }

        for (let coveredRow = rowIndex + 1; coveredRow < rowIndex + rowSpan; coveredRow += 1) {
            for (let coveredColumn = columnIndex; coveredColumn < columnIndex + columnSpan; coveredColumn += 1) {
                placementRows[coveredRow]![coveredColumn] = { occupiedByRowSpan: true };
            }
        }
    };

    ensurePlacementRows(Math.max(1, minimumRowCount));
    let autoRowIndex = 0;
    let autoColumnIndex = 0;

    const findLegacyPlacement = (
        placement: { columnStart?: number; columnSpan: number; rowStart?: number; rowSpan: number },
    ): { rowIndex: number; columnIndex: number } => {
        const preferredRowIndex = placement.rowStart !== undefined ? Math.max(0, placement.rowStart - 1) : undefined;
        const preferredColumnIndex = placement.columnStart !== undefined ? Math.max(0, placement.columnStart - 1) : undefined;
        let resolvedRowIndex = preferredRowIndex ?? autoRowIndex;
        let resolvedColumnIndex: number | undefined;

        while (resolvedColumnIndex === undefined) {
            ensurePlacementRows(resolvedRowIndex + placement.rowSpan);

            if (preferredColumnIndex !== undefined) {
                ensurePlacementColumns(preferredColumnIndex + placement.columnSpan);
                resolvedColumnIndex = canPlaceNodeAt(resolvedRowIndex, preferredColumnIndex, placement.columnSpan, placement.rowSpan)
                    ? preferredColumnIndex
                    : undefined;
            } else {
                const searchStart = preferredRowIndex === undefined && resolvedRowIndex === autoRowIndex ? autoColumnIndex : undefined;
                for (let columnIndex = searchStart ?? 0; columnIndex <= getColumnCount() - placement.columnSpan; columnIndex += 1) {
                    if (canPlaceNodeAt(resolvedRowIndex, columnIndex, placement.columnSpan, placement.rowSpan)) {
                        resolvedColumnIndex = columnIndex;
                        break;
                    }
                }
            }

            if (resolvedColumnIndex === undefined) {
                resolvedRowIndex += 1;
            }
        }

        return {
            rowIndex: resolvedRowIndex,
            columnIndex: resolvedColumnIndex,
        };
    };

    const findAutoPlacement = (columnSpan: number, rowSpan: number): { rowIndex: number; columnIndex: number } => {
        if (canUseColumnAutoFlow) {
            const rowLimit = Math.max(1, minimumRowCount);
            let searchColumnIndex = autoFlow.dense ? 0 : autoColumnIndex;
            const initialRowIndex = autoFlow.dense ? 0 : autoRowIndex;

            while (true) {
                const maxRowIndex = Math.max(0, Math.max(rowLimit, rowSpan) - rowSpan);
                const rowStart = searchColumnIndex === (autoFlow.dense ? 0 : autoColumnIndex)
                    ? Math.min(initialRowIndex, maxRowIndex)
                    : 0;
                ensurePlacementColumns(searchColumnIndex + columnSpan);

                for (let rowIndex = rowStart; rowIndex <= maxRowIndex; rowIndex += 1) {
                    if (canPlaceNodeAt(rowIndex, searchColumnIndex, columnSpan, rowSpan)) {
                        return { rowIndex, columnIndex: searchColumnIndex };
                    }
                }

                searchColumnIndex += 1;
            }
        }

        let searchRowIndex = autoFlow.dense ? 0 : autoRowIndex;
        const initialColumnIndex = autoFlow.dense ? 0 : autoColumnIndex;

        while (true) {
            ensurePlacementRows(searchRowIndex + rowSpan);

            const columnStart = searchRowIndex === (autoFlow.dense ? 0 : autoRowIndex)
                ? initialColumnIndex
                : 0;
            for (let columnIndex = columnStart; columnIndex <= getColumnCount() - columnSpan; columnIndex += 1) {
                if (canPlaceNodeAt(searchRowIndex, columnIndex, columnSpan, rowSpan)) {
                    return { rowIndex: searchRowIndex, columnIndex };
                }
            }

            searchRowIndex += 1;
        }
    };

    for (const node of nodes) {
        const placement = resolveNativeGridChildPlacement(
            node,
            resolvedStyles,
            styleResolveOptions,
            templateAreaPlacements,
            columnLineNames,
            rowLineNames,
            columnExplicitLineCount,
            rowExplicitLineCount,
        );
        if (placement.columnStart !== undefined) {
            ensurePlacementColumns(placement.columnStart + Math.max(0, placement.columnSpan - 1));
        }

        const columnSpan = Math.min(getColumnCount(), placement.columnSpan);
        const rowSpan = Math.max(1, placement.rowSpan);
        const hasExplicitPlacement = placement.rowStart !== undefined || placement.columnStart !== undefined;
        const { rowIndex: resolvedRowIndex, columnIndex: resolvedColumnIndex } = hasExplicitPlacement
            ? findLegacyPlacement(placement)
            : findAutoPlacement(columnSpan, rowSpan);

        markNodePlacement(node, resolvedRowIndex, resolvedColumnIndex, columnSpan, rowSpan);
        placements.push({ node, rowIndex: resolvedRowIndex, rowSpan, columnIndex: resolvedColumnIndex, columnSpan });

        if (!hasExplicitPlacement) {
            if (canUseColumnAutoFlow) {
                const rowLimit = Math.max(1, minimumRowCount);
                autoColumnIndex = resolvedColumnIndex;
                autoRowIndex = resolvedRowIndex + rowSpan;
                if (autoRowIndex >= rowLimit) {
                    autoColumnIndex += 1;
                    ensurePlacementColumns(autoColumnIndex + 1);
                    autoRowIndex = 0;
                }
            } else {
                autoRowIndex = resolvedRowIndex;
                autoColumnIndex = resolvedColumnIndex + columnSpan;
                while (autoColumnIndex >= getColumnCount()) {
                    autoRowIndex += 1;
                    autoColumnIndex -= getColumnCount();
                }
            }
        }
    }

    const resolveRowSizing = (rowIndex: number): NativeGridTrackSizeSpec | undefined => {
        return explicitRowSizing[rowIndex] ?? autoRowSizing;
    };

    const resolvedRowSizing = placementRows.map((_, rowIndex) => ({ ...(resolveRowSizing(rowIndex) ?? {}) }));
    const resolvedColumnSizing = placementColumnSizing.map((spec) => ({ ...(spec ?? {}) }));

    const resolveIntrinsicRowHeight = (rowIndex: number): number | undefined => {
        let preferredHeight: number | undefined;

        for (const placement of placements) {
            if (placement.rowIndex !== rowIndex || placement.rowSpan !== 1) {
                continue;
            }

            const nextHeight = estimateNodePreferredHeight(placement.node, resolvedStyles, styleResolveOptions);
            if (nextHeight === undefined || nextHeight <= 0) {
                continue;
            }

            preferredHeight = preferredHeight === undefined
                ? nextHeight
                : Math.max(preferredHeight, nextHeight);
        }

        return preferredHeight;
    };

    for (const [rowIndex, rowSizing] of resolvedRowSizing.entries()) {
        const preferredHeight = resolveIntrinsicRowHeight(rowIndex);
        if (preferredHeight === undefined || preferredHeight <= 0) {
            continue;
        }

        if (rowSizing.intrinsicHeight) {
            rowSizing.height = preferredHeight;
            rowSizing.minHeight = preferredHeight;
        }

        if (rowSizing.intrinsicMinHeight) {
            rowSizing.minHeight = Math.max(rowSizing.minHeight ?? 0, preferredHeight);
        }

        if (rowSizing.intrinsicMaxHeight) {
            rowSizing.maxHeight = rowSizing.maxHeight !== undefined
                ? Math.min(rowSizing.maxHeight, preferredHeight)
                : preferredHeight;
        }
    }

    const resolveIntrinsicColumnWidth = (columnIndex: number): number | undefined => {
        let preferredWidth: number | undefined;

        for (const placement of placements) {
            if (placement.columnIndex !== columnIndex || placement.columnSpan !== 1) {
                continue;
            }

            const nextWidth = estimateNodePreferredWidth(placement.node, resolvedStyles, styleResolveOptions);
            if (nextWidth <= 0) {
                continue;
            }

            preferredWidth = preferredWidth === undefined
                ? nextWidth
                : Math.max(preferredWidth, nextWidth);
        }

        return preferredWidth;
    };

    for (const [columnIndex, columnSizing] of resolvedColumnSizing.entries()) {
        const preferredWidth = resolveIntrinsicColumnWidth(columnIndex);
        if (preferredWidth === undefined || preferredWidth <= 0) {
            continue;
        }

        if (columnSizing.intrinsicWidth) {
            columnSizing.width = preferredWidth;
            columnSizing.minWidth = preferredWidth;
        }

        if (columnSizing.intrinsicMinWidth) {
            columnSizing.minWidth = Math.max(columnSizing.minWidth ?? 0, preferredWidth);
        }

        if (columnSizing.intrinsicMaxWidth) {
            columnSizing.maxWidth = columnSizing.maxWidth !== undefined
                ? Math.min(columnSizing.maxWidth, preferredWidth)
                : preferredWidth;
        }
    }

    for (const placement of placements) {
        if (placement.rowSpan <= 1) {
            continue;
        }

        const preferredHeight = estimateNodePreferredHeight(placement.node, resolvedStyles, styleResolveOptions);
        if (preferredHeight === undefined || preferredHeight <= 0) {
            continue;
        }

        const spanRowIndexes = Array.from({ length: placement.rowSpan }, (_, offset) => placement.rowIndex + offset);
        const baseHeight = spanRowIndexes.reduce((sum, rowIndex) => {
            const rowSizing = resolvedRowSizing[rowIndex] ?? {};
            return sum + (rowSizing.height ?? rowSizing.minHeight ?? 0);
        }, 0);
        let remainingHeight = preferredHeight - (Math.max(0, placement.rowSpan - 1) * rowGap) - baseHeight;
        if (remainingHeight <= 0) {
            continue;
        }

        const adjustableRowIndexes = spanRowIndexes.filter((rowIndex) => {
            const rowSizing = resolvedRowSizing[rowIndex] ?? {};
            return rowSizing.height === undefined && rowSizing.trackWeight === undefined;
        });
        if (adjustableRowIndexes.length === 0) {
            continue;
        }

        const additionalHeightPerRow = remainingHeight / adjustableRowIndexes.length;
        for (const rowIndex of adjustableRowIndexes) {
            const rowSizing = resolvedRowSizing[rowIndex] ?? {};
            const currentMinHeight = rowSizing.minHeight ?? 0;
            const targetMinHeight = currentMinHeight + additionalHeightPerRow;
            const nextMinHeight = rowSizing.maxHeight !== undefined
                ? Math.min(rowSizing.maxHeight, targetMinHeight)
                : targetMinHeight;
            if (nextMinHeight > currentMinHeight) {
                rowSizing.minHeight = nextMinHeight;
                resolvedRowSizing[rowIndex] = rowSizing;
                remainingHeight -= (nextMinHeight - currentMinHeight);
            }
        }
    }

    for (const placement of placements) {
        if (placement.columnSpan <= 1) {
            continue;
        }

        const preferredWidth = estimateNodePreferredWidth(placement.node, resolvedStyles, styleResolveOptions);
        if (preferredWidth <= 0) {
            continue;
        }

        const spanColumnIndexes = Array.from({ length: placement.columnSpan }, (_, offset) => placement.columnIndex + offset);
        const baseWidth = spanColumnIndexes.reduce((sum, columnIndex) => {
            const columnSizing = resolvedColumnSizing[columnIndex] ?? {};
            return sum + (columnSizing.width ?? columnSizing.minWidth ?? 0);
        }, 0);
        let remainingWidth = preferredWidth - (Math.max(0, placement.columnSpan - 1) * columnGap) - baseWidth;
        if (remainingWidth <= 0) {
            continue;
        }

        const adjustableColumnIndexes = spanColumnIndexes.filter((columnIndex) => {
            const columnSizing = resolvedColumnSizing[columnIndex] ?? {};
            return columnSizing.width === undefined;
        });
        if (adjustableColumnIndexes.length === 0) {
            continue;
        }

        const additionalWidthPerColumn = remainingWidth / adjustableColumnIndexes.length;
        for (const columnIndex of adjustableColumnIndexes) {
            const columnSizing = resolvedColumnSizing[columnIndex] ?? {};
            const currentMinWidth = columnSizing.minWidth ?? 0;
            const targetMinWidth = currentMinWidth + additionalWidthPerColumn;
            const nextMinWidth = columnSizing.maxWidth !== undefined
                ? Math.min(columnSizing.maxWidth, targetMinWidth)
                : targetMinWidth;
            if (nextMinWidth > currentMinWidth) {
                columnSizing.minWidth = nextMinWidth;
                resolvedColumnSizing[columnIndex] = columnSizing;
                remainingWidth -= (nextMinWidth - currentMinWidth);
            }
        }
    }

    const rows: NativeChunkedRow[] = [];

    const aggregateColumnSizing = (
        specs: Array<NativeGridColumnTrackSizeSpec | undefined>,
    ): NativeGridColumnTrackSizeSpec | undefined => {
        let exactWidth = 0;
        let canUseExactWidth = specs.length > 0;
        let minWidth = 0;
        let hasMinWidth = false;
        let maxWidth = 0;
        let canUseMaxWidth = specs.length > 0;
        let hasMaxWidth = false;
        let trackWeight: number | undefined;

        for (const spec of specs) {
            if (!spec) {
                canUseExactWidth = false;
                canUseMaxWidth = false;
                continue;
            }

            if (spec.width !== undefined) {
                exactWidth += spec.width;
                minWidth += spec.width;
                maxWidth += spec.width;
                hasMinWidth = true;
                hasMaxWidth = true;
            } else {
                canUseExactWidth = false;

                if (spec.minWidth !== undefined) {
                    minWidth += spec.minWidth;
                    hasMinWidth = true;
                }

                if (spec.maxWidth !== undefined) {
                    maxWidth += spec.maxWidth;
                    hasMaxWidth = true;
                } else {
                    canUseMaxWidth = false;
                }
            }

            if (spec.trackWeight !== undefined && spec.trackWeight > 0) {
                trackWeight = (trackWeight ?? 0) + spec.trackWeight;
            }
        }

        const internalGap = specs.length > 1 ? columnGap * (specs.length - 1) : 0;
        const aggregated: NativeGridColumnTrackSizeSpec = {};
        if (canUseExactWidth && exactWidth > 0) {
            aggregated.width = exactWidth + internalGap;
        } else {
            if (hasMinWidth) {
                aggregated.minWidth = minWidth + internalGap;
            } else if (internalGap > 0 && trackWeight === undefined) {
                aggregated.minWidth = internalGap;
            }
            if (canUseMaxWidth && hasMaxWidth) {
                aggregated.maxWidth = maxWidth + internalGap;
            }
        }

        if (trackWeight !== undefined) {
            aggregated.trackWeight = trackWeight;
        }

        return Object.keys(aggregated).length > 0 ? aggregated : undefined;
    };

    for (const [rowIndex, placementRow] of placementRows.entries()) {
        const items: NativeNode[] = [];
        const rowWeights: Array<number | undefined> = [];
        const rowColumnSizes: Array<NativeGridColumnTrackSizeSpec | undefined> = [];

        for (let columnIndex = 0; columnIndex < getColumnCount(); columnIndex += 1) {
            const cell = placementRow[columnIndex];
            if (cell?.coveredInline) {
                continue;
            }

            if (cell?.node) {
                const span = Math.max(1, cell.columnSpan ?? 1);
                const aggregatedColumnSizing = aggregateColumnSizing(resolvedColumnSizing.slice(columnIndex, columnIndex + span));
                items.push(cell.node);
                rowColumnSizes.push(aggregatedColumnSizing);
                rowWeights.push(aggregatedColumnSizing?.trackWeight);
                continue;
            }

            const aggregatedColumnSizing = aggregateColumnSizing(resolvedColumnSizing.slice(columnIndex, columnIndex + 1));
            items.push(createNativeGridPlaceholderNode());
            rowColumnSizes.push(aggregatedColumnSizing);
            rowWeights.push(aggregatedColumnSizing?.trackWeight);
        }

        const rowSizing = resolvedRowSizing[rowIndex];
        rows.push({
            items,
            weights: rowWeights,
            columnSizes: rowColumnSizes,
            ...(rowSizing?.minHeight !== undefined ? { minHeight: rowSizing.minHeight } : {}),
            ...(rowSizing?.height !== undefined ? { height: rowSizing.height } : {}),
            ...(rowSizing?.maxHeight !== undefined && rowSizing.height === undefined ? { maxHeight: rowSizing.maxHeight } : {}),
            ...(rowSizing?.trackWeight !== undefined ? { trackWeight: rowSizing.trackWeight } : {}),
            ...(rowSizing?.stretchEligible ? { stretchEligible: true } : {}),
        });
    }

    return rows;
}

function chunkNodesIntoWrappedRows(
    nodes: NativeNode[],
    availableWidth: number,
    columnGap: number,
    resolvedStyles: NativeResolvedStyleMap | undefined,
    styleResolveOptions: NativeStyleResolveOptions,
): NativeNode[][] {
    const rows: NativeNode[][] = [];
    let currentRow: NativeNode[] = [];
    let currentWidth = 0;

    for (const node of nodes) {
        const preferredWidth = estimateNodePreferredWidth(node, resolvedStyles, styleResolveOptions);
        const nextWidth = currentRow.length === 0
            ? preferredWidth
            : currentWidth + columnGap + preferredWidth;

        if (currentRow.length > 0 && nextWidth > availableWidth) {
            rows.push(currentRow);
            currentRow = [node];
            currentWidth = preferredWidth;
            continue;
        }

        currentRow.push(node);
        currentWidth = nextWidth;
    }

    if (currentRow.length > 0) {
        rows.push(currentRow);
    }

    return rows;
}

export function resolveChunkedLayout(
    node: NativeElementNode,
    resolvedStyles: NativeResolvedStyleMap | undefined,
    styleResolveOptions: NativeStyleResolveOptions,
): NativeChunkedLayout | undefined {
    const style = getStyleObject(node, resolvedStyles, styleResolveOptions);
    if (!style) {
        return undefined;
    }

    const orderedChildren = getOrderedNativeChildren(node, node.children, resolvedStyles, styleResolveOptions);
    const viewportWidth = styleResolveOptions.viewportWidth ?? 390;
    const rowGap = toScaledUnitNumber(style.rowGap ?? style.gap, styleResolveOptions);
    const columnGap = toScaledUnitNumber(style.columnGap ?? style.gap, styleResolveOptions) ?? rowGap ?? 0;
    const display = typeof style.display === 'string' ? style.display.trim().toLowerCase() : undefined;

    if (display === 'grid' || display === 'inline-grid') {
        const columnSizing = resolveGridColumnTrackSizeSpecs(style.gridTemplateColumns, styleResolveOptions, columnGap);
        if (columnSizing && columnSizing.length > 0) {
            const columnTracks = typeof style.gridTemplateColumns === 'string'
                ? parseNativeGridTrackDefinition(style.gridTemplateColumns)
                : undefined;
            const rowTracks = typeof style.gridTemplateRows === 'string'
                ? parseNativeGridTrackDefinition(style.gridTemplateRows)
                : undefined;
            const columnExplicitLineCount = columnTracks?.lineCount ?? (columnSizing.length > 0 ? columnSizing.length + 1 : undefined);
            const explicitRowCount = resolveGridTrackCount(style.gridTemplateRows);
            const rowExplicitLineCount = rowTracks?.lineCount ?? (explicitRowCount !== undefined && explicitRowCount > 0 ? explicitRowCount + 1 : undefined);
            const contentAlignment = resolveNativeAlignContent(style);
            return {
                kind: 'grid',
                rows: resolveNativeStretchChunkedRows(
                    chunkNodesIntoGridRows(
                        orderedChildren,
                        columnSizing,
                        explicitRowCount ?? 0,
                        resolveNativeGridAutoFlow(style.gridAutoFlow),
                        rowGap ?? 0,
                        columnGap,
                        resolveGridTrackSizeSpecs(style.gridTemplateRows, styleResolveOptions) ?? [],
                        parseGridTrackSizeSpec(String(style.gridAutoRows ?? '').trim(), styleResolveOptions),
                        parseGridColumnTrackSizeSpec(String(style.gridAutoColumns ?? '').trim(), styleResolveOptions),
                        resolvedStyles,
                        styleResolveOptions,
                        resolveNativeGridTemplateAreaPlacements(style.gridTemplateAreas),
                        columnTracks?.lineNames,
                        rowTracks?.lineNames,
                        columnExplicitLineCount,
                        rowExplicitLineCount,
                    ),
                    contentAlignment,
                ),
                rowGap,
                columnGap,
                contentAlignment,
            };
        }
    }

    if (node.children.length < 2) {
        return undefined;
    }

    if (isWrapEnabled(style) && isRowFlexLayout(style)) {
        const availableWidth = Math.max(160, viewportWidth - estimateHorizontalPadding(style, styleResolveOptions));
        const rows = chunkNodesIntoWrappedRows(orderedChildren, availableWidth, columnGap, resolvedStyles, styleResolveOptions);
        if (rows.length > 1) {
            return {
                kind: 'wrap',
                rows: rows.map((items) => ({ items })),
                rowGap: rowGap ?? columnGap,
                columnGap,
                contentAlignment: resolveNativeAlignContent(style),
            };
        }
    }

    return undefined;
}