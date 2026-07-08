/**
 * Elit - CreateStyle CSS Generation System
 */

import { NativeStyleResolver } from './native-resolver';
import { renderStyleSheet } from './renderer';
import { getSharedStyleStore } from './store';
import type {
    ContainerRule,
    CSSRule,
    CSSVariable,
    CreateStyleStore,
    FontFace,
    Keyframes,
    LayerRule,
    MediaRule,
    NativeStyleResolveOptions,
    StyleRenderInput,
    StyleSelectorTarget,
    SupportsRule,
} from './types';

export type {
    CSSVariable,
    CSSRule,
    MediaRule,
    KeyframeStep,
    Keyframes,
    FontFace,
    ContainerRule,
    SupportsRule,
    LayerRule,
    StyleSelectorTarget,
    NativeStyleResolveOptions,
} from './types';

export class CreateStyle {
    private variables: CSSVariable[] = [];
    private rules: CSSRule[] = [];
    private mediaRules: MediaRule[] = [];
    private keyframes: Keyframes[] = [];
    private fontFaces: FontFace[] = [];
    private imports: string[] = [];
    private containerRules: ContainerRule[] = [];
    private supportsRules: SupportsRule[] = [];
    private layerRules: LayerRule[] = [];
    private _layerOrder: string[] = [];
    private nativeStyleResolver = new NativeStyleResolver();

    constructor(store?: CreateStyleStore) {
        if (!store) {
            return;
        }

        this.variables = store.variables;
        this.rules = store.rules;
        this.mediaRules = store.mediaRules;
        this.keyframes = store.keyframes;
        this.fontFaces = store.fontFaces;
        this.imports = store.imports;
        this.containerRules = store.containerRules;
        this.supportsRules = store.supportsRules;
        this.layerRules = store.layerRules;
        this._layerOrder = store.layerOrder;
    }

    addVar(name: string, value: string): CSSVariable {
        const cssVar: CSSVariable = {
            name: name.startsWith('--') ? name : `--${name}`,
            value,
            toString() {
                return `var(${this.name})`;
            },
        };
        this.variables.push(cssVar);
        return cssVar;
    }

    var(variable: CSSVariable | string, fallback?: string): string {
        const varName = typeof variable === 'string'
            ? (variable.startsWith('--') ? variable : `--${variable}`)
            : variable.name;
        return fallback ? `var(${varName}, ${fallback})` : `var(${varName})`;
    }

    addTag(tag: string, styles: Record<string, string | number>): CSSRule {
        const rule: CSSRule = { selector: tag, styles, type: 'tag' };
        this.rules.push(rule);
        return rule;
    }

    addClass(name: string, styles: Record<string, string | number>): CSSRule {
        const selector = name.startsWith('.') ? name : `.${name}`;
        const rule: CSSRule = { selector, styles, type: 'class' };
        this.rules.push(rule);
        return rule;
    }

    addId(name: string, styles: Record<string, string | number>): CSSRule {
        const selector = name.startsWith('#') ? name : `#${name}`;
        const rule: CSSRule = { selector, styles, type: 'id' };
        this.rules.push(rule);
        return rule;
    }

    addPseudoClass(pseudo: string, styles: Record<string, string | number>, baseSelector?: string): CSSRule {
        const pseudoClass = pseudo.startsWith(':') ? pseudo : `:${pseudo}`;
        const selector = baseSelector ? `${baseSelector}${pseudoClass}` : pseudoClass;
        const rule: CSSRule = { selector, styles, type: 'pseudo-class' };
        this.rules.push(rule);
        return rule;
    }

    addPseudoElement(pseudo: string, styles: Record<string, string | number>, baseSelector?: string): CSSRule {
        const pseudoElement = pseudo.startsWith('::') ? pseudo : `::${pseudo}`;
        const selector = baseSelector ? `${baseSelector}${pseudoElement}` : pseudoElement;
        const rule: CSSRule = { selector, styles, type: 'pseudo-element' };
        this.rules.push(rule);
        return rule;
    }

    addAttribute(attr: string, styles: Record<string, string | number>, baseSelector?: string): CSSRule {
        const attrSelector = attr.startsWith('[') ? attr : `[${attr}]`;
        const selector = baseSelector ? `${baseSelector}${attrSelector}` : attrSelector;
        const rule: CSSRule = { selector, styles, type: 'attribute' };
        this.rules.push(rule);
        return rule;
    }

    attrEquals(attr: string, value: string, styles: Record<string, string | number>, baseSelector?: string): CSSRule {
        return this.addAttribute(`${attr}="${value}"`, styles, baseSelector);
    }

    attrContainsWord(attr: string, value: string, styles: Record<string, string | number>, baseSelector?: string): CSSRule {
        return this.addAttribute(`${attr}~="${value}"`, styles, baseSelector);
    }

