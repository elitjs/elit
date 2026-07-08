import { type NativeStyleResolveOptions } from '../client/style';

export type NativePlatform = 'generic' | 'android' | 'ios';

export type NativePropScalar = string | number | boolean | null;
export interface NativePropObject {
    [key: string]: NativePropValue;
}
export type NativePropValue = NativePropScalar | NativePropObject | NativePropValue[];

export interface NativeTextNode {
    kind: 'text';
    value: string;
    stateId?: string;
}

export interface NativeElementNode {
    kind: 'element';
    component: string;
    sourceTag: string;
    props: Record<string, NativePropValue>;
    events: string[];
    children: NativeNode[];
}

export type NativeNode = NativeTextNode | NativeElementNode;

export interface NativeTree {
    platform: NativePlatform;
    roots: NativeNode[];
    stateDescriptors?: NativeStateDescriptor[];
}

export interface NativeTransformOptions {
    platform?: NativePlatform;
    tagMap?: Record<string, string>;
    wrapTextNodes?: boolean;
    preserveUnknownTags?: boolean;
}

export interface AndroidComposeOptions {
    packageName?: string;
    functionName?: string;
    includePackage?: boolean;
    includeImports?: boolean;
    includePreview?: boolean;
}

export interface SwiftUIOptions {
    structName?: string;
    includeImports?: boolean;
    includePreview?: boolean;
}

export type NativeHelperFlag = 'imagePlaceholder' | 'unsupportedPlaceholder' | 'uriHandler' | 'openUrlHandler' | 'downloadHandler' | 'bridge' | 'webViewSurface' | 'mediaSurface' | 'interactivePressState' | 'backgroundImage' | 'screenRoot';
export type NativeResolvedStyleMap = WeakMap<NativeElementNode, Record<string, NativePropValue>>;
export interface NativeStyleContextEntry {
    scope: NativeStyleScope;
    ancestors: NativeStyleScope[];
    inheritedTextStyles: Record<string, NativePropValue>;
}
export type NativeStyleContextMap = WeakMap<NativeElementNode, NativeStyleContextEntry>;

export interface NativeStyleScope {
    tagName: string;
    classNames: string[];
    attributes: Record<string, string>;
    pseudoStates: string[];
    previousSiblings?: NativeStyleScope[];
    nextSiblings?: NativeStyleScope[];
    children?: NativeStyleScope[];
    childIndex?: number;
    siblingCount?: number;
    sameTypeIndex?: number;
    sameTypeCount?: number;
    containerNames?: string[];
    containerWidth?: number;
    isContainer?: boolean;
}

export interface NativeRenderHints {
    fillWidth?: boolean;
    fillHeight?: boolean;
    availableWidth?: number;
    availableHeight?: number;
    negotiatedMaxWidth?: number;
    negotiatedMaxHeight?: number;
    parentFlexLayout?: 'Row' | 'Column';
    parentRowBaselineAlignment?: 'first' | 'last';
    absoluteOverlay?: boolean;
}

export interface NativeChunkedRow {
    items: NativeNode[];
    weights?: Array<number | undefined>;
    columnSizes?: Array<NativeGridColumnTrackSizeSpec | undefined>;
    minHeight?: number;
    height?: number;
    maxHeight?: number;
    trackWeight?: number;
    stretchEligible?: boolean;
}

export interface NativeGridTrackSizeSpec {
    minHeight?: number;
    height?: number;
    maxHeight?: number;
    trackWeight?: number;
    stretchEligible?: boolean;
    intrinsicHeight?: boolean;
    intrinsicMinHeight?: boolean;
    intrinsicMaxHeight?: boolean;
}

export interface NativeGridColumnTrackSizeSpec {
    minWidth?: number;
    width?: number;
    maxWidth?: number;
    trackWeight?: number;
    intrinsicWidth?: boolean;
    intrinsicMinWidth?: boolean;
    intrinsicMaxWidth?: boolean;
}

