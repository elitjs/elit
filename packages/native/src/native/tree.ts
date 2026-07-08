import { ELIT_NATIVE_BINDING, type NativeBindingMetadata } from '../../client/state';
import type { Child, Props, VNode } from '../../core/types';
import type {
    NativeBindingReference,
    NativeElementNode,
    NativeNode,
    NativePropObject,
    NativePropValue,
    NativeStateDescriptor,
    NativeStateValueType,
    NativeTextNode,
    NativeTransformContext,
    NativeTransformOptions,
    NativeTree,
    StateLike,
} from '../types';
import { isCheckboxInput, isRangeInput } from '../interaction';
import { attachDesktopNativeMetadata } from '../vector';

const DEFAULT_COMPONENT_MAP: Record<string, string> = {
    html: 'Screen',
    body: 'Screen',
    main: 'Screen',
    section: 'View',
    address: 'View',
    header: 'View',
    footer: 'View',
    nav: 'View',
    article: 'View',
    aside: 'View',
    div: 'View',
    dl: 'View',
    dt: 'View',
    dd: 'View',
    map: 'View',
    figure: 'View',
    figcaption: 'Text',
    details: 'View',
    dialog: 'View',
    form: 'View',
    fieldset: 'View',
    datalist: 'View',
    optgroup: 'View',
    menu: 'View',
    ul: 'List',
    ol: 'List',
    li: 'ListItem',
    table: 'Table',
    tbody: 'View',
    thead: 'View',
    tfoot: 'View',
    tr: 'Row',
    td: 'Cell',
    th: 'Cell',
    caption: 'Text',
    h1: 'Text',
    h2: 'Text',
    h3: 'Text',
    h4: 'Text',
    h5: 'Text',
    h6: 'Text',
    p: 'Text',
    span: 'Text',
    label: 'Text',
    legend: 'Text',
    summary: 'Text',
    strong: 'Text',
    em: 'Text',
    b: 'Text',
    bdi: 'Text',
    bdo: 'Text',
    i: 'Text',
    small: 'Text',
    code: 'Text',
    data: 'Text',
    mark: 'Text',
    q: 'Text',
    cite: 'Text',
    ruby: 'Text',
    rp: 'Text',
    rt: 'Text',
    s: 'Text',
    time: 'Text',
    sub: 'Text',
    sup: 'Text',
    u: 'Text',
    del: 'Text',
    ins: 'Text',
    output: 'Text',
    abbr: 'Text',
    dfn: 'Text',
    kbd: 'Text',
    samp: 'Text',
    blockquote: 'Text',
    pre: 'Text',
    hr: 'Divider',
    button: 'Button',
    a: 'Link',
    input: 'TextInput',
    textarea: 'TextInput',
    select: 'Picker',
    option: 'Option',
    progress: 'Progress',
    meter: 'Progress',
    img: 'Image',
    picture: 'Image',
    audio: 'Media',
    video: 'Media',
    canvas: 'Canvas',
    iframe: 'WebView',
    object: 'WebView',
    embed: 'WebView',
    portal: 'WebView',
    svg: 'Vector',
};

const DEFAULT_OPTIONS: Required<Omit<NativeTransformOptions, 'tagMap'>> = {
    platform: 'generic',
    wrapTextNodes: true,
    preserveUnknownTags: false,
};

const NON_RENDERING_NATIVE_TAGS = new Set([
    'head',
    'title',
    'base',
    'link',
    'meta',
    'style',
    'script',
    'noscript',
    'template',
    'source',
    'track',
    'param',
    'area',
    'col',
    'colgroup',
    'wbr',
]);

const TRANSPARENT_NATIVE_TAGS = new Set(['slot']);