    attrStartsWith(attr: string, value: string, styles: Record<string, string | number>, baseSelector?: string): CSSRule {
        return this.addAttribute(`${attr}^="${value}"`, styles, baseSelector);
    }

    attrEndsWith(attr: string, value: string, styles: Record<string, string | number>, baseSelector?: string): CSSRule {
        return this.addAttribute(`${attr}$="${value}"`, styles, baseSelector);
    }

    attrContains(attr: string, value: string, styles: Record<string, string | number>, baseSelector?: string): CSSRule {
        return this.addAttribute(`${attr}*="${value}"`, styles, baseSelector);
    }

    descendant(ancestor: string, descendant: string, styles: Record<string, string | number>): CSSRule {
        return this.createAndAddRule(`${ancestor} ${descendant}`, styles);
    }

    child(parent: string, childSel: string, styles: Record<string, string | number>): CSSRule {
        return this.createAndAddRule(`${parent} > ${childSel}`, styles);
    }

    adjacentSibling(element: string, sibling: string, styles: Record<string, string | number>): CSSRule {
        return this.createAndAddRule(`${element} + ${sibling}`, styles);
    }

    generalSibling(element: string, sibling: string, styles: Record<string, string | number>): CSSRule {
        return this.createAndAddRule(`${element} ~ ${sibling}`, styles);
    }

    multiple(selectors: string[], styles: Record<string, string | number>): CSSRule {
        return this.createAndAddRule(selectors.join(', '), styles);
    }

    addName(name: string, styles: Record<string, string | number>): CSSRule {
        const selector = name.startsWith('--') ? `&${name}` : `&--${name}`;
        return { selector, styles, type: 'name' };
    }

    nesting(parentRule: CSSRule, ...childRules: CSSRule[]): CSSRule {
        parentRule.nested = childRules;
        return parentRule;
    }

    keyframe(name: string, steps: Record<string | number, Record<string, string | number>>): Keyframes {
        const keyframeSteps = Object.entries(steps).map(([step, styles]) => ({
            step: step === 'from' ? 'from' : step === 'to' ? 'to' : `${step}%`,
            styles,
        }));
        const kf: Keyframes = { name, steps: keyframeSteps };
        this.keyframes.push(kf);
        return kf;
    }

    keyframeFromTo(name: string, from: Record<string, string | number>, to: Record<string, string | number>): Keyframes {
        return this.keyframe(name, { from, to });
    }

    fontFace(options: FontFace): FontFace {
        this.fontFaces.push(options);
        return options;
    }

    import(url: string, mediaQuery?: string): string {
        const importRule = mediaQuery ? `@import url("${url}") ${mediaQuery};` : `@import url("${url}");`;
        this.imports.push(importRule);
        return importRule;
    }

    media(type: string, condition: string, rules: Record<string, Record<string, string | number>>): MediaRule {
        const mediaRule: MediaRule = { type, condition, rules: this.rulesToCSSRules(rules) };
        this.mediaRules.push(mediaRule);
        return mediaRule;
    }

    mediaScreen(condition: string, rules: Record<string, Record<string, string | number>>): MediaRule {
        return this.media('screen', condition, rules);
    }

    mediaPrint(rules: Record<string, Record<string, string | number>>): MediaRule {
        return this.media('print', '', rules);
    }

    mediaMinWidth(minWidth: string, rules: Record<string, Record<string, string | number>>): MediaRule {
        return this.media('screen', `min-width: ${minWidth}`, rules);
    }

    mediaMaxWidth(maxWidth: string, rules: Record<string, Record<string, string | number>>): MediaRule {
        return this.media('screen', `max-width: ${maxWidth}`, rules);
    }

    mediaDark(rules: Record<string, Record<string, string | number>>): MediaRule {
        const mediaRule: MediaRule = { type: '', condition: 'prefers-color-scheme: dark', rules: this.rulesToCSSRules(rules) };
        this.mediaRules.push(mediaRule);
        return mediaRule;
    }

    mediaLight(rules: Record<string, Record<string, string | number>>): MediaRule {
        const mediaRule: MediaRule = { type: '', condition: 'prefers-color-scheme: light', rules: this.rulesToCSSRules(rules) };
        this.mediaRules.push(mediaRule);
        return mediaRule;
    }

    mediaReducedMotion(rules: Record<string, Record<string, string | number>>): MediaRule {
        const mediaRule: MediaRule = { type: '', condition: 'prefers-reduced-motion: reduce', rules: this.rulesToCSSRules(rules) };
        this.mediaRules.push(mediaRule);
        return mediaRule;
    }

