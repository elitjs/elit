import { type NativeStyleResolveOptions } from '../../client/style';
import type { NativeNode, NativePropValue } from '../types';
import { isFillValue } from '../color';
import { parseCssUnitValue, resolveAxisUnitNumber, toScaledUnitNumber } from '../units';
import { flattenTextContent } from '../strings';
import { estimateHorizontalPadding, estimateVerticalPadding } from '../spacing';

export function estimateNodePreferredWidth(
    node: NativeNode,
    style: Record<string, NativePropValue> | undefined,
    styleResolveOptions: NativeStyleResolveOptions,
): number {
    if (node.kind === 'text') {
        return Math.max(48, node.value.trim().length * 8);
    }

    if (style?.width && isFillValue(style.width)) {
        return styleResolveOptions.viewportWidth ?? 390;
    }

    const explicitWidth = resolveAxisUnitNumber(style?.width ?? style?.minWidth, 'horizontal', undefined, styleResolveOptions);
    if (explicitWidth !== undefined && explicitWidth > 0) {
        return explicitWidth;
    }

    const fontSize = toScaledUnitNumber(style?.fontSize, styleResolveOptions) ?? 16;
    const text = flattenTextContent(node.children)
        || (typeof node.props.placeholder === 'string' ? node.props.placeholder : '');
    let baseWidth = text
        ? Math.max(56, text.length * fontSize * (node.component === 'Button' || node.component === 'Link' ? 0.58 : 0.52))
        : 0;

    switch (node.component) {
        case 'Button':
        case 'Link':
            baseWidth = Math.max(baseWidth, 120);
            break;
        case 'TextInput':
            baseWidth = Math.max(baseWidth, 220);
            break;
        case 'Toggle':
            baseWidth = Math.max(baseWidth, 56);
            break;
        default:
            baseWidth = Math.max(baseWidth, 160);
            break;
    }

    return baseWidth + estimateHorizontalPadding(style, styleResolveOptions);
}

export function estimateNodePreferredHeight(
    node: NativeNode,
    style: Record<string, NativePropValue> | undefined,
    styleResolveOptions: NativeStyleResolveOptions,
): number | undefined {
    if (node.kind === 'text') {
        return undefined;
    }

    if (style?.height && isFillValue(style.height)) {
        return undefined;
    }

    const explicitHeight = resolveAxisUnitNumber(style?.height ?? style?.minHeight, 'vertical', undefined, styleResolveOptions);
    if (explicitHeight !== undefined && explicitHeight > 0) {
        return explicitHeight;
    }

    const fontSize = toScaledUnitNumber(style?.fontSize, styleResolveOptions) ?? 16;
    const lineHeightValue = parseCssUnitValue(style?.lineHeight);
    const lineHeight = lineHeightValue?.unit === '' && lineHeightValue.value > 0 && lineHeightValue.value <= 4
        ? fontSize * lineHeightValue.value
        : toScaledUnitNumber(style?.lineHeight, styleResolveOptions) ?? (fontSize * 1.2);
    const text = flattenTextContent(node.children)
        || (typeof node.props.placeholder === 'string' ? node.props.placeholder : '');
    const lineCount = text ? text.split(/\r?\n/).length : 0;
    let baseHeight = lineCount > 0 ? lineHeight * lineCount : 0;

    switch (node.component) {
        case 'Button':
        case 'Link':
            baseHeight = Math.max(baseHeight, 40);
            break;
        case 'TextInput':
            baseHeight = Math.max(baseHeight, 44);
            break;
        case 'Toggle':
            baseHeight = Math.max(baseHeight, 32);
            break;
        default:
            baseHeight = Math.max(baseHeight, 24);
            break;
    }

    return baseHeight + estimateVerticalPadding(style, styleResolveOptions);
}