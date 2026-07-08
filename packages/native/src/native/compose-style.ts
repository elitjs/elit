import { type NativeStyleResolveOptions } from '../../client/style';
import type {
    NativeElementNode,
    NativePropValue,
    NativeRenderHints,
    NativeResolvedStyleMap,
} from '../types';
import {
    formatFloat,
    toDpLiteral,
    parsePlainNumericValue,
    resolveFlexStyleValues,
    resolveOpacityValue,
    resolveAspectRatioValue,
    resolveAxisUnitNumber,
    toAxisDpLiteral,
    shouldClipNativeOverflow,
    getNativeStyleResolveOptions,
} from '../units';
import {
    resolveStyleCurrentColor,
    toComposeColorLiteral,
    toComposeBrushLiteral,
    parseBoxShadowList,
    toComposeShadowElevation,
    resolveBackdropBlurRadius,
    isFillValue,
} from '../color';
import {
    resolveBackgroundColor,
    resolveBackgroundGradient,
} from '../background';
import { parseNativeTransform } from '../transform';
import { buildComposeAccessibilityModifier } from '../interaction';
import {
    resolveNativeBorder,
    buildComposeSideBorderModifier,
    buildComposeUniformStyledBorderModifier,
} from '../border';
import {
    resolveDirectionalSpacing,
    buildComposeMarginPaddingCalls,
    shouldCenterConstrainedHorizontalAutoMargins,
    buildComposeAutoMarginCalls,
} from '../spacing';
import { buildComposeLabelTextFromStyle } from '../typography';
import {
    resolvePositionMode,
    resolveBaselineAlignmentKeyword,
    resolveSelfAlignmentKeyword,
    resolveComposeSelfAlignmentCall,
    resolvePositionInsets,
} from '../layout';
import { getStyleObject } from './style-resolve';

export function buildComposeLabelText(
    node: NativeElementNode,
    label: string,
    resolvedStyles?: NativeResolvedStyleMap,
    expression?: string,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): string {
    return buildComposeLabelTextFromStyle(
        label,
        getStyleObject(node, resolvedStyles, styleResolveOptions),
        expression,
        styleResolveOptions,
    );
}

