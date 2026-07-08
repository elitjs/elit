import { type NativeStyleResolveOptions } from '../../client/style';
import { isFillValue } from '../color';
import type { NativePropValue, NativeRenderHints, NativeStyleScope } from '../types';
import { getNativeStyleResolveOptions, resolveAxisUnitNumber } from '../units';

export function resolvePositionMode(value: NativePropValue | undefined): 'relative' | 'absolute' | 'fixed' | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const normalized = value.trim().toLowerCase();
    return normalized === 'relative' || normalized === 'absolute' || normalized === 'fixed'
        ? normalized
        : undefined;
}

export function hasExplicitNativeWidthStyle(style: Record<string, NativePropValue> | undefined): boolean {
    return Boolean(style && (style.width !== undefined || style.minWidth !== undefined || style.maxWidth !== undefined));
}

export function hasExplicitNativeHeightStyle(style: Record<string, NativePropValue> | undefined): boolean {
    return Boolean(style && (style.height !== undefined || style.minHeight !== undefined || style.maxHeight !== undefined));
}

export function hasNativeTableLayoutSourceTag(sourceTag: string | undefined): boolean {
    return sourceTag === 'table'
        || sourceTag === 'thead'
        || sourceTag === 'tbody'
        || sourceTag === 'tfoot'
        || sourceTag === 'tr'
        || sourceTag === 'td'
        || sourceTag === 'th';
}

export function resolvePositionInsets(
    style: Record<string, NativePropValue> | undefined,
    hints: NativeRenderHints | undefined,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): { top?: number; right?: number; bottom?: number; left?: number } {
    return {
        top: resolveAxisUnitNumber(style?.top, 'vertical', hints, styleResolveOptions),
        right: resolveAxisUnitNumber(style?.right, 'horizontal', hints, styleResolveOptions),
        bottom: resolveAxisUnitNumber(style?.bottom, 'vertical', hints, styleResolveOptions),
        left: resolveAxisUnitNumber(style?.left, 'horizontal', hints, styleResolveOptions),
    };
}

function resolveNativeContainerNames(style: Record<string, NativePropValue> | undefined): string[] {
    if (!style || typeof style.containerName !== 'string') {
        return [];
    }

    return style.containerName
        .split(/\s+/)
        .map((containerName) => containerName.trim().toLowerCase())
        .filter((containerName) => containerName.length > 0 && containerName !== 'none');
}

function resolveNativeContainerWidth(
    style: Record<string, NativePropValue> | undefined,
    options: NativeStyleResolveOptions,
): number | undefined {
    if (!style) {
        return undefined;
    }

    if (isFillValue(style.width)) {
        return options.viewportWidth ?? 390;
    }

    return resolveAxisUnitNumber(style.width, 'horizontal', undefined, options)
        ?? resolveAxisUnitNumber(style.maxWidth, 'horizontal', undefined, options)
        ?? resolveAxisUnitNumber(style.minWidth, 'horizontal', undefined, options)
        ?? (options.viewportWidth ?? 390);
}

export function resolveNativeContainerScope(
    style: Record<string, NativePropValue> | undefined,
    options: NativeStyleResolveOptions,
): Pick<NativeStyleScope, 'containerNames' | 'containerWidth' | 'isContainer'> {
    const containerNames = resolveNativeContainerNames(style);
    const containerType = typeof style?.containerType === 'string'
        ? style.containerType.trim().toLowerCase()
        : undefined;
    const isContainer = Boolean(containerType && containerType !== 'normal') || containerNames.length > 0;

    return isContainer
        ? {
            containerNames,
            containerWidth: resolveNativeContainerWidth(style, options),
            isContainer: true,
        }
        : {};
}