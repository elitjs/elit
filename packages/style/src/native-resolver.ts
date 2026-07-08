import {
    findMatchingContainerTarget,
    getOrderedLayerNames,
    matchesContainerCondition,
    matchesMediaRule,
    matchesSupportsCondition,
} from './condition-utils';
import {
    extractSupportedSelectorChains,
    parseSimpleSelectorToken,
    splitSelectorList,
} from './selector-parser';
import type {
    ContainerRule,
    CSSRule,
    LayerRule,
    MediaRule,
    NativeStyleResolveOptions,
    ParsedAttributeSelector,
    ParsedSelectorCursor,
    ParsedSimpleSelector,
    StyleSelectorTarget,
    SupportsRule,
} from './types';

interface NativeStyleResolverContext {
    variables: Record<string, string>;
    rules: CSSRule[];
    mediaRules: MediaRule[];
    containerRules: ContainerRule[];
    supportsRules: SupportsRule[];
    layerRules: LayerRule[];
    layerOrder: string[];
}

export class NativeStyleResolver {
    private parsedSelectorChainCache = new Map<string, ParsedSimpleSelector[][]>();
    private nativeTargetNormalizationCache?: WeakMap<StyleSelectorTarget, StyleSelectorTarget>;

    resolveNativeStyles(
        target: StyleSelectorTarget,
        ancestors: StyleSelectorTarget[] = [],
        options: NativeStyleResolveOptions = {},
        context: NativeStyleResolverContext,
    ): Record<string, string | number> {
        return this.withNativeTargetNormalizationCache(() => {
            const normalizedTarget = this.normalizeTarget(target);
            if (!normalizedTarget.tagName && (!normalizedTarget.classNames || normalizedTarget.classNames.length === 0)) {
                return {};
            }

            const normalizedAncestors = ancestors.map((ancestor) => this.normalizeTarget(ancestor));
            const resolved: Record<string, string | number> = {};

            const applyRules = (rules: CSSRule[]): void => {
                for (const rule of rules) {
                    const selectorChains = extractSupportedSelectorChains(rule.selector, this.parsedSelectorChainCache);
                    if (selectorChains.length === 0) {
                        continue;
                    }

                    const matches = selectorChains.some((selectorChain) => this.matchesSelectorChain(normalizedTarget, normalizedAncestors, selectorChain));
                    if (!matches) {
                        continue;
                    }

                    for (const [property, value] of Object.entries(rule.styles)) {
                        resolved[property] = typeof value === 'string'
                            ? this.resolveVariableReferences(value, context.variables)
                            : value;
                    }
                }
            };

            for (const layerName of getOrderedLayerNames(context.layerOrder, context.layerRules)) {
                for (const layerRule of context.layerRules) {
                    if (layerRule.name.trim() === layerName) {
                        applyRules(layerRule.rules);
                    }
                }
            }

            applyRules(context.rules);

            for (const supportsRule of context.supportsRules) {
                if (matchesSupportsCondition(supportsRule.condition)) {
                    applyRules(supportsRule.rules);
                }
            }

            for (const containerRule of context.containerRules) {
                const matchingContainer = findMatchingContainerTarget(normalizedAncestors, containerRule.name);
                if (matchingContainer && this.hasContainerWidth(matchingContainer) && matchesContainerCondition(containerRule.condition, matchingContainer.containerWidth)) {
                    applyRules(containerRule.rules);
                }
            }

            for (const mediaRule of context.mediaRules) {
                if (matchesMediaRule(mediaRule, options)) {
                    applyRules(mediaRule.rules);
                }
            }

            return resolved;
        });
    }

    resolveClassStyles(classNames: string[], context: NativeStyleResolverContext): Record<string, string | number> {
        return this.resolveNativeStyles({ classNames }, [], {}, context);
    }

    private hasContainerWidth(target: StyleSelectorTarget): target is StyleSelectorTarget & { containerWidth: number } {
        return typeof target.containerWidth === 'number' && Number.isFinite(target.containerWidth);
    }