export type NativeVideoPosterFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
export type NativeVideoPosterPosition = 'center' | 'top' | 'bottom' | 'leading' | 'trailing' | 'top-leading' | 'top-trailing' | 'bottom-leading' | 'bottom-trailing';
export type NativeBackgroundRepeat = 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
export type NativeContentStackAlignment = 'start' | 'center' | 'end' | 'stretch' | 'space-between' | 'space-around' | 'space-evenly';
export type NativeGridItemAlignment = 'start' | 'center' | 'end' | 'stretch';

export interface NativeBackgroundLayerMetadata {
    source?: string;
    gradient?: NativeGradientValue;
    color?: NativeColorValue;
    repeat?: NativeBackgroundRepeat;
    size?: string;
    position?: string;
}

export interface NativeBackgroundImageSpec {
    kind: 'image';
    source: string;
    fit: NativeVideoPosterFit;
    position: NativeVideoPosterPosition;
    repeat: NativeBackgroundRepeat;
}

export type NativeBackgroundLayerSpec =
    | NativeBackgroundImageSpec
    | { kind: 'gradient'; gradient: NativeGradientValue }
    | { kind: 'color'; color: NativeColorValue };

export interface NativeGridTemplateAreaPlacement {
    rowPlacement: { start?: number; span: number };
    columnPlacement: { start?: number; span: number };
}

export interface NativeGridTrackDefinition {
    tracks: string[];
    lineNames: Map<string, number[]>;
    lineCount: number;
}

export interface NativeChunkedLayout {
    kind: 'grid' | 'wrap';
    rows: NativeChunkedRow[];
    rowGap?: number;
    columnGap?: number;
    contentAlignment?: NativeContentStackAlignment;
}

export interface NativeAutoMarginFlags {
    top: boolean;
    right: boolean;
    bottom: boolean;
    left: boolean;
}

export interface StateLike<T = unknown> {
    value: T;
    subscribe: (listener: (value: T) => void) => () => void;
}

export type NativeStateValueType = 'string' | 'number' | 'boolean' | 'string-array';

export interface NativeStateDescriptor {
    id: string;
    type: NativeStateValueType;
    initialValue: string | number | boolean | string[];
}

export interface NativeBindingReference extends NativePropObject {
    id: string;
    kind: 'value' | 'checked';
    valueType: NativeStateValueType;
}

export interface NativePickerOption {
    label: string;
    value: string;
    selected?: boolean;
    disabled?: boolean;
}

export interface NativeControlEventExpressionOptions {
    valueExpression?: string;
    valuesExpression?: string;
    checkedExpression?: string;
}

export interface NativeTransformContext {
    nextStateIndex: number;
    stateIds: WeakMap<object, string>;
    stateDescriptors: Map<string, NativeStateDescriptor>;
}

export interface AndroidComposeContext {
    textFieldIndex: number;
    sliderIndex: number;
    toggleIndex: number;
    pickerIndex: number;
    interactionIndex: number;
    stateDeclarations: string[];
    declaredStateIds: Set<string>;
    helperFlags: Set<NativeHelperFlag>;
    resolvedStyles: NativeResolvedStyleMap;
    styleContexts: NativeStyleContextMap;
    styleResolveOptions: NativeStyleResolveOptions;
    stateDescriptors: Map<string, NativeStateDescriptor>;
}

export interface SwiftUIContext {
    textFieldIndex: number;
    sliderIndex: number;
    toggleIndex: number;
    pickerIndex: number;
    interactionIndex: number;
    stateDeclarations: string[];
    declaredStateIds: Set<string>;
    helperFlags: Set<NativeHelperFlag>;
    resolvedStyles: NativeResolvedStyleMap;
    styleContexts: NativeStyleContextMap;
    styleResolveOptions: NativeStyleResolveOptions;
    stateDescriptors: Map<string, NativeStateDescriptor>;
}

export interface NativeColorValue {
    red: number;
    green: number;
    blue: number;
    alpha: number;
}

export type NativeGradientDirection =
    | 'topToBottom'
    | 'bottomToTop'
    | 'leadingToTrailing'
    | 'trailingToLeading'
    | 'topLeadingToBottomTrailing'
    | 'bottomTrailingToTopLeading';

