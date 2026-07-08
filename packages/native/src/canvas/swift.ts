import type { NativeIntrinsicSizeSpec, NativeVectorSpec } from '../types';
import { toSwiftColorLiteral } from '../color';
import { formatFloat } from '../units';
import { indent } from './shared';

function buildSwiftIntrinsicSurfaceModifiers(
    baseModifiers: string[],
    spec: NativeIntrinsicSizeSpec,
    widthDefined: boolean,
    heightDefined: boolean,
): string[] {
    const modifiers = [...baseModifiers];
    const frameArgs: string[] = [];
    if (!widthDefined) {
        frameArgs.push(`width: ${formatFloat(spec.intrinsicWidth)}`);
    }
    if (!heightDefined) {
        frameArgs.push(`height: ${formatFloat(spec.intrinsicHeight)}`);
    }
    if (frameArgs.length > 0) {
        modifiers.push(`.frame(${frameArgs.join(', ')})`);
    }
    return modifiers;
}

function buildSwiftDrawingCanvasLines(
    spec: NativeVectorSpec,
    level: number,
): string[] {
    const viewport = spec.viewport;
    const lines = [`${indent(level)}Canvas { context, size in`];
    lines.push(`${indent(level + 1)}let viewportWidth = CGFloat(${formatFloat(viewport.width)})`);
    lines.push(`${indent(level + 1)}let viewportHeight = CGFloat(${formatFloat(viewport.height)})`);
    lines.push(`${indent(level + 1)}let scaleX = size.width / viewportWidth`);
    lines.push(`${indent(level + 1)}let scaleY = size.height / viewportHeight`);
    lines.push(`${indent(level + 1)}let strokeScale = (scaleX + scaleY) / 2`);

    let pathIndex = 0;
    for (const shape of spec.shapes) {
        const pathName = `vectorPath${pathIndex++}`;
        lines.push(`${indent(level + 1)}var ${pathName} = Path()`);

        if (shape.kind === 'circle') {
            lines.push(`${indent(level + 1)}${pathName}.addEllipse(in: CGRect(x: CGFloat(${formatFloat(shape.cx - shape.r - viewport.minX)}) * scaleX, y: CGFloat(${formatFloat(shape.cy - shape.r - viewport.minY)}) * scaleY, width: CGFloat(${formatFloat(shape.r * 2)}) * scaleX, height: CGFloat(${formatFloat(shape.r * 2)}) * scaleY))`);
        } else if (shape.kind === 'ellipse') {
            lines.push(`${indent(level + 1)}${pathName}.addEllipse(in: CGRect(x: CGFloat(${formatFloat(shape.cx - shape.rx - viewport.minX)}) * scaleX, y: CGFloat(${formatFloat(shape.cy - shape.ry - viewport.minY)}) * scaleY, width: CGFloat(${formatFloat(shape.rx * 2)}) * scaleX, height: CGFloat(${formatFloat(shape.ry * 2)}) * scaleY))`);
        } else if (shape.kind === 'rect') {
            if ((shape.rx ?? 0) > 0 || (shape.ry ?? shape.rx ?? 0) > 0) {
                lines.push(`${indent(level + 1)}${pathName}.addRoundedRect(in: CGRect(x: CGFloat(${formatFloat(shape.x - viewport.minX)}) * scaleX, y: CGFloat(${formatFloat(shape.y - viewport.minY)}) * scaleY, width: CGFloat(${formatFloat(shape.width)}) * scaleX, height: CGFloat(${formatFloat(shape.height)}) * scaleY), cornerSize: CGSize(width: CGFloat(${formatFloat(shape.rx ?? 0)}) * scaleX, height: CGFloat(${formatFloat(shape.ry ?? shape.rx ?? 0)}) * scaleY))`);
            } else {
                lines.push(`${indent(level + 1)}${pathName}.addRect(CGRect(x: CGFloat(${formatFloat(shape.x - viewport.minX)}) * scaleX, y: CGFloat(${formatFloat(shape.y - viewport.minY)}) * scaleY, width: CGFloat(${formatFloat(shape.width)}) * scaleX, height: CGFloat(${formatFloat(shape.height)}) * scaleY))`);
            }
        } else {
            for (const command of shape.commands) {
                if (command.kind === 'close') {
                    lines.push(`${indent(level + 1)}${pathName}.closeSubpath()`);
                    continue;
                }

                if (command.kind === 'cubicTo') {
                    lines.push(`${indent(level + 1)}${pathName}.addCurve(to: CGPoint(x: CGFloat(${formatFloat(command.x - viewport.minX)}) * scaleX, y: CGFloat(${formatFloat(command.y - viewport.minY)}) * scaleY), control1: CGPoint(x: CGFloat(${formatFloat(command.control1X - viewport.minX)}) * scaleX, y: CGFloat(${formatFloat(command.control1Y - viewport.minY)}) * scaleY), control2: CGPoint(x: CGFloat(${formatFloat(command.control2X - viewport.minX)}) * scaleX, y: CGFloat(${formatFloat(command.control2Y - viewport.minY)}) * scaleY))`);
                    continue;
                }

                lines.push(`${indent(level + 1)}${pathName}.${command.kind === 'moveTo' ? 'move' : 'addLine'}(to: CGPoint(x: CGFloat(${formatFloat(command.x - viewport.minX)}) * scaleX, y: CGFloat(${formatFloat(command.y - viewport.minY)}) * scaleY))`);
            }
        }

        if (shape.fill) {
            lines.push(`${indent(level + 1)}context.fill(${pathName}, with: .color(${toSwiftColorLiteral(shape.fill)}))`);
        }
        if (shape.stroke) {
            lines.push(`${indent(level + 1)}context.stroke(${pathName}, with: .color(${toSwiftColorLiteral(shape.stroke)}), style: StrokeStyle(lineWidth: CGFloat(${formatFloat(shape.strokeWidth ?? 1)}) * strokeScale))`);
        }
    }

    lines.push(`${indent(level)}}`);
    return lines;
}

export function buildSwiftCanvasSurfaceLines(
    spec: NativeIntrinsicSizeSpec,
    drawingSpec: NativeVectorSpec | undefined,
    level: number,
    baseModifiers: string[],
    widthDefined: boolean,
    heightDefined: boolean,
): { lines: string[]; modifiers: string[] } {
    return {
        lines: drawingSpec
            ? buildSwiftDrawingCanvasLines(drawingSpec, level)
            : [
                `${indent(level)}Canvas { _, _ in`,
                `${indent(level)}}`,
            ],
        modifiers: buildSwiftIntrinsicSurfaceModifiers(baseModifiers, spec, widthDefined, heightDefined),
    };
}

export function buildSwiftVectorCanvasLines(
    spec: NativeVectorSpec,
    level: number,
    baseModifiers: string[],
    widthDefined: boolean,
    heightDefined: boolean,
): { lines: string[]; modifiers: string[] } {
    return {
        lines: buildSwiftDrawingCanvasLines(spec, level),
        modifiers: buildSwiftIntrinsicSurfaceModifiers(baseModifiers, spec, widthDefined, heightDefined),
    };
}