const SVG_SOURCE_TAGS = new Set([
    'svg',
    'circle',
    'rect',
    'path',
    'line',
    'polyline',
    'polygon',
    'ellipse',
    'g',
    'text',
    'tspan',
    'defs',
    'linearGradient',
    'radialGradient',
    'stop',
    'pattern',
    'mask',
    'clipPath',
    'use',
    'symbol',
    'marker',
    'image',
    'foreignObject',
    'animate',
    'animateTransform',
    'animateMotion',
    'set',
    'filter',
    'feBlend',
    'feColorMatrix',
    'feComponentTransfer',
    'feComposite',
    'feConvolveMatrix',
    'feDiffuseLighting',
    'feDisplacementMap',
    'feFlood',
    'feGaussianBlur',
    'feMorphology',
    'feOffset',
    'feSpecularLighting',
    'feTile',
    'feTurbulence',
]);

const MATH_SOURCE_TAGS = new Set([
    'math',
    'mi',
    'mn',
    'mo',
    'ms',
    'mtext',
    'mrow',
    'mfrac',
    'msqrt',
    'mroot',
    'msub',
    'msup',
]);

const TEXT_CONTAINER_COMPONENTS = new Set(['Text']);

const EVENT_NAME_MAP: Record<string, string> = {
    onClick: 'press',
    onChange: 'change',
    onInput: 'input',
    onSubmit: 'submit',
};

function isStateLike(value: unknown): value is StateLike {
    return Boolean(
        value &&
        typeof value === 'object' &&
        'value' in value &&
        'subscribe' in value &&
        typeof (value as { subscribe?: unknown }).subscribe === 'function'
    );
}

function createNativeTransformContext(): NativeTransformContext {
    return {
        nextStateIndex: 0,
        stateIds: new WeakMap(),
        stateDescriptors: new Map(),
    };
}

function inferNativeStateValueType(value: unknown): NativeStateValueType {
    if (Array.isArray(value)) {
        return 'string-array';
    }

    if (typeof value === 'boolean') {
        return 'boolean';
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        return 'number';
    }

    return 'string';
}

function coerceNativeStateInitialValue(value: unknown, type: NativeStateValueType): string | number | boolean | string[] {
    if (type === 'string-array') {
        if (!Array.isArray(value)) {
            return [];
        }

        return value
            .filter((entry): entry is string | number | boolean => typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean')
            .map((entry) => String(entry));
    }

    if (type === 'boolean') {
        return Boolean(value);
    }

    if (type === 'number') {
        return typeof value === 'number' && Number.isFinite(value) ? value : 0;
    }

    return value == null ? '' : String(value);
}

function ensureNativeStateDescriptor(stateContext: NativeTransformContext, stateLike: StateLike): NativeStateDescriptor {
    const existingId = stateContext.stateIds.get(stateLike as object);
    if (existingId) {
        const existing = stateContext.stateDescriptors.get(existingId);
        if (!existing) {
            throw new Error(`Missing native state descriptor for ${existingId}`);
        }
        return existing;
    }

    const id = `state${stateContext.nextStateIndex++}`;
    const type = inferNativeStateValueType(stateLike.value);
    const descriptor: NativeStateDescriptor = {
        id,
        type,
        initialValue: coerceNativeStateInitialValue(stateLike.value, type),
    };

    stateContext.stateIds.set(stateLike as object, id);
    stateContext.stateDescriptors.set(id, descriptor);
    return descriptor;
}

function isPrimitiveNativeStateValue(value: unknown): value is string | number | boolean | null | undefined {
    return value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function readNativeBindingMetadata(props: Props): NativeBindingMetadata | undefined {
    const metadata = (props as Props & { [ELIT_NATIVE_BINDING]?: NativeBindingMetadata })[ELIT_NATIVE_BINDING];
    if (!metadata || typeof metadata !== 'object' || !('kind' in metadata) || !('state' in metadata)) {
        return undefined;
    }

    return metadata;
}

function isVNode(value: unknown): value is VNode {
    return Boolean(
        value &&
        typeof value === 'object' &&
        'tagName' in value &&
        'props' in value &&
        'children' in value
    );
}

export function isNativeTree(value: unknown): value is NativeTree {
    return Boolean(
        value &&
        typeof value === 'object' &&
        'platform' in value &&
        'roots' in value
    );
}

function isEventProp(key: string, value: unknown): boolean {
    return /^on[A-Z]/.test(key) && typeof value === 'function';
}

function serializeValue(value: unknown): NativePropValue | undefined {
    if (value == null || value === false) return undefined;
    if (isStateLike(value)) return serializeValue(value.value);

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }

    if (Array.isArray(value)) {
        const serialized = value
            .map((item) => serializeValue(item))
            .filter((item): item is NativePropValue => item !== undefined);
        return serialized;
    }

    if (typeof value === 'function') {
        return '[function]';
    }

    if (typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>);
        const serialized: NativePropObject = {};
        for (const [key, item] of entries) {
            const result = serializeValue(item);
            if (result !== undefined) {
                serialized[key] = result;
            }
        }
        return serialized;
    }

    return String(value);
}

