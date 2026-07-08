import type {
    NativeChunkedLayout,
    NativeElementNode,
    NativeNode,
    NativeRenderHints,
    SwiftUIContext,
} from '../types';
import { formatFloat, resolveAxisReferenceLength } from '../units';
import {
    resolveNativeBackgroundLayersFromStyle,
    stripNativeBackgroundPaintStyles,
} from '../background';
import {
    shouldFillChunkedCellChild,
    shouldDefaultFillWidthHint as estimateDefaultFillWidthHint,
} from '../estimation';
import {
    resolveEffectiveChunkedContentAlignment,
    hasNativeGridColumnConstraint,
    shouldRenderNativeBackgroundLayersWithWrapper,
    appendSwiftUIBackgroundLayers,
    buildSwiftChunkedRowModifiers,
    resolveSwiftGridCellFrameAlignment,
    resolveNativeGridCellFillWidth,
    buildSwiftGridCellFrameModifier,
    appendSwiftUIModifiers,
} from '../render-support';
import { resolveBaselineAlignmentKeyword, resolveSwiftColumnAlignment, resolveNativeGridCellAlignmentFromStyle, resolveSwiftUILayoutFromStyle, buildSwiftUILayoutFromStyle } from '../layout';
import {
    getOrderedNativeChildren,
    resolveChunkedLayout,
    resolveNativeAvailableAxisSize,
    resolveNativeFlexContainerLayout,
    resolveNativeFlexShrinkTargets,
    shouldStretchFlexChildCrossAxis,
} from './chunked-layout';
import { getStyleObject } from './style-resolve';
import { buildSwiftUIModifiers, resolveSwiftRowAlignment } from './swiftui-style';

export type SwiftUIRenderNode = (
    node: NativeNode,
    level: number,
    context: SwiftUIContext,
    hints?: NativeRenderHints,
) => string[];

function indent(level: number): string {
    return '    '.repeat(level);
}

