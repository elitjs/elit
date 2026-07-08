import type {
    NativeBorderStyleKeyword,
    NativeBorderValue,
    NativeColorValue,
    NativePropValue,
} from '../types';
import { parseCssColor, resolveStyleCurrentColor } from '../color';

type ParsedBorderValue = {
    width?: string;
    color?: NativeColorValue;
    style?: NativeBorderStyleKeyword;
};

const SIDE_KEYS = [
    { shorthand: 'borderTop', width: 'borderTopWidth', color: 'borderTopColor', style: 'borderTopStyle' },
    { shorthand: 'borderRight', width: 'borderRightWidth', color: 'borderRightColor', style: 'borderRightStyle' },
    { shorthand: 'borderBottom', width: 'borderBottomWidth', color: 'borderBottomColor', style: 'borderBottomStyle' },
    { shorthand: 'borderLeft', width: 'borderLeftWidth', color: 'borderLeftColor', style: 'borderLeftStyle' },
] as const;

function parseBorderValue(
    value: NativePropValue | undefined,
    unitParser: (value: NativePropValue | undefined) => string | undefined,
    currentColor: NativeColorValue,
): ParsedBorderValue | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const widthMatch = value.match(/-?\d+(?:\.\d+)?(?:px|dp|pt)?/i);
    const width = widthMatch ? unitParser(widthMatch[0]) : undefined;
    const color = parseCssColor(value, currentColor);
    const style = parseBorderStyleKeyword(value);

    if (!width && !color && !style) {
        return undefined;
    }

    return { width, color, style };
}

function parseBorderStyleKeyword(value: NativePropValue | undefined): NativeBorderStyleKeyword | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const normalized = value.trim().toLowerCase();
    if (!normalized) {
        return undefined;
    }

    if (/(^|\s)(none|hidden)(\s|$)/.test(normalized)) {
        return 'none';
    }

    if (/(^|\s)solid(\s|$)/.test(normalized)) {
        return 'solid';
    }

    if (/(^|\s)dashed(\s|$)/.test(normalized)) {
        return 'dashed';
    }

    if (/(^|\s)dotted(\s|$)/.test(normalized)) {
        return 'dotted';
    }

    if (/(^|\s)(double|groove|ridge|inset|outset)(\s|$)/.test(normalized)) {
        return 'unsupported';
    }

    return undefined;
}

function areNativeColorsEqual(left: NativeColorValue | undefined, right: NativeColorValue | undefined): boolean {
    if (!left || !right) {
        return left === right;
    }

    return left.red === right.red
        && left.green === right.green
        && left.blue === right.blue
        && Math.abs(left.alpha - right.alpha) < 0.0001;
}

function isRenderableBorder(
    width: string | undefined,
    color: NativeColorValue | undefined,
    borderStyle: NativeBorderStyleKeyword | undefined,
): boolean {
    return Boolean(width && color && borderStyle !== 'none' && borderStyle !== 'unsupported');
}

export function resolveNativeBorder(
    style: Record<string, NativePropValue>,
    unitParser: (value: NativePropValue | undefined) => string | undefined,
): NativeBorderValue | undefined {
    const currentColor = resolveStyleCurrentColor(style);
    const shorthandBorder = parseBorderValue(style.border, unitParser, currentColor);
    const globalWidth = unitParser(style.borderWidth) ?? shorthandBorder?.width;
    const globalColor = parseCssColor(style.borderColor, currentColor) ?? shorthandBorder?.color;
    const globalStyle = parseBorderStyleKeyword(style.borderStyle) ?? shorthandBorder?.style;
    const hasSideSpecificBorder = SIDE_KEYS.some((keys) => style[keys.shorthand] !== undefined || style[keys.width] !== undefined || style[keys.color] !== undefined || style[keys.style] !== undefined);

    if (!hasSideSpecificBorder) {
        return isRenderableBorder(globalWidth, globalColor, globalStyle)
            ? { width: globalWidth, color: globalColor, style: globalStyle }
            : undefined;
    }

    const resolvedSides = SIDE_KEYS.map((keys) => {
        const sideBorder = parseBorderValue(style[keys.shorthand], unitParser, currentColor);
        return {
            width: unitParser(style[keys.width]) ?? sideBorder?.width ?? globalWidth,
            color: parseCssColor(style[keys.color], currentColor) ?? sideBorder?.color ?? globalColor,
            style: parseBorderStyleKeyword(style[keys.style]) ?? sideBorder?.style ?? globalStyle,
        };
    });

    const [firstSide] = resolvedSides;
    if (
        firstSide
        && isRenderableBorder(firstSide.width, firstSide.color, firstSide.style)
        && resolvedSides.every((side) => side.width === firstSide.width && areNativeColorsEqual(side.color, firstSide.color) && side.style === firstSide.style)
    ) {
        return {
            width: firstSide.width,
            color: firstSide.color,
            style: firstSide.style,
        };
    }

    const renderedBorder: NativeBorderValue = {};
    const sideNames = ['top', 'right', 'bottom', 'left'] as const;

    resolvedSides.forEach((side, index) => {
        if (isRenderableBorder(side.width, side.color, side.style)) {
            renderedBorder[sideNames[index]] = {
                width: side.width!,
                color: side.color!,
                style: side.style,
            };
        }
    });

    return renderedBorder.top || renderedBorder.right || renderedBorder.bottom || renderedBorder.left
        ? renderedBorder
        : undefined;
}