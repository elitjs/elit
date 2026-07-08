import styles, { type NativeStyleResolveOptions } from '../../client/style';
import type {
    NativeElementNode,
    NativeNode,
    NativePropValue,
    NativeResolvedStyleMap,
    NativeStyleContextMap,
    NativeStyleScope,
} from '../types';
import {
    getDefaultCurrentColor,
    normalizeResolvedCurrentTextColor,
    parseCssColor,
} from '../color';
import {
    isNativeActive,
    isNativeChecked,
    isNativeDisabled,
    isNativeElementEmpty,
    isNativeEnabled,
    isNativeFocusWithin,
    isNativeInvalid,
    isNativeOptional,
    isNativePlaceholderShown,
    isNativePseudoFocused,
    isNativeReadOnlyState,
    isNativeReadWrite,
    isNativeRequired,
    isNativeSelected,
    isNativeValid,
} from '../interaction';
import { resolveNativeContainerScope } from '../layout';
import { getNativeStyleResolveOptions } from '../units';

const INHERITED_TEXT_STYLE_KEYS = [
    'color',
    'fontFamily',
    'fontSize',
    'fontStyle',
    'fontWeight',
    'letterSpacing',
    'lineHeight',
    'lineSpacing',
    'textAlign',
    'textDecorationLine',
    'textDecorationStyle',
    'textDecorationThickness',
    'textIndent',
    'textTransform',
    'whiteSpace',
] as const;

function getClassList(node: NativeElementNode): string[] {
    const classList = node.props.classList;
    if (!Array.isArray(classList)) {
        return [];
    }

    return classList
        .map((item) => String(item).trim())
        .filter(Boolean);
}

function getSelectorAttributes(node: NativeElementNode): Record<string, string> {
    const attributes: Record<string, string> = {};

    for (const [key, value] of Object.entries(node.props)) {
        if (
            value == null ||
            value === false ||
            key === 'classList' ||
            key === 'style' ||
            key === 'innerHTML' ||
            key === 'nativeAction' ||
            key === 'nativeRoute' ||
            key === 'nativePayload'
        ) {
            continue;
        }

        if (key === 'source') {
            attributes.src = String(value);
            continue;
        }

        if (key === 'destination') {
            attributes.href = String(value);
            continue;
        }

        if (typeof value === 'boolean') {
            if (value) {
                attributes[key] = 'true';
            }
            continue;
        }

        if (typeof value === 'string' || typeof value === 'number') {
            attributes[key] = String(value);
        }
    }

    if (node.sourceTag === 'input' && node.component === 'Toggle' && !attributes.type) {
        attributes.type = 'checkbox';
    }

    return attributes;
}

function pickInheritedTextStyles(style: Record<string, NativePropValue> | undefined): Record<string, NativePropValue> | undefined {
    if (!style) {
        return undefined;
    }

    const inheritedEntries = INHERITED_TEXT_STYLE_KEYS
        .map((key) => [key, style[key]] as const)
        .filter(([, value]) => value !== undefined);

    return inheritedEntries.length > 0
        ? Object.fromEntries(inheritedEntries) as Record<string, NativePropValue>
        : undefined;
}

function getInlineStyleObject(node: NativeElementNode): Record<string, NativePropValue> | undefined {
    const inlineStyle = node.props.style;
    if (inlineStyle && typeof inlineStyle === 'object' && !Array.isArray(inlineStyle)) {
        return inlineStyle as Record<string, NativePropValue>;
    }

    return undefined;
}

function createNativeStyleScope(tagName: string): NativeStyleScope {
    return {
        tagName,
        classNames: [],
        attributes: {},
        pseudoStates: [],
    };
}

