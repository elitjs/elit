import type {
    NativeElementNode,
    NativeRenderHints,
    NativeResolvedStyleMap,
    SwiftUIContext,
} from '../types';
import {
    buildSwiftUIButtonModifiersFromStyle,
    isNativeDisabled,
    serializeNativePayload,
    resolveNativeAction,
    resolveNativeRoute,
    buildSwiftBridgeInvocation,
} from '../interaction';
import {
    resolveNativeDownloadSuggestedName,
    shouldNativeDownloadLink,
    isExternalDestination,
} from '../link';
import { escapeSwiftString, quoteSwiftString, flattenTextContent } from '../strings';
import { appendSwiftUIModifiers } from '../render-support';
import { buildSwiftTextExpression } from '../state';
import { resolveTextTransform } from '../typography';
import {
    createSingleNodeResolvedStyleMap,
    getStyleObject,
    resolveNativePseudoStateVariantStyle,
} from './style-resolve';
import { buildSwiftUIModifiers } from './swiftui-style';

function indent(level: number): string {
    return '    '.repeat(level);
}

export function renderSwiftUIActionControlNode(
    node: NativeElementNode,
    level: number,
    context: SwiftUIContext,
    _hints: NativeRenderHints,
    baseLines: string[] = [],
): string[] | undefined {
    if (node.component === 'Button') {
        const label = flattenTextContent(node.children) || 'Button';
        const disabled = node.sourceTag === 'button' && isNativeDisabled(node);
        const bridgeInvocation = disabled
            ? undefined
            : buildSwiftBridgeInvocation(
                resolveNativeAction(node),
                resolveNativeRoute(node),
                serializeNativePayload(node.props.nativePayload),
            );
        const activeStyle = !disabled
            ? resolveNativePseudoStateVariantStyle(node, context.styleContexts, context.styleResolveOptions, ['active'])
            : undefined;
        const activeResolvedStyles = activeStyle ? createSingleNodeResolvedStyleMap(node, activeStyle) : undefined;
        const buildButtonLines = (resolvedStyles: NativeResolvedStyleMap): string[] => {
            const style = getStyleObject(node, resolvedStyles, context.styleResolveOptions);
            const transformedLabel = buildSwiftTextExpression(node.children, context, resolveTextTransform(style?.textTransform));
            const lines = bridgeInvocation
                ? [
                    `${indent(level)}Button(action: {`,
                    `${indent(level + 1)}${bridgeInvocation}`,
                    `${indent(level)}}) {`,
                    `${indent(level + 1)}Text(${transformedLabel || quoteSwiftString(label)})`,
                    `${indent(level)}}`,
                ]
                : disabled
                    ? [
                        `${indent(level)}Button(action: {}) {`,
                        `${indent(level + 1)}Text(${transformedLabel || quoteSwiftString(label)})`,
                        `${indent(level)}}`,
                    ]
                    : [
                        `${indent(level)}Button(action: {`,
                        `${indent(level + 1)}// TODO: wire elit event(s): ${node.events.join(', ') || 'press'}`,
                        `${indent(level)}}) {`,
                        `${indent(level + 1)}Text(${transformedLabel || quoteSwiftString(label)})`,
                        `${indent(level)}}`,
                    ];

            return appendSwiftUIModifiers(
                lines,
                buildSwiftUIButtonModifiersFromStyle(
                    node,
                    buildSwiftUIModifiers(node, resolvedStyles, {}, context.styleResolveOptions),
                    getStyleObject(node, resolvedStyles, context.styleResolveOptions),
                ),
                level,
            );
        };
        const baseVariantLines = buildButtonLines(context.resolvedStyles);
        const activeVariantLines = activeResolvedStyles ? buildButtonLines(activeResolvedStyles) : baseVariantLines;
        const shouldUseRuntimeActiveVariant = !disabled && activeResolvedStyles !== undefined && activeVariantLines.join('\n') !== baseVariantLines.join('\n');

        if (bridgeInvocation) {
            context.helperFlags.add('bridge');
        }

        if (shouldUseRuntimeActiveVariant) {
            const pressedName = `interactionPressed${context.interactionIndex++}`;
            context.stateDeclarations.push(`${indent(1)}@GestureState private var ${pressedName} = false`);
            return [
                ...baseLines,
                `${indent(level)}Group {`,
                `${indent(level + 1)}if ${pressedName} {`,
                ...activeVariantLines.map((line) => `${indent(2)}${line}`),
                `${indent(level + 1)}} else {`,
                ...baseVariantLines.map((line) => `${indent(2)}${line}`),
                `${indent(level + 1)}}`,
                `${indent(level)}}`,
                `${indent(level + 1)}.simultaneousGesture(DragGesture(minimumDistance: 0).updating($${pressedName}) { _, state, _ in`,
                `${indent(level + 2)}state = true`,
                `${indent(level + 1)}})`,
            ];
        }

        return [...baseLines, ...baseVariantLines];
    }

    if (node.component === 'Link') {
        const label = flattenTextContent(node.children) || String(node.props.destination ?? 'Link');
        const destination = typeof node.props.destination === 'string' ? node.props.destination : 'destination';
        const suggestedName = resolveNativeDownloadSuggestedName(node);
        const bridgeInvocation = buildSwiftBridgeInvocation(
            resolveNativeAction(node),
            resolveNativeRoute(node),
            serializeNativePayload(node.props.nativePayload),
        );
        const activeStyle = resolveNativePseudoStateVariantStyle(node, context.styleContexts, context.styleResolveOptions, ['active']);
        const activeResolvedStyles = activeStyle ? createSingleNodeResolvedStyleMap(node, activeStyle) : undefined;
        const buildLinkLines = (resolvedStyles: NativeResolvedStyleMap): string[] => {
            const style = getStyleObject(node, resolvedStyles, context.styleResolveOptions);
            const transformedLabel = buildSwiftTextExpression(node.children, context, resolveTextTransform(style?.textTransform));
            const lines = shouldNativeDownloadLink(node) && typeof node.props.destination === 'string'
                ? [
                    `${indent(level)}Button(action: {`,
                    `${indent(level + 1)}elitDownloadFile(from: ${quoteSwiftString(node.props.destination)}, suggestedName: ${suggestedName ? quoteSwiftString(suggestedName) : 'nil'})`,
                    `${indent(level)}}) {`,
                    `${indent(level + 1)}Text(${transformedLabel || quoteSwiftString(label)})`,
                    `${indent(level)}}`,
                ]
                : isExternalDestination(destination)
                    ? [
                        `${indent(level)}Button(action: {`,
                        `${indent(level + 1)}if let destination = URL(string: ${quoteSwiftString(destination)}) {`,
                        `${indent(level + 2)}openURL(destination)`,
                        `${indent(level + 1)}}`,
                        `${indent(level)}}) {`,
                        `${indent(level + 1)}Text(${transformedLabel || quoteSwiftString(label)})`,
                        `${indent(level)}}`,
                    ]
                    : bridgeInvocation
                        ? [
                            `${indent(level)}Button(action: {`,
                            `${indent(level + 1)}${bridgeInvocation}`,
                            `${indent(level)}}) {`,
                            `${indent(level + 1)}Text(${transformedLabel || quoteSwiftString(label)})`,
                            `${indent(level)}}`,
                        ]
                        : [
                            `${indent(level)}Button(action: {`,
                            `${indent(level + 1)}// TODO: navigate to ${escapeSwiftString(destination)}`,
                            `${indent(level)}}) {`,
                            `${indent(level + 1)}Text(${transformedLabel || quoteSwiftString(label)})`,
                            `${indent(level)}}`,
                        ];

            return appendSwiftUIModifiers(
                lines,
                buildSwiftUIButtonModifiersFromStyle(
                    node,
                    buildSwiftUIModifiers(node, resolvedStyles, {}, context.styleResolveOptions),
                    getStyleObject(node, resolvedStyles, context.styleResolveOptions),
                ),
                level,
            );
        };
        const baseVariantLines = buildLinkLines(context.resolvedStyles);
        const activeVariantLines = activeResolvedStyles ? buildLinkLines(activeResolvedStyles) : baseVariantLines;
        const shouldUseRuntimeActiveVariant = activeResolvedStyles !== undefined && activeVariantLines.join('\n') !== baseVariantLines.join('\n');
        if (shouldNativeDownloadLink(node) && typeof node.props.destination === 'string') {
            context.helperFlags.add('downloadHandler');
        } else if (isExternalDestination(destination)) {
            context.helperFlags.add('openUrlHandler');
        } else if (bridgeInvocation) {
            context.helperFlags.add('bridge');
        }

        if (shouldUseRuntimeActiveVariant) {
            const pressedName = `interactionPressed${context.interactionIndex++}`;
            context.stateDeclarations.push(`${indent(1)}@GestureState private var ${pressedName} = false`);
            return [
                ...baseLines,
                `${indent(level)}Group {`,
                `${indent(level + 1)}if ${pressedName} {`,
                ...activeVariantLines.map((line) => `${indent(2)}${line}`),
                `${indent(level + 1)}} else {`,
                ...baseVariantLines.map((line) => `${indent(2)}${line}`),
                `${indent(level + 1)}}`,
                `${indent(level)}}`,
                `${indent(level + 1)}.simultaneousGesture(DragGesture(minimumDistance: 0).updating($${pressedName}) { _, state, _ in`,
                `${indent(level + 2)}state = true`,
                `${indent(level + 1)}})`,
            ];
        }

        return [...baseLines, ...baseVariantLines];
    }

    return undefined;
}