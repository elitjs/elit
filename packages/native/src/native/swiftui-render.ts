import type { Child } from '../../core/types';
import type {
    NativeElementNode,
    NativeNode,
    NativePropValue,
    NativeRenderHints,
    NativeTextNode,
    NativeTree,
    SwiftUIContext,
    SwiftUIOptions,
} from '../types';
import { getNativeStyleResolveOptions } from '../units';
import {
    resolveNativeObjectFitStyle,
    resolveNativeObjectPositionStyle,
} from '../background';
import {
    toNativeBoolean,
    isNativeMuted,
    shouldNativeShowVideoControls,
    resolveNativeVideoPoster,
    shouldNativePlayInline,
    resolveNativeMediaLabel,
    resolveImageFallbackLabel,
    resolveNativeAccessibilityLabel,
    resolveNativeSurfaceSource,
} from '../interaction';
import { quoteSwiftString, flattenTextContent } from '../strings';
import {
    buildNativeVectorSpec,
    buildNativeCanvasSpec,
    buildNativeCanvasDrawingSpec,
} from '../vector';
import {
    buildSwiftCanvasSurfaceLines,
    buildSwiftVectorCanvasLines,
} from '../canvas';
import {
    appendSwiftUIModifiers,
    appendSwiftUIOverlays,
} from '../render-support';
import {
    createNativeStateDescriptorMap,
    ensureSwiftStateVariable,
    toSwiftTextValueExpression,
    buildSwiftTextExpression,
} from '../state';
import {
    resolveTextTransform,
    applyTextTransform,
} from '../typography';
import {
    hasExplicitNativeWidthStyle,
    hasExplicitNativeHeightStyle,
} from '../layout';
import {
    splitAbsolutePositionedChildren,
    splitFixedPositionedChildren,
} from './chunked-layout';
import { isNativeTree, renderNativeTree } from './tree';
import {
    buildRootResolvedStyleData,
    getStyleObject,
} from './style-resolve';
import { buildSwiftUIModifiers } from './swiftui-style';
import {
    renderSwiftUIChildren,
    renderSwiftUIContainerBody,
} from './swiftui-layout-render';
import { renderSwiftUIControlNode } from './swiftui-control-render';

function indent(level: number): string {
    return '    '.repeat(level);
}

function renderTextView(node: NativeTextNode, level: number, context: SwiftUIContext): string[] {
    if (node.stateId) {
        const { descriptor, variableName } = ensureSwiftStateVariable(context, node.stateId);
        return [`${indent(level)}Text(${toSwiftTextValueExpression(variableName, descriptor)})`];
    }

    return [`${indent(level)}Text(${quoteSwiftString(node.value)})`];
}

function renderSwiftUIContainerNode(
    node: NativeElementNode,
    level: number,
    context: SwiftUIContext,
    hints: NativeRenderHints,
    baseLines: string[],
): string[] {
    const { flowChildren: nonFixedChildren, fixedChildren } = splitFixedPositionedChildren(
        node.children,
        context.resolvedStyles,
        context.styleResolveOptions,
    );
    const { flowChildren, absoluteChildren } = splitAbsolutePositionedChildren(
        nonFixedChildren,
        context.resolvedStyles,
        context.styleResolveOptions,
    );
    const hasOverlays = absoluteChildren.length > 0 || fixedChildren.length > 0;
    const flowNode = hasOverlays ? { ...node, children: flowChildren } : node;
    const contentLines = renderSwiftUIContainerBody(flowNode, level, context, hints, renderSwiftUINode);

    if (!hasOverlays) {
        return [...baseLines, ...contentLines];
    }

    const overlays = [
        ...absoluteChildren.map((child) => renderSwiftUINode(child, level + 2, context, { ...hints, absoluteOverlay: true })),
        ...fixedChildren.map((child) => renderSwiftUINode(child, level + 2, context, {
            ...hints,
            absoluteOverlay: true,
            fillWidth: true,
            fillHeight: true,
        })),
    ];

    return [...baseLines, ...appendSwiftUIOverlays(contentLines, overlays, level)];
}

