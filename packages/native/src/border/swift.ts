import type {
    NativeBorderSideValue,
    NativeBorderStyleKeyword,
    NativeBorderValue,
} from '../types';
import { toSwiftColorLiteral } from '../color';
import { formatFloat } from '../units';
import { hasNativeSideBorders, parseNativeBorderNumericWidth } from './shared';

function buildSwiftBorderDashPattern(style: NativeBorderStyleKeyword | undefined, widthValue: number): string | undefined {
    if (style === 'dotted') {
        return `[${formatFloat(widthValue)}, ${formatFloat(widthValue * 1.5)}]`;
    }

    if (style === 'dashed') {
        return `[${formatFloat(widthValue * 3)}, ${formatFloat(widthValue * 2)}]`;
    }

    return undefined;
}

function buildSwiftBorderLineCap(style: NativeBorderStyleKeyword | undefined): string {
    return style === 'dotted' ? '.round' : '.square';
}

function buildSwiftBorderJoinInset(side: NativeBorderSideValue | undefined, widthValue: number): string {
    return side ? `CGFloat(${side.width}) / 2` : `CGFloat(${formatFloat(widthValue)}) / 2`;
}

export function buildSwiftSideBorderOverlay(border: NativeBorderValue, radius?: string): string | undefined {
    if (!hasNativeSideBorders(border)) {
        return undefined;
    }

    const sideEntries = [
        ['top', border.top],
        ['right', border.right],
        ['bottom', border.bottom],
        ['left', border.left],
    ].filter((entry): entry is ['top' | 'right' | 'bottom' | 'left', NativeBorderSideValue] => Boolean(entry[1]));

    const hasStyledSides = sideEntries.some(([, side]) => side.style === 'dashed' || side.style === 'dotted');
    if (hasStyledSides) {
        const overlays = sideEntries.map(([sideName, side]) => {
            const widthValue = parseNativeBorderNumericWidth(side.width);
            const dashPattern = buildSwiftBorderDashPattern(side.style, widthValue);
            const lineCap = buildSwiftBorderLineCap(side.style);
            const strokeStyle = dashPattern
                ? `StrokeStyle(lineWidth: ${side.width}, lineCap: ${lineCap}, dash: ${dashPattern})`
                : `StrokeStyle(lineWidth: ${side.width}, lineCap: ${lineCap})`;

            switch (sideName) {
                case 'top':
                    return `Path { path in path.move(to: CGPoint(x: ${buildSwiftBorderJoinInset(border.left, widthValue)}, y: CGFloat(${side.width}) / 2)); path.addLine(to: CGPoint(x: proxy.size.width - (${buildSwiftBorderJoinInset(border.right, widthValue)}), y: CGFloat(${side.width}) / 2)) }.stroke(${toSwiftColorLiteral(side.color)}, style: ${strokeStyle})`;
                case 'right':
                    return `Path { path in path.move(to: CGPoint(x: proxy.size.width - (CGFloat(${side.width}) / 2), y: ${buildSwiftBorderJoinInset(border.top, widthValue)})); path.addLine(to: CGPoint(x: proxy.size.width - (CGFloat(${side.width}) / 2), y: proxy.size.height - (${buildSwiftBorderJoinInset(border.bottom, widthValue)}))) }.stroke(${toSwiftColorLiteral(side.color)}, style: ${strokeStyle})`;
                case 'bottom':
                    return `Path { path in path.move(to: CGPoint(x: ${buildSwiftBorderJoinInset(border.left, widthValue)}, y: proxy.size.height - (CGFloat(${side.width}) / 2))); path.addLine(to: CGPoint(x: proxy.size.width - (${buildSwiftBorderJoinInset(border.right, widthValue)}), y: proxy.size.height - (CGFloat(${side.width}) / 2))) }.stroke(${toSwiftColorLiteral(side.color)}, style: ${strokeStyle})`;
                case 'left':
                default:
                    return `Path { path in path.move(to: CGPoint(x: CGFloat(${side.width}) / 2, y: ${buildSwiftBorderJoinInset(border.top, widthValue)})); path.addLine(to: CGPoint(x: CGFloat(${side.width}) / 2, y: proxy.size.height - (${buildSwiftBorderJoinInset(border.bottom, widthValue)}))) }.stroke(${toSwiftColorLiteral(side.color)}, style: ${strokeStyle})`;
            }
        });

        const clipModifier = radius ? `.clipShape(RoundedRectangle(cornerRadius: ${radius}))` : '';
        return `.overlay { GeometryReader { proxy in ZStack { ${overlays.join('; ')} } }${clipModifier} }`;
    }

    const overlays: string[] = [];
    if (border.top) {
        overlays.push(`Rectangle().fill(${toSwiftColorLiteral(border.top.color)}).frame(height: ${border.top.width}).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)`);
    }
    if (border.right) {
        overlays.push(`Rectangle().fill(${toSwiftColorLiteral(border.right.color)}).frame(width: ${border.right.width}).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .trailing)`);
    }
    if (border.bottom) {
        overlays.push(`Rectangle().fill(${toSwiftColorLiteral(border.bottom.color)}).frame(height: ${border.bottom.width}).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)`);
    }
    if (border.left) {
        overlays.push(`Rectangle().fill(${toSwiftColorLiteral(border.left.color)}).frame(width: ${border.left.width}).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)`);
    }

    if (overlays.length === 0) {
        return undefined;
    }

    const clipModifier = radius ? `.clipShape(RoundedRectangle(cornerRadius: ${radius}))` : '';
    return `.overlay { ZStack { ${overlays.join('; ')} }${clipModifier} }`;
}

export function buildSwiftUniformStyledBorderModifier(border: NativeBorderValue, radius?: string): string | undefined {
    if (!border.width || !border.color || (border.style !== 'dashed' && border.style !== 'dotted')) {
        return undefined;
    }

    const widthValue = parseNativeBorderNumericWidth(border.width);
    const dashPattern = buildSwiftBorderDashPattern(border.style, widthValue);
    if (!dashPattern) {
        return undefined;
    }

    const shape = radius ? `RoundedRectangle(cornerRadius: ${radius})` : 'Rectangle()';
    return `.overlay(${shape}.stroke(${toSwiftColorLiteral(border.color)}, style: StrokeStyle(lineWidth: ${border.width}, dash: ${dashPattern})))`;
}