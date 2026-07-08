import type {
    AndroidComposeContext,
    NativeNode,
    SwiftUIContext,
} from '../types';
import { quoteKotlinString, quoteSwiftString } from '../strings';
import {
    ensureComposeStateVariable,
    ensureSwiftStateVariable,
    toComposeTextValueExpression,
    toSwiftTextValueExpression,
} from './declarations';

type NativeTextTransform = 'uppercase' | 'lowercase' | 'capitalize';

export function applyComposeTextTransformExpression(expression: string, transform: NativeTextTransform | undefined): string {
    if (!transform) {
        return expression;
    }

    if (transform === 'uppercase') {
        return `${expression}.uppercase()`;
    }

    if (transform === 'lowercase') {
        return `${expression}.lowercase()`;
    }

    return `${expression}.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }`;
}

function applySwiftTextTransformExpression(expression: string, transform: NativeTextTransform | undefined): string {
    if (!transform) {
        return expression;
    }

    if (transform === 'uppercase') {
        return `${expression}.uppercased()`;
    }

    if (transform === 'lowercase') {
        return `${expression}.lowercased()`;
    }

    return `${expression}.capitalized`;
}

export function buildComposeTextExpression(
    nodes: NativeNode[],
    context: AndroidComposeContext,
    transform?: NativeTextTransform,
): string | undefined {
    const parts: string[] = [];
    let hasDynamicPart = false;

    const visit = (items: NativeNode[]): void => {
        for (const item of items) {
            if (item.kind === 'text') {
                if (item.stateId) {
                    const { descriptor, variableName } = ensureComposeStateVariable(context, item.stateId);
                    parts.push(toComposeTextValueExpression(variableName, descriptor));
                    hasDynamicPart = true;
                } else {
                    parts.push(quoteKotlinString(item.value));
                }
                continue;
            }

            visit(item.children);
        }
    };

    visit(nodes);

    if (parts.length === 0 || !hasDynamicPart) {
        return undefined;
    }

    const expression = parts.join(' + ');
    return applyComposeTextTransformExpression(expression, transform);
}

export function buildSwiftTextExpression(
    nodes: NativeNode[],
    context: SwiftUIContext,
    transform?: NativeTextTransform,
): string | undefined {
    const parts: string[] = [];
    let hasDynamicPart = false;

    const visit = (items: NativeNode[]): void => {
        for (const item of items) {
            if (item.kind === 'text') {
                if (item.stateId) {
                    const { descriptor, variableName } = ensureSwiftStateVariable(context, item.stateId);
                    parts.push(toSwiftTextValueExpression(variableName, descriptor));
                    hasDynamicPart = true;
                } else {
                    parts.push(quoteSwiftString(item.value));
                }
                continue;
            }

            visit(item.children);
        }
    };

    visit(nodes);

    if (parts.length === 0 || !hasDynamicPart) {
        return undefined;
    }

    const expression = parts.join(' + ');
    return applySwiftTextTransformExpression(expression, transform);
}