function buildGlobalInheritedTextStyles(options: NativeStyleResolveOptions): Record<string, NativePropValue> {
    const htmlScope = createNativeStyleScope('html');
    const bodyScope = createNativeStyleScope('body');
    const htmlStyles = pickInheritedTextStyles(
        styles.resolveNativeStyles(htmlScope, [], options) as Record<string, NativePropValue>
    );
    const bodyStyles = pickInheritedTextStyles(
        styles.resolveNativeStyles(bodyScope, [htmlScope], options) as Record<string, NativePropValue>
    );

    const mergedInheritedStyles = {
        ...(htmlStyles ?? {}),
        ...(bodyStyles ?? {}),
    };

    return normalizeResolvedCurrentTextColor(mergedInheritedStyles) ?? mergedInheritedStyles;
}

export function buildRootResolvedStyleData(nodes: NativeNode[], options: NativeStyleResolveOptions): { resolvedStyles: NativeResolvedStyleMap; styleContexts: NativeStyleContextMap } {
    const scopeSnapshots = buildNativeStyleScopeSnapshots(nodes);
    const styleContexts: NativeStyleContextMap = new WeakMap();
    const resolvedStyles = buildResolvedStyleMap(
        nodes,
        options,
        [],
        new WeakMap<NativeElementNode, Record<string, NativePropValue>>(),
        buildGlobalInheritedTextStyles(options),
        scopeSnapshots,
        styleContexts,
    );

    return {
        resolvedStyles,
        styleContexts,
    };
}

function buildNativeStyleScopeSnapshots(nodes: NativeNode[]): NativeStyleScope[] {
    const elementNodes = nodes.filter((node): node is NativeElementNode => node.kind === 'element');
    const sameTypeCounts = new Map<string, number>();
    for (const node of elementNodes) {
        sameTypeCounts.set(node.sourceTag, (sameTypeCounts.get(node.sourceTag) ?? 0) + 1);
    }

    const previousTypeCounts = new Map<string, number>();
    const baseScopes: NativeStyleScope[] = [];

    for (const node of elementNodes) {
        const sameTypeIndex = (previousTypeCounts.get(node.sourceTag) ?? 0) + 1;
        const children = buildNativeStyleScopeSnapshots(node.children);
        baseScopes.push({
            tagName: node.sourceTag,
            classNames: getClassList(node),
            attributes: getSelectorAttributes(node),
            pseudoStates: getNativePseudoStates(node),
            childIndex: baseScopes.length + 1,
            siblingCount: elementNodes.length,
            sameTypeIndex,
            sameTypeCount: sameTypeCounts.get(node.sourceTag),
            ...(children.length > 0 ? { children } : {}),
        });
        previousTypeCounts.set(node.sourceTag, sameTypeIndex);
    }

    const cloneRelativeSiblingSequence = (scopes: NativeStyleScope[]): NativeStyleScope[] => {
        const clones: NativeStyleScope[] = [];

        for (const scope of scopes) {
            const clonedChildren = scope.children && scope.children.length > 0
                ? cloneRelativeSiblingSequence(scope.children)
                : undefined;

            clones.push({
                tagName: scope.tagName,
                classNames: [...scope.classNames],
                attributes: { ...scope.attributes },
                pseudoStates: [...scope.pseudoStates],
                ...(scope.childIndex !== undefined ? { childIndex: scope.childIndex } : {}),
                ...(scope.siblingCount !== undefined ? { siblingCount: scope.siblingCount } : {}),
                ...(scope.sameTypeIndex !== undefined ? { sameTypeIndex: scope.sameTypeIndex } : {}),
                ...(scope.sameTypeCount !== undefined ? { sameTypeCount: scope.sameTypeCount } : {}),
                ...(scope.containerNames ? { containerNames: [...scope.containerNames] } : {}),
                ...(scope.containerWidth !== undefined ? { containerWidth: scope.containerWidth } : {}),
                ...(scope.isContainer ? { isContainer: true } : {}),
                ...(clonedChildren ? { children: clonedChildren } : {}),
                ...(clones.length > 0 ? { previousSiblings: [...clones] } : {}),
            });
        }

        return clones;
    };

    const snapshots: NativeStyleScope[] = [];
    for (let index = 0; index < baseScopes.length; index++) {
        const baseScope = baseScopes[index];
        snapshots.push({
            ...baseScope,
            previousSiblings: [...snapshots],
            nextSiblings: cloneRelativeSiblingSequence(baseScopes.slice(index + 1)),
        });
    }

    return snapshots;
}

