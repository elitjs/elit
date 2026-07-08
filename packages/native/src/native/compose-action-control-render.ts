import type {
    AndroidComposeContext,
    NativeElementNode,
    NativeRenderHints,
} from '../types';
import {
    buildComposeButtonModifier,
    isNativeDisabled,
    serializeNativePayload,
    resolveNativeAction,
    resolveNativeRoute,
    buildComposeBridgeInvocation,
} from '../interaction';
import {
    resolveNativeDownloadSuggestedName,
    shouldNativeDownloadLink,
    isExternalDestination,
} from '../link';
import { escapeKotlinString, quoteKotlinString, flattenTextContent } from '../strings';
import { buildComposeTextExpression } from '../state';
import {
    createSingleNodeResolvedStyleMap,
    resolveNativePseudoStateVariantStyle,
} from './style-resolve';
import { buildComposeLabelText, buildComposeModifier } from './compose-style';

function indent(level: number): string {
    return '    '.repeat(level);
}

export function renderComposeActionControlNode(
    node: NativeElementNode,
    level: number,
    context: AndroidComposeContext,
    hints: NativeRenderHints,
    modifier: string,
    baseLines: string[] = [],
): string[] | undefined {
    const lines = [...baseLines];

    if (node.component === 'Button') {
        const label = flattenTextContent(node.children) || 'Button';
        const disabled = isNativeDisabled(node);
        const onClickExpression = disabled
            ? undefined
            : buildComposeBridgeInvocation(
                resolveNativeAction(node),
                resolveNativeRoute(node),
                serializeNativePayload(node.props.nativePayload),
            );
        const activeStyle = !disabled
            ? resolveNativePseudoStateVariantStyle(node, context.styleContexts, context.styleResolveOptions, ['active'])
            : undefined;
        const activeResolvedStyles = activeStyle ? createSingleNodeResolvedStyleMap(node, activeStyle) : undefined;
        const baseLabel = buildComposeLabelText(node, label, context.resolvedStyles, buildComposeTextExpression(node.children, context), context.styleResolveOptions);
        const activeLabel = activeResolvedStyles
            ? buildComposeLabelText(node, label, activeResolvedStyles, buildComposeTextExpression(node.children, context), context.styleResolveOptions)
            : baseLabel;
        const activeModifier = activeResolvedStyles
            ? buildComposeModifier(node, activeResolvedStyles, hints, context.styleResolveOptions)
            : modifier;
        const shouldUseRuntimeActiveVariant = !disabled && (activeModifier !== modifier || activeLabel !== baseLabel);
        const clickBody = onClickExpression
            ?? (node.events.length > 0
                ? `/* TODO: wire elit event(s): ${node.events.join(', ')} */`
                : shouldUseRuntimeActiveVariant
                    ? '/* active-state preview no-op */'
                    : undefined);
        const buttonModifier = buildComposeButtonModifier(modifier, clickBody, !disabled);

        if (onClickExpression) {
            context.helperFlags.add('bridge');
        } else if (!disabled && node.events.length > 0) {
            lines.push(`${indent(level)}// TODO: wire elit event(s): ${node.events.join(', ')}`);
        }

        if (shouldUseRuntimeActiveVariant && clickBody) {
            context.helperFlags.add('interactivePressState');
            const interactionId = context.interactionIndex++;
            const interactionSourceName = `interactionSource${interactionId}`;
            const pressedName = `pressedState${interactionId}`;
            const pressedModifier = buildComposeButtonModifier(activeModifier, clickBody, !disabled, interactionSourceName);
            const idleModifier = buildComposeButtonModifier(modifier, clickBody, !disabled, interactionSourceName);

            lines.push(`${indent(level)}val ${interactionSourceName} = remember { MutableInteractionSource() }`);
            lines.push(`${indent(level)}val ${pressedName} by ${interactionSourceName}.collectIsPressedAsState()`);
            lines.push(`${indent(level)}Box(modifier = if (${pressedName}) ${pressedModifier} else ${idleModifier}, contentAlignment = Alignment.Center) {`);
            if (activeLabel !== baseLabel) {
                lines.push(`${indent(level + 1)}if (${pressedName}) {`);
                lines.push(`${indent(level + 2)}${activeLabel}`);
                lines.push(`${indent(level + 1)}} else {`);
                lines.push(`${indent(level + 2)}${baseLabel}`);
                lines.push(`${indent(level + 1)}}`);
            } else {
                lines.push(`${indent(level + 1)}${baseLabel}`);
            }
            lines.push(`${indent(level)}}`);
        } else {
            lines.push(`${indent(level)}Box(modifier = ${buttonModifier}, contentAlignment = Alignment.Center) {`);
            lines.push(`${indent(level + 1)}${baseLabel}`);
            lines.push(`${indent(level)}}`);
        }
        return lines;
    }

    if (node.component === 'Link') {
        const label = flattenTextContent(node.children) || String(node.props.destination ?? 'Link');
        const destination = typeof node.props.destination === 'string' ? node.props.destination : undefined;
        const suggestedName = resolveNativeDownloadSuggestedName(node);
        let onClickExpression: string | undefined;
        if (destination && shouldNativeDownloadLink(node)) {
            context.helperFlags.add('downloadHandler');
            onClickExpression = `ElitDownloadHandler.download(localContext, ${quoteKotlinString(destination)}, ${suggestedName ? quoteKotlinString(suggestedName) : 'null'})`;
        } else if (destination && isExternalDestination(destination)) {
            context.helperFlags.add('uriHandler');
            onClickExpression = `uriHandler.openUri(${quoteKotlinString(destination)})`;
        } else {
            onClickExpression = buildComposeBridgeInvocation(
                resolveNativeAction(node),
                resolveNativeRoute(node),
                serializeNativePayload(node.props.nativePayload),
            );

            if (onClickExpression) {
                context.helperFlags.add('bridge');
            } else if (destination) {
                lines.push(`${indent(level)}// TODO: navigate to ${escapeKotlinString(destination)}`);
            }
        }

        const activeStyle = resolveNativePseudoStateVariantStyle(node, context.styleContexts, context.styleResolveOptions, ['active']);
        const activeResolvedStyles = activeStyle ? createSingleNodeResolvedStyleMap(node, activeStyle) : undefined;
        const baseLabel = buildComposeLabelText(node, label, context.resolvedStyles, buildComposeTextExpression(node.children, context), context.styleResolveOptions);
        const activeLabel = activeResolvedStyles
            ? buildComposeLabelText(node, label, activeResolvedStyles, buildComposeTextExpression(node.children, context), context.styleResolveOptions)
            : baseLabel;
        const activeModifier = activeResolvedStyles
            ? buildComposeModifier(node, activeResolvedStyles, hints, context.styleResolveOptions)
            : modifier;
        const shouldUseRuntimeActiveVariant = activeResolvedStyles !== undefined && (activeModifier !== modifier || activeLabel !== baseLabel);
        const clickBody = onClickExpression
            ?? (destination
                ? `/* TODO: navigate to ${escapeKotlinString(destination)} */`
                : shouldUseRuntimeActiveVariant
                    ? '/* active-state preview no-op */'
                    : undefined);

        if (shouldUseRuntimeActiveVariant && clickBody) {
            context.helperFlags.add('interactivePressState');
            const interactionId = context.interactionIndex++;
            const interactionSourceName = `interactionSource${interactionId}`;
            const pressedName = `pressedState${interactionId}`;
            const pressedModifier = buildComposeButtonModifier(activeModifier, clickBody, true, interactionSourceName);
            const idleModifier = buildComposeButtonModifier(modifier, clickBody, true, interactionSourceName);

            lines.push(`${indent(level)}val ${interactionSourceName} = remember { MutableInteractionSource() }`);
            lines.push(`${indent(level)}val ${pressedName} by ${interactionSourceName}.collectIsPressedAsState()`);
            lines.push(`${indent(level)}Box(modifier = if (${pressedName}) ${pressedModifier} else ${idleModifier}, contentAlignment = Alignment.Center) {`);
            if (activeLabel !== baseLabel) {
                lines.push(`${indent(level + 1)}if (${pressedName}) {`);
                lines.push(`${indent(level + 2)}${activeLabel}`);
                lines.push(`${indent(level + 1)}} else {`);
                lines.push(`${indent(level + 2)}${baseLabel}`);
                lines.push(`${indent(level + 1)}}`);
            } else {
                lines.push(`${indent(level + 1)}${baseLabel}`);
            }
            lines.push(`${indent(level)}}`);
        } else {
            lines.push(`${indent(level)}Box(modifier = ${buildComposeButtonModifier(modifier, clickBody)}, contentAlignment = Alignment.Center) {`);
            lines.push(`${indent(level + 1)}${baseLabel}`);
            lines.push(`${indent(level)}}`);
        }
        return lines;
    }

    return undefined;
}