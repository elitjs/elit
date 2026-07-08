import type {
    AndroidComposeContext,
    NativeChunkedLayout,
    NativeElementNode,
    NativeNode,
    NativeRenderHints,
} from '../types';
import { toDpLiteral, resolveAxisReferenceLength } from '../units';
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
    buildComposeChunkedRowArguments,
    buildComposeChunkedTrackModifier,
    hasNativeGridColumnConstraint,
    buildComposeGridCellModifier,
    resolveComposeGridCellContentAlignment,
    buildComposeChunkedColumnArrangement,
    shouldRenderNativeBackgroundLayersWithWrapper,
    buildComposeBackgroundLayerInvocation,
    resolveNativeGridCellFillWidth,
} from '../render-support';
import { resolveBaselineAlignmentKeyword, resolveNativeGridCellAlignmentFromStyle, resolveComposeLayoutFromStyle, buildComposeLayoutArgumentsFromStyle } from '../layout';
import {
    getOrderedNativeChildren,
    resolveChunkedLayout,
    resolveNativeAvailableAxisSize,
    resolveNativeFlexContainerLayout,
    resolveNativeFlexShrinkTargets,
    shouldStretchFlexChildCrossAxis,
} from './chunked-layout';
import { getStyleObject } from './style-resolve';
import { buildComposeModifier } from './compose-style';

export type ComposeRenderNode = (
    node: NativeNode,
    level: number,
    context: AndroidComposeContext,
    hints?: NativeRenderHints,
) => string[];

function indent(level: number): string {
    return '    '.repeat(level);
}

