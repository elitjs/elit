import { type NativeStyleResolveOptions } from '../../client/style';
import type { Child } from '../../core/types';
import type {
    NativePlatform,
    NativePropObject,
    NativePropValue,
    NativeElementNode,
    NativeNode,
    NativeTree,
    NativeTransformOptions,
    NativeResolvedStyleMap,
    NativeStyleContextMap,
} from '../types';
import { getNativeStyleResolveOptions } from '../units';
import { renderNativeTree } from './tree';
import {
    buildRootResolvedStyleData,
    resolveNativePseudoStateVariantStyle,
} from './style-resolve';

export type {
    NativePlatform, NativePropScalar, NativePropObject, NativePropValue,
    NativeTextNode, NativeElementNode, NativeNode, NativeTree,
    NativeTransformOptions, AndroidComposeOptions, SwiftUIOptions,
    NativeCanvasPoint, NativeCanvasDrawOperation,
} from '../types';

export { renderNativeJson, renderNativeTree } from './tree';
export { renderAndroidCompose } from './compose-render';
export { renderSwiftUI } from './swiftui-render';

const DESKTOP_RUNTIME_PSEUDO_VARIANTS: ReadonlyArray<readonly [string, string[]]> = [
    ['invalid', ['invalid']],
    ['checked', ['checked']],
    ['selected', ['selected']],
    ['hover', ['hover']],
    ['focusWithin', ['focus-within']],
    ['focus', ['focus', 'focus-visible']],
    ['active', ['active']],
    ['disabled', ['disabled']],
];

function isNativePropObject(value: NativePropValue | undefined): value is NativePropObject {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nativePropValuesEqual(left: NativePropValue | undefined, right: NativePropValue | undefined): boolean {
    if (left === right) {
        return true;
    }

    if (Array.isArray(left) || Array.isArray(right)) {
        if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
            return false;
        }

        return left.every((value, index) => nativePropValuesEqual(value, right[index]));
    }

    if (isNativePropObject(left) && isNativePropObject(right)) {
        const leftKeys = Object.keys(left);
        const rightKeys = Object.keys(right);
        if (leftKeys.length !== rightKeys.length) {
            return false;
        }

        return leftKeys.every((key) => nativePropValuesEqual(left[key], right[key]));
    }

    return false;
}

function diffNativeStyleVariant(
    baseStyle: Record<string, NativePropValue> | undefined,
    variantStyle: Record<string, NativePropValue> | undefined,
): NativePropObject | undefined {
    if (!variantStyle) {
        return undefined;
    }

    const diff: NativePropObject = {};
    for (const [key, value] of Object.entries(variantStyle)) {
        if (!nativePropValuesEqual(baseStyle?.[key], value)) {
            diff[key] = value;
        }
    }

    return Object.keys(diff).length > 0 ? diff : undefined;
}

function buildDesktopNativeStyleVariants(
    node: NativeElementNode,
    baseStyle: Record<string, NativePropValue> | undefined,
    styleContexts: NativeStyleContextMap,
    styleResolveOptions: NativeStyleResolveOptions,
): NativePropObject | undefined {
    const variants: NativePropObject = {};

    for (const [variantName, pseudoStates] of DESKTOP_RUNTIME_PSEUDO_VARIANTS) {
        const resolvedVariant = resolveNativePseudoStateVariantStyle(node, styleContexts, styleResolveOptions, [...pseudoStates]);
        const diff = diffNativeStyleVariant(baseStyle, resolvedVariant);
        if (diff) {
            variants[variantName] = diff;
        }
    }

    return Object.keys(variants).length > 0 ? variants : undefined;
}

function cloneNativeNodeWithMaterializedStyle(
    node: NativeNode,
    resolvedStyles: NativeResolvedStyleMap,
    styleContexts: NativeStyleContextMap,
    styleResolveOptions: NativeStyleResolveOptions,
    platform: NativePlatform,
): NativeNode {
    if (node.kind === 'text') {
        return { ...node };
    }

    const resolvedStyle = resolvedStyles.get(node);
    const desktopStyleVariants = platform === 'generic'
        ? buildDesktopNativeStyleVariants(node, resolvedStyle, styleContexts, styleResolveOptions)
        : undefined;

    return {
        ...node,
        props: {
            ...node.props,
            ...(resolvedStyle ? { style: resolvedStyle } : {}),
            ...(desktopStyleVariants ? { desktopStyleVariants } : {}),
        },
        children: node.children.map((child) => cloneNativeNodeWithMaterializedStyle(child, resolvedStyles, styleContexts, styleResolveOptions, platform)),
    };
}

export function materializeNativeTree(tree: NativeTree, styleResolveOptions = getNativeStyleResolveOptions(tree.platform)): NativeTree {
    const { resolvedStyles, styleContexts } = buildRootResolvedStyleData(tree.roots, styleResolveOptions);

    return {
        ...tree,
        roots: tree.roots.map((node) => cloneNativeNodeWithMaterializedStyle(node, resolvedStyles, styleContexts, styleResolveOptions, tree.platform)),
    };
}

export function renderMaterializedNativeTree(input: Child, options: NativeTransformOptions = {}): NativeTree {
    return materializeNativeTree(renderNativeTree(input, options));
}

export function renderMaterializedNativeJson(input: Child, options: NativeTransformOptions = {}): string {
    return JSON.stringify(renderMaterializedNativeTree(input, options), null, 2);
}