    private resolveVariableReferences(value: string, variables: Record<string, string>): string {
        let resolved = value;

        for (let index = 0; index < 8; index++) {
            let replaced = false;
            resolved = resolved.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^\)]+))?\)/g, (match, name: string, fallback?: string) => {
                const variableValue = variables[name];
                if (variableValue !== undefined) {
                    replaced = true;
                    return variableValue;
                }

                if (fallback !== undefined) {
                    replaced = true;
                    return fallback.trim();
                }

                return match;
            });

            if (!replaced) {
                break;
            }
        }

        return resolved.replace(/\s*!important\s*$/i, '').trim();
    }

    private normalizeTargetIdentity(target: StyleSelectorTarget): StyleSelectorTarget {
        return {
            tagName: typeof target.tagName === 'string' && target.tagName.trim()
                ? target.tagName.trim().toLowerCase()
                : undefined,
            classNames: Array.isArray(target.classNames)
                ? target.classNames.map((className) => className.trim()).filter(Boolean)
                : [],
            attributes: target.attributes
                ? Object.fromEntries(
                    Object.entries(target.attributes)
                        .filter(([, value]) => value !== undefined && value !== null && value !== false)
                        .map(([name, value]) => [name.toLowerCase(), String(value)]),
                )
                : {},
            pseudoStates: Array.isArray(target.pseudoStates)
                ? [...new Set(target.pseudoStates.map((pseudoState) => pseudoState.trim().toLowerCase()).filter(Boolean))]
                : [],
            childIndex: typeof target.childIndex === 'number' && Number.isFinite(target.childIndex)
                ? target.childIndex
                : undefined,
            siblingCount: typeof target.siblingCount === 'number' && Number.isFinite(target.siblingCount)
                ? target.siblingCount
                : undefined,
            sameTypeIndex: typeof target.sameTypeIndex === 'number' && Number.isFinite(target.sameTypeIndex)
                ? target.sameTypeIndex
                : undefined,
            sameTypeCount: typeof target.sameTypeCount === 'number' && Number.isFinite(target.sameTypeCount)
                ? target.sameTypeCount
                : undefined,
            containerNames: Array.isArray(target.containerNames)
                ? [...new Set(target.containerNames.map((containerName) => containerName.trim().toLowerCase()).filter(Boolean))]
                : [],
            containerWidth: typeof target.containerWidth === 'number' && Number.isFinite(target.containerWidth)
                ? target.containerWidth
                : undefined,
            isContainer: target.isContainer === true,
            isScopeReference: target.isScopeReference === true,
        };
    }

    private normalizeTarget(target: StyleSelectorTarget): StyleSelectorTarget {
        const cached = this.nativeTargetNormalizationCache?.get(target);
        if (cached) {
            return cached;
        }

        const normalized: StyleSelectorTarget = {
            ...this.normalizeTargetIdentity(target),
            previousSiblings: [],
            nextSiblings: [],
            children: [],
        };

        this.nativeTargetNormalizationCache?.set(target, normalized);

        normalized.previousSiblings = Array.isArray(target.previousSiblings)
            ? target.previousSiblings.map((sibling) => this.normalizeTarget(sibling))
            : [];
        normalized.nextSiblings = Array.isArray(target.nextSiblings)
            ? target.nextSiblings.map((sibling) => this.normalizeTarget(sibling))
            : [];
        normalized.children = Array.isArray(target.children)
            ? target.children.map((child) => this.normalizeTarget(child))
            : [];

        return normalized;
    }

    private withNativeTargetNormalizationCache<T>(callback: () => T): T {
        const previousCache = this.nativeTargetNormalizationCache;
        this.nativeTargetNormalizationCache = new WeakMap();

        try {
            return callback();
        } finally {
            this.nativeTargetNormalizationCache = previousCache;
        }
    }

    private matchesAttributeSelector(targetValue: string | undefined, selector: ParsedAttributeSelector): boolean {
        if (selector.operator === undefined) {
            return targetValue !== undefined;
        }

        if (targetValue === undefined || selector.value === undefined) {
            return false;
        }

        switch (selector.operator) {
            case '=':
                return targetValue === selector.value;
            case '~=':
                return targetValue.split(/\s+/).includes(selector.value);
            case '^=':
                return targetValue.startsWith(selector.value);
            case '$=':
                return targetValue.endsWith(selector.value);
            case '*=':
                return targetValue.includes(selector.value);
            default:
                return false;
        }
    }

    private matchesSelectorPart(target: StyleSelectorTarget, selector: ParsedSimpleSelector): boolean {
        if (selector.tagName && target.tagName !== selector.tagName) {
            return false;
        }

        const attributes = target.attributes as Record<string, string> | undefined;
        if (selector.idName && attributes?.id !== selector.idName) {
            return false;
        }

        const classSet = new Set(target.classNames ?? []);
        if (!selector.classNames.every((className) => classSet.has(className))) {
            return false;
        }

        if (!selector.attributes.every((attribute) => this.matchesAttributeSelector(attributes?.[attribute.name], attribute))) {
            return false;
        }

        return selector.pseudoClasses.every((pseudoClass) => this.matchesPseudoClass(target, pseudoClass));
    }

    private matchesPseudoClass(target: StyleSelectorTarget, pseudoClass: string): boolean {
        const rawPseudoClass = pseudoClass.trim();
        const normalized = rawPseudoClass.toLowerCase();
        const pseudoStates = new Set((target.pseudoStates ?? []).map((state) => state.trim().toLowerCase()));
        if (pseudoStates.has(normalized)) {
            return true;
        }

        const functionalMatch = rawPseudoClass.match(/^([_a-zA-Z][-_a-zA-Z0-9]*)(?:\((.*)\))?$/);
        const pseudoName = functionalMatch?.[1] ?? normalized;
        const pseudoArgument = functionalMatch?.[2]?.trim();
        const attributes = target.attributes as Record<string, string> | undefined;
        switch (pseudoName) {
            case 'scope':
                return target.isScopeReference === true;
            case 'checked':
                return attributes?.checked !== undefined && attributes.checked !== 'false';
            case 'disabled':
                return attributes?.disabled !== undefined && attributes.disabled !== 'false';
            case 'selected':
                return (attributes?.selected !== undefined && attributes.selected !== 'false') || attributes?.['aria-current'] !== undefined;
            case 'first-child':
                return target.childIndex === 1;
            case 'last-child':
                return target.childIndex !== undefined
                    && target.siblingCount !== undefined
                    && target.childIndex === target.siblingCount;
            case 'only-child':
                return target.childIndex !== undefined
                    && target.siblingCount !== undefined
                    && target.siblingCount === 1;
            case 'first-of-type':
                return target.sameTypeIndex === 1;
            case 'last-of-type':
                return target.sameTypeIndex !== undefined
                    && target.sameTypeCount !== undefined
                    && target.sameTypeIndex === target.sameTypeCount;
            case 'only-of-type':
                return target.sameTypeIndex !== undefined
                    && target.sameTypeCount !== undefined
                    && target.sameTypeCount === 1;
            case 'nth-child':
                return target.childIndex !== undefined
                    && typeof pseudoArgument === 'string'
                    && this.matchesNthChildExpression(pseudoArgument, target.childIndex);
            case 'nth-last-child':
                return target.childIndex !== undefined
                    && target.siblingCount !== undefined
                    && typeof pseudoArgument === 'string'
                    && this.matchesNthChildExpression(pseudoArgument, target.siblingCount - target.childIndex + 1);
            case 'nth-of-type':
                return target.sameTypeIndex !== undefined
                    && typeof pseudoArgument === 'string'
                    && this.matchesNthChildExpression(pseudoArgument, target.sameTypeIndex);
            case 'nth-last-of-type':
                return target.sameTypeIndex !== undefined
                    && target.sameTypeCount !== undefined
                    && typeof pseudoArgument === 'string'
                    && this.matchesNthChildExpression(pseudoArgument, target.sameTypeCount - target.sameTypeIndex + 1);
            case 'has':
                return typeof pseudoArgument === 'string'
                    && this.matchesHasPseudoClass(target, pseudoArgument);
            case 'not': {
                if (!pseudoArgument) {
                    return false;
                }

                const selectorArguments = splitSelectorList(pseudoArgument);
                if (selectorArguments.length === 0) {
                    return false;
                }

                const parsedSelectors: ParsedSimpleSelector[] = [];
                for (const selectorArgument of selectorArguments) {
                    const parsedSelector = parseSimpleSelectorToken(selectorArgument);
                    if (!parsedSelector) {
                        return false;
                    }

                    parsedSelectors.push(parsedSelector);
                }

                return parsedSelectors.every((selectorPart) => !this.matchesSelectorPart(target, selectorPart));
            }
            default:
                return false;
        }
    }

    private matchesNthChildExpression(expression: string, childIndex: number): boolean {
        const normalized = expression.trim().toLowerCase().replace(/\s+/g, '');
        if (!normalized) {
            return false;
        }

        if (normalized === 'odd') {
            return childIndex % 2 === 1;
        }

        if (normalized === 'even') {
            return childIndex % 2 === 0;
        }

        if (/^[+-]?\d+$/.test(normalized)) {
            return childIndex === Number(normalized);
        }

        const patternMatch = normalized.match(/^([+-]?\d*)n(?:([+-]?\d+))?$/);
        if (!patternMatch) {
            return false;
        }

        const coefficientToken = patternMatch[1];
        const offsetToken = patternMatch[2];
        const coefficient = coefficientToken === '' || coefficientToken === '+'
            ? 1
            : coefficientToken === '-'
                ? -1
                : Number(coefficientToken);
        const offset = offsetToken !== undefined ? Number(offsetToken) : 0;

        if (!Number.isFinite(coefficient) || !Number.isFinite(offset)) {
            return false;
        }

        if (coefficient === 0) {
            return childIndex === offset;
        }

        const delta = childIndex - offset;
        const step = Math.abs(coefficient);
        if (delta % step !== 0) {
            return false;
        }

        const n = delta / coefficient;
        return Number.isInteger(n) && n >= 0;
    }

    private matchesHasPseudoClass(target: StyleSelectorTarget, pseudoArgument: string): boolean {
        const selectorArguments = splitSelectorList(pseudoArgument);
        if (selectorArguments.length === 0) {
            return false;
        }

        return selectorArguments.some((selectorArgument) => this.matchesRelativeHasSelector(target, selectorArgument));
    }

    private matchesRelativeHasSelector(target: StyleSelectorTarget, selectorArgument: string): boolean {
        const trimmedSelector = selectorArgument.trim();
        if (!trimmedSelector) {
            return false;
        }

        const scopeRelativeSelector = this.toHasScopeRelativeSelector(trimmedSelector);
        if (!scopeRelativeSelector) {
            return false;
        }

        const selectorChains = extractSupportedSelectorChains(scopeRelativeSelector, this.parsedSelectorChainCache);
        if (selectorChains.length === 0) {
            return false;
        }

        const scopeTarget = this.normalizeTarget({ ...target, isScopeReference: true });
        if (trimmedSelector.startsWith('+') || trimmedSelector.startsWith('~')) {
            const scopedSiblings = this.buildScopedFollowingSiblingTargets(scopeTarget, target.nextSiblings ?? []);
            return selectorChains.some((selectorChain) =>
                scopedSiblings.some((sibling) => this.matchesSelectorChainInSubtree(sibling, [], selectorChain)),
            );
        }

        return selectorChains.some((selectorChain) =>
            (target.children ?? []).some((child) => this.matchesSelectorChainInSubtree(child, [scopeTarget], selectorChain)),
        );
    }

    private toHasScopeRelativeSelector(selectorArgument: string): string | undefined {
        const trimmedSelector = selectorArgument.trim();
        if (!trimmedSelector) {
            return undefined;
        }

        return trimmedSelector.startsWith('>') || trimmedSelector.startsWith('+') || trimmedSelector.startsWith('~')
            ? `:scope${trimmedSelector}`
            : `:scope ${trimmedSelector}`;
    }

    private buildScopedFollowingSiblingTargets(
        scopeTarget: StyleSelectorTarget,
        nextSiblings: StyleSelectorTarget[],
    ): StyleSelectorTarget[] {
        const scopedSiblings: StyleSelectorTarget[] = [];

        for (const sibling of nextSiblings) {
            const scopedSibling = this.normalizeTarget({
                ...sibling,
                previousSiblings: [scopeTarget, ...scopedSiblings],
            });
            scopedSiblings.push(scopedSibling);
        }

        return scopedSiblings;
    }

    private matchesSelectorChainInSubtree(
        target: StyleSelectorTarget,
        ancestors: StyleSelectorTarget[],
        chain: ParsedSimpleSelector[],
    ): boolean {
        if (this.matchesSelectorChain(target, ancestors, chain)) {
            return true;
        }

        const nextAncestors = [...ancestors, target];
        return (target.children ?? []).some((child) => this.matchesSelectorChainInSubtree(child, nextAncestors, chain));
    }

    private matchesSelectorChain(
        target: StyleSelectorTarget,
        ancestors: StyleSelectorTarget[],
        chain: ParsedSimpleSelector[],
    ): boolean {
        const initialCursor: ParsedSelectorCursor = {
            target,
            ancestorIndex: ancestors.length - 1,
            previousSiblings: Array.isArray(target.previousSiblings) ? target.previousSiblings : [],
        };

        return this.matchesSelectorChainFromCursor(chain, chain.length - 1, ancestors, initialCursor);
    }

    private getAncestorCursor(ancestors: StyleSelectorTarget[], ancestorIndex: number): ParsedSelectorCursor | undefined {
        if (ancestorIndex < 0 || ancestorIndex >= ancestors.length) {
            return undefined;
        }

        const ancestor = ancestors[ancestorIndex];
        return {
            target: ancestor,
            ancestorIndex: ancestorIndex - 1,
            previousSiblings: Array.isArray(ancestor.previousSiblings) ? ancestor.previousSiblings : [],
        };
    }

    private matchesSelectorChainFromCursor(
        chain: ParsedSimpleSelector[],
        chainIndex: number,
        ancestors: StyleSelectorTarget[],
        cursor: ParsedSelectorCursor,
    ): boolean {
        if (!this.matchesSelectorPart(cursor.target, chain[chainIndex])) {
            return false;
        }

        if (chainIndex === 0) {
            return true;
        }

        const combinator = chain[chainIndex].combinator ?? 'descendant';
        switch (combinator) {
            case 'child': {
                const parentCursor = this.getAncestorCursor(ancestors, cursor.ancestorIndex);
                return parentCursor
                    ? this.matchesSelectorChainFromCursor(chain, chainIndex - 1, ancestors, parentCursor)
                    : false;
            }
            case 'adjacent-sibling': {
                const siblingIndex = cursor.previousSiblings.length - 1;
                if (siblingIndex < 0) {
                    return false;
                }

                return this.matchesSelectorChainFromCursor(chain, chainIndex - 1, ancestors, {
                    target: cursor.previousSiblings[siblingIndex],
                    ancestorIndex: cursor.ancestorIndex,
                    previousSiblings: cursor.previousSiblings.slice(0, siblingIndex),
                });
            }
            case 'general-sibling': {
                for (let siblingIndex = cursor.previousSiblings.length - 1; siblingIndex >= 0; siblingIndex--) {
                    if (this.matchesSelectorChainFromCursor(chain, chainIndex - 1, ancestors, {
                        target: cursor.previousSiblings[siblingIndex],
                        ancestorIndex: cursor.ancestorIndex,
                        previousSiblings: cursor.previousSiblings.slice(0, siblingIndex),
                    })) {
                        return true;
                    }
                }

                return false;
            }
            case 'descendant':
            default: {
                for (let ancestorIndex = cursor.ancestorIndex; ancestorIndex >= 0; ancestorIndex--) {
                    const ancestorCursor = this.getAncestorCursor(ancestors, ancestorIndex);
                    if (ancestorCursor && this.matchesSelectorChainFromCursor(chain, chainIndex - 1, ancestors, ancestorCursor)) {
                        return true;
                    }
                }

                return false;
            }
        }
    }
}