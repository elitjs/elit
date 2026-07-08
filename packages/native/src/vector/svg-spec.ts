import type { NativeElementNode, NativeNode, NativePropValue, NativeVectorShape, NativeVectorSpec, NativeVectorViewport } from '../types';
import { parseNativeSvgNumber } from '../units';
import { buildNativeVectorPathFromPoints, parseNativeSvgPathData, parseNativeSvgPointList } from './path';
import { resolveNativeDefaultFillColor, resolveNativeVectorPaintColor, resolveNativeVectorStrokeWidth } from './paint';

export function parseNativeVectorShape(node: NativeElementNode): NativeVectorShape | undefined {
    const fill = resolveNativeVectorPaintColor(node.props.fill, resolveNativeDefaultFillColor(node.sourceTag));
    const stroke = resolveNativeVectorPaintColor(node.props.stroke);
    const strokeWidth = resolveNativeVectorStrokeWidth(node);

    switch (node.sourceTag) {
        case 'circle': {
            const cx = parseNativeSvgNumber(node.props.cx);
            const cy = parseNativeSvgNumber(node.props.cy);
            const r = parseNativeSvgNumber(node.props.r);
            if (cx === undefined || cy === undefined || r === undefined) {
                return undefined;
            }

            return { kind: 'circle', cx, cy, r, fill, stroke, strokeWidth };
        }
        case 'ellipse': {
            const cx = parseNativeSvgNumber(node.props.cx);
            const cy = parseNativeSvgNumber(node.props.cy);
            const rx = parseNativeSvgNumber(node.props.rx);
            const ry = parseNativeSvgNumber(node.props.ry);
            if (cx === undefined || cy === undefined || rx === undefined || ry === undefined) {
                return undefined;
            }

            return { kind: 'ellipse', cx, cy, rx, ry, fill, stroke, strokeWidth };
        }
        case 'rect': {
            const x = parseNativeSvgNumber(node.props.x) ?? 0;
            const y = parseNativeSvgNumber(node.props.y) ?? 0;
            const width = parseNativeSvgNumber(node.props.width);
            const height = parseNativeSvgNumber(node.props.height);
            if (width === undefined || height === undefined) {
                return undefined;
            }

            return {
                kind: 'rect',
                x,
                y,
                width,
                height,
                rx: parseNativeSvgNumber(node.props.rx),
                ry: parseNativeSvgNumber(node.props.ry),
                fill,
                stroke,
                strokeWidth,
            };
        }
        case 'line': {
            const x1 = parseNativeSvgNumber(node.props.x1) ?? 0;
            const y1 = parseNativeSvgNumber(node.props.y1) ?? 0;
            const x2 = parseNativeSvgNumber(node.props.x2) ?? 0;
            const y2 = parseNativeSvgNumber(node.props.y2) ?? 0;
            return {
                kind: 'path',
                commands: [
                    { kind: 'moveTo', x: x1, y: y1 },
                    { kind: 'lineTo', x: x2, y: y2 },
                ],
                fill,
                stroke,
                strokeWidth,
            };
        }
        case 'polyline': {
            const points = parseNativeSvgPointList(node.props.points);
            const commands = points ? buildNativeVectorPathFromPoints(points, false) : undefined;
            if (!commands) {
                return undefined;
            }

            return { kind: 'path', commands, fill, stroke, strokeWidth };
        }
        case 'polygon': {
            const points = parseNativeSvgPointList(node.props.points);
            const commands = points ? buildNativeVectorPathFromPoints(points, true) : undefined;
            if (!commands) {
                return undefined;
            }

            return { kind: 'path', commands, fill, stroke, strokeWidth };
        }
        case 'path': {
            const data = typeof node.props.d === 'string' ? node.props.d.trim() : undefined;
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

export function collectNativeVectorShapes(nodes: NativeNode[]): NativeVectorShape[] | undefined {
    const shapes: NativeVectorShape[] = [];

    const visit = (items: NativeNode[]): boolean => {
        for (const item of items) {
            if (item.kind !== 'element' || item.component !== 'Vector') {
                return false;
            }

            if (item.sourceTag === 'g') {
                if (!visit(item.children)) {
                    return false;
                }
                continue;
            }

            const shape = parseNativeVectorShape(item);
            if (!shape) {
                return false;
            }
            shapes.push(shape);
        }

        return true;
    };

    return visit(nodes) && shapes.length > 0 ? shapes : undefined;
}

export function parseNativeVectorViewBox(value: NativePropValue | undefined): NativeVectorViewport | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const parts = value.trim().split(/[\s,]+/).map((part) => Number(part));
    if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
        return undefined;
    }

    const [minX, minY, width, height] = parts;
    if (width <= 0 || height <= 0) {
        return undefined;
    }

    return { minX, minY, width, height };
}

export function buildNativeVectorSpec(node: NativeElementNode): NativeVectorSpec | undefined {
    if (node.sourceTag !== 'svg') {
        return undefined;
    }

    const shapes = collectNativeVectorShapes(node.children);
    if (!shapes) {
        return undefined;
    }

    const viewBox = parseNativeVectorViewBox(node.props.viewBox);
    const intrinsicWidth = parseNativeSvgNumber(node.props.width) ?? viewBox?.width ?? 24;
    const intrinsicHeight = parseNativeSvgNumber(node.props.height) ?? viewBox?.height ?? 24;
    const viewport = viewBox ?? { minX: 0, minY: 0, width: intrinsicWidth, height: intrinsicHeight };

    return {
        viewport,
        shapes,
        intrinsicWidth: intrinsicWidth > 0 ? intrinsicWidth : viewport.width,
        intrinsicHeight: intrinsicHeight > 0 ? intrinsicHeight : viewport.height,
    };
}