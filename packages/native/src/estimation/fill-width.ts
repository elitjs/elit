import { type NativeStyleResolveOptions } from '../../client/style';
import type { NativeNode, NativePropValue } from '../types';
import { parseBoxShadowList, resolveBackdropBlurRadius, resolveStyleCurrentColor } from '../color';
import { getNativeStyleResolveOptions, toDpLiteral, toScaledUnitNumber } from '../units';
import { resolveNativeBackgroundLayersFromStyle } from '../background';
import { resolveNativeBorder } from '../border';

const INLINE_DISPLAY_VALUES = new Set(['inline', 'inline-block', 'inline-flex', 'inline-grid']);
const DEFAULT_BLOCK_FILL_SOURCE_TAGS = new Set([
    'html',
    'body',
    'main',
    'header',
    'footer',
    'nav',
    'section',
    'article',
    'aside',
    'div',
    'form',
    'fieldset',
    'figure',
    'details',
    'dialog',
    'menu',
    'ul',
    'ol',
    'li',
    'table',
    'tbody',
    'thead',
    'tfoot',
    'tr',
]);
const FILL_WIDTH_EXCLUDED_COMPONENTS = new Set(['Text', 'Button', 'Link', 'Toggle', 'TextInput', 'Image', 'Media', 'WebView', 'Canvas', 'Vector', 'Math']);

export function shouldFillChunkedCellChild(node: NativeNode): boolean {
    if (node.kind !== 'element') {
        return false;
    }

    return !FILL_WIDTH_EXCLUDED_COMPONENTS.has(node.component);
}

function hasNativeContainerSpacing(
    style: Record<string, NativePropValue>,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): boolean {
    return [
        style.padding,
        style.paddingHorizontal,
        style.paddingVertical,
        style.paddingTop,
        style.paddingRight,
        style.paddingBottom,
        style.paddingLeft,
        style.paddingStart,
        style.paddingEnd,
        style.gap,
        style.rowGap,
        style.columnGap,
    ].some((value) => toScaledUnitNumber(value, styleResolveOptions) !== undefined);
}

function hasNativeContainerDecoration(
    style: Record<string, NativePropValue>,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): boolean {
    return resolveNativeBackgroundLayersFromStyle(style, styleResolveOptions).length > 0
        || resolveBackdropBlurRadius(style, styleResolveOptions) !== undefined
        || resolveNativeBorder(style, (value) => toDpLiteral(value, styleResolveOptions)) !== undefined
        || parseBoxShadowList(style.boxShadow, resolveStyleCurrentColor(style)).length > 0;
}

export function shouldDefaultFillWidthHint(
    node: NativeNode,
    style: Record<string, NativePropValue> | undefined,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): boolean {
    if (node.kind !== 'element' || !shouldFillChunkedCellChild(node)) {
        return false;
    }

    const display = typeof style?.display === 'string'
        ? style.display.trim().toLowerCase()
        : undefined;

    if (display && INLINE_DISPLAY_VALUES.has(display)) {
        return false;
    }

    if (display === 'flex' || display === 'grid' || typeof style?.flexDirection === 'string') {
        return true;
    }

    if (style && (hasNativeContainerSpacing(style, styleResolveOptions) || hasNativeContainerDecoration(style, styleResolveOptions))) {
        return true;
    }

    return DEFAULT_BLOCK_FILL_SOURCE_TAGS.has(node.sourceTag);
}