function renderSwiftUnsupportedFallback(
    node: NativeElementNode,
    level: number,
    context: SwiftUIContext,
    baseLines: string[],
    modifiers: string[],
    label: string,
): string[] {
    context.helperFlags.add('unsupportedPlaceholder');
    const sourceTag = node.sourceTag ?? node.component.toLowerCase();
    return appendSwiftUIModifiers(
        [
            ...baseLines,
            `${indent(level)}elitUnsupportedPlaceholder(label: ${quoteSwiftString(label)}, sourceTag: ${quoteSwiftString(sourceTag)})`,
        ],
        modifiers,
        level,
    );
}

function renderSwiftUINode(
    node: NativeNode,
    level: number,
    context: SwiftUIContext,
    hints: NativeRenderHints = {},
): string[] {
    if (node.kind === 'text') {
        return renderTextView(node, level, context);
    }

    const modifiers = buildSwiftUIModifiers(node, context.resolvedStyles, hints, context.styleResolveOptions);
    const classComment = Array.isArray(node.props.classList) && node.props.classList.length > 0
        ? `${indent(level)}// classList: ${(node.props.classList as NativePropValue[]).map((item) => String(item)).join(' ')}`
        : undefined;
    const baseLines: string[] = [];
    if (classComment) {
        baseLines.push(classComment);
    }

    if (node.component === 'Text') {
        const style = getStyleObject(node, context.resolvedStyles, context.styleResolveOptions);
        const dynamicText = buildSwiftTextExpression(node.children, context, resolveTextTransform(style?.textTransform));
        const staticText = applyTextTransform(flattenTextContent(node.children), resolveTextTransform(style?.textTransform));
        return appendSwiftUIModifiers(
            [...baseLines, `${indent(level)}Text(${dynamicText ?? quoteSwiftString(staticText)})`],
            modifiers,
            level,
        );
    }

    const controlLines = renderSwiftUIControlNode(node, level, context, hints, baseLines);
    if (controlLines) {
        return controlLines;
    }

    if (node.component === 'Image') {
        context.helperFlags.add('imagePlaceholder');
        context.helperFlags.add('backgroundImage');
        const source = resolveNativeSurfaceSource(node) ?? '';
        const alt = typeof node.props.alt === 'string' ? node.props.alt : undefined;
        const fallbackLabel = resolveImageFallbackLabel(source, alt);
        const imageStyle = getStyleObject(node, context.resolvedStyles, context.styleResolveOptions);
        const objectFit = resolveNativeObjectFitStyle(imageStyle);
        const objectPosition = resolveNativeObjectPositionStyle(imageStyle);
        const imageArgs = [
            `source: ${quoteSwiftString(source)}`,
            `label: ${quoteSwiftString(fallbackLabel)}`,
            `alt: ${alt ? quoteSwiftString(alt) : 'nil'}`,
        ];
        if (objectFit !== 'cover') {
            imageArgs.push(`objectFit: ${quoteSwiftString(objectFit)}`);
        }
        if (objectPosition !== 'center') {
            imageArgs.push(`objectPosition: ${quoteSwiftString(objectPosition)}`);
        }
        return appendSwiftUIModifiers(
            [
                ...baseLines,
                `${indent(level)}elitImageSurface(${imageArgs.join(', ')})`,
            ],
            modifiers,
            level,
        );
    }

    if (node.component === 'Vector') {
        const vectorSpec = buildNativeVectorSpec(node);
        if (vectorSpec) {
            const style = getStyleObject(node, context.resolvedStyles, context.styleResolveOptions);
            const canvas = buildSwiftVectorCanvasLines(
                vectorSpec,
                level,
                modifiers,
                hasExplicitNativeWidthStyle(style),
                hasExplicitNativeHeightStyle(style),
            );
            return [...baseLines, ...appendSwiftUIModifiers(canvas.lines, canvas.modifiers, level)];
        }
    }

    if (node.component === 'Canvas') {
        const canvasSpec = buildNativeCanvasSpec(node);
        const drawingSpec = buildNativeCanvasDrawingSpec(node);
        const style = getStyleObject(node, context.resolvedStyles, context.styleResolveOptions);
        const canvas = buildSwiftCanvasSurfaceLines(
            canvasSpec,
            drawingSpec,
            level,
            modifiers,
            hasExplicitNativeWidthStyle(style),
            hasExplicitNativeHeightStyle(style),
        );
        return [...baseLines, ...appendSwiftUIModifiers(canvas.lines, canvas.modifiers, level)];
    }

    if (node.component === 'WebView') {
        const source = resolveNativeSurfaceSource(node);
        if (!source) {
            return renderSwiftUnsupportedFallback(node, level, context, baseLines, modifiers, 'WebView');
        }
        context.helperFlags.add('webViewSurface');
        const label = resolveNativeAccessibilityLabel(node) ?? 'Web content';
        return appendSwiftUIModifiers(
            [
                ...baseLines,
                `${indent(level)}ElitWebViewSurface(source: ${quoteSwiftString(source)}, label: ${quoteSwiftString(label)})`,
            ],
            modifiers,
            level,
        );
    }

    if (node.component === 'Media') {
        const source = resolveNativeSurfaceSource(node);
        if (!source) {
            return renderSwiftUnsupportedFallback(node, level, context, baseLines, modifiers, 'Media');
        }
        context.helperFlags.add('mediaSurface');
        const label = resolveNativeMediaLabel(node);
        const style = getStyleObject(node, context.resolvedStyles, context.styleResolveOptions);
        const objectFit = resolveNativeObjectFitStyle(style);
        const objectPosition = resolveNativeObjectPositionStyle(style);
        const autoPlay = toNativeBoolean(node.props.autoPlay ?? node.props.autoplay);
        const muted = isNativeMuted(node);

        if (node.sourceTag === 'audio') {
            return appendSwiftUIModifiers(
                [
                    ...baseLines,
                    `${indent(level)}ElitAudioSurface(source: ${quoteSwiftString(source)}, label: ${quoteSwiftString(label)}, autoPlay: ${autoPlay ? 'true' : 'false'}, muted: ${muted ? 'true' : 'false'})`,
                ],
                modifiers,
                level,
            );
        }

        const poster = resolveNativeVideoPoster(node);
        const controls = shouldNativeShowVideoControls(node);
        const playsInline = shouldNativePlayInline(node);
        const videoArgs = [
            `source: ${quoteSwiftString(source)}`,
            `label: ${quoteSwiftString(label)}`,
            `autoPlay: ${autoPlay ? 'true' : 'false'}`,
            `muted: ${muted ? 'true' : 'false'}`,
            `controls: ${controls ? 'true' : 'false'}`,
            `poster: ${poster ? quoteSwiftString(poster) : 'nil'}`,
            `playsInline: ${playsInline ? 'true' : 'false'}`,
        ];
        if (objectFit !== 'cover') {
            videoArgs.push(`posterFit: ${quoteSwiftString(objectFit)}`);
        }
        if (objectPosition !== 'center') {
            videoArgs.push(`posterPosition: ${quoteSwiftString(objectPosition)}`);
        }
        return appendSwiftUIModifiers(
            [
                ...baseLines,
                `${indent(level)}ElitVideoSurface(${videoArgs.join(', ')})`,
            ],
            modifiers,
            level,
        );
    }

    if (node.component === 'Math') {
        return renderSwiftUnsupportedFallback(node, level, context, baseLines, modifiers, 'Math');
    }

    if (node.component === 'Cell') {
        const style = getStyleObject(node, context.resolvedStyles, context.styleResolveOptions);
        const cellHints: NativeRenderHints = {
            ...hints,
            ...(!hasExplicitNativeWidthStyle(style) ? { fillWidth: true } : {}),
            ...(!hasExplicitNativeHeightStyle(style) && hints.fillHeight ? { fillHeight: true } : {}),
        };
        return renderSwiftUIContainerNode(node, level, context, cellHints, baseLines);
    }

    if (node.children.length > 0 || node.component === 'Screen') {
        return renderSwiftUIContainerNode(node, level, context, hints, baseLines);
    }

    context.helperFlags.add('unsupportedPlaceholder');
    const label = flattenTextContent(node.children) || node.component;
    return appendSwiftUIModifiers(
        [...baseLines, `${indent(level)}Text(${quoteSwiftString(label)})`],
        modifiers,
        level,
    );
}