export function renderSwiftChunkedLayout(
    node: NativeElementNode,
    layout: NativeChunkedLayout,
    level: number,
    context: SwiftUIContext,
    hints: NativeRenderHints,
    renderNode: SwiftUIRenderNode,
): string[] {
    const style = getStyleObject(node, context.resolvedStyles, context.styleResolveOptions);
    const rowSpacing = layout.rowGap !== undefined ? formatFloat(layout.rowGap) : '12';
    const columnSpacing = layout.columnGap !== undefined ? formatFloat(layout.columnGap) : '12';
    const rowAlignment = resolveSwiftRowAlignment(style, node.children, context.resolvedStyles, context.styleResolveOptions);
    const columnAlignment = resolveSwiftColumnAlignment(style);
    const effectiveContentAlignment = resolveEffectiveChunkedContentAlignment(layout);
    const usesSingleRowGridStackAlignment = layout.kind === 'grid'
        && layout.rows.length === 1
        && effectiveContentAlignment !== undefined
        && effectiveContentAlignment !== 'start';

    if (layout.kind === 'grid' && layout.rows.length === 1 && !usesSingleRowGridStackAlignment) {
        const [row] = layout.rows;
        const lines = [`${indent(level)}HStack(alignment: ${rowAlignment}, spacing: ${columnSpacing}) {`];
        const totalWeight = row.weights ? row.weights.reduce<number>((sum, entry) => sum + (entry ?? 0), 0) : undefined;
        row.items.forEach((child, index) => {
            const weight = row.weights?.[index];
            const columnSize = row.columnSizes?.[index];
            const cellAlignment = resolveNativeGridCellAlignmentFromStyle(
                child.kind === 'element'
                    ? getStyleObject(child, context.resolvedStyles, context.styleResolveOptions)
                    : undefined,
                style,
            );
            const fillChild = resolveNativeGridCellFillWidth(shouldFillChunkedCellChild(child), cellAlignment.horizontal);
            const fillHeight = cellAlignment.vertical === 'stretch';
            const shouldExpandCellHeight = cellAlignment.vertical !== undefined;
            const frameAlignment = resolveSwiftGridCellFrameAlignment(cellAlignment.horizontal, cellAlignment.vertical);
            const cellAvailableWidth = weight !== undefined && totalWeight && hints.availableWidth !== undefined
                ? Math.max(0, (hints.availableWidth - ((layout.columnGap ?? 0) * Math.max(0, row.items.length - 1))) * (weight / totalWeight))
                : columnSize?.width ?? columnSize?.maxWidth ?? hints.availableWidth;
            lines.push(`${indent(level + 1)}VStack(alignment: .leading, spacing: 0) {`);
            lines.push(...renderNode(child, level + 2, context, {
                ...(fillChild ? { fillWidth: true } : {}),
                ...(fillHeight ? { fillHeight: true } : {}),
                availableWidth: cellAvailableWidth,
                availableHeight: hints.availableHeight,
            }));
            lines.push(`${indent(level + 1)}}`);
            const shouldExpandCellWidth = weight !== undefined
                ? fillChild || cellAlignment.horizontal !== undefined
                : !hasNativeGridColumnConstraint(columnSize) && (fillChild || cellAlignment.horizontal !== undefined);
            const cellFrameModifier = buildSwiftGridCellFrameModifier(shouldExpandCellWidth, shouldExpandCellHeight, frameAlignment, columnSize);
            if (cellFrameModifier) {
                lines.push(`${indent(level + 2)}${cellFrameModifier}`);
            }
            if (row.weights?.[index] !== undefined) {
                lines.push(`${indent(level + 2)}.layoutPriority(${formatFloat(row.weights[index])})`);
            }
        });
        lines.push(`${indent(level)}}`);
        lines.push(...buildSwiftChunkedRowModifiers(row).map((modifier) => `${indent(level + 1)}${modifier}`));
        return lines;
    }

    const halfRowSpacing = layout.rowGap !== undefined ? formatFloat(layout.rowGap / 2) : '6';
    const usesFlexibleOuterAlignment = effectiveContentAlignment === 'center'
        || effectiveContentAlignment === 'end'
        || effectiveContentAlignment === 'space-between'
        || effectiveContentAlignment === 'space-around'
        || effectiveContentAlignment === 'space-evenly';
    const lines = [`${indent(level)}VStack(alignment: ${columnAlignment}, spacing: ${usesFlexibleOuterAlignment ? '0' : rowSpacing}) {`];
    if (effectiveContentAlignment === 'center' || effectiveContentAlignment === 'end') {
        lines.push(`${indent(level + 1)}Spacer(minLength: 0)`);
    } else if (effectiveContentAlignment === 'space-around') {
        lines.push(`${indent(level + 1)}Spacer(minLength: ${halfRowSpacing})`);
    } else if (effectiveContentAlignment === 'space-evenly') {
        lines.push(`${indent(level + 1)}Spacer(minLength: ${rowSpacing})`);
    }

    for (const [rowIndex, row] of layout.rows.entries()) {
        const totalWeight = row.weights ? row.weights.reduce<number>((sum, entry) => sum + (entry ?? 0), 0) : undefined;
        lines.push(`${indent(level + 1)}HStack(alignment: ${rowAlignment}, spacing: ${columnSpacing}) {`);
        row.items.forEach((child, index) => {
            const cellAlignment = layout.kind === 'grid'
                ? resolveNativeGridCellAlignmentFromStyle(
                    child.kind === 'element'
                        ? getStyleObject(child, context.resolvedStyles, context.styleResolveOptions)
                        : undefined,
                    style,
                )
                : {};
            const columnSize = row.columnSizes?.[index];
            const fillChild = layout.kind === 'grid'
                ? resolveNativeGridCellFillWidth(shouldFillChunkedCellChild(child), cellAlignment.horizontal)
                : false;
            const fillHeight = layout.kind === 'grid' && cellAlignment.vertical === 'stretch';
            const shouldExpandCellHeight = layout.kind === 'grid' && cellAlignment.vertical !== undefined;
            const frameAlignment = layout.kind === 'grid'
                ? resolveSwiftGridCellFrameAlignment(cellAlignment.horizontal, cellAlignment.vertical)
                : undefined;
            const weight = row.weights?.[index];
            const cellAvailableWidth = weight !== undefined && totalWeight && hints.availableWidth !== undefined
                ? Math.max(0, (hints.availableWidth - ((layout.columnGap ?? 0) * Math.max(0, row.items.length - 1))) * (weight / totalWeight))
                : columnSize?.width ?? columnSize?.maxWidth ?? hints.availableWidth;
            lines.push(`${indent(level + 2)}VStack(alignment: .leading, spacing: 0) {`);
            lines.push(...renderNode(child, level + 3, context, {
                ...(fillChild ? { fillWidth: true } : {}),
                ...(fillHeight ? { fillHeight: true } : {}),
                availableWidth: cellAvailableWidth,
                availableHeight: hints.availableHeight,
            }));
            lines.push(`${indent(level + 2)}}`);
            const shouldExpandCellWidth = weight !== undefined
                ? fillChild || cellAlignment.horizontal !== undefined
                : !hasNativeGridColumnConstraint(columnSize) && (fillChild || cellAlignment.horizontal !== undefined);
            const cellFrameModifier = buildSwiftGridCellFrameModifier(shouldExpandCellWidth, shouldExpandCellHeight, frameAlignment, columnSize);
            if (cellFrameModifier) {
                lines.push(`${indent(level + 3)}${cellFrameModifier}`);
            }
            if (row.weights?.[index] !== undefined) {
                lines.push(`${indent(level + 3)}.layoutPriority(${formatFloat(row.weights[index])})`);
            }
        });
        lines.push(`${indent(level + 1)}}`);
        lines.push(...buildSwiftChunkedRowModifiers(row).map((modifier) => `${indent(level + 2)}${modifier}`));
        if (usesFlexibleOuterAlignment && rowIndex < layout.rows.length - 1) {
            if (effectiveContentAlignment === 'space-around') {
                lines.push(`${indent(level + 1)}Spacer(minLength: ${halfRowSpacing})`);
                lines.push(`${indent(level + 1)}Spacer(minLength: ${halfRowSpacing})`);
            } else {
                lines.push(`${indent(level + 1)}Spacer(minLength: ${rowSpacing})`);
            }
        }
    }

    if (effectiveContentAlignment === 'center') {
        lines.push(`${indent(level + 1)}Spacer(minLength: 0)`);
    } else if (effectiveContentAlignment === 'space-around') {
        lines.push(`${indent(level + 1)}Spacer(minLength: ${halfRowSpacing})`);
    } else if (effectiveContentAlignment === 'space-evenly') {
        lines.push(`${indent(level + 1)}Spacer(minLength: ${rowSpacing})`);
    }
    lines.push(`${indent(level)}}`);

    return lines;
}

