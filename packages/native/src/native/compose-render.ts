import type { Child } from '../../core/types';
import type {
    AndroidComposeContext,
    AndroidComposeOptions,
    NativeElementNode,
    NativeNode,
    NativePropValue,
    NativeRenderHints,
    NativeTextNode,
    NativeTree,
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
import { quoteKotlinString, flattenTextContent } from '../strings';
import {
    buildNativeVectorSpec,
    buildNativeCanvasSpec,
    buildNativeCanvasDrawingSpec,
} from '../vector';
import {
    buildComposeCanvasSurfaceLines,
    buildComposeVectorCanvasLines,
} from '../canvas';
import {
    createNativeStateDescriptorMap,
    ensureComposeStateVariable,
    toComposeTextValueExpression,
    buildComposeTextExpression,
} from '../state';
import {
    resolveTextTransform,
    buildComposeTextStyleArgsFromStyle,
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
import { buildComposeModifier } from './compose-style';
import {
    renderComposeChildren,
    renderComposeContainerBody,
} from './compose-layout-render';
import { renderComposeControlNode } from './compose-control-render';

function indent(level: number): string {
    return '    '.repeat(level);
}

function renderTextComposable(node: NativeTextNode, level: number, context: AndroidComposeContext): string[] {
    if (node.stateId) {
        const { descriptor, variableName } = ensureComposeStateVariable(context, node.stateId);
        return [`${indent(level)}Text(text = ${toComposeTextValueExpression(variableName, descriptor)})`];
    }

    return [`${indent(level)}Text(text = ${quoteKotlinString(node.value)})`];
}

function renderComposeContainerNode(
    node: NativeElementNode,
    level: number,
    context: AndroidComposeContext,
    hints: NativeRenderHints,
    modifier: string,
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

    if (!hasOverlays) {
        return [
            ...baseLines,
            ...renderComposeContainerBody(flowNode, level, context, modifier, hints, renderComposeNode),
        ];
    }

    const lines = [
        ...baseLines,
        `${indent(level)}Box(modifier = Modifier.matchParentSize()) {`,
        ...renderComposeContainerBody(flowNode, level + 1, context, modifier, hints, renderComposeNode),
    ];

    absoluteChildren.forEach((child) => {
        lines.push(...renderComposeNode(child, level + 1, context, { ...hints, absoluteOverlay: true }));
    });
    fixedChildren.forEach((child) => {
        lines.push(...renderComposeNode(child, level + 1, context, {
            ...hints,
            absoluteOverlay: true,
            fillWidth: true,
            fillHeight: true,
        }));
    });

    lines.push(`${indent(level)}}`);
    return lines;
}

function renderComposeUnsupportedFallback(
    node: NativeElementNode,
    level: number,
    context: AndroidComposeContext,
    modifier: string,
    baseLines: string[],
    label: string,
): string[] {
    context.helperFlags.add('unsupportedPlaceholder');
    const sourceTag = node.sourceTag ?? node.component.toLowerCase();
    const args = [`label = ${quoteKotlinString(label)}`, `sourceTag = ${quoteKotlinString(sourceTag)}`];
    if (modifier !== 'Modifier') {
        args.push(`modifier = ${modifier}`);
    }
    return [
        ...baseLines,
        `${indent(level)}ElitUnsupported(${args.join(', ')})`,
    ];
}

function renderComposeNode(
    node: NativeNode,
    level: number,
    context: AndroidComposeContext,
    hints: NativeRenderHints = {},
): string[] {
    if (node.kind === 'text') {
        return renderTextComposable(node, level, context);
    }

    const modifier = buildComposeModifier(node, context.resolvedStyles, hints, context.styleResolveOptions);
    const classComment = Array.isArray(node.props.classList) && node.props.classList.length > 0
        ? `${indent(level)}// classList: ${(node.props.classList as NativePropValue[]).map((item) => String(item)).join(' ')}`
        : undefined;
    const baseLines: string[] = [];
    if (classComment) {
        baseLines.push(classComment);
    }

    if (node.component === 'Text') {
        const style = getStyleObject(node, context.resolvedStyles, context.styleResolveOptions);
        const dynamicText = buildComposeTextExpression(node.children, context, resolveTextTransform(style?.textTransform));
        const staticText = applyTextTransform(flattenTextContent(node.children), resolveTextTransform(style?.textTransform));
        const args = [`text = ${dynamicText ?? quoteKotlinString(staticText)}`];
        if (modifier !== 'Modifier') {
            args.push(`modifier = ${modifier}`);
        }
        args.push(...buildComposeTextStyleArgsFromStyle(style, context.styleResolveOptions));
        return [...baseLines, `${indent(level)}Text(${args.join(', ')})`];
    }

    const controlLines = renderComposeControlNode(node, level, context, hints, modifier, baseLines);
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
        return [
            ...baseLines,
            `${indent(level)}ElitImageSurface(source = ${quoteKotlinString(source)}, label = ${quoteKotlinString(fallbackLabel)}, alt = ${alt ? quoteKotlinString(alt) : 'null'}, modifier = ${modifier}${objectFit !== 'cover' ? `, objectFit = ${quoteKotlinString(objectFit)}` : ''}${objectPosition !== 'center' ? `, objectPosition = ${quoteKotlinString(objectPosition)}` : ''})`,
        ];
    }

    if (node.component === 'Vector') {
        const vectorSpec = buildNativeVectorSpec(node);
        if (vectorSpec) {
            const style = getStyleObject(node, context.resolvedStyles, context.styleResolveOptions);
            return [
                ...baseLines,
                ...buildComposeVectorCanvasLines(
                    vectorSpec,
                    level,
                    modifier,
                    hasExplicitNativeWidthStyle(style),
                    hasExplicitNativeHeightStyle(style),
                ),
            ];
        }
    }

    if (node.component === 'Canvas') {
        const canvasSpec = buildNativeCanvasSpec(node);
        const drawingSpec = buildNativeCanvasDrawingSpec(node);
        const style = getStyleObject(node, context.resolvedStyles, context.styleResolveOptions);
        return [
            ...baseLines,
            ...buildComposeCanvasSurfaceLines(
                canvasSpec,
                drawingSpec,
                level,
                modifier,
                hasExplicitNativeWidthStyle(style),
                hasExplicitNativeHeightStyle(style),
            ),
        ];
    }

    if (node.component === 'WebView') {
        const source = resolveNativeSurfaceSource(node);
        if (!source) {
            return renderComposeUnsupportedFallback(node, level, context, modifier, baseLines, 'WebView');
        }
        context.helperFlags.add('webViewSurface');
        const label = resolveNativeAccessibilityLabel(node) ?? 'Web content';
        return [
            ...baseLines,
            `${indent(level)}ElitWebViewSurface(source = ${quoteKotlinString(source)}, label = ${quoteKotlinString(label)}, modifier = ${modifier})`,
        ];
    }

    if (node.component === 'Media') {
        const source = resolveNativeSurfaceSource(node);
        if (!source) {
            return renderComposeUnsupportedFallback(node, level, context, modifier, baseLines, 'Media');
        }
        context.helperFlags.add('mediaSurface');
        const label = resolveNativeMediaLabel(node);
        const style = getStyleObject(node, context.resolvedStyles, context.styleResolveOptions);
        const objectFit = resolveNativeObjectFitStyle(style);
        const objectPosition = resolveNativeObjectPositionStyle(style);
        const autoPlay = toNativeBoolean(node.props.autoPlay ?? node.props.autoplay);
        const loop = toNativeBoolean(node.props.loop);
        const muted = isNativeMuted(node);

        if (node.sourceTag === 'audio') {
            return [
                ...baseLines,
                `${indent(level)}ElitAudioSurface(source = ${quoteKotlinString(source)}, label = ${quoteKotlinString(label)}, autoPlay = ${autoPlay ? 'true' : 'false'}, loop = ${loop ? 'true' : 'false'}, muted = ${muted ? 'true' : 'false'}, modifier = ${modifier})`,
            ];
        }

        const poster = resolveNativeVideoPoster(node);
        const controls = shouldNativeShowVideoControls(node);
        const playsInline = shouldNativePlayInline(node);
        const videoArgs = [
            `source = ${quoteKotlinString(source)}`,
            `label = ${quoteKotlinString(label)}`,
            `autoPlay = ${autoPlay ? 'true' : 'false'}`,
            `loop = ${loop ? 'true' : 'false'}`,
            `muted = ${muted ? 'true' : 'false'}`,
            `controls = ${controls ? 'true' : 'false'}`,
            `poster = ${poster ? quoteKotlinString(poster) : 'null'}`,
            `playsInline = ${playsInline ? 'true' : 'false'}`,
        ];
        if (objectFit !== 'cover') {
            videoArgs.push(`posterFit = ${quoteKotlinString(objectFit)}`);
        }
        if (objectPosition !== 'center') {
            videoArgs.push(`posterPosition = ${quoteKotlinString(objectPosition)}`);
        }
        videoArgs.push(`modifier = ${modifier}`);
        return [
            ...baseLines,
            `${indent(level)}ElitVideoSurface(${videoArgs.join(', ')})`,
        ];
    }

    if (node.component === 'Math') {
        return renderComposeUnsupportedFallback(node, level, context, modifier, baseLines, 'Math');
    }

    if (node.component === 'Cell') {
        const style = getStyleObject(node, context.resolvedStyles, context.styleResolveOptions);
        const hasExplicitWidth = hasExplicitNativeWidthStyle(style);
        const cellHints: NativeRenderHints = {
            ...hints,
            ...(!hasExplicitWidth ? { fillWidth: true } : {}),
            ...(!hasExplicitNativeHeightStyle(style) && hints.fillHeight ? { fillHeight: true } : {}),
        };
        let cellModifier = modifier;
        if (hints.parentFlexLayout === 'Row' && !hasExplicitWidth) {
            cellModifier = cellModifier === 'Modifier'
                ? 'Modifier.weight(1f, fill = true)'
                : cellModifier.replace(/^Modifier\./, 'Modifier.weight(1f, fill = true).');
        }
        return renderComposeContainerNode(node, level, context, cellHints, cellModifier, baseLines);
    }

    if (node.children.length > 0 || node.component === 'Screen') {
        return renderComposeContainerNode(node, level, context, hints, modifier, baseLines);
    }

    context.helperFlags.add('unsupportedPlaceholder');
    const label = flattenTextContent(node.children) || node.component;
    return [
        ...baseLines,
        `${indent(level)}Text(text = ${quoteKotlinString(label)}${modifier !== 'Modifier' ? `, modifier = ${modifier}` : ''})`,
    ];
}

function buildAndroidComposeHelpers(context: AndroidComposeContext): string[] {
    const helpers: string[] = [];

    if (context.helperFlags.has('bridge')) {
        helpers.push('');
        helpers.push('private object ElitNativeBridge {');
        helpers.push('    var onAction: ((String, String?, String?) -> Unit)? = null');
        helpers.push('    var onNavigate: ((String) -> Unit)? = null');
        helpers.push('    fun dispatch(action: String? = null, route: String? = null, payloadJson: String? = null) {');
        helpers.push('        android.util.Log.d("ElitNativeBridge", listOfNotNull(action, route, payloadJson).joinToString(" | "))');
        helpers.push('    }');
        helpers.push('');
        helpers.push('    fun controlEventPayload(event: String, sourceTag: String, inputType: String? = null, value: String? = null, values: Iterable<String>? = null, checked: Boolean? = null, detailJson: String? = null): String {');
        helpers.push('        val parts = mutableListOf<String>()');
        helpers.push('        parts += "\"event\":\"$event\""');
        helpers.push('        parts += "\"sourceTag\":\"$sourceTag\""');
        helpers.push('        if (inputType != null) parts += "\"inputType\":\"$inputType\""');
        helpers.push('        if (value != null) parts += "\"value\":\"$value\""');
        helpers.push('        if (values != null) parts += "\"values\":\"${values.joinToString(",")}\""');
        helpers.push('        if (checked != null) parts += "\"checked\":\"$checked\""');
        helpers.push('        if (detailJson != null) parts += "\"detail\":$detailJson"');
        helpers.push('        return "{${parts.joinToString(",")}}"');
        helpers.push('    }');
        helpers.push('}');
    }

    if (context.helperFlags.has('downloadHandler')) {
        helpers.push('');
        helpers.push('private object ElitDownloadHandler {');
        helpers.push('    fun download(context: android.content.Context, source: String, suggestedName: String? = null) {');
        helpers.push('        val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(source))');
        helpers.push('        intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)');
        helpers.push('        kotlin.runCatching { context.startActivity(intent) }');
        helpers.push('    }');
        helpers.push('}');
    }

    if (context.helperFlags.has('backgroundImage') || context.helperFlags.has('imagePlaceholder')) {
        helpers.push('');
        helpers.push('private fun elitLoadBackgroundBitmap(view: android.widget.ImageView, source: String, repeatMode: String, backgroundSize: String, backgroundPosition: String) {');
        helpers.push('    if (source.isBlank()) return');
        helpers.push('    val tileModeX = if (repeatMode == "repeat-y") android.graphics.Shader.TileMode.CLAMP else android.graphics.Shader.TileMode.REPEAT');
        helpers.push('    val tileModeY = if (repeatMode == "repeat-x") android.graphics.Shader.TileMode.CLAMP else android.graphics.Shader.TileMode.REPEAT');
        helpers.push('    view.scaleType = android.widget.ImageView.ScaleType.CENTER_CROP');
        helpers.push('    if (repeatMode == "no-repeat" || repeatMode == "round") {');
        helpers.push('        view.setImageURI(android.net.Uri.parse(source))');
        helpers.push('    } else {');
        helpers.push('        val bitmap = android.graphics.BitmapFactory.decodeStream(android.net.Uri.parse(source).let { runCatching { view.context.contentResolver.openInputStream(it) }.getOrNull() })');
        helpers.push('        if (bitmap != null) view.setImageDrawable(android.graphics.drawable.BitmapDrawable(view.resources, bitmap).apply { tileModeX = tileModeX; tileModeY = tileModeY })');
        helpers.push('    }');
        helpers.push('}');
        helpers.push('');
        helpers.push('@Composable');
        helpers.push('private fun ElitBackgroundImage(source: String, backgroundSize: String = "cover", backgroundPosition: String = "center", backgroundRepeat: String = "no-repeat", modifier: Modifier = Modifier) {');
        helpers.push('    androidx.compose.ui.viewinterop.AndroidView(');
        helpers.push('        factory = { context -> android.widget.ImageView(context).apply {');
        helpers.push('            elitLoadBackgroundBitmap(this, source, backgroundRepeat, backgroundSize, backgroundPosition)');
        helpers.push('        } },');
        helpers.push('        modifier = modifier,');
        helpers.push('    )');
        helpers.push('}');
        helpers.push('');
        helpers.push('@Composable');
        helpers.push('private fun ElitImageSurface(source: String, label: String, contentDescription: String?, objectFit: String = "cover", objectPosition: String = "center", modifier: Modifier = Modifier) {');
        helpers.push('    if (source.isBlank()) {');
        helpers.push('        Box(modifier = modifier, contentAlignment = Alignment.Center) {');
        helpers.push('            Text(text = contentDescription ?: label)');
        helpers.push('        }');
        helpers.push('        return');
        helpers.push('    }');
        helpers.push('    androidx.compose.ui.viewinterop.AndroidView(');
        helpers.push('        factory = { context -> android.widget.ImageView(context).apply {');
        helpers.push('            elitLoadBackgroundBitmap(this, source, "no-repeat", objectFit, objectPosition)');
        helpers.push('        } },');
        helpers.push('        modifier = modifier,');
        helpers.push('    )');
        helpers.push('}');
    }

    if (context.helperFlags.has('webViewSurface')) {
        helpers.push('');
        helpers.push('@Composable');
        helpers.push('private fun ElitWebViewSurface(source: String, label: String?, modifier: Modifier = Modifier) {');
        helpers.push('    androidx.compose.ui.viewinterop.AndroidView(');
        helpers.push('        factory = { context -> android.webkit.WebView(context).apply {');
        helpers.push('            contentDescription = label');
        helpers.push('            settings.javaScriptEnabled = true');
        helpers.push('            if (source.isNotBlank()) loadUrl(source)');
        helpers.push('        } },');
        helpers.push('        modifier = modifier,');
        helpers.push('    )');
        helpers.push('}');
    }

    if (context.helperFlags.has('mediaSurface')) {
        helpers.push('');
        helpers.push('private fun elitVideoPosterScaleType(posterFit: String, posterPosition: String): android.widget.ImageView.ScaleType = when (posterFit.trim().lowercase()) {');
        helpers.push('    "contain", "scale-down" -> when (posterPosition.trim().lowercase()) {');
        helpers.push('        "top", "leading", "top-leading", "bottom-leading" -> android.widget.ImageView.ScaleType.FIT_START');
        helpers.push('        "bottom", "trailing", "bottom-trailing" -> android.widget.ImageView.ScaleType.FIT_END');
        helpers.push('        else -> android.widget.ImageView.ScaleType.FIT_CENTER');
        helpers.push('    }');
        helpers.push('    else -> android.widget.ImageView.ScaleType.CENTER_CROP');
        helpers.push('}');
        helpers.push('');
        helpers.push('@Composable');
        helpers.push('private fun ElitVideoSurface(source: String, label: String, autoPlay: Boolean, loop: Boolean, muted: Boolean, controls: Boolean, poster: String?, playsInline: Boolean, posterFit: String = "cover", posterPosition: String = "center", modifier: Modifier = Modifier) {');
        helpers.push('    // Android VideoView already renders inline; playsInline is retained for parity with iOS generation.');
        helpers.push('    Box(modifier = modifier, contentAlignment = Alignment.Center) {');
        helpers.push('        androidx.compose.ui.viewinterop.AndroidView(');
        helpers.push('            factory = { context ->');
        helpers.push('                android.widget.ImageView(context).apply {');
        helpers.push('                    val posterView = this');
        helpers.push('                    posterView.contentDescription = label');
        helpers.push('                    posterView.scaleType = elitVideoPosterScaleType(posterFit, posterPosition)');
        helpers.push('                    if (poster != null) posterView.setImageURI(android.net.Uri.parse(poster))');
        helpers.push('                }');
        helpers.push('            },');
        helpers.push('        )');
        helpers.push('        if (controls) {');
        helpers.push('            // Hand off to platform chrome; ElitVideoSurface exposes controls for parity only.');
        helpers.push('        }');
        helpers.push('    }');
        helpers.push('}');
        helpers.push('');
        helpers.push('@Composable');
        helpers.push('private fun ElitAudioSurface(source: String, label: String, autoPlay: Boolean, loop: Boolean, muted: Boolean, modifier: Modifier = Modifier) {');
        helpers.push('    androidx.compose.ui.viewinterop.AndroidView(');
        helpers.push('        factory = { context ->');
        helpers.push('            android.media.MediaPlayer().apply {');
        helpers.push('                val mediaPlayer = this');
        helpers.push('                mediaPlayer.isLooping = loop');
        helpers.push('                mediaPlayer.setVolume(if (muted) 0f else 1f, if (muted) 0f else 1f)');
        helpers.push('                if (source.isNotBlank()) setDataSource(source)');
        helpers.push('                if (autoPlay) start()');
        helpers.push('            }');
        helpers.push('        },');
        helpers.push('        modifier = modifier,');
        helpers.push('    )');
        helpers.push('}');
    }

    if (context.helperFlags.has('unsupportedPlaceholder')) {
        helpers.push('');
        helpers.push('@Composable');
        helpers.push('private fun ElitUnsupported(label: String, sourceTag: String, modifier: Modifier = Modifier) {');
        helpers.push('    Box(modifier = modifier, contentAlignment = Alignment.Center) {');
        helpers.push('        Text(text = "$label ($sourceTag)")');
        helpers.push('    }');
        helpers.push('}');
    }

    return helpers;
}

export function renderAndroidCompose(input: Child | NativeTree, options: AndroidComposeOptions = {}): string {
    const tree = isNativeTree(input)
        ? input
        : renderNativeTree(input, { platform: 'android' });

    const resolvedOptions = {
        packageName: options.packageName ?? 'com.elit.generated',
        functionName: options.functionName ?? 'ElitScreen',
        includePackage: options.includePackage ?? true,
        includeImports: options.includeImports ?? true,
        includePreview: options.includePreview ?? false,
    };

    const styleResolveOptions = getNativeStyleResolveOptions('android');
    const styleData = buildRootResolvedStyleData(tree.roots, styleResolveOptions);

    const context: AndroidComposeContext = {
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

    if (isSingleScreenRoot) {
        context.helperFlags.add('screenRoot');
    }

    let bodyLines: string[];
    if (isSingleScreenRoot) {
        bodyLines = [
            '    Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {',
            ...renderComposeNode(tree.roots[0], 2, context, { availableWidth: styleResolveOptions.viewportWidth, availableHeight: styleResolveOptions.viewportHeight }),
            '    }',
        ];
    } else if (tree.roots.length === 1) {
        bodyLines = renderComposeNode(tree.roots[0], 1, context, { availableWidth: styleResolveOptions.viewportWidth, availableHeight: styleResolveOptions.viewportHeight });
    } else {
        bodyLines = [
            '    Column(modifier = Modifier.fillMaxSize()) {',
            ...renderComposeChildren(tree.roots, 2, context, renderComposeNode, 'Column', undefined, { availableWidth: styleResolveOptions.viewportWidth, availableHeight: styleResolveOptions.viewportHeight }),
            '    }',
        ];
    }

    const lines: string[] = [];

    if (resolvedOptions.includePackage) {
        lines.push(`package ${resolvedOptions.packageName}`);
        lines.push('');
    }

    if (resolvedOptions.includeImports) {
        lines.push('import androidx.compose.foundation.layout.*');
        lines.push('import androidx.compose.foundation.background');
        lines.push('import androidx.compose.foundation.border');
        lines.push('import androidx.compose.foundation.clickable');
        if (context.helperFlags.has('interactivePressState')) {
            lines.push('import androidx.compose.foundation.LocalIndication');
            lines.push('import androidx.compose.foundation.interaction.MutableInteractionSource');
            lines.push('import androidx.compose.foundation.interaction.collectIsPressedAsState');
        }
        lines.push('import androidx.compose.foundation.rememberScrollState');
        lines.push('import androidx.compose.foundation.text.BasicTextField');
        lines.push('import androidx.compose.foundation.verticalScroll');
        lines.push('import androidx.compose.ui.focus.focusRequester');
        lines.push('import androidx.compose.ui.draw.alpha');
        lines.push('import androidx.compose.ui.draw.clip');
        lines.push('import androidx.compose.ui.draw.drawBehind');
        lines.push('import androidx.compose.ui.draw.shadow');
        lines.push('import androidx.compose.ui.graphics.graphicsLayer');
        lines.push('import androidx.compose.material3.*');
        lines.push('import androidx.compose.runtime.*');
        lines.push('import androidx.compose.foundation.shape.RoundedCornerShape');
        lines.push('import androidx.compose.ui.Alignment');
        lines.push('import androidx.compose.ui.Modifier');
        lines.push('import androidx.compose.ui.graphics.Brush');
        lines.push('import androidx.compose.ui.graphics.Color');
        lines.push('import androidx.compose.ui.graphics.RectangleShape');
        lines.push('import androidx.compose.ui.graphics.SolidColor');
        lines.push('import androidx.compose.ui.semantics.Role');
        lines.push('import androidx.compose.ui.semantics.contentDescription');
        lines.push('import androidx.compose.ui.semantics.disabled');
        lines.push('import androidx.compose.ui.semantics.heading');
        lines.push('import androidx.compose.ui.semantics.role');
        lines.push('import androidx.compose.ui.semantics.selected');
        lines.push('import androidx.compose.ui.semantics.semantics');
        lines.push('import androidx.compose.ui.semantics.stateDescription');
        if (context.helperFlags.has('downloadHandler')) {
            lines.push('import androidx.compose.ui.platform.LocalContext');
        }
        if (context.helperFlags.has('uriHandler')) {
            lines.push('import androidx.compose.ui.platform.LocalUriHandler');
        }
        lines.push('import androidx.compose.ui.text.font.FontFamily');
        lines.push('import androidx.compose.ui.text.font.FontWeight');
        lines.push('import androidx.compose.ui.text.style.TextDecoration');
        lines.push('import androidx.compose.ui.text.style.TextAlign');
        lines.push('import androidx.compose.ui.tooling.preview.Preview');
        lines.push('import androidx.compose.ui.zIndex');
        lines.push('import androidx.compose.ui.unit.dp');
        lines.push('import androidx.compose.ui.unit.sp');
        lines.push('');
    }

    lines.push('@Composable');
    lines.push(`fun ${resolvedOptions.functionName}() {`);
    if (context.helperFlags.has('uriHandler')) {
        lines.push(`${indent(1)}val uriHandler = LocalUriHandler.current`);
    }
    if (context.helperFlags.has('downloadHandler')) {
        lines.push(`${indent(1)}val localContext = LocalContext.current`);
    }
    if ((context.helperFlags.has('uriHandler') || context.helperFlags.has('downloadHandler')) && context.stateDeclarations.length > 0) {
        lines.push('');
    }
    if (context.stateDeclarations.length > 0) {
        lines.push(...context.stateDeclarations);
        lines.push('');
    }
    lines.push(...bodyLines);
    lines.push('}');

    if (resolvedOptions.includePreview) {
        lines.push('');
        lines.push('@Preview(showBackground = true)');
        lines.push('@Composable');
        lines.push(`private fun ${resolvedOptions.functionName}Preview() {`);
        lines.push(`    ${resolvedOptions.functionName}()`);
        lines.push('}');
    }

    lines.push(...buildAndroidComposeHelpers(context));
    lines.push('');
    return lines.join('\n');
}