function buildSwiftUIHelpers(context: SwiftUIContext): string[] {
    const helpers: string[] = [];

    if (context.helperFlags.has('bridge')) {
        helpers.push('');
        helpers.push('private enum ElitNativeBridge {');
        helpers.push('    static var onAction: ((String, String?, String?) -> Void)?');
        helpers.push('    static var onNavigate: ((String) -> Void)?');
        helpers.push('    static func dispatch(action: String? = nil, route: String? = nil, payloadJson: String? = nil) {');
        helpers.push('        print("ElitNativeBridge", action ?? "", route ?? "", payloadJson ?? "")');
        helpers.push('    }');
        helpers.push('');
        helpers.push('    static func controlEventPayload(event: String, sourceTag: String, inputType: String? = nil, value: String? = nil, values: [String]? = nil, checked: Bool? = nil, detailJson: String? = nil) -> String {');
        helpers.push('        var parts: [String] = []');
        helpers.push('        parts.append("\"event\":\"\(event)\"")');
        helpers.push('        parts.append("\"sourceTag\":\"\(sourceTag)\"")');
        helpers.push('        if let inputType { parts.append("\"inputType\":\"\(inputType)\"") }');
        helpers.push('        if let value { parts.append("\"value\":\"\(value)\"") }');
        helpers.push('        if let values { parts.append("\"values\":\"\(values.joined(separator: ","))\"") }');
        helpers.push('        if let checked { parts.append("\"checked\":\"\(checked)\"") }');
        helpers.push('        if let detailJson { parts.append("\"detail\":\(detailJson)") }');
        helpers.push('        return "{\(parts.joined(separator: ","))}"');
        helpers.push('    }');
        helpers.push('}');
    }

    if (context.helperFlags.has('downloadHandler')) {
        helpers.push('');
        helpers.push('private func elitDownloadFile(from source: String, suggestedName: String? = nil) {');
        helpers.push('    print("Download", source, suggestedName ?? "")');
        helpers.push('}');
    }

    if (context.helperFlags.has('backgroundImage') || context.helperFlags.has('imagePlaceholder')) {
        helpers.push('');
        helpers.push('@ViewBuilder');
        helpers.push('private func elitBackgroundImage(_ image: Image, backgroundSize: String = "cover", backgroundPosition: String = "center", backgroundRepeat: String = "no-repeat") -> some View {');
        helpers.push('    image');
        helpers.push('        .resizable()');
        helpers.push('        .scaledToFill()');
        helpers.push('}');
        helpers.push('');
        helpers.push('@ViewBuilder');
        helpers.push('private func elitBackgroundImageSurface(source: String, objectFit: String = "cover", objectPosition: String = "center") -> some View {');
        helpers.push('    if let url = URL(string: source), !source.isEmpty {');
        helpers.push('        AsyncImage(url: url) { phase in');
        helpers.push('            switch phase {');
        helpers.push('            case .success(let image):');
        helpers.push('                elitBackgroundImage(image, backgroundSize: objectFit, backgroundPosition: objectPosition, backgroundRepeat: "no-repeat")');
        helpers.push('            default:');
        helpers.push('                Color.clear');
        helpers.push('            }');
        helpers.push('        }');
        helpers.push('    } else {');
        helpers.push('        Color.clear');
        helpers.push('    }');
        helpers.push('}');
        helpers.push('');
        helpers.push('@ViewBuilder');
        helpers.push('private func elitImageSurface(source: String, label: String, alt: String?, objectFit: String = "cover", objectPosition: String = "center") -> some View {');
        helpers.push('    if source.isEmpty {');
        helpers.push('        Text(alt ?? label)');
        helpers.push('            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)');
        helpers.push('    } else {');
        helpers.push('        elitBackgroundImageSurface(source: source, objectFit: objectFit, objectPosition: objectPosition)');
        helpers.push('    }');
        helpers.push('}');
    }

    if (context.helperFlags.has('webViewSurface')) {
        helpers.push('');
        helpers.push('struct ElitWebViewSurface: UIViewRepresentable {');
        helpers.push('    let source: String');
        helpers.push('    let label: String?');
        helpers.push('');
        helpers.push('    func makeUIView(context: Context) -> WKWebView {');
        helpers.push('        let webView = WKWebView()');
        helpers.push('        webView.accessibilityLabel = label');
        helpers.push('        if let url = URL(string: source), !source.isEmpty { webView.load(URLRequest(url: url)) }');
        helpers.push('        return webView');
        helpers.push('    }');
        helpers.push('');
        helpers.push('    func updateUIView(_ uiView: WKWebView, context: Context) {}');
        helpers.push('}');
    }

    if (context.helperFlags.has('mediaSurface')) {
        helpers.push('');
        helpers.push('private func elitPosterAlignment(_ posterPosition: String) -> Alignment {');
        helpers.push('    switch posterPosition.lowercased() {');
        helpers.push('    case "top", "leading", "top-leading":');
        helpers.push('        return .topLeading');
        helpers.push('    case "bottom", "trailing", "bottom-trailing":');
        helpers.push('        return .bottomTrailing');
        helpers.push('    case "center":');
        helpers.push('        return .center');
        helpers.push('    default:');
        helpers.push('        return .center');
        helpers.push('    }');
        helpers.push('}');
        helpers.push('');
        helpers.push('@ViewBuilder');
        helpers.push('private func elitPosterImage(_ image: Image, posterFit: String, posterPosition: String) -> some View {');
        helpers.push('    let resizable = image.resizable()');
        helpers.push('    switch posterFit.lowercased() {');
        helpers.push('    case "contain":');
        helpers.push('        return AnyView(resizable.scaledToFit().frame(maxWidth: .infinity, maxHeight: .infinity, alignment: elitPosterAlignment(posterPosition)))');
        helpers.push('    case "fill", "cover":');
        helpers.push('        return AnyView(resizable.scaledToFill().frame(maxWidth: .infinity, maxHeight: .infinity, alignment: elitPosterAlignment(posterPosition)))');
        helpers.push('    default:');
        helpers.push('        return AnyView(resizable.scaledToFill())');
        helpers.push('    }');
        helpers.push('}');
        helpers.push('');
        helpers.push('struct ElitVideoPlayerController: UIViewControllerRepresentable {');
        helpers.push('    let source: String');
        helpers.push('    let autoPlay: Bool');
        helpers.push('    let muted: Bool');
        helpers.push('    let controls: Bool');
        helpers.push('    let playsInline: Bool');
        helpers.push('');
        helpers.push('    func makeUIViewController(context: Context) -> AVPlayerViewController {');
        helpers.push('        let controller = AVPlayerViewController()');
        helpers.push('        if let url = URL(string: source) {');
        helpers.push('            let player = AVPlayer(url: url)');
        helpers.push('            let resolvedPlayer = player');
        helpers.push('            resolvedPlayer.isMuted = muted');
        helpers.push('            controller.player = resolvedPlayer');
        helpers.push('            if autoPlay { resolvedPlayer.play() }');
        helpers.push('        }');
        helpers.push('        controller.showsPlaybackControls = controls');
        helpers.push('        controller.entersFullScreenWhenPlaybackBegins = !playsInline');
        helpers.push('        return controller');
        helpers.push('    }');
        helpers.push('');
        helpers.push('    func updateUIViewController(_ controller: AVPlayerViewController, context: Context) {}');
        helpers.push('}');
        helpers.push('');
        helpers.push('struct ElitVideoSurface: View {');
        helpers.push('    let source: String');
        helpers.push('    let label: String');
        helpers.push('    let autoPlay: Bool');
        helpers.push('    let muted: Bool');
        helpers.push('    let controls: Bool');
        helpers.push('    let poster: String?');
        helpers.push('    let playsInline: Bool');
        helpers.push('    let posterFit: String');
        helpers.push('    let posterPosition: String');
        helpers.push('');
        helpers.push('    var body: some View {');
        helpers.push('        ZStack {');
        helpers.push('            if let poster, !poster.isEmpty, let posterURL = URL(string: poster) {');
        helpers.push('                AsyncImage(url: posterURL) { phase in');
        helpers.push('                    switch phase {');
        helpers.push('                    case .success(let image):');
        helpers.push('                        elitPosterImage(image, posterFit: posterFit, posterPosition: posterPosition)');
        helpers.push('                    default:');
        helpers.push('                        Color.clear');
        helpers.push('                    }');
        helpers.push('                }');
        helpers.push('            }');
        helpers.push('            ElitVideoPlayerController(source: source, autoPlay: autoPlay, muted: muted, controls: controls, playsInline: playsInline)');
        helpers.push('                .accessibilityLabel(label)');
        helpers.push('        }');
        helpers.push('    }');
        helpers.push('}');
        helpers.push('');
        helpers.push('struct ElitAudioSurface: View {');
        helpers.push('    let source: String');
        helpers.push('    let label: String');
        helpers.push('    let autoPlay: Bool');
        helpers.push('    let muted: Bool');
        helpers.push('');
        helpers.push('    var body: some View {');
        helpers.push('        VStack {');
        helpers.push('            if let url = URL(string: source), !source.isEmpty {');
        helpers.push('                AVPlayer(url: url).let { resolvedPlayer in');
        helpers.push('                    resolvedPlayer.isMuted = muted');
        helpers.push('                    if autoPlay { resolvedPlayer.play() }');
        helpers.push('                }');
        helpers.push('            }');
        helpers.push('            Label(label, systemImage: "waveform")');
        helpers.push('                .accessibilityLabel(label)');
        helpers.push('        }');
        helpers.push('    }');
        helpers.push('}');
    }

    if (context.helperFlags.has('unsupportedPlaceholder')) {
        helpers.push('');
        helpers.push('@ViewBuilder');
        helpers.push('private func elitUnsupportedPlaceholder(label: String, sourceTag: String) -> some View {');
        helpers.push('    VStack(spacing: 8) {');
        helpers.push('        Text(label)');
        helpers.push('        Text(sourceTag)');
        helpers.push('            .font(.caption)');
        helpers.push('            .foregroundStyle(.secondary)');
        helpers.push('    }');
        helpers.push('}');
    }

    return helpers;
}

export function renderSwiftUI(input: Child | NativeTree, options: SwiftUIOptions = {}): string {
    const tree = isNativeTree(input)
        ? input
        : renderNativeTree(input, { platform: 'ios' });

    const resolvedOptions = {
        structName: options.structName ?? 'ElitScreen',
        includeImports: options.includeImports ?? true,
        includePreview: options.includePreview ?? false,
    };

    const styleResolveOptions = getNativeStyleResolveOptions('ios');
    const styleData = buildRootResolvedStyleData(tree.roots, styleResolveOptions);

    const context: SwiftUIContext = {
        textFieldIndex: 0,
        sliderIndex: 0,
        toggleIndex: 0,
        pickerIndex: 0,
        interactionIndex: 0,
        stateDeclarations: [],
        stateDescriptors: createNativeStateDescriptorMap(tree),
        declaredStateIds: new Set(),
        helperFlags: new Set(),
        styleResolveOptions,
        resolvedStyles: styleData.resolvedStyles,
        styleContexts: styleData.styleContexts,
    };

    const singleRoot = tree.roots.length === 1 ? tree.roots[0] : null;
    const isSingleScreenRoot = singleRoot !== null
        && singleRoot.kind === 'element'
        && singleRoot.component === 'Screen';
    const innerLines = tree.roots.length === 1
        ? renderSwiftUINode(tree.roots[0], 2, context, { availableWidth: styleResolveOptions.viewportWidth, availableHeight: styleResolveOptions.viewportHeight })
        : [
            '        VStack(alignment: .leading, spacing: 0) {',
            ...renderSwiftUIChildren(tree.roots, 3, context, renderSwiftUINode, 'VStack', undefined, { availableWidth: styleResolveOptions.viewportWidth, availableHeight: styleResolveOptions.viewportHeight }),
            '        }',
        ];

    const bodyLines = isSingleScreenRoot
        ? [
            '        ScrollView {',
            ...innerLines.map((line) => '    ' + line),
            '        }',
        ]
        : innerLines;

    const lines: string[] = [];

    if (resolvedOptions.includeImports) {
        lines.push('import SwiftUI');
        if (context.helperFlags.has('backgroundImage') || context.helperFlags.has('imagePlaceholder') || context.helperFlags.has('openUrlHandler')) {
            lines.push('import Foundation');
        }
        if (context.helperFlags.has('webViewSurface')) {
            lines.push('import WebKit');
        }
        if (context.helperFlags.has('mediaSurface')) {
            lines.push('import AVKit');
        }
        lines.push('');
    }

    lines.push(`struct ${resolvedOptions.structName}: View {`);
    if (context.helperFlags.has('openUrlHandler')) {
        lines.push(`${indent(1)}@Environment(\\.openURL) private var openURL`);
    }
    if (context.stateDeclarations.length > 0) {
        lines.push(...context.stateDeclarations);
    }
    if (context.helperFlags.has('openUrlHandler') || context.stateDeclarations.length > 0) {
        lines.push('');
    }
    lines.push(`${indent(1)}var body: some View {`);
    lines.push(...bodyLines);
    lines.push(`${indent(1)}}`);
    lines.push('}');

    if (resolvedOptions.includePreview) {
        lines.push('');
        lines.push('#Preview {');
        lines.push(`${indent(1)}${resolvedOptions.structName}()`);
        lines.push('}');
    }

    lines.push(...buildSwiftUIHelpers(context));
    lines.push('');
    return lines.join('\n');
}