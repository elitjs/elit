import type {
    AndroidComposeContext,
    NativeElementNode,
    NativeRenderHints,
} from '../types';
import { renderComposeActionControlNode } from './compose-action-control-render';
import { renderComposeFormControlNode } from './compose-form-control-render';

export function renderComposeControlNode(
    node: NativeElementNode,
    level: number,
    context: AndroidComposeContext,
    hints: NativeRenderHints,
    modifier: string,
    baseLines: string[] = [],
): string[] | undefined {
    return renderComposeFormControlNode(node, level, context, hints, modifier, baseLines)
        ?? renderComposeActionControlNode(node, level, context, hints, modifier, baseLines);
}