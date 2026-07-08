import { type NativeStyleResolveOptions } from '../../client/style';
import type { NativePropValue } from '../types';
import { parseCssColor, toComposeColorLiteral } from '../color';
import { quoteKotlinString } from '../strings';
import { applyComposeTextTransformExpression } from '../state';
import { formatFloat, getNativeStyleResolveOptions, toScaledUnitNumber } from '../units';
import { resolveComposeFontFamily } from './font-family';
import { resolveComposeLineHeight } from './line-height';
import { resolveComposeTextAlign } from './text-align';
import { resolveComposeTextDecoration } from './text-decoration';
import { applyTextTransform, resolveTextTransform } from './text-transform';
import { resolveComposeFontWeight } from './font-weight';

export function buildComposeTextStyleArgsFromStyle(
    style: Record<string, NativePropValue> | undefined,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): string[] {
    if (!style) {
        return [];
    }

    const args: string[] = [];
    const color = parseCssColor(style.color);
    const fontSize = toScaledUnitNumber(style.fontSize, styleResolveOptions);
    const fontWeight = resolveComposeFontWeight(style.fontWeight);
    const fontFamily = resolveComposeFontFamily(style.fontFamily);
    const letterSpacing = toScaledUnitNumber(style.letterSpacing, styleResolveOptions);
    const lineHeight = resolveComposeLineHeight(style.lineHeight, style.fontSize, styleResolveOptions);
    const textAlign = resolveComposeTextAlign(style.textAlign);
    const textDecoration = resolveComposeTextDecoration(style.textDecoration);

    if (color) args.push(`color = ${toComposeColorLiteral(color)}`);
    if (fontSize !== undefined) args.push(`fontSize = ${formatFloat(fontSize)}.sp`);
    if (fontWeight) args.push(`fontWeight = ${fontWeight}`);
    if (fontFamily) args.push(`fontFamily = ${fontFamily}`);
    if (letterSpacing !== undefined) args.push(`letterSpacing = ${formatFloat(letterSpacing)}.sp`);
    if (lineHeight) args.push(`lineHeight = ${lineHeight}`);
    if (textAlign) args.push(`textAlign = ${textAlign}`);
    if (textDecoration) args.push(`textDecoration = ${textDecoration}`);

    return args;
}

export function buildComposeLabelTextFromStyle(
    label: string,
    style: Record<string, NativePropValue> | undefined,
    expression?: string,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): string {
    const transform = resolveTextTransform(style?.textTransform);
    const textValue = expression
        ? applyComposeTextTransformExpression(expression, transform)
        : quoteKotlinString(applyTextTransform(label, transform));
    const args = [`text = ${textValue}`, ...buildComposeTextStyleArgsFromStyle(style, styleResolveOptions)];
    return `Text(${args.join(', ')})`;
}

export function buildComposeTextStyleLiteralFromStyle(
    style: Record<string, NativePropValue> | undefined,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): string | undefined {
    const args = buildComposeTextStyleArgsFromStyle(style, styleResolveOptions);
    return args.length > 0 ? `androidx.compose.ui.text.TextStyle(${args.join(', ')})` : undefined;
}