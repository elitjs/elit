import type {
    NativeElementNode,
    NativeRenderHints,
    SwiftUIContext,
} from '../types';
import { renderSwiftUIActionControlNode } from './swiftui-action-control-render';
import { renderSwiftUIFormControlNode } from './swiftui-form-control-render';

export function renderSwiftUIControlNode(
    node: NativeElementNode,
    level: number,
    context: SwiftUIContext,
    hints: NativeRenderHints,
    baseLines: string[] = [],
): string[] | undefined {
    return renderSwiftUIFormControlNode(node, level, context, hints, baseLines)
        ?? renderSwiftUIActionControlNode(node, level, context, hints, baseLines);
}