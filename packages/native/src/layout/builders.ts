import { type NativeStyleResolveOptions } from '../../client/style';
import type { NativePropValue } from '../types';
import { getNativeStyleResolveOptions, toPointLiteral } from '../units';
import { buildComposeArrangement, buildComposeCrossAlignment, resolveSwiftColumnAlignment } from './alignment';
import { hasNativeTableLayoutSourceTag } from './scope';

export function resolveLayoutDirection(style: Record<string, NativePropValue> | undefined): 'Row' | 'Column' | undefined {
    if (!style) return undefined;

    if (typeof style.flexDirection === 'string') {
        return style.flexDirection.trim().toLowerCase() === 'row' ? 'Row' : 'Column';
    }

    if (typeof style.display === 'string') {
        const display = style.display.trim().toLowerCase();
        if (display === 'flex' || display === 'inline-flex') {
            return 'Row';
        }
        if (display === 'grid' || display === 'inline-grid') {
            return 'Column';
        }
    }

    return undefined;
}

export function resolveComposeLayoutFromStyle(
    component: string,
    style: Record<string, NativePropValue> | undefined,
): 'Row' | 'Column' {
    const styleLayout = resolveLayoutDirection(style);
    if (styleLayout) {
        return styleLayout;
    }

    return component === 'Row' || component === 'ListItem' ? 'Row' : 'Column';
}

export function resolveSwiftUILayoutFromStyle(
    component: string,
    style: Record<string, NativePropValue> | undefined,
): 'HStack' | 'VStack' {
    return resolveComposeLayoutFromStyle(component, style) === 'Row' ? 'HStack' : 'VStack';
}

export function buildComposeLayoutArgumentsFromStyle(
    layout: 'Row' | 'Column',
    modifier: string,
    style: Record<string, NativePropValue> | undefined,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): string {
    const args = [`modifier = ${modifier}`];
    const arrangement = buildComposeArrangement(layout, style, styleResolveOptions);
    const alignment = buildComposeCrossAlignment(layout, style);

    if (layout === 'Row') {
        if (arrangement) args.push(`horizontalArrangement = ${arrangement}`);
        if (alignment) args.push(`verticalAlignment = ${alignment}`);
    } else {
        if (arrangement) args.push(`verticalArrangement = ${arrangement}`);
        if (alignment) args.push(`horizontalAlignment = ${alignment}`);
    }

    return args.join(', ');
}

export function buildSwiftUILayoutFromStyle(
    layout: 'HStack' | 'VStack',
    sourceTag: string,
    style: Record<string, NativePropValue> | undefined,
    rowAlignment: string,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): string {
    const spacing = toPointLiteral(style?.gap ?? (layout === 'HStack' ? style?.columnGap : style?.rowGap) ?? style?.gap, styleResolveOptions)
        ?? (hasNativeTableLayoutSourceTag(sourceTag) ? '0' : '12');

    if (layout === 'HStack') {
        return `HStack(alignment: ${rowAlignment}, spacing: ${spacing})`;
    }

    return `VStack(alignment: ${resolveSwiftColumnAlignment(style)}, spacing: ${spacing})`;
}