function normalizeProps(
    component: string,
    props: Props,
    stateContext?: NativeTransformContext,
): { props: Record<string, NativePropValue>; events: string[] } {
    const normalized: Record<string, NativePropValue> = {};
    const events: string[] = [];

    for (const [key, rawValue] of Object.entries(props)) {
        if ((key === 'aria-invalid' || key === 'aria-pressed') && rawValue === false) {
            normalized[key] = false;
            continue;
        }

        if (rawValue == null || rawValue === false || key === 'ref') continue;

        if (isEventProp(key, rawValue)) {
            events.push(EVENT_NAME_MAP[key] ?? key.slice(2).toLowerCase());
            continue;
        }

        if (key === 'class' || key === 'className') {
            const classList = Array.isArray(rawValue)
                ? rawValue.map((item) => String(item))
                : String(rawValue).split(/\s+/).filter(Boolean);
            if (classList.length > 0) {
                normalized.classList = classList;
            }
            continue;
        }

        if (key === 'dangerouslySetInnerHTML' && typeof rawValue === 'object' && rawValue && '__html' in rawValue) {
            normalized.innerHTML = String((rawValue as { __html: unknown }).__html ?? '');
            continue;
        }

        const serialized = serializeValue(rawValue);
        if (serialized !== undefined) {
            normalized[key] = serialized;
        }
    }

    if (component === 'Image' && normalized.src !== undefined) {
        normalized.source = normalized.src;
        delete normalized.src;
    }

    if (component === 'Media') {
        if (normalized.src !== undefined) {
            normalized.source = normalized.src;
            delete normalized.src;
        }
    }

    if (component === 'WebView') {
        if (normalized.src !== undefined) {
            normalized.source = normalized.src;
            delete normalized.src;
        } else if (normalized.data !== undefined) {
            normalized.source = normalized.data;
        }
    }

    if (component === 'Link' && normalized.href !== undefined) {
        normalized.destination = normalized.href;
        delete normalized.href;
    }

    const nativeBinding = readNativeBindingMetadata(props);
    if (nativeBinding && stateContext) {
        const descriptor = ensureNativeStateDescriptor(stateContext, nativeBinding.state);
        const reference: NativeBindingReference = {
            id: descriptor.id,
            kind: nativeBinding.kind,
            valueType: descriptor.type,
        };

        normalized.nativeBinding = reference;
    }

    return { props: normalized, events };
}

function resolveComponent(tagName: string, options: Required<Omit<NativeTransformOptions, 'tagMap'>> & { tagMap: Record<string, string> }): string {
    if (options.tagMap[tagName]) return options.tagMap[tagName];
    if (DEFAULT_COMPONENT_MAP[tagName]) return DEFAULT_COMPONENT_MAP[tagName];
    if (SVG_SOURCE_TAGS.has(tagName)) return 'Vector';
    if (MATH_SOURCE_TAGS.has(tagName)) return 'Math';
    return options.preserveUnknownTags ? tagName : 'View';
}

function wrapTextNodeIfNeeded(node: NativeNode, parentComponent: string, options: Required<Omit<NativeTransformOptions, 'tagMap'>>): NativeNode {
    if (!options.wrapTextNodes || node.kind !== 'text') {
        return node;
    }

    if (TEXT_CONTAINER_COMPONENTS.has(parentComponent)) {
        return node;
    }

    return {
        kind: 'element',
        component: 'Text',
        sourceTag: '#text',
        props: {},
        events: [],
        children: [node],
    };
}

function toNativeNodes(
    child: Child,
    options: Required<Omit<NativeTransformOptions, 'tagMap'>> & { tagMap: Record<string, string> },
    parentComponent: string,
    stateContext: NativeTransformContext,
): NativeNode[] {
    if (child == null || child === false) return [];

    if (isStateLike(child)) {
        const descriptor = ensureNativeStateDescriptor(stateContext, child);
        if (isPrimitiveNativeStateValue(child.value)) {
            const textNode: NativeTextNode = {
                kind: 'text',
                value: String(child.value ?? ''),
                stateId: descriptor.id,
            };
            return [wrapTextNodeIfNeeded(textNode, parentComponent, options)];
        }

        return toNativeNodes(child.value as Child, options, parentComponent, stateContext);
    }

    if (Array.isArray(child)) {
        const nodes: NativeNode[] = [];
        for (const item of child) {
            const converted = toNativeNodes(item, options, parentComponent, stateContext);
            for (const node of converted) {
                nodes.push(wrapTextNodeIfNeeded(node, parentComponent, options));
            }
        }
        return nodes;
    }

    if (!isVNode(child)) {
        const textNode: NativeTextNode = { kind: 'text', value: String(child) };
        return [wrapTextNodeIfNeeded(textNode, parentComponent, options)];
    }

    if (!child.tagName) {
        const fragmentChildren: NativeNode[] = [];
        for (const item of child.children) {
            const converted = toNativeNodes(item, options, parentComponent, stateContext);
            for (const node of converted) {
                fragmentChildren.push(wrapTextNodeIfNeeded(node, parentComponent, options));
            }
        }
        return fragmentChildren;
    }

    if (TRANSPARENT_NATIVE_TAGS.has(child.tagName)) {
        const transparentChildren: NativeNode[] = [];
        for (const item of child.children) {
            const converted = toNativeNodes(item, options, parentComponent, stateContext);
            for (const node of converted) {
                transparentChildren.push(wrapTextNodeIfNeeded(node, parentComponent, options));
            }
        }
        return transparentChildren;
    }

    if (child.tagName === 'br') {
        return [wrapTextNodeIfNeeded({ kind: 'text', value: '\n' }, parentComponent, options)];
    }

    if (NON_RENDERING_NATIVE_TAGS.has(child.tagName)) {
        return [];
    }

    const component = resolveComponent(child.tagName, options);
    const childNodes: NativeNode[] = [];
    for (const item of child.children) {
        childNodes.push(...toNativeNodes(item, options, component, stateContext));
    }

    const { props, events } = normalizeProps(component, child.props, stateContext);
    const resolvedComponent = isCheckboxInput(child.tagName, props)
        ? 'Toggle'
        : isRangeInput(child.tagName, props)
            ? 'Slider'
            : component;

    if (resolvedComponent === 'Toggle' && isCheckboxInput(child.tagName, props)) {
        delete props.type;
    }

    const nativeNode: NativeElementNode = {
        kind: 'element',
        component: resolvedComponent,
        sourceTag: child.tagName,
        props,
        events,
        children: childNodes,
    };

    if (options.platform === 'generic') {
        attachDesktopNativeMetadata(nativeNode);
    }

    return [nativeNode];
}

export function renderNativeTree(input: Child, options: NativeTransformOptions = {}): NativeTree {
    const resolvedOptions = {
        ...DEFAULT_OPTIONS,
        ...options,
        tagMap: options.tagMap ?? {},
    };

    const stateContext = createNativeTransformContext();
    const roots = toNativeNodes(input, resolvedOptions, '__root__', stateContext);
    return {
        platform: resolvedOptions.platform,
        roots,
        stateDescriptors: [...stateContext.stateDescriptors.values()],
    };
}

export function renderNativeJson(input: Child, options: NativeTransformOptions = {}): string {
    return JSON.stringify(renderNativeTree(input, options), null, 2);
}