export function renderSwiftUIContainerBody(
    node: NativeElementNode,
    level: number,
    context: SwiftUIContext,
    hints: NativeRenderHints,
    renderNode: SwiftUIRenderNode,
): string[] {
    const contentLines = renderSwiftUIContainerContent(node, level, context, hints, renderNode);
    const style = getStyleObject(node, context.resolvedStyles, context.styleResolveOptions);
    const backgroundLayers = resolveNativeBackgroundLayersFromStyle(style, context.styleResolveOptions);
    const usesBackgroundWrapper = shouldRenderNativeBackgroundLayersWithWrapper(backgroundLayers);
    const lines = usesBackgroundWrapper
        ? appendSwiftUIBackgroundLayers(contentLines, backgroundLayers, level, style, context.styleResolveOptions)
        : contentLines;

    if (backgroundLayers.some((layer) => layer.kind === 'image')) {
        context.helperFlags.add('backgroundImage');
    }

    return appendSwiftUIModifiers(
        lines,
        buildSwiftUIModifiers(
            node,
            context.resolvedStyles,
            hints,
            context.styleResolveOptions,
            usesBackgroundWrapper ? stripNativeBackgroundPaintStyles(style) : undefined,
        ),
        level,
    );
}

export function renderSwiftUIContainerContent(
    node: NativeElementNode,
    level: number,
    context: SwiftUIContext,
    hints: NativeRenderHints,
    renderNode: SwiftUIRenderNode,
): string[] {
    const chunkedLayout = resolveChunkedLayout(node, context.resolvedStyles, context.styleResolveOptions);
    if (chunkedLayout) {
        return renderSwiftChunkedLayout(node, chunkedLayout, level, context, hints, renderNode);
    }

    const style = getStyleObject(node, context.resolvedStyles, context.styleResolveOptions);
    const layoutKind = resolveSwiftUILayoutFromStyle(node.component, style);
    const layout = buildSwiftUILayoutFromStyle(
        layoutKind,
        node.sourceTag,
        style,
        resolveSwiftRowAlignment(style, node.children, context.resolvedStyles, context.styleResolveOptions),
        context.styleResolveOptions,
    );

    return [
        `${indent(level)}${layout} {`,
        ...renderSwiftUIChildren(node.children, level + 1, context, renderNode, layoutKind, node, hints),
        `${indent(level)}}`,
    ];
}