export function renderComposeChildren(
    nodes: NativeNode[],
    level: number,
    context: AndroidComposeContext,
    renderNode: ComposeRenderNode,
    parentLayout?: 'Column' | 'Row',
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
    const inheritedParentFlexLayout = parentFlexLayout ?? parentLayout;
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
            ...(parentLayout === 'Column' && shouldDefaultFillCrossAxis
                && (!parentFlexLayout || (parentFlexLayout === 'Column' && shouldStretchCrossAxis))
                ? { fillWidth: true }
                : {}),
            ...(parentLayout === 'Row' && parentFlexLayout === 'Row' && shouldDefaultFillCrossAxis && shouldStretchCrossAxis
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

export function renderComposeChunkedLayout(
    node: NativeElementNode,
    layout: NativeChunkedLayout,
    level: number,
    context: AndroidComposeContext,
    modifier: string,
    hints: NativeRenderHints,
    renderNode: ComposeRenderNode,
): string[] {
    const style = getStyleObject(node, context.resolvedStyles, context.styleResolveOptions);
    const outerGap = buildComposeChunkedColumnArrangement(layout);
    const effectiveContentAlignment = resolveEffectiveChunkedContentAlignment(layout);
    const usesSingleRowGridStackAlignment = layout.kind === 'grid'
        && layout.rows.length === 1
        && effectiveContentAlignment !== undefined
        && effectiveContentAlignment !== 'start';

    if (layout.kind === 'grid' && layout.rows.length === 1 && !usesSingleRowGridStackAlignment) {
        const [row] = layout.rows;
        const lines = [`${indent(level)}Row(${buildComposeChunkedRowArguments(style, buildComposeChunkedTrackModifier(modifier, row, { fillWidth: false }), layout.columnGap, context.styleResolveOptions)}) {`];
        const totalWeight = row.weights ? row.weights.reduce<number>((sum, entry) => sum + (entry ?? 0), 0) : undefined;
        row.items.forEach((child, index) => {
            const weight = row.weights?.[index];
            const columnSize = row.columnSizes?.[index];
            const baseFillChild = shouldFillChunkedCellChild(child);
            const cellAlignment = resolveNativeGridCellAlignmentFromStyle(
                child.kind === 'element'
                    ? getStyleObject(child, context.resolvedStyles, context.styleResolveOptions)
                    : undefined,
                style,
            );
            const fillChild = resolveNativeGridCellFillWidth(baseFillChild, cellAlignment.horizontal);
            const fillHeight = cellAlignment.vertical === 'stretch';
            const shouldExpandCellHeight = cellAlignment.vertical !== undefined;
            const shouldExpandCellWidth = weight !== undefined
                ? fillChild
                : !hasNativeGridColumnConstraint(columnSize) && fillChild;
            const cellModifier = buildComposeGridCellModifier(weight, shouldExpandCellWidth, shouldExpandCellHeight, columnSize);
            const contentAlignment = resolveComposeGridCellContentAlignment(cellAlignment.horizontal, cellAlignment.vertical);
            const cellAvailableWidth = weight !== undefined && totalWeight && hints.availableWidth !== undefined
                ? Math.max(0, (hints.availableWidth - ((layout.columnGap ?? 0) * Math.max(0, row.items.length - 1))) * (weight / totalWeight))
                : columnSize?.width ?? columnSize?.maxWidth ?? hints.availableWidth;
            lines.push(`${indent(level + 1)}Box(modifier = ${cellModifier}${contentAlignment ? `, contentAlignment = ${contentAlignment}` : ''}) {`);
            lines.push(...renderNode(child, level + 2, context, {
                ...(fillChild ? { fillWidth: true } : {}),
                ...(fillHeight ? { fillHeight: true } : {}),
                availableWidth: cellAvailableWidth,
                availableHeight: hints.availableHeight,
            }));
            lines.push(`${indent(level + 1)}}`);
        });
        lines.push(`${indent(level)}}`);
        return lines;
    }

    const lines = [`${indent(level)}Column(modifier = ${modifier}${outerGap ? `, verticalArrangement = ${outerGap}` : ''}) {`];
    for (const row of layout.rows) {
        const totalWeight = row.weights ? row.weights.reduce<number>((sum, entry) => sum + (entry ?? 0), 0) : undefined;
        lines.push(`${indent(level + 1)}Row(${buildComposeChunkedRowArguments(style, buildComposeChunkedTrackModifier('Modifier', row), layout.columnGap, context.styleResolveOptions)}) {`);
        row.items.forEach((child, index) => {
            const weight = row.weights?.[index];
            const columnSize = row.columnSizes?.[index];
            const baseFillChild = layout.kind === 'grid' && shouldFillChunkedCellChild(child);
            const cellAlignment = layout.kind === 'grid'
                ? resolveNativeGridCellAlignmentFromStyle(
                    child.kind === 'element'
                        ? getStyleObject(child, context.resolvedStyles, context.styleResolveOptions)
                        : undefined,
                    style,
                )
                : {};
            const fillChild = layout.kind === 'grid'
                ? resolveNativeGridCellFillWidth(baseFillChild, cellAlignment.horizontal)
                : baseFillChild;
            const fillHeight = layout.kind === 'grid' && cellAlignment.vertical === 'stretch';
            const shouldExpandCellHeight = layout.kind === 'grid' && cellAlignment.vertical !== undefined;
            const shouldExpandCellWidth = weight !== undefined
                ? fillChild
                : !hasNativeGridColumnConstraint(columnSize) && fillChild;
            const cellModifier = buildComposeGridCellModifier(weight, shouldExpandCellWidth, shouldExpandCellHeight, columnSize);
            const contentAlignment = layout.kind === 'grid'
                ? resolveComposeGridCellContentAlignment(cellAlignment.horizontal, cellAlignment.vertical)
                : undefined;
            const cellAvailableWidth = weight !== undefined && totalWeight && hints.availableWidth !== undefined
                ? Math.max(0, (hints.availableWidth - ((layout.columnGap ?? 0) * Math.max(0, row.items.length - 1))) * (weight / totalWeight))
                : columnSize?.width ?? columnSize?.maxWidth ?? hints.availableWidth;
            lines.push(`${indent(level + 2)}Box(modifier = ${cellModifier}${contentAlignment ? `, contentAlignment = ${contentAlignment}` : ''}) {`);
            lines.push(...renderNode(child, level + 3, context, {
                ...(fillChild ? { fillWidth: true } : {}),
                ...(fillHeight ? { fillHeight: true } : {}),
                availableWidth: cellAvailableWidth,
                availableHeight: hints.availableHeight,
            }));
            lines.push(`${indent(level + 2)}}`);
        });
        lines.push(`${indent(level + 1)}}`);
    }
    lines.push(`${indent(level)}}`);

    return lines;
}

export function renderComposeContainerContent(
    node: NativeElementNode,
    level: number,
    context: AndroidComposeContext,
    modifier: string,
    hints: NativeRenderHints,
    renderNode: ComposeRenderNode,
): string[] {
    const chunkedLayout = resolveChunkedLayout(node, context.resolvedStyles, context.styleResolveOptions);
    if (chunkedLayout) {
        return renderComposeChunkedLayout(node, chunkedLayout, level, context, modifier, hints, renderNode);
    }

    const style = getStyleObject(node, context.resolvedStyles, context.styleResolveOptions);
    const layout = resolveComposeLayoutFromStyle(node.component, style);
    return [
        `${indent(level)}${layout}(${buildComposeLayoutArgumentsFromStyle(layout, modifier, style, context.styleResolveOptions)}) {`,
        ...renderComposeChildren(node.children, level + 1, context, renderNode, layout, node, hints),
        `${indent(level)}}`,
    ];
}

export function renderComposeContainerBody(
    node: NativeElementNode,
    level: number,
    context: AndroidComposeContext,
    modifier: string,
    hints: NativeRenderHints,
    renderNode: ComposeRenderNode,
): string[] {
    const style = getStyleObject(node, context.resolvedStyles, context.styleResolveOptions);
    const backgroundLayers = resolveNativeBackgroundLayersFromStyle(style, context.styleResolveOptions);
    if (!shouldRenderNativeBackgroundLayersWithWrapper(backgroundLayers)) {
        return renderComposeContainerContent(node, level, context, modifier, hints, renderNode);
    }

    if (backgroundLayers.some((layer) => layer.kind === 'image')) {
        context.helperFlags.add('backgroundImage');
    }

    const contentStyle = stripNativeBackgroundPaintStyles(style);
    const contentModifier = contentStyle
        ? buildComposeModifier(node, context.resolvedStyles, hints, context.styleResolveOptions, contentStyle)
        : modifier;
    const radius = toDpLiteral(style?.borderRadius, context.styleResolveOptions);
    const backgroundModifier = `Modifier.matchParentSize()${radius ? `.clip(RoundedCornerShape(${radius}))` : ''}`;
    const renderedBackgroundLayers = [...backgroundLayers].reverse();

    return [
        `${indent(level)}Box {`,
        ...renderedBackgroundLayers.map((backgroundLayer) => `${indent(level + 1)}${buildComposeBackgroundLayerInvocation(backgroundLayer, backgroundModifier)}`),
        ...renderComposeContainerContent(node, level + 1, context, contentModifier, hints, renderNode),
        `${indent(level)}}`,
    ];
}