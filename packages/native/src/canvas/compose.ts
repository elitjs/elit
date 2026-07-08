import type { NativeIntrinsicSizeSpec, NativeVectorSpec } from '../types';
import { toComposeColorLiteral } from '../color';
import { formatFloat } from '../units';
import { prependComposeModifierCall } from './modifier';
import { indent } from './shared';

function buildComposeIntrinsicSurfaceModifier(
    modifier: string,
    spec: NativeIntrinsicSizeSpec,
    widthDefined: boolean,
    heightDefined: boolean,
): string {
    if (!widthDefined && !heightDefined) {
        return prependComposeModifierCall(modifier, `size(width = ${formatFloat(spec.intrinsicWidth)}.dp, height = ${formatFloat(spec.intrinsicHeight)}.dp)`);
    }

    let resolvedModifier = modifier;
    if (!widthDefined) {
        resolvedModifier = prependComposeModifierCall(resolvedModifier, `width(${formatFloat(spec.intrinsicWidth)}.dp)`);
    }
    if (!heightDefined) {
        resolvedModifier = prependComposeModifierCall(resolvedModifier, `height(${formatFloat(spec.intrinsicHeight)}.dp)`);
    }

    return resolvedModifier;
}

function buildComposeDrawingCanvasLines(
    spec: NativeVectorSpec,
    level: number,
    modifier: string,
): string[] {
    const viewport = spec.viewport;
    const lines = [`${indent(level)}androidx.compose.foundation.Canvas(modifier = ${modifier}) {`];
    lines.push(`${indent(level + 1)}val viewportWidth = ${formatFloat(viewport.width)}f`);
    lines.push(`${indent(level + 1)}val viewportHeight = ${formatFloat(viewport.height)}f`);
    lines.push(`${indent(level + 1)}val scaleX = size.width / viewportWidth`);
    lines.push(`${indent(level + 1)}val scaleY = size.height / viewportHeight`);
    lines.push(`${indent(level + 1)}val strokeScale = (scaleX + scaleY) / 2f`);

    let pathIndex = 0;
    for (const shape of spec.shapes) {
        if (shape.kind === 'circle') {
            const radiusExpression = `${formatFloat(shape.r)}f * kotlin.math.min(scaleX, scaleY)`;
            const centerExpression = `androidx.compose.ui.geometry.Offset(${formatFloat(shape.cx - viewport.minX)}f * scaleX, ${formatFloat(shape.cy - viewport.minY)}f * scaleY)`;
            if (shape.fill) {
                lines.push(`${indent(level + 1)}drawCircle(color = ${toComposeColorLiteral(shape.fill)}, radius = ${radiusExpression}, center = ${centerExpression})`);
            }
            if (shape.stroke) {
                lines.push(`${indent(level + 1)}drawCircle(color = ${toComposeColorLiteral(shape.stroke)}, radius = ${radiusExpression}, center = ${centerExpression}, style = androidx.compose.ui.graphics.drawscope.Stroke(width = ${(shape.strokeWidth ?? 1).toString()}f * strokeScale))`);
            }
            continue;
        }

        if (shape.kind === 'ellipse') {
            const topLeftExpression = `androidx.compose.ui.geometry.Offset(${formatFloat(shape.cx - shape.rx - viewport.minX)}f * scaleX, ${formatFloat(shape.cy - shape.ry - viewport.minY)}f * scaleY)`;
            const sizeExpression = `androidx.compose.ui.geometry.Size(${formatFloat(shape.rx * 2)}f * scaleX, ${formatFloat(shape.ry * 2)}f * scaleY)`;
            if (shape.fill) {
                lines.push(`${indent(level + 1)}drawOval(color = ${toComposeColorLiteral(shape.fill)}, topLeft = ${topLeftExpression}, size = ${sizeExpression})`);
            }
            if (shape.stroke) {
                lines.push(`${indent(level + 1)}drawOval(color = ${toComposeColorLiteral(shape.stroke)}, topLeft = ${topLeftExpression}, size = ${sizeExpression}, style = androidx.compose.ui.graphics.drawscope.Stroke(width = ${(shape.strokeWidth ?? 1).toString()}f * strokeScale))`);
            }
            continue;
        }

        if (shape.kind === 'rect') {
            const topLeftExpression = `androidx.compose.ui.geometry.Offset(${formatFloat(shape.x - viewport.minX)}f * scaleX, ${formatFloat(shape.y - viewport.minY)}f * scaleY)`;
            const sizeExpression = `androidx.compose.ui.geometry.Size(${formatFloat(shape.width)}f * scaleX, ${formatFloat(shape.height)}f * scaleY)`;
            const hasRadius = (shape.rx ?? 0) > 0 || (shape.ry ?? shape.rx ?? 0) > 0;
            const radiusExpression = `androidx.compose.ui.geometry.CornerRadius(${formatFloat(shape.rx ?? 0)}f * scaleX, ${formatFloat(shape.ry ?? shape.rx ?? 0)}f * scaleY)`;
            if (shape.fill) {
                lines.push(`${indent(level + 1)}${hasRadius
                    ? `drawRoundRect(color = ${toComposeColorLiteral(shape.fill)}, topLeft = ${topLeftExpression}, size = ${sizeExpression}, cornerRadius = ${radiusExpression})`
                    : `drawRect(color = ${toComposeColorLiteral(shape.fill)}, topLeft = ${topLeftExpression}, size = ${sizeExpression})`}`);
            }
            if (shape.stroke) {
                lines.push(`${indent(level + 1)}${hasRadius
                    ? `drawRoundRect(color = ${toComposeColorLiteral(shape.stroke)}, topLeft = ${topLeftExpression}, size = ${sizeExpression}, cornerRadius = ${radiusExpression}, style = androidx.compose.ui.graphics.drawscope.Stroke(width = ${(shape.strokeWidth ?? 1).toString()}f * strokeScale))`
                    : `drawRect(color = ${toComposeColorLiteral(shape.stroke)}, topLeft = ${topLeftExpression}, size = ${sizeExpression}, style = androidx.compose.ui.graphics.drawscope.Stroke(width = ${(shape.strokeWidth ?? 1).toString()}f * strokeScale))`}`);
            }
            continue;
        }

        const pathName = `vectorPath${pathIndex++}`;
        lines.push(`${indent(level + 1)}val ${pathName} = androidx.compose.ui.graphics.Path().apply {`);
        for (const command of shape.commands) {
            if (command.kind === 'close') {
                lines.push(`${indent(level + 2)}close()`);
                continue;
            }

            if (command.kind === 'cubicTo') {
                lines.push(`${indent(level + 2)}cubicTo(${formatFloat(command.control1X - viewport.minX)}f * scaleX, ${formatFloat(command.control1Y - viewport.minY)}f * scaleY, ${formatFloat(command.control2X - viewport.minX)}f * scaleX, ${formatFloat(command.control2Y - viewport.minY)}f * scaleY, ${formatFloat(command.x - viewport.minX)}f * scaleX, ${formatFloat(command.y - viewport.minY)}f * scaleY)`);
                continue;
            }

            lines.push(`${indent(level + 2)}${command.kind}(${formatFloat(command.x - viewport.minX)}f * scaleX, ${formatFloat(command.y - viewport.minY)}f * scaleY)`);
        }
        lines.push(`${indent(level + 1)}}`);
        if (shape.fill) {
            lines.push(`${indent(level + 1)}drawPath(path = ${pathName}, color = ${toComposeColorLiteral(shape.fill)})`);
        }
        if (shape.stroke) {
            lines.push(`${indent(level + 1)}drawPath(path = ${pathName}, color = ${toComposeColorLiteral(shape.stroke)}, style = androidx.compose.ui.graphics.drawscope.Stroke(width = ${(shape.strokeWidth ?? 1).toString()}f * strokeScale))`);
        }
    }

    lines.push(`${indent(level)}}`);
    return lines;
}

export function buildComposeCanvasSurfaceLines(
    spec: NativeIntrinsicSizeSpec,
    drawingSpec: NativeVectorSpec | undefined,
    level: number,
    modifier: string,
    widthDefined: boolean,
    heightDefined: boolean,
): string[] {
    const canvasModifier = buildComposeIntrinsicSurfaceModifier(modifier, spec, widthDefined, heightDefined);
    return drawingSpec
        ? buildComposeDrawingCanvasLines(drawingSpec, level, canvasModifier)
        : [
            `${indent(level)}androidx.compose.foundation.Canvas(modifier = ${canvasModifier}) {`,
            `${indent(level)}}`,
        ];
}

export function buildComposeVectorCanvasLines(
    spec: NativeVectorSpec,
    level: number,
    modifier: string,
    widthDefined: boolean,
    heightDefined: boolean,
): string[] {
    const vectorModifier = buildComposeIntrinsicSurfaceModifier(modifier, spec, widthDefined, heightDefined);
    return buildComposeDrawingCanvasLines(spec, level, vectorModifier);
}