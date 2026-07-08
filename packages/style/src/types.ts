export interface CSSVariable {
    name: string;
    value: string;
    toString(): string;
}

export interface CSSRule {
    selector: string;
    styles: Record<string, string | number>;
    nested?: CSSRule[];
    type: 'tag' | 'class' | 'id' | 'pseudo-class' | 'pseudo-element' | 'name' | 'custom' | 'media' | 'attribute';
}

export interface MediaRule {
    type: string;
    condition: string;
    rules: CSSRule[];
}

export interface KeyframeStep {
    step: string | number;
    styles: Record<string, string | number>;
}

export interface Keyframes {
    name: string;
    steps: KeyframeStep[];
}

export interface FontFace {
    fontFamily: string;
    src: string;
    fontWeight?: string | number;
    fontStyle?: string;
    fontDisplay?: string;
    unicodeRange?: string;
}

export interface ContainerRule {
    name?: string;
    condition: string;
    rules: CSSRule[];
}

export interface SupportsRule {
    condition: string;
    rules: CSSRule[];
}

export interface LayerRule {
    name: string;
    rules: CSSRule[];
}

export interface StyleSelectorTarget {
    tagName?: string;
    classNames?: string[];
    attributes?: Record<string, string | number | boolean>;
    pseudoStates?: string[];
    previousSiblings?: StyleSelectorTarget[];
    nextSiblings?: StyleSelectorTarget[];
    children?: StyleSelectorTarget[];
    childIndex?: number;
    siblingCount?: number;
    sameTypeIndex?: number;
    sameTypeCount?: number;
    containerNames?: string[];
    containerWidth?: number;
    isContainer?: boolean;
    isScopeReference?: boolean;
}

export interface NativeStyleResolveOptions {
    viewportWidth?: number;
    viewportHeight?: number;
    colorScheme?: 'light' | 'dark';
    reducedMotion?: boolean;
    mediaType?: 'screen' | 'print' | 'all';
}

export type ParsedSelectorCombinator = 'descendant' | 'child' | 'adjacent-sibling' | 'general-sibling';

export interface ParsedAttributeSelector {
    name: string;
    operator?: '=' | '~=' | '^=' | '$=' | '*=';
    value?: string;
}

export interface ParsedSimpleSelector {
    tagName?: string;
    idName?: string;
    classNames: string[];
    attributes: ParsedAttributeSelector[];
    pseudoClasses: string[];
    combinator?: ParsedSelectorCombinator;
}

export interface ParsedSelectorCursor {
    target: StyleSelectorTarget;
    ancestorIndex: number;
    previousSiblings: StyleSelectorTarget[];
}

export interface CreateStyleStore {
    variables: CSSVariable[];
    rules: CSSRule[];
    mediaRules: MediaRule[];
    keyframes: Keyframes[];
    fontFaces: FontFace[];
    imports: string[];
    containerRules: ContainerRule[];
    supportsRules: SupportsRule[];
    layerRules: LayerRule[];
    layerOrder: string[];
}

export type StyleRenderInput = CSSRule | CSSRule[] | MediaRule | Keyframes | ContainerRule | SupportsRule | LayerRule | undefined | null;