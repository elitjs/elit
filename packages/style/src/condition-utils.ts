import type {
    LayerRule,
    MediaRule,
    NativeStyleResolveOptions,
    StyleSelectorTarget,
} from './types';

export function splitConditionalClauses(value: string, operator: 'and' | 'or'): string[] {
    const clauses: string[] = [];
    let token = '';
    let depth = 0;

    for (let index = 0; index < value.length; index++) {
        const char = value[index];
        if (char === '(') {
            depth += 1;
        } else if (char === ')' && depth > 0) {
            depth -= 1;
        }

        const operatorToken = ` ${operator} `;
        if (depth === 0 && value.slice(index, index + operatorToken.length).toLowerCase() === operatorToken) {
            const trimmed = token.trim();
            if (trimmed) {
                clauses.push(trimmed);
            }
            token = '';
            index += operatorToken.length - 1;
            continue;
        }

        token += char;
    }

    const trailing = token.trim();
    if (trailing) {
        clauses.push(trailing);
    }

    return clauses;
}

function matchesSupportsDeclaration(property: string, value: string): boolean {
    const normalizedProperty = property.trim().toLowerCase();
    const normalizedValue = value.trim().toLowerCase();
    const supportedProperties = new Set([
        'align-items',
        'background',
        'background-color',
        'backdrop-filter',
        'border',
        'border-radius',
        'box-shadow',
        'color',
        'column-gap',
        'container-name',
        'container-type',
        'display',
        'flex',
        'flex-direction',
        'flex-grow',
        'flex-wrap',
        'font-family',
        'font-size',
        'font-weight',
        'gap',
        'grid-template-columns',
        'height',
        'justify-content',
        'letter-spacing',
        'line-height',
        'margin',
        'margin-bottom',
        'margin-left',
        'margin-right',
        'margin-top',
        'max-height',
        'max-width',
        'min-height',
        'min-width',
        'padding',
        'padding-bottom',
        'padding-end',
        'padding-horizontal',
        'padding-left',
        'padding-right',
        'padding-start',
        'padding-top',
        'padding-vertical',
        'row-gap',
        'text-align',
        'text-decoration',
        'text-transform',
        'width',
    ]);

    if (!supportedProperties.has(normalizedProperty)) {
        return false;
    }

    if (normalizedProperty === 'display') {
        return new Set(['block', 'flex', 'grid', 'inline', 'inline-block', 'inline-flex', 'inline-grid']).has(normalizedValue);
    }

    if (normalizedProperty === 'backdrop-filter') {
        return /blur\(/.test(normalizedValue);
    }

    if (normalizedProperty === 'container-type') {
        return new Set(['inline-size', 'size']).has(normalizedValue);
    }

    return true;
}

export function matchesSupportsCondition(condition: string): boolean {
    const normalized = condition.trim().replace(/^\(+|\)+$/g, '').trim();
    if (!normalized) {
        return true;
    }

    if (normalized.toLowerCase().startsWith('not ')) {
        return !matchesSupportsCondition(normalized.slice(4));
    }

    const orClauses = splitConditionalClauses(normalized, 'or');
    if (orClauses.length > 1) {
        return orClauses.some((clause) => matchesSupportsCondition(clause));
    }

    const andClauses = splitConditionalClauses(normalized, 'and');
    if (andClauses.length > 1) {
        return andClauses.every((clause) => matchesSupportsCondition(clause));
    }

    const declarationMatch = normalized.match(/^([a-z-]+)\s*:\s*(.+)$/i);
    if (!declarationMatch) {
        return false;
    }

    return matchesSupportsDeclaration(declarationMatch[1], declarationMatch[2]);
}

export function findMatchingContainerTarget(ancestors: StyleSelectorTarget[], name?: string): StyleSelectorTarget | undefined {
    const normalizedName = typeof name === 'string' && name.trim()
        ? name.trim().toLowerCase()
        : undefined;

    for (let index = ancestors.length - 1; index >= 0; index--) {
        const ancestor = ancestors[index];
        if (!ancestor?.isContainer || ancestor.containerWidth === undefined) {
            continue;
        }

        if (!normalizedName) {
            return ancestor;
        }

        if ((ancestor.containerNames ?? []).includes(normalizedName)) {
            return ancestor;
        }
    }

    return undefined;
}

export function matchesContainerCondition(condition: string, containerWidth: number): boolean {
    const normalized = condition.trim().replace(/^\(+|\)+$/g, '').trim().toLowerCase();
    if (!normalized) {
        return true;
    }

    if (normalized.startsWith('not ')) {
        return !matchesContainerCondition(normalized.slice(4), containerWidth);
    }

    const orClauses = splitConditionalClauses(normalized, 'or');
    if (orClauses.length > 1) {
        return orClauses.some((clause) => matchesContainerCondition(clause, containerWidth));
    }

    const andClauses = splitConditionalClauses(normalized, 'and');
    if (andClauses.length > 1) {
        return andClauses.every((clause) => matchesContainerCondition(clause, containerWidth));
    }

    if (normalized.startsWith('min-width:')) {
        const minWidth = parseMediaLength(normalized.slice('min-width:'.length));
        return minWidth !== undefined && containerWidth >= minWidth;
    }

    if (normalized.startsWith('max-width:')) {
        const maxWidth = parseMediaLength(normalized.slice('max-width:'.length));
        return maxWidth !== undefined && containerWidth <= maxWidth;
    }

    return false;
}

export function parseMediaLength(value: string): number | undefined {
    const match = value.trim().match(/^(-?\d+(?:\.\d+)?)(px|rem|em)?$/i);
    if (!match) {
        return undefined;
    }

    const numericValue = Number(match[1]);
    const unit = (match[2] ?? 'px').toLowerCase();
    if (unit === 'rem' || unit === 'em') {
        return numericValue * 16;
    }

    return numericValue;
}

function matchesMediaCondition(condition: string, options: NativeStyleResolveOptions): boolean {
    const normalized = condition.trim().replace(/^\(+|\)+$/g, '').trim().toLowerCase();
    if (!normalized) {
        return true;
    }

    if (normalized.startsWith('min-width:')) {
        const minWidth = parseMediaLength(normalized.slice('min-width:'.length));
        return minWidth !== undefined && options.viewportWidth !== undefined && options.viewportWidth >= minWidth;
    }

    if (normalized.startsWith('max-width:')) {
        const maxWidth = parseMediaLength(normalized.slice('max-width:'.length));
        return maxWidth !== undefined && options.viewportWidth !== undefined && options.viewportWidth <= maxWidth;
    }

    if (normalized === 'prefers-color-scheme: dark') {
        return options.colorScheme === 'dark';
    }

    if (normalized === 'prefers-color-scheme: light') {
        return (options.colorScheme ?? 'light') === 'light';
    }

    if (normalized === 'prefers-reduced-motion: reduce') {
        return options.reducedMotion === true;
    }

    return false;
}

export function matchesMediaRule(rule: MediaRule, options: NativeStyleResolveOptions): boolean {
    const mediaType = options.mediaType ?? 'screen';
    if (rule.type && rule.type !== mediaType && rule.type !== 'all') {
        return false;
    }

    if (!rule.condition.trim()) {
        return true;
    }

    return rule.condition
        .split(/\band\b/i)
        .map((part) => part.trim())
        .filter(Boolean)
        .every((part) => matchesMediaCondition(part, options));
}

export function getOrderedLayerNames(layerOrder: string[], layerRules: LayerRule[]): string[] {
    const orderedLayerNames: string[] = [];

    for (const layerName of layerOrder) {
        const normalizedName = layerName.trim();
        if (normalizedName && !orderedLayerNames.includes(normalizedName)) {
            orderedLayerNames.push(normalizedName);
        }
    }

    for (const layerRule of layerRules) {
        const normalizedName = layerRule.name.trim();
        if (normalizedName && !orderedLayerNames.includes(normalizedName)) {
            orderedLayerNames.push(normalizedName);
        }
    }

    return orderedLayerNames;
}