export function renderSwiftUIChildren(
    nodes: NativeNode[],
    level: number,
    context: SwiftUIContext,
    renderNode: SwiftUIRenderNode,
    parentLayout?: 'VStack' | 'HStack',
    parentNode?: NativeElementNode,
    parentHints?: NativeRenderHints,
): string[] {
    const lines: string[] = [];
    const orderedNodes = parentNode
        ? getOrderedNativeChildren(parentNode, nodes, context.resolvedStyles, context.styleResolveOptions)
        : nodes;
    const availableWidth = parentNode
        ? resolveNativeAvailableAxisSize(parentNode, 'horizontal', context.resolvedStyles, parentHints, context.styleResolveOptions)
        : resolveAxisReferenceLength('horizontal', parentHints, context.styleResolveOptions);
    const availableHeight = parentNode
        ? resolveNativeAvailableAxisSize(parentNode, 'vertical', context.resolvedStyles, parentHints, context.styleResolveOptions)
        : resolveAxisReferenceLength('vertical', parentHints, context.styleResolveOptions);
    const parentFlexLayout = resolveNativeFlexContainerLayout(parentNode, context.resolvedStyles, context.styleResolveOptions);
    const inheritedParentFlexLayout = parentFlexLayout ?? (parentLayout === 'HStack' ? 'Row' : parentLayout === 'VStack' ? 'Column' : undefined);
    const flexShrinkTargets = resolveNativeFlexShrinkTargets(
        parentNode,
        orderedNodes,
        parentFlexLayout,
        availableWidth,
        availableHeight,
        parentHints,
        context.resolvedStyles,
        context.styleResolveOptions,
    );
    const parentRowBaselineAlignment = parentFlexLayout === 'Row' && parentNode
        ? resolveBaselineAlignmentKeyword(getStyleObject(parentNode, context.resolvedStyles, context.styleResolveOptions)?.alignItems)
        : undefined;

    for (const child of orderedNodes) {
        const shouldDefaultFillCrossAxis = estimateDefaultFillWidthHint(
            child,
            child.kind === 'element'
                ? getStyleObject(child, context.resolvedStyles, context.styleResolveOptions)
                : undefined,
            context.styleResolveOptions,
        );
        const shouldStretchCrossAxis = shouldStretchFlexChildCrossAxis(
            child,
            parentFlexLayout,
            parentNode,
            parentHints,
            context.resolvedStyles,
            context.styleResolveOptions,
        );
        const childHints: NativeRenderHints = {
            availableWidth,
            availableHeight,
            ...(parentLayout === 'VStack' && shouldDefaultFillCrossAxis
                && (!parentFlexLayout || (parentFlexLayout === 'Column' && shouldStretchCrossAxis))
                ? { fillWidth: true }
                : {}),
            ...(parentLayout === 'HStack' && parentFlexLayout === 'Row' && shouldDefaultFillCrossAxis && shouldStretchCrossAxis
                ? { fillHeight: true }
                : {}),
            ...(child.kind === 'element' && parentFlexLayout === 'Row' && flexShrinkTargets.has(child)
                ? { negotiatedMaxWidth: flexShrinkTargets.get(child) }
                : {}),
            ...(child.kind === 'element' && parentFlexLayout === 'Column' && flexShrinkTargets.has(child)
                ? { negotiatedMaxHeight: flexShrinkTargets.get(child) }
                : {}),
            ...(inheritedParentFlexLayout ? { parentFlexLayout: inheritedParentFlexLayout } : {}),
            ...(parentRowBaselineAlignment ? { parentRowBaselineAlignment } : {}),
        };
        lines.push(...renderNode(child, level, context, childHints));
    }

    return lines;
}