    container(condition: string, rules: Record<string, Record<string, string | number>>, name?: string): ContainerRule {
        const containerRule: ContainerRule = { name, condition, rules: this.rulesToCSSRules(rules) };
        this.containerRules.push(containerRule);
        return containerRule;
    }

    addContainer(name: string, styles: Record<string, string | number>): CSSRule {
        const containerStyles = { ...styles, containerName: name };
        return this.addClass(name, containerStyles);
    }

    supports(condition: string, rules: Record<string, Record<string, string | number>>): SupportsRule {
        const supportsRule: SupportsRule = { condition, rules: this.rulesToCSSRules(rules) };
        this.supportsRules.push(supportsRule);
        return supportsRule;
    }

    layerOrder(...layers: string[]): void {
        this._layerOrder = layers;
    }

    layer(name: string, rules: Record<string, Record<string, string | number>>): LayerRule {
        const layerRule: LayerRule = { name, rules: this.rulesToCSSRules(rules) };
        this.layerRules.push(layerRule);
        return layerRule;
    }

    add(rules: Record<string, Record<string, string | number>>): CSSRule[] {
        return Object.entries(rules).map(([selector, styles]) => {
            const rule: CSSRule = { selector, styles, type: 'custom' };
            this.rules.push(rule);
            return rule;
        });
    }

    important(value: string | number): string {
        return `${value} !important`;
    }

    getVariables(): Record<string, string> {
        return Object.fromEntries(this.variables.map((variable) => [variable.name, variable.value]));
    }

    resolveNativeStyles(
        target: StyleSelectorTarget,
        ancestors: StyleSelectorTarget[] = [],
        options: NativeStyleResolveOptions = {},
    ): Record<string, string | number> {
        return this.nativeStyleResolver.resolveNativeStyles(target, ancestors, options, this.getResolverContext());
    }

    resolveClassStyles(classNames: string[]): Record<string, string | number> {
        return this.nativeStyleResolver.resolveClassStyles(classNames, this.getResolverContext());
    }

    render(...additionalRules: StyleRenderInput[]): string {
        return renderStyleSheet(this.getRenderContext(), ...additionalRules);
    }

    inject(styleId?: string): HTMLStyleElement {
        const css = this.render();
        const style = document.createElement('style');
        if (styleId) {
            style.id = styleId;
        }
        style.textContent = css;
        document.head.appendChild(style);
        return style;
    }

    clear(): void {
        this.variables.length = 0;
        this.rules.length = 0;
        this.mediaRules.length = 0;
        this.keyframes.length = 0;
        this.fontFaces.length = 0;
        this.imports.length = 0;
        this.containerRules.length = 0;
        this.supportsRules.length = 0;
        this.layerRules.length = 0;
        this._layerOrder.length = 0;
    }

    private getResolverContext() {
        return {
            variables: this.getVariables(),
            rules: this.rules,
            mediaRules: this.mediaRules,
            containerRules: this.containerRules,
            supportsRules: this.supportsRules,
            layerRules: this.layerRules,
            layerOrder: this._layerOrder,
        };
    }

    private getRenderContext() {
        return {
            imports: this.imports,
            layerOrder: this._layerOrder,
            variables: this.variables,
            fontFaces: this.fontFaces,
            keyframes: this.keyframes,
            rules: this.rules,
            mediaRules: this.mediaRules,
            containerRules: this.containerRules,
            supportsRules: this.supportsRules,
            layerRules: this.layerRules,
        };
    }

    private createAndAddRule(selector: string, styles: Record<string, string | number>, type: CSSRule['type'] = 'custom'): CSSRule {
        const rule: CSSRule = { selector, styles, type };
        this.rules.push(rule);
        return rule;
    }

    private rulesToCSSRules(rules: Record<string, Record<string, string | number>>): CSSRule[] {
        return Object.entries(rules).map(([selector, styles]) => ({
            selector,
            styles,
            type: 'custom' as const,
        }));
    }
}

export const styles = new CreateStyle(getSharedStyleStore());

export const {
    addVar, var: getVar,
    addTag, addClass, addId,
    addPseudoClass, addPseudoElement, addAttribute, attrEquals, attrContainsWord, attrStartsWith, attrEndsWith, attrContains,
    descendant, child: childStyle, adjacentSibling, generalSibling, multiple: multipleStyle,
    addName, nesting,
    keyframe, keyframeFromTo,
    fontFace,
    import: importStyle,
    media: mediaStyle,
    mediaScreen, mediaPrint, mediaMinWidth, mediaMaxWidth, mediaDark, mediaLight, mediaReducedMotion,
    container, addContainer,
    supports: supportsStyle,
    layerOrder, layer,
    add: addStyle, important,
    getVariables: getStyleVariables,
    resolveNativeStyles,
    resolveClassStyles,
    render: renderStyle, inject: injectStyle, clear: clearStyle,
} = styles;

export default styles;