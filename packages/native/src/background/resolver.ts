import { type NativeStyleResolveOptions } from '../../client/style';
import type {
    NativeBackgroundLayerSpec,
    NativeColorValue,
    NativeGradientValue,
    NativePropValue,
} from '../types';
import {
    liftColorAlpha,
    parseCssColor,
    parseLinearGradient,
    resolveBackdropBlurRadius,
    resolveStyleCurrentColor,
} from '../color';
import { resolveNativeBackgroundImagePositionValue } from './object-position';
import {
    extractCssUrlValue,
    pickNativeBackgroundLayerValue,
    resolveNativeBackgroundImageFitValue,
    resolveNativeBackgroundRepeatValue,
    resolveNativeBackgroundShorthandColor,
    resolveNativeBackgroundShorthandLayers,
    splitNativeBackgroundLayers,
} from './parsing';

export function resolveNativeBackgroundColorLayer(
    color: NativeColorValue | undefined,
    style: Record<string, NativePropValue>,
    styleResolveOptions: NativeStyleResolveOptions,
): NativeColorValue | undefined {
    const backdropBlur = color ? resolveBackdropBlurRadius(style, styleResolveOptions) : undefined;

    if (!color || backdropBlur === undefined || color.alpha >= 1) {
        return color;
    }

    return liftColorAlpha(color, Math.min(0.14, backdropBlur / 160));
}

export function resolveBackgroundColor(
    style: Record<string, NativePropValue>,
    styleResolveOptions: NativeStyleResolveOptions,
): NativeColorValue | undefined {
    const currentColor = resolveStyleCurrentColor(style);
    const explicitBackgroundColor = parseCssColor(style.backgroundColor, currentColor);
    const shorthandBackgroundColor = explicitBackgroundColor ? undefined : resolveNativeBackgroundShorthandColor(style.background, currentColor);
    return resolveNativeBackgroundColorLayer(explicitBackgroundColor ?? shorthandBackgroundColor, style, styleResolveOptions);
}

export function resolveBackgroundGradient(style: Record<string, NativePropValue>): NativeGradientValue | undefined {
    return parseLinearGradient(style.background, resolveStyleCurrentColor(style));
}

export function resolveNativeBackgroundLayersFromStyle(
    style: Record<string, NativePropValue> | undefined,
    styleResolveOptions: NativeStyleResolveOptions,
): NativeBackgroundLayerSpec[] {
    if (!style) {
        return [];
    }

    const currentColor = resolveStyleCurrentColor(style);
    const layers: NativeBackgroundLayerSpec[] = [];

    if (typeof style.backgroundImage === 'string' && style.backgroundImage.trim()) {
        const repeatLayers = splitNativeBackgroundLayers(style.backgroundRepeat);
        const sizeLayers = splitNativeBackgroundLayers(style.backgroundSize);
        const positionLayers = splitNativeBackgroundLayers(style.backgroundPosition);

        splitNativeBackgroundLayers(style.backgroundImage).forEach((entry, index) => {
            const source = extractCssUrlValue(entry);
            if (!source) {
                const gradient = parseLinearGradient(entry, currentColor);
                if (gradient) {
                    layers.push({ kind: 'gradient', gradient });
                }
                return;
            }

            const repeat = resolveNativeBackgroundRepeatValue(pickNativeBackgroundLayerValue(repeatLayers, index));
            const size = pickNativeBackgroundLayerValue(sizeLayers, index);
            const position = pickNativeBackgroundLayerValue(positionLayers, index);

            layers.push({
                kind: 'image',
                source,
                fit: resolveNativeBackgroundImageFitValue(size, repeat),
                position: resolveNativeBackgroundImagePositionValue(position),
                repeat,
            });
        });
    } else {
        for (const layer of resolveNativeBackgroundShorthandLayers(style.background, currentColor)) {
            if (layer.source) {
                const repeat = resolveNativeBackgroundRepeatValue(layer.repeat);
                layers.push({
                    kind: 'image',
                    source: layer.source,
                    fit: resolveNativeBackgroundImageFitValue(layer.size, repeat),
                    position: resolveNativeBackgroundImagePositionValue(layer.position),
                    repeat,
                });
                continue;
            }

            if (layer.gradient) {
                layers.push({ kind: 'gradient', gradient: layer.gradient });
            }
        }
    }

    let explicitBackgroundColor: NativeColorValue | undefined;
    if (style.backgroundColor !== undefined) {
        const styleWithoutBackground = { ...style };
        delete styleWithoutBackground.background;
        explicitBackgroundColor = resolveBackgroundColor(styleWithoutBackground, styleResolveOptions);
    }

    const shouldReadBackgroundColorFallback = typeof style.background === 'string'
        && (!style.backgroundImage
            || (!/url\(/i.test(style.background) && !/linear-gradient\(/i.test(style.background) && !style.background.includes(',')));
    const shorthandBackgroundColor = shouldReadBackgroundColorFallback
        ? resolveNativeBackgroundColorLayer(resolveNativeBackgroundShorthandColor(style.background, currentColor), style, styleResolveOptions)
        : undefined;
    const backgroundColor = explicitBackgroundColor ?? shorthandBackgroundColor;

    if (backgroundColor) {
        layers.push({ kind: 'color', color: backgroundColor });
    }

    return layers;
}

export function stripNativeBackgroundPaintStyles(style: Record<string, NativePropValue> | undefined): Record<string, NativePropValue> | undefined {
    if (!style) {
        return undefined;
    }

    const nextStyle = { ...style };
    delete nextStyle.background;
    delete nextStyle.backgroundColor;
    delete nextStyle.backgroundImage;
    delete nextStyle.backgroundRepeat;
    delete nextStyle.backgroundPosition;
    delete nextStyle.backgroundSize;
    return nextStyle;
}