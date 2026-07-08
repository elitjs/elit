import type {
    ContainerRule,
    CSSRule,
    CSSVariable,
    FontFace,
    Keyframes,
    LayerRule,
    MediaRule,
    StyleRenderInput,
    SupportsRule,
} from './types';

interface StyleRenderContext {
    imports: string[];
    layerOrder: string[];
    variables: CSSVariable[];
    fontFaces: FontFace[];
    keyframes: Keyframes[];
    rules: CSSRule[];
    mediaRules: MediaRule[];
    containerRules: ContainerRule[];
    supportsRules: SupportsRule[];
    layerRules: LayerRule[];
}

function toKebabCase(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function stylesToString(styles: Record<string, string | number>, indent = '    '): string {
    return Object.entries(styles)
        .map(([prop, value]) => {
            const cssValue = typeof value === 'object' && value !== null && 'name' in value
                ? `var(${(value as CSSVariable).name})`
                : value;
            return `${indent}${toKebabCase(prop)}: ${cssValue};`;
        })
        .join('\n');
}

function renderRule(rule: CSSRule, indent = ''): string {
    let css = `${indent}${rule.selector} {\n${stylesToString(rule.styles, indent + '    ')}\n`;

    if (rule.nested && rule.nested.length > 0) {
        for (const nestedRule of rule.nested) {
            const nestedSelector = nestedRule.selector.startsWith('&')
                ? nestedRule.selector.replace(/&/g, rule.selector)
                : `${rule.selector} ${nestedRule.selector}`;
            css += `\n${indent}${nestedSelector} {\n${stylesToString(nestedRule.styles, indent + '    ')}\n${indent}}\n`;
        }
    }

    css += `${indent}}`;
    return css;
}

function renderRulesWithIndent(rules: CSSRule[], indent = '    '): string {
    return rules.map((rule) => renderRule(rule, indent)).join('\n');
}

function renderMediaRule(media: MediaRule): string {
    const condition = media.type && media.condition
        ? `${media.type} and (${media.condition})`
        : media.type
            ? media.type
            : `(${media.condition})`;
    return `@media ${condition} {\n${renderRulesWithIndent(media.rules)}\n}`;
}

function renderKeyframes(kf: Keyframes): string {
    let css = `@keyframes ${kf.name} {\n`;
    for (const step of kf.steps) {
        css += `    ${step.step} {\n${stylesToString(step.styles, '        ')}\n    }\n`;
    }
    css += '}';
    return css;
}

function renderFontFace(ff: FontFace): string {
    let css = '@font-face {\n';
    css += `    font-family: "${ff.fontFamily}";\n`;
    css += `    src: ${ff.src};\n`;
    if (ff.fontWeight) css += `    font-weight: ${ff.fontWeight};\n`;
    if (ff.fontStyle) css += `    font-style: ${ff.fontStyle};\n`;
    if (ff.fontDisplay) css += `    font-display: ${ff.fontDisplay};\n`;
    if (ff.unicodeRange) css += `    unicode-range: ${ff.unicodeRange};\n`;
    css += '}';
    return css;
}

function renderContainerRule(container: ContainerRule): string {
    const nameStr = container.name ? `${container.name} ` : '';
    return `@container ${nameStr}(${container.condition}) {\n${renderRulesWithIndent(container.rules)}\n}`;
}

function renderSupportsRule(supports: SupportsRule): string {
    return `@supports (${supports.condition}) {\n${renderRulesWithIndent(supports.rules)}\n}`;
}

function renderLayerRule(layer: LayerRule): string {
    return `@layer ${layer.name} {\n${renderRulesWithIndent(layer.rules)}\n}`;
}

export function renderStyleSheet(context: StyleRenderContext, ...additionalRules: StyleRenderInput[]): string {
    const parts: string[] = [];

    if (context.imports.length > 0) {
        parts.push(context.imports.join('\n'));
    }

    if (context.layerOrder.length > 0) {
        parts.push(`@layer ${context.layerOrder.join(', ')};`);
    }

    if (context.variables.length > 0) {
        const varDeclarations = context.variables
            .map((variable) => `    ${variable.name}: ${variable.value};`)
            .join('\n');
        parts.push(`:root {\n${varDeclarations}\n}`);
    }

    for (const ff of context.fontFaces) {
        parts.push(renderFontFace(ff));
    }

    for (const kf of context.keyframes) {
        parts.push(renderKeyframes(kf));
    }

    const allRules: CSSRule[] = [...context.rules];
    const allMediaRules: MediaRule[] = [...context.mediaRules];
    const allKeyframes: Keyframes[] = [];
    const allContainerRules: ContainerRule[] = [...context.containerRules];
    const allSupportsRules: SupportsRule[] = [...context.supportsRules];
    const allLayerRules: LayerRule[] = [...context.layerRules];

    for (const item of additionalRules) {
        if (!item) {
            continue;
        }

        if (Array.isArray(item)) {
            allRules.push(...item);
        } else if ('condition' in item && 'rules' in item && !('name' in item && 'steps' in item)) {
            if ('type' in item) {
                allMediaRules.push(item as MediaRule);
            } else if ('name' in item && typeof item.name === 'string') {
                allContainerRules.push(item as ContainerRule);
            } else {
                allSupportsRules.push(item as SupportsRule);
            }
        } else if ('name' in item && 'steps' in item) {
            allKeyframes.push(item as Keyframes);
        } else if ('name' in item && 'rules' in item) {
            allLayerRules.push(item as LayerRule);
        } else {
            allRules.push(item as CSSRule);
        }
    }

    for (const kf of allKeyframes) {
        parts.push(renderKeyframes(kf));
    }

    for (const layer of allLayerRules) {
        parts.push(renderLayerRule(layer));
    }

    for (const rule of allRules) {
        parts.push(renderRule(rule));
    }

    for (const supports of allSupportsRules) {
        parts.push(renderSupportsRule(supports));
    }

    for (const container of allContainerRules) {
        parts.push(renderContainerRule(container));
    }

    for (const media of allMediaRules) {
        parts.push(renderMediaRule(media));
    }

    return parts.join('\n\n');
}