function getNativePseudoStates(node: NativeElementNode): string[] {
    const pseudoStates = new Set<string>();

    if (isNativeElementEmpty(node)) {
        pseudoStates.add('empty');
    }

    if (isNativeChecked(node)) {
        pseudoStates.add('checked');
    }

    if (isNativeDisabled(node)) {
        pseudoStates.add('disabled');
    }

    if (isNativeEnabled(node)) {
        pseudoStates.add('enabled');
    }

    if (isNativeSelected(node)) {
        pseudoStates.add('selected');
    }

    if (isNativeReadOnlyState(node)) {
        pseudoStates.add('read-only');
    }

    if (isNativeReadWrite(node)) {
        pseudoStates.add('read-write');
    }

    if (isNativePlaceholderShown(node)) {
        pseudoStates.add('placeholder-shown');
    }

    if (isNativeFocusWithin(node)) {
        pseudoStates.add('focus-within');
    }

    if (isNativeRequired(node)) {
        pseudoStates.add('required');
    }

    if (isNativeOptional(node)) {
        pseudoStates.add('optional');
    }

    if (isNativeInvalid(node)) {
        pseudoStates.add('invalid');
    } else if (isNativeValid(node)) {
        pseudoStates.add('valid');
    }

    if (isNativePseudoFocused(node)) {
        pseudoStates.add('focus');
        pseudoStates.add('focus-visible');
    }

    if (isNativeActive(node)) {
        pseudoStates.add('active');
    }

    return [...pseudoStates];
}

function buildResolvedStyleMap(
    nodes: NativeNode[],
    options: NativeStyleResolveOptions,
    ancestors: NativeStyleScope[] = [],
    resolvedStyles: NativeResolvedStyleMap = new WeakMap(),
    inheritedTextStyles: Record<string, NativePropValue> = {},
    scopeSnapshots: NativeStyleScope[] = buildNativeStyleScopeSnapshots(nodes),
    styleContexts?: NativeStyleContextMap,
): NativeResolvedStyleMap {
    const elementNodes = nodes.filter((node): node is NativeElementNode => node.kind === 'element');
    for (const [index, node] of elementNodes.entries()) {
        const scope = scopeSnapshots[index] ?? {
            tagName: node.sourceTag,
            classNames: getClassList(node),
            attributes: getSelectorAttributes(node),
            pseudoStates: getNativePseudoStates(node),
        };
        const classStyles = styles.resolveNativeStyles(scope, ancestors, options) as Record<string, NativePropValue>;
        const inlineStyle = getInlineStyleObject(node);
        const hasClassStyles = Object.keys(classStyles).length > 0;

        if (styleContexts) {
            styleContexts.set(node, {
                scope,
                ancestors: [...ancestors],
                inheritedTextStyles: { ...inheritedTextStyles },
            });
        }

        const ownStyle = inlineStyle
            ? hasClassStyles
                ? { ...classStyles, ...inlineStyle }
                : inlineStyle
            : hasClassStyles
                ? classStyles
                : undefined;
        const inheritedCurrentColor = parseCssColor(inheritedTextStyles.color, getDefaultCurrentColor()) ?? getDefaultCurrentColor();
        const mergedStyle = ownStyle
            ? { ...inheritedTextStyles, ...ownStyle }
            : Object.keys(inheritedTextStyles).length > 0
                ? { ...inheritedTextStyles }
                : undefined;
        const resolvedStyle = normalizeResolvedCurrentTextColor(mergedStyle, inheritedCurrentColor);

        if (resolvedStyle) {
            resolvedStyles.set(node, resolvedStyle);
        }

        const nextScope: NativeStyleScope = {
            ...scope,
            ...resolveNativeContainerScope(resolvedStyle, options),
        };

        buildResolvedStyleMap(
            node.children,
            options,
            [...ancestors, nextScope],
            resolvedStyles,
            pickInheritedTextStyles(resolvedStyle) ?? inheritedTextStyles,
            scope.children ?? [],
            styleContexts,
        );
    }

    return resolvedStyles;
}

