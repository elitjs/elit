import { type NativeStyleResolveOptions } from '../../client/style';
import type {
    NativeBackgroundImageSpec,
    NativeBackgroundLayerSpec,
    NativePropValue,
} from '../types';
import {
    toComposeBrushLiteral,
    toComposeColorLiteral,
    toSwiftColorLiteral,
    toSwiftGradientLiteral,
} from '../color';
import { quoteKotlinString, quoteSwiftString } from '../strings';
import { toPointLiteral } from '../units';
import { appendComposeModifierCall } from '../canvas';
import { indent } from './shared';

export function buildComposeBackgroundImageInvocation(spec: NativeBackgroundImageSpec, modifier: string): string {
    return `ElitBackgroundImage(source = ${quoteKotlinString(spec.source)}${spec.fit !== 'cover' ? `, backgroundSize = ${quoteKotlinString(spec.fit)}` : ''}${spec.position !== 'center' ? `, backgroundPosition = ${quoteKotlinString(spec.position)}` : ''}${spec.repeat !== 'no-repeat' ? `, backgroundRepeat = ${quoteKotlinString(spec.repeat)}` : ''}, modifier = ${modifier})`;
}

export function shouldRenderNativeBackgroundLayersWithWrapper(layers: NativeBackgroundLayerSpec[]): boolean {
    return layers.length > 1 || layers.some((layer) => layer.kind === 'image');
}

export function buildComposeBackgroundLayerInvocation(layer: NativeBackgroundLayerSpec, modifier: string): string {
    if (layer.kind === 'image') {
        return buildComposeBackgroundImageInvocation(layer, modifier);
    }

    const backgroundCall = layer.kind === 'gradient'
        ? `background(brush = ${toComposeBrushLiteral(layer.gradient)})`
        : `background(${toComposeColorLiteral(layer.color)})`;
    return `Box(modifier = ${appendComposeModifierCall(modifier, backgroundCall)})`;
}

export function buildSwiftBackgroundImageInvocation(spec: NativeBackgroundImageSpec): string {
    return `elitBackgroundImageSurface(source: ${quoteSwiftString(spec.source)}${spec.fit !== 'cover' ? `, backgroundSize: ${quoteSwiftString(spec.fit)}` : ''}${spec.position !== 'center' ? `, backgroundPosition: ${quoteSwiftString(spec.position)}` : ''}${spec.repeat !== 'no-repeat' ? `, backgroundRepeat: ${quoteSwiftString(spec.repeat)}` : ''})`;
}

export function buildSwiftBackgroundLayerInvocation(layer: NativeBackgroundLayerSpec): string {
    if (layer.kind === 'image') {
        return buildSwiftBackgroundImageInvocation(layer);
    }

    const fillLiteral = layer.kind === 'gradient'
        ? toSwiftGradientLiteral(layer.gradient)
        : toSwiftColorLiteral(layer.color);
    return `Rectangle().fill(${fillLiteral}).frame(maxWidth: .infinity, maxHeight: .infinity)`;
}

export function appendSwiftUIBackgroundLayers(
    lines: string[],
    layers: NativeBackgroundLayerSpec[],
    level: number,
    style: Record<string, NativePropValue> | undefined,
    styleResolveOptions: NativeStyleResolveOptions,
): string[] {
    const radius = toPointLiteral(style?.borderRadius, styleResolveOptions);
    const result = [...lines];
    result.push(`${indent(level + 1)}.background(alignment: .topLeading) {`);
    if (layers.length > 1) {
        result.push(`${indent(level + 2)}ZStack {`);
        for (const layer of [...layers].reverse()) {
            result.push(`${indent(level + 3)}${buildSwiftBackgroundLayerInvocation(layer)}`);
        }
        result.push(`${indent(level + 2)}}`);
    } else if (layers[0]) {
        result.push(`${indent(level + 2)}${buildSwiftBackgroundLayerInvocation(layers[0])}`);
    }
    if (radius) {
        result.push(`${indent(level + 3)}.clipShape(RoundedRectangle(cornerRadius: ${radius}))`);
    }
    result.push(`${indent(level + 1)}}`);
    return result;
}