import type { NativeCanvasSpec, NativeElementNode, NativePropObject, NativePropValue, NativeVectorShape, NativeVectorSpec } from '../types';
import { parseNativeSvgNumber } from '../units';
import { buildNativeVectorPathFromPoints, parseNativeSvgPathData, parseNativeSvgPointList } from './path';
import {
    isNativePropObjectValue,
    parseNativeCanvasStrokeWidth,
    resolveNativeCanvasFillFallback,
    resolveNativeCanvasStrokeFallback,
    resolveNativeVectorPaintColor,
} from './paint';

export function buildNativeCanvasSpec(node: NativeElementNode): NativeCanvasSpec {
    const intrinsicWidth = parseNativeSvgNumber(node.props.width) ?? 300;
    const intrinsicHeight = parseNativeSvgNumber(node.props.height) ?? 150;

    return {
        intrinsicWidth: intrinsicWidth > 0 ? intrinsicWidth : 300,
        intrinsicHeight: intrinsicHeight > 0 ? intrinsicHeight : 150,
    };
}

export function parseNativeCanvasPointList(value: NativePropValue | undefined): Array<{ x: number; y: number }> | undefined {
    if (typeof value === 'string') {
        return parseNativeSvgPointList(value);
    }

    if (!Array.isArray(value)) {
        return undefined;
    }

    const points: Array<{ x: number; y: number }> = [];
    for (const item of value) {
        if (Array.isArray(item)) {
            const x = parseNativeSvgNumber(item[0]);
            const y = parseNativeSvgNumber(item[1]);
            if (x === undefined || y === undefined) {
                return undefined;
            }
            points.push({ x, y });
            continue;
        }

        if (!isNativePropObjectValue(item)) {
            return undefined;
        }

        const x = parseNativeSvgNumber(item.x);
        const y = parseNativeSvgNumber(item.y);
        if (x === undefined || y === undefined) {
            return undefined;
        }
        points.push({ x, y });
    }

    return points.length >= 2 ? points : undefined;
}

export function parseNativeCanvasDrawOperation(op: NativePropObject): NativeVectorShape | undefined {
    const kind = typeof op.kind === 'string' ? op.kind.trim() : undefined;
    if (!kind) {
        return undefined;
    }

    const fill = resolveNativeVectorPaintColor(op.fill ?? op.fillStyle, resolveNativeCanvasFillFallback(kind));
    const stroke = resolveNativeVectorPaintColor(op.stroke ?? op.strokeStyle, resolveNativeCanvasStrokeFallback(kind));
    const strokeWidth = parseNativeCanvasStrokeWidth(op);

    switch (kind) {
        case 'rect': {
            const width = parseNativeSvgNumber(op.width);
            const height = parseNativeSvgNumber(op.height);
            if (width === undefined || height === undefined) {
                return undefined;
            }

            return {
                kind: 'rect',
                x: parseNativeSvgNumber(op.x) ?? 0,
                y: parseNativeSvgNumber(op.y) ?? 0,
                width,
                height,
                rx: parseNativeSvgNumber(op.rx),
                ry: parseNativeSvgNumber(op.ry),
                fill,
                stroke,
                strokeWidth,
            };
        }
        case 'circle': {
            const cx = parseNativeSvgNumber(op.cx);
            const cy = parseNativeSvgNumber(op.cy);
            const r = parseNativeSvgNumber(op.r);
            if (cx === undefined || cy === undefined || r === undefined) {
                return undefined;
            }

            return { kind: 'circle', cx, cy, r, fill, stroke, strokeWidth };
        }
        case 'ellipse': {
            const cx = parseNativeSvgNumber(op.cx);
            const cy = parseNativeSvgNumber(op.cy);
            const rx = parseNativeSvgNumber(op.rx);
            const ry = parseNativeSvgNumber(op.ry);
            if (cx === undefined || cy === undefined || rx === undefined || ry === undefined) {
                return undefined;
            }

            return { kind: 'ellipse', cx, cy, rx, ry, fill, stroke, strokeWidth };
        }
        case 'line': {
            const x1 = parseNativeSvgNumber(op.x1);
            const y1 = parseNativeSvgNumber(op.y1);
            const x2 = parseNativeSvgNumber(op.x2);
            const y2 = parseNativeSvgNumber(op.y2);
            if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) {
                return undefined;
            }

            return {
                kind: 'path',
                commands: [
                    { kind: 'moveTo', x: x1, y: y1 },
                    { kind: 'lineTo', x: x2, y: y2 },
                ],
                stroke,
                strokeWidth,
            };
        }
        case 'polyline': {
            const points = parseNativeCanvasPointList(op.points);
            const commands = points ? buildNativeVectorPathFromPoints(points, false) : undefined;
            if (!commands) {
                return undefined;
            }

            return { kind: 'path', commands, fill, stroke, strokeWidth };
        }
        case 'polygon': {
            const points = parseNativeCanvasPointList(op.points);
            const commands = points ? buildNativeVectorPathFromPoints(points, true) : undefined;
            if (!commands) {
                return undefined;
            }

            return { kind: 'path', commands, fill, stroke, strokeWidth };
        }
        case 'path': {
            const data = typeof op.d === 'string' ? op.d.trim() : undefined;
            if (!data) {
                return undefined;
            }

            const commands = parseNativeSvgPathData(data);
            if (!commands) {
                return undefined;
            }

            return { kind: 'path', commands, fill, stroke, strokeWidth };
        }
        default:
            return undefined;
    }
}

export function buildNativeCanvasDrawingSpec(node: NativeElementNode): NativeVectorSpec | undefined {
    const drawOps = node.props.drawOps;
    if (!Array.isArray(drawOps)) {
        return undefined;
    }

    const shapes = drawOps
        .map((op) => isNativePropObjectValue(op) ? parseNativeCanvasDrawOperation(op) : undefined)
        .filter((shape): shape is NativeVectorShape => Boolean(shape));
    if (shapes.length === 0) {
        return undefined;
    }

    const canvasSpec = buildNativeCanvasSpec(node);
    return {
        viewport: {
            minX: 0,
            minY: 0,
            width: canvasSpec.intrinsicWidth,
            height: canvasSpec.intrinsicHeight,
        },
        shapes,
        intrinsicWidth: canvasSpec.intrinsicWidth,
        intrinsicHeight: canvasSpec.intrinsicHeight,
    };
}