export function getStyleObject(
    node: NativeElementNode,
    resolvedStyles?: NativeResolvedStyleMap,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): Record<string, NativePropValue> | undefined {
    const mappedStyle = resolvedStyles?.get(node);
    if (mappedStyle) {
        return mappedStyle;
    }

    const fallbackScope = buildNativeStyleScopeSnapshots([node])[0] ?? {
        tagName: node.sourceTag,
        classNames: getClassList(node),
        attributes: getSelectorAttributes(node),
        pseudoStates: getNativePseudoStates(node),
    };
    const classStyles = styles.resolveNativeStyles(fallbackScope, [], styleResolveOptions) as Record<string, NativePropValue>;
    const globalInheritedTextStyles = buildGlobalInheritedTextStyles(styleResolveOptions);
    const inlineStyle = getInlineStyleObject(node);
    const hasClassStyles = Object.keys(classStyles).length > 0;
    const hasGlobalInheritedTextStyles = Object.keys(globalInheritedTextStyles).length > 0;
    const globalCurrentColor = parseCssColor(globalInheritedTextStyles.color, getDefaultCurrentColor()) ?? getDefaultCurrentColor();

    if (inlineStyle) {
        const mergedStyle = {
            ...globalInheritedTextStyles,
            ...(hasClassStyles ? classStyles : {}),
            ...inlineStyle,
        };

        return normalizeResolvedCurrentTextColor(mergedStyle, globalCurrentColor);
    }

    if (!hasClassStyles && !hasGlobalInheritedTextStyles) {
        return undefined;
    }

    const mergedStyle = {
        ...globalInheritedTextStyles,
        ...(hasClassStyles ? classStyles : {}),
    };

    return normalizeResolvedCurrentTextColor(mergedStyle, globalCurrentColor);
}

export function createSingleNodeResolvedStyleMap(
    node: NativeElementNode,
    style: Record<string, NativePropValue>,
): NativeResolvedStyleMap {
    const resolvedStyles: NativeResolvedStyleMap = new WeakMap();
    resolvedStyles.set(node, style);
    return resolvedStyles;
}

export function resolveNativePseudoStateVariantStyle(
    node: NativeElementNode,
    styleContexts: NativeStyleContextMap | undefined,
    styleResolveOptions: NativeStyleResolveOptions,
    additionalPseudoStates: string[],
): Record<string, NativePropValue> | undefined {
    const context = styleContexts?.get(node);
    if (!context) {
        return undefined;
    }

    const pseudoStates = [...new Set([...context.scope.pseudoStates, ...additionalPseudoStates])];
    const scopedNode: NativeStyleScope = {
        ...context.scope,
        pseudoStates,
    };
    const classStyles = styles.resolveNativeStyles(scopedNode, context.ancestors, styleResolveOptions) as Record<string, NativePropValue>;
    const inlineStyle = getInlineStyleObject(node);
    const hasClassStyles = Object.keys(classStyles).length > 0;
    const hasInheritedTextStyles = Object.keys(context.inheritedTextStyles).length > 0;
    const inheritedCurrentColor = parseCssColor(context.inheritedTextStyles.color, getDefaultCurrentColor()) ?? getDefaultCurrentColor();

    if (inlineStyle) {
        const mergedStyle = {
            ...context.inheritedTextStyles,
            ...(hasClassStyles ? classStyles : {}),
            ...inlineStyle,
        };

        return normalizeResolvedCurrentTextColor(mergedStyle, inheritedCurrentColor);
    }

    if (!hasClassStyles && !hasInheritedTextStyles) {
        return undefined;
    }

    const mergedStyle = {
        ...context.inheritedTextStyles,
        ...(hasClassStyles ? classStyles : {}),
    };

    return normalizeResolvedCurrentTextColor(mergedStyle, inheritedCurrentColor);
}