export interface NativeGradientValue {
    colors: NativeColorValue[];
    direction: NativeGradientDirection;
}

export type NativeVectorPathCommand =
    | { kind: 'moveTo' | 'lineTo'; x: number; y: number }
    | { kind: 'cubicTo'; control1X: number; control1Y: number; control2X: number; control2Y: number; x: number; y: number }
    | { kind: 'close' };

export interface NativeIntrinsicSizeSpec {
    intrinsicWidth: number;
    intrinsicHeight: number;
}

export interface NativeCanvasPoint {
    x: number;
    y: number;
}

export type NativeCanvasDrawOperation =
    | {
        kind: 'rect';
        x?: number;
        y?: number;
        width: number;
        height: number;
        rx?: number;
        ry?: number;
        fill?: string;
        fillStyle?: string;
        stroke?: string;
        strokeStyle?: string;
        strokeWidth?: number;
        lineWidth?: number;
    }
    | {
        kind: 'circle';
        cx: number;
        cy: number;
        r: number;
        fill?: string;
        fillStyle?: string;
        stroke?: string;
        strokeStyle?: string;
        strokeWidth?: number;
        lineWidth?: number;
    }
    | {
        kind: 'ellipse';
        cx: number;
        cy: number;
        rx: number;
        ry: number;
        fill?: string;
        fillStyle?: string;
        stroke?: string;
        strokeStyle?: string;
        strokeWidth?: number;
        lineWidth?: number;
    }
    | {
        kind: 'line';
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        stroke?: string;
        strokeStyle?: string;
        strokeWidth?: number;
        lineWidth?: number;
    }
    | {
        kind: 'polyline' | 'polygon';
        points: string | NativeCanvasPoint[];
        fill?: string;
        fillStyle?: string;
        stroke?: string;
        strokeStyle?: string;
        strokeWidth?: number;
        lineWidth?: number;
    }
    | {
        kind: 'path';
        d: string;
        fill?: string;
        fillStyle?: string;
        stroke?: string;
        strokeStyle?: string;
        strokeWidth?: number;
        lineWidth?: number;
    };

export type NativeVectorShape =
    | {
        kind: 'circle';
        cx: number;
        cy: number;
        r: number;
        fill?: NativeColorValue;
        stroke?: NativeColorValue;
        strokeWidth?: number;
    }
    | {
        kind: 'rect';
        x: number;
        y: number;
        width: number;
        height: number;
        rx?: number;
        ry?: number;
        fill?: NativeColorValue;
        stroke?: NativeColorValue;
        strokeWidth?: number;
    }
    | {
        kind: 'ellipse';
        cx: number;
        cy: number;
        rx: number;
        ry: number;
        fill?: NativeColorValue;
        stroke?: NativeColorValue;
        strokeWidth?: number;
    }
    | {
        kind: 'path';
        commands: NativeVectorPathCommand[];
        fill?: NativeColorValue;
        stroke?: NativeColorValue;
        strokeWidth?: number;
    };

export interface NativeVectorViewport {
    minX: number;
    minY: number;
    width: number;
    height: number;
}

export interface NativeVectorSpec extends NativeIntrinsicSizeSpec {
    viewport: NativeVectorViewport;
    shapes: NativeVectorShape[];
}

export interface NativeCanvasSpec extends NativeIntrinsicSizeSpec {
}

export interface NativeFlexStyleValues {
    grow?: number;
    shrink?: number;
    basis?: NativePropValue;
}

export interface NativeShadowValue {
    offsetX: number;
    offsetY: number;
    blur: number;
    color: NativeColorValue;
}

export type NativeBorderStyleKeyword = 'solid' | 'dashed' | 'dotted' | 'none' | 'unsupported';

export interface NativeBorderSideValue {
    width: string;
    color: NativeColorValue;
    style?: NativeBorderStyleKeyword;
}

export interface NativeBorderValue {
    width?: string;
    color?: NativeColorValue;
    style?: NativeBorderStyleKeyword;
    top?: NativeBorderSideValue;
    right?: NativeBorderSideValue;
    bottom?: NativeBorderSideValue;
    left?: NativeBorderSideValue;
}