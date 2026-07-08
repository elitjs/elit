import type { NativeElementNode, NativePropObject } from '../types';
import { buildNativeCanvasDrawingSpec, buildNativeCanvasSpec } from './canvas';
import { buildNativeVectorSpec } from './svg-spec';

export function attachDesktopNativeMetadata(node: NativeElementNode): void {
    if (node.component === 'Vector' && node.sourceTag === 'svg') {
        const vectorSpec = buildNativeVectorSpec(node);
        if (vectorSpec) {
            node.props.desktopVectorSpec = vectorSpec as unknown as NativePropObject;
        }
        return;
    }

    if (node.component === 'Canvas') {
        const canvasSpec = buildNativeCanvasDrawingSpec(node) ?? buildNativeCanvasSpec(node);
        node.props.desktopCanvasSpec = canvasSpec as unknown as NativePropObject;
    }
}