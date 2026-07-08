import type {
    NativeBorderSideValue,
    NativeBorderStyleKeyword,
    NativeBorderValue,
} from '../types';
import { toComposeColorLiteral } from '../color';
import { hasNativeSideBorders } from './shared';

function buildComposeBorderLineCap(style: NativeBorderStyleKeyword | undefined): string {
    return style === 'dotted'
        ? 'androidx.compose.ui.graphics.StrokeCap.Round'
        : 'androidx.compose.ui.graphics.StrokeCap.Square';
}

function buildComposeBorderJoinInset(side: NativeBorderSideValue | undefined, strokeVariable: string): string {
    return side ? `${side.width}.toPx() / 2f` : `${strokeVariable} / 2f`;
}

function buildComposeBorderDashPattern(style: NativeBorderStyleKeyword | undefined, strokeVariable: string): string | undefined {
    if (style === 'dotted') {
        return `floatArrayOf(${strokeVariable}, ${strokeVariable} * 1.5f)`;
    }

    if (style === 'dashed') {
        return `floatArrayOf(${strokeVariable} * 3f, ${strokeVariable} * 2f)`;
    }

    return undefined;
}

export function buildComposeSideBorderModifier(border: NativeBorderValue): string | undefined {
    if (!hasNativeSideBorders(border)) {
        return undefined;
    }

    const commands: string[] = [];
    if (border.top) {
        commands.push(`val topStroke = ${border.top.width}.toPx()`);
        const topStartX = buildComposeBorderJoinInset(border.left, 'topStroke');
        const topEndX = `size.width - (${buildComposeBorderJoinInset(border.right, 'topStroke')})`;
        const topCap = buildComposeBorderLineCap(border.top.style);
        const topDashPattern = buildComposeBorderDashPattern(border.top.style, 'topStroke');
        const topPathEffect = topDashPattern
            ? `, pathEffect = androidx.compose.ui.graphics.PathEffect.dashPathEffect(${topDashPattern})`
            : '';
        commands.push(`drawLine(color = ${toComposeColorLiteral(border.top.color)}, start = androidx.compose.ui.geometry.Offset(${topStartX}, topStroke / 2f), end = androidx.compose.ui.geometry.Offset(${topEndX}, topStroke / 2f), strokeWidth = topStroke, cap = ${topCap}${topPathEffect})`);
    }
    if (border.right) {
        commands.push(`val rightStroke = ${border.right.width}.toPx()`);
        const rightStartY = buildComposeBorderJoinInset(border.top, 'rightStroke');
        const rightEndY = `size.height - (${buildComposeBorderJoinInset(border.bottom, 'rightStroke')})`;
        const rightCap = buildComposeBorderLineCap(border.right.style);
        const rightDashPattern = buildComposeBorderDashPattern(border.right.style, 'rightStroke');
        const rightPathEffect = rightDashPattern
            ? `, pathEffect = androidx.compose.ui.graphics.PathEffect.dashPathEffect(${rightDashPattern})`
            : '';
        commands.push(`drawLine(color = ${toComposeColorLiteral(border.right.color)}, start = androidx.compose.ui.geometry.Offset(size.width - (rightStroke / 2f), ${rightStartY}), end = androidx.compose.ui.geometry.Offset(size.width - (rightStroke / 2f), ${rightEndY}), strokeWidth = rightStroke, cap = ${rightCap}${rightPathEffect})`);
    }
    if (border.bottom) {
        commands.push(`val bottomStroke = ${border.bottom.width}.toPx()`);
        const bottomStartX = buildComposeBorderJoinInset(border.left, 'bottomStroke');
        const bottomEndX = `size.width - (${buildComposeBorderJoinInset(border.right, 'bottomStroke')})`;
        const bottomCap = buildComposeBorderLineCap(border.bottom.style);
        const bottomDashPattern = buildComposeBorderDashPattern(border.bottom.style, 'bottomStroke');
        const bottomPathEffect = bottomDashPattern
            ? `, pathEffect = androidx.compose.ui.graphics.PathEffect.dashPathEffect(${bottomDashPattern})`
            : '';
        commands.push(`drawLine(color = ${toComposeColorLiteral(border.bottom.color)}, start = androidx.compose.ui.geometry.Offset(${bottomStartX}, size.height - (bottomStroke / 2f)), end = androidx.compose.ui.geometry.Offset(${bottomEndX}, size.height - (bottomStroke / 2f)), strokeWidth = bottomStroke, cap = ${bottomCap}${bottomPathEffect})`);
    }
    if (border.left) {
        commands.push(`val leftStroke = ${border.left.width}.toPx()`);
        const leftStartY = buildComposeBorderJoinInset(border.top, 'leftStroke');
        const leftEndY = `size.height - (${buildComposeBorderJoinInset(border.bottom, 'leftStroke')})`;
        const leftCap = buildComposeBorderLineCap(border.left.style);
        const leftDashPattern = buildComposeBorderDashPattern(border.left.style, 'leftStroke');
        const leftPathEffect = leftDashPattern
            ? `, pathEffect = androidx.compose.ui.graphics.PathEffect.dashPathEffect(${leftDashPattern})`
            : '';
        commands.push(`drawLine(color = ${toComposeColorLiteral(border.left.color)}, start = androidx.compose.ui.geometry.Offset(leftStroke / 2f, ${leftStartY}), end = androidx.compose.ui.geometry.Offset(leftStroke / 2f, ${leftEndY}), strokeWidth = leftStroke, cap = ${leftCap}${leftPathEffect})`);
    }

    return commands.length > 0 ? `drawBehind { ${commands.join('; ')} }` : undefined;
}

export function buildComposeUniformStyledBorderModifier(border: NativeBorderValue, radius?: string): string | undefined {
    if (!border.width || !border.color || (border.style !== 'dashed' && border.style !== 'dotted')) {
        return undefined;
    }

    const dashPattern = buildComposeBorderDashPattern(border.style, 'strokeWidth');
    if (!dashPattern) {
        return undefined;
    }

    if (radius) {
        return `drawBehind { val strokeWidth = ${border.width}.toPx(); val dashPattern = ${dashPattern}; val borderRadius = ${radius}.toPx(); drawRoundRect(color = ${toComposeColorLiteral(border.color)}, cornerRadius = androidx.compose.ui.geometry.CornerRadius(borderRadius, borderRadius), style = androidx.compose.ui.graphics.drawscope.Stroke(width = strokeWidth, pathEffect = androidx.compose.ui.graphics.PathEffect.dashPathEffect(dashPattern))) }`;
    }

    return `drawBehind { val strokeWidth = ${border.width}.toPx(); val dashPattern = ${dashPattern}; drawRect(color = ${toComposeColorLiteral(border.color)}, style = androidx.compose.ui.graphics.drawscope.Stroke(width = strokeWidth, pathEffect = androidx.compose.ui.graphics.PathEffect.dashPathEffect(dashPattern))) }`;
}