export function buildComposeModifier(
    node: NativeElementNode,
    resolvedStyles?: NativeResolvedStyleMap,
    hints: NativeRenderHints = {},
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
    styleOverride?: Record<string, NativePropValue>,
): string {
    const parts = ['Modifier'];
    if (node.component === 'Screen') {
        parts.push('fillMaxSize()');
        parts.push('verticalScroll(rememberScrollState())');
    }

    const style = styleOverride ?? getStyleObject(node, resolvedStyles, styleResolveOptions);
    if (style) {
        const padding = toDpLiteral(style.padding, styleResolveOptions);
        const paddingHorizontal = toDpLiteral(style.paddingHorizontal, styleResolveOptions);
        const paddingVertical = toDpLiteral(style.paddingVertical, styleResolveOptions);
        const parentFlexLayout = hints.parentFlexLayout;
        const flexStyle = resolveFlexStyleValues(style);
        const flexBasisValue = parentFlexLayout === 'Row'
            ? resolveAxisUnitNumber(flexStyle.basis, 'horizontal', hints, styleResolveOptions)
            : parentFlexLayout === 'Column'
                ? resolveAxisUnitNumber(flexStyle.basis, 'vertical', hints, styleResolveOptions)
                : undefined;
        const flexBasis = flexBasisValue !== undefined ? `${formatFloat(flexBasisValue)}.dp` : undefined;
        const hasFlexBasisSizeHint = flexBasisValue !== undefined && Math.abs(flexBasisValue) > 0.0001;
        const flexShrink = flexStyle.shrink;
        const shrinkableMainAxisBasis = hasFlexBasisSizeHint && flexShrink !== 0;
        const suppressExactWidth = parentFlexLayout === 'Row' && hints.negotiatedMaxWidth !== undefined && flexShrink !== 0;
        const suppressExactHeight = parentFlexLayout === 'Column' && hints.negotiatedMaxHeight !== undefined && flexShrink !== 0;
        const width = (!suppressExactWidth ? toAxisDpLiteral(style.width, 'horizontal', hints, styleResolveOptions) : undefined)
            ?? (parentFlexLayout === 'Row' && hasFlexBasisSizeHint && !shrinkableMainAxisBasis ? flexBasis : undefined);
        const height = (!suppressExactHeight ? toAxisDpLiteral(style.height, 'vertical', hints, styleResolveOptions) : undefined)
            ?? (parentFlexLayout === 'Column' && hasFlexBasisSizeHint && !shrinkableMainAxisBasis ? flexBasis : undefined);
        const minWidth = toAxisDpLiteral(style.minWidth, 'horizontal', hints, styleResolveOptions)
            ?? (parentFlexLayout === 'Row' && hasFlexBasisSizeHint && flexShrink === 0 ? flexBasis : undefined);
        const negotiatedMaxWidth = hints.negotiatedMaxWidth !== undefined
            ? `${formatFloat(hints.negotiatedMaxWidth)}.dp`
            : undefined;
        const maxWidth = negotiatedMaxWidth
            ?? toAxisDpLiteral(style.maxWidth, 'horizontal', hints, styleResolveOptions)
            ?? (parentFlexLayout === 'Row' && shrinkableMainAxisBasis ? flexBasis : undefined);
        const minHeight = toAxisDpLiteral(style.minHeight, 'vertical', hints, styleResolveOptions)
            ?? (parentFlexLayout === 'Column' && hasFlexBasisSizeHint && flexShrink === 0 ? flexBasis : undefined);
        const negotiatedMaxHeight = hints.negotiatedMaxHeight !== undefined
            ? `${formatFloat(hints.negotiatedMaxHeight)}.dp`
            : undefined;
        const maxHeight = negotiatedMaxHeight
            ?? toAxisDpLiteral(style.maxHeight, 'vertical', hints, styleResolveOptions)
            ?? (parentFlexLayout === 'Column' && shrinkableMainAxisBasis ? flexBasis : undefined);
        const radius = toDpLiteral(style.borderRadius, styleResolveOptions);
        const backgroundGradient = resolveBackgroundGradient(style);
        const backdropBlur = resolveBackdropBlurRadius(style, styleResolveOptions);
        const backgroundColor = resolveBackgroundColor(style, styleResolveOptions);
        const border = resolveNativeBorder(style, (value) => toDpLiteral(value, styleResolveOptions));
        const shadows = parseBoxShadowList(style.boxShadow, resolveStyleCurrentColor(style));
        const shadow = shadows[0];
        const aspectRatio = resolveAspectRatioValue(style.aspectRatio);
        const opacity = resolveOpacityValue(style.opacity);
        const zIndex = parsePlainNumericValue(style.zIndex);
        const shouldClipOverflow = shouldClipNativeOverflow(style);
        const transform = parseNativeTransform(style.transform, styleResolveOptions);
        const positionMode = resolvePositionMode(style.position);
        const positionInsets = resolvePositionInsets(style, hints, styleResolveOptions);
        const selfAlignment = resolveComposeSelfAlignmentCall(hints.parentFlexLayout, style);
        const childBaselineAlignment = resolveBaselineAlignmentKeyword(style.alignSelf);
        const shouldAlignByBaseline = node.component === 'Text'
            && hints.parentFlexLayout === 'Row'
            && (childBaselineAlignment !== undefined
                || (hints.parentRowBaselineAlignment !== undefined && resolveSelfAlignmentKeyword(style.alignSelf) === undefined));
        const selfAlignmentFillsWidth = selfAlignment === 'fillMaxWidth()';
        const selfAlignmentFillsHeight = selfAlignment === 'fillMaxHeight()';
        const marginCalls = buildComposeMarginPaddingCalls(style, styleResolveOptions);
        const autoMarginCalls = buildComposeAutoMarginCalls(style);
        const shouldForceAutoMarginFillWidth = shouldCenterConstrainedHorizontalAutoMargins(style);
        const paddingCalls: string[] = [];
        const flexValue = flexStyle.grow;

        if (padding) {
            paddingCalls.push(`padding(${padding})`);
        } else {
            const paddingArgs: string[] = [];
            const spacing = resolveDirectionalSpacing(style, 'padding', (value) => toDpLiteral(value, styleResolveOptions));
            const top = spacing.top;
            const right = spacing.right;
            const bottom = spacing.bottom;
            const left = spacing.left;

            if (paddingHorizontal) paddingArgs.push(`horizontal = ${paddingHorizontal}`);
            if (paddingVertical) paddingArgs.push(`vertical = ${paddingVertical}`);
            if (top) paddingArgs.push(`top = ${top}`);
            if (right) paddingArgs.push(`end = ${right}`);
            if (bottom) paddingArgs.push(`bottom = ${bottom}`);
            if (left) paddingArgs.push(`start = ${left}`);

            if (paddingArgs.length > 0) {
                paddingCalls.push(`padding(${paddingArgs.join(', ')})`);
            }
        }

        parts.push(...marginCalls);

        if (shouldForceAutoMarginFillWidth) {
            parts.push('fillMaxWidth()');
        }

        if (isFillValue(style.width) && !suppressExactWidth) {
            parts.push('fillMaxWidth()');
        } else if (width) {
            parts.push(`width(${width})`);
        } else if (hints.fillWidth && !shouldForceAutoMarginFillWidth && !selfAlignmentFillsWidth) {
            parts.push('fillMaxWidth()');
        }

        if (isFillValue(style.height) && !suppressExactHeight) {
            parts.push('fillMaxHeight()');
        } else if (height) {
            parts.push(`height(${height})`);
        } else if (hints.fillHeight && !selfAlignmentFillsHeight) {
            parts.push('fillMaxHeight()');
        }

        const widthInArgs: string[] = [];
        if (minWidth) widthInArgs.push(`min = ${minWidth}`);
        if (maxWidth) widthInArgs.push(`max = ${maxWidth}`);
        if (widthInArgs.length > 0) {
            parts.push(`widthIn(${widthInArgs.join(', ')})`);
        }

        const heightInArgs: string[] = [];
        if (minHeight) heightInArgs.push(`min = ${minHeight}`);
        if (maxHeight) heightInArgs.push(`max = ${maxHeight}`);
        if (heightInArgs.length > 0) {
            parts.push(`heightIn(${heightInArgs.join(', ')})`);
        }

        if (aspectRatio !== undefined) {
            parts.push(`aspectRatio(${formatFloat(aspectRatio)}f)`);
        }

        parts.push(...autoMarginCalls);

        if (shadows.length > 0) {
            for (const entry of shadows) {
                parts.push(`shadow(elevation = ${toComposeShadowElevation(entry)}, shape = RoundedCornerShape(${radius ?? '0.dp'}))`);
            }
        }

        if (backgroundGradient) {
            if (radius) {
                parts.push(`background(brush = ${toComposeBrushLiteral(backgroundGradient)}, shape = RoundedCornerShape(${radius}))`);
            } else {
                parts.push(`background(brush = ${toComposeBrushLiteral(backgroundGradient)})`);
            }
        } else if (backgroundColor) {
            if (radius) {
                parts.push(`background(color = ${toComposeColorLiteral(backgroundColor)}, shape = RoundedCornerShape(${radius}))`);
            } else {
                parts.push(`background(${toComposeColorLiteral(backgroundColor)})`);
            }
        }

        if (backdropBlur !== undefined && !shadow && radius) {
            parts.push(`shadow(elevation = ${formatFloat(Math.max(12, backdropBlur / 1.5))}.dp, shape = RoundedCornerShape(${radius}))`);
        }

        if (border?.width && border.color) {
            const styledBorderModifier = buildComposeUniformStyledBorderModifier(border, radius);
            if (styledBorderModifier) {
                parts.push(styledBorderModifier);
            } else if (radius) {
                parts.push(`border(${border.width}, ${toComposeColorLiteral(border.color)}, RoundedCornerShape(${radius}))`);
            } else {
                parts.push(`border(${border.width}, ${toComposeColorLiteral(border.color)})`);
            }
        } else {
            const sideBorderModifier = buildComposeSideBorderModifier(border ?? {});
            if (sideBorderModifier) {
                parts.push(sideBorderModifier);
            }
        }

        const positionUsesEndX = positionInsets.left === undefined && positionInsets.right !== undefined;
        const positionUsesEndY = positionInsets.top === undefined && positionInsets.bottom !== undefined;
        const combinedOffsetX = (positionInsets.left ?? (positionInsets.right !== undefined ? -positionInsets.right : 0)) + (transform?.translateX ?? 0);
        const combinedOffsetY = (positionInsets.top ?? (positionInsets.bottom !== undefined ? -positionInsets.bottom : 0)) + (transform?.translateY ?? 0);
        if ((positionMode === 'absolute' || positionMode === 'fixed') && hints.absoluteOverlay && (positionUsesEndX || positionUsesEndY)) {
            parts.push(`align(Alignment.${positionUsesEndY ? 'Bottom' : 'Top'}${positionUsesEndX ? 'End' : 'Start'})`);
        }

        const offsetArgs: string[] = [];
        if (combinedOffsetX !== 0) offsetArgs.push(`x = ${formatFloat(combinedOffsetX)}.dp`);
        if (combinedOffsetY !== 0) offsetArgs.push(`y = ${formatFloat(combinedOffsetY)}.dp`);
        if (offsetArgs.length > 0) {
            parts.push(`offset(${offsetArgs.join(', ')})`);
        }

        const graphicsLayerArgs: string[] = [];
        if (transform?.scaleX !== undefined) graphicsLayerArgs.push(`scaleX = ${formatFloat(transform.scaleX)}f`);
        if (transform?.scaleY !== undefined) graphicsLayerArgs.push(`scaleY = ${formatFloat(transform.scaleY)}f`);
        if (transform?.rotationDegrees !== undefined) graphicsLayerArgs.push(`rotationZ = ${formatFloat(transform.rotationDegrees)}f`);
        if (graphicsLayerArgs.length > 0) {
            parts.push(`graphicsLayer(${graphicsLayerArgs.join(', ')})`);
        }

        if (selfAlignment) {
            parts.push(selfAlignment);
        }

        if (shouldAlignByBaseline) {
            parts.push('alignByBaseline()');
        }

        if (shouldClipOverflow) {
            parts.push(`clip(${radius ? `RoundedCornerShape(${radius})` : 'RectangleShape'})`);
        }

        if (opacity !== undefined && opacity < 1) {
            parts.push(`alpha(${formatFloat(opacity)}f)`);
        }

        if (zIndex !== undefined && zIndex !== 0) {
            parts.push(`zIndex(${formatFloat(zIndex)}f)`);
        }

        if (flexValue !== undefined && Number.isFinite(flexValue) && flexValue > 0) {
            parts.push(`weight(${flexValue}f)`);
        }

        parts.push(...paddingCalls);
    }

    if (!style && hints.fillWidth) {
        parts.push('fillMaxWidth()');
    }

    const accessibilityModifier = buildComposeAccessibilityModifier(node);
    if (accessibilityModifier) {
        parts.push(accessibilityModifier);
    }

    return parts.join('.');
}