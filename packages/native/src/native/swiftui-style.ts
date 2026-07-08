import { type NativeStyleResolveOptions } from '../../client/style';
import type {
    NativeElementNode,
    NativeNode,
    NativePropValue,
    NativeRenderHints,
    NativeResolvedStyleMap,
} from '../types';
import {
    formatFloat,
    toPointLiteral,
    parsePlainNumericValue,
    resolveFlexStyleValues,
    resolveOpacityValue,
    resolveAspectRatioValue,
    resolveAxisUnitNumber,
    toAxisPointLiteral,
    shouldClipNativeOverflow,
    getNativeStyleResolveOptions,
} from '../units';
import {
    resolveStyleCurrentColor,
    parseCssColor,
    toSwiftColorLiteral,
    toSwiftGradientLiteral,
    parseBoxShadowList,
    toSwiftShadowRadius,
    resolveBackdropBlurRadius,
    isFillValue,
} from '../color';
import {
    resolveBackgroundColor,
    resolveBackgroundGradient,
} from '../background';
import { parseNativeTransform } from '../transform';
import { buildSwiftAccessibilityModifiers } from '../interaction';
import {
    resolveNativeBorder,
    buildSwiftSideBorderOverlay,
    buildSwiftUniformStyledBorderModifier,
} from '../border';
import {
    resolveDirectionalSpacing,
    buildSwiftMarginPaddingModifiers,
    buildSwiftAutoMarginModifiers,
} from '../spacing';
import {
    resolveSwiftFontDesign,
    resolveSwiftLineSpacing,
    resolveSwiftTextDecoration,
    resolveSwiftFontWeight,
    resolveSwiftTextAlign,
} from '../typography';
import {
    resolvePositionMode,
    resolveSwiftSelfAlignmentModifier,
    resolveSwiftRowAlignmentFromStyle,
    resolveRowBaselineAlignmentValues,
    resolvePositionInsets,
} from '../layout';
import { getStyleObject } from './style-resolve';

export function buildSwiftUIModifiers(
    node: NativeElementNode,
    resolvedStyles?: NativeResolvedStyleMap,
    hints: NativeRenderHints = {},
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
    styleOverride?: Record<string, NativePropValue>,
): string[] {
    const modifiers: string[] = [];

    if (node.component === 'Screen') {
        modifiers.push('.frame(maxWidth: .infinity, alignment: .topLeading)');
    }

    const style = styleOverride ?? getStyleObject(node, resolvedStyles, styleResolveOptions);
    if (style) {
        const padding = toPointLiteral(style.padding, styleResolveOptions);
        const paddingHorizontal = toPointLiteral(style.paddingHorizontal, styleResolveOptions);
        const paddingVertical = toPointLiteral(style.paddingVertical, styleResolveOptions);
        const parentFlexLayout = hints.parentFlexLayout;
        const flexStyle = resolveFlexStyleValues(style);
        const flexBasisValue = parentFlexLayout === 'Row'
            ? resolveAxisUnitNumber(flexStyle.basis, 'horizontal', hints, styleResolveOptions)
            : parentFlexLayout === 'Column'
                ? resolveAxisUnitNumber(flexStyle.basis, 'vertical', hints, styleResolveOptions)
                : undefined;
        const flexBasis = flexBasisValue !== undefined ? formatFloat(flexBasisValue) : undefined;
        const hasFlexBasisSizeHint = flexBasisValue !== undefined && Math.abs(flexBasisValue) > 0.0001;
        const flexShrink = flexStyle.shrink;
        const shrinkableMainAxisBasis = hasFlexBasisSizeHint && flexShrink !== 0;
        const suppressExactWidth = parentFlexLayout === 'Row' && hints.negotiatedMaxWidth !== undefined && flexShrink !== 0;
        const suppressExactHeight = parentFlexLayout === 'Column' && hints.negotiatedMaxHeight !== undefined && flexShrink !== 0;
        const width = (!suppressExactWidth ? toAxisPointLiteral(style.width, 'horizontal', hints, styleResolveOptions) : undefined)
            ?? (parentFlexLayout === 'Row' && hasFlexBasisSizeHint && !shrinkableMainAxisBasis ? flexBasis : undefined);
        const height = (!suppressExactHeight ? toAxisPointLiteral(style.height, 'vertical', hints, styleResolveOptions) : undefined)
            ?? (parentFlexLayout === 'Column' && hasFlexBasisSizeHint && !shrinkableMainAxisBasis ? flexBasis : undefined);
        const minWidth = toAxisPointLiteral(style.minWidth, 'horizontal', hints, styleResolveOptions)
            ?? (parentFlexLayout === 'Row' && hasFlexBasisSizeHint && flexShrink === 0 ? flexBasis : undefined);
        const negotiatedMaxWidth = hints.negotiatedMaxWidth !== undefined
            ? formatFloat(hints.negotiatedMaxWidth)
            : undefined;
        const maxWidth = negotiatedMaxWidth
            ?? toAxisPointLiteral(style.maxWidth, 'horizontal', hints, styleResolveOptions)
            ?? (parentFlexLayout === 'Row' && shrinkableMainAxisBasis ? flexBasis : undefined);
        const minHeight = toAxisPointLiteral(style.minHeight, 'vertical', hints, styleResolveOptions)
            ?? (parentFlexLayout === 'Column' && hasFlexBasisSizeHint && flexShrink === 0 ? flexBasis : undefined);
        const negotiatedMaxHeight = hints.negotiatedMaxHeight !== undefined
            ? formatFloat(hints.negotiatedMaxHeight)
            : undefined;
        const maxHeight = negotiatedMaxHeight
            ?? toAxisPointLiteral(style.maxHeight, 'vertical', hints, styleResolveOptions)
            ?? (parentFlexLayout === 'Column' && shrinkableMainAxisBasis ? flexBasis : undefined);
        const radius = toPointLiteral(style.borderRadius, styleResolveOptions);
        const backgroundGradient = resolveBackgroundGradient(style);
        const backdropBlur = resolveBackdropBlurRadius(style, styleResolveOptions);
        const backgroundColor = resolveBackgroundColor(style, styleResolveOptions);
        const border = resolveNativeBorder(style, (value) => toPointLiteral(value, styleResolveOptions));
        const shadows = parseBoxShadowList(style.boxShadow, resolveStyleCurrentColor(style));
        const aspectRatio = resolveAspectRatioValue(style.aspectRatio);
        const opacity = resolveOpacityValue(style.opacity);
        const zIndex = parsePlainNumericValue(style.zIndex);
        const shouldClipOverflow = shouldClipNativeOverflow(style);
        const transform = parseNativeTransform(style.transform, styleResolveOptions);
        const positionMode = resolvePositionMode(style.position);
        const positionInsets = resolvePositionInsets(style, hints, styleResolveOptions);
        const selfAlignment = resolveSwiftSelfAlignmentModifier(hints.parentFlexLayout, style);
        const selfAlignmentFillsWidth = selfAlignment?.startsWith('.frame(maxWidth: .infinity') ?? false;
        const selfAlignmentFillsHeight = selfAlignment?.startsWith('.frame(maxHeight: .infinity') ?? false;
        const color = parseCssColor(style.color);
        const fontSize = toPointLiteral(style.fontSize, styleResolveOptions);
        const fontWeight = resolveSwiftFontWeight(style.fontWeight);
        const fontDesign = resolveSwiftFontDesign(style.fontFamily);
        const letterSpacing = toPointLiteral(style.letterSpacing, styleResolveOptions);
        const lineSpacing = resolveSwiftLineSpacing(style.lineHeight, style.fontSize, styleResolveOptions);
        const textAlign = resolveSwiftTextAlign(style.textAlign);
        const textDecoration = resolveSwiftTextDecoration(style.textDecoration);
        const marginModifiers = buildSwiftMarginPaddingModifiers(style, styleResolveOptions);
        const autoMarginModifiers = buildSwiftAutoMarginModifiers(style);
        const hasAutoMarginMaxWidth = autoMarginModifiers.some((modifier) => modifier.startsWith('.frame(maxWidth: .infinity'));
        const flexValue = flexStyle.grow;

        if (padding) {
            modifiers.push(`.padding(${padding})`);
        } else {
            const spacing = resolveDirectionalSpacing(style, 'padding', (value) => toPointLiteral(value, styleResolveOptions));
            const top = spacing.top;
            const right = spacing.right;
            const bottom = spacing.bottom;
            const left = spacing.left;

            if (paddingHorizontal) modifiers.push(`.padding(.horizontal, ${paddingHorizontal})`);
            if (paddingVertical) modifiers.push(`.padding(.vertical, ${paddingVertical})`);
            if (top) modifiers.push(`.padding(.top, ${top})`);
            if (right) modifiers.push(`.padding(.trailing, ${right})`);
            if (bottom) modifiers.push(`.padding(.bottom, ${bottom})`);
            if (left) modifiers.push(`.padding(.leading, ${left})`);
        }

        const frameArgs: string[] = [];
        if (isFillValue(style.width) && !suppressExactWidth) {
            if (!hasAutoMarginMaxWidth) {
                frameArgs.push('maxWidth: .infinity');
            }
        } else if (width) {
            frameArgs.push(`width: ${width}`);
        } else if (hints.fillWidth && !hasAutoMarginMaxWidth && !selfAlignmentFillsWidth) {
            frameArgs.push('maxWidth: .infinity');
        }
        if (isFillValue(style.height) && !suppressExactHeight) {
            frameArgs.push('maxHeight: .infinity');
        } else if (height) {
            frameArgs.push(`height: ${height}`);
        } else if (hints.fillHeight && !selfAlignmentFillsHeight) {
            frameArgs.push('maxHeight: .infinity');
        }
        if (minWidth) frameArgs.push(`minWidth: ${minWidth}`);
        if (maxWidth) frameArgs.push(`maxWidth: ${maxWidth}`);
        if (minHeight) frameArgs.push(`minHeight: ${minHeight}`);
        if (maxHeight) frameArgs.push(`maxHeight: ${maxHeight}`);
        if (frameArgs.length > 0) {
            modifiers.push(`.frame(${frameArgs.join(', ')})`);
        }

        if (aspectRatio !== undefined) {
            modifiers.push(`.aspectRatio(${formatFloat(aspectRatio)}, contentMode: .fit)`);
        }

        if (backdropBlur !== undefined) {
            const backdropShape = radius ? `RoundedRectangle(cornerRadius: ${radius})` : 'Rectangle()';
            modifiers.push(`.background(.ultraThinMaterial, in: ${backdropShape})`);
        }

        if (backgroundGradient) {
            modifiers.push(`.background(${toSwiftGradientLiteral(backgroundGradient)})`);
        } else if (backgroundColor) {
            modifiers.push(`.background(${toSwiftColorLiteral(backgroundColor)})`);
        }

        if (radius) {
            modifiers.push(`.clipShape(RoundedRectangle(cornerRadius: ${radius}))`);
        }

        if (shouldClipOverflow && !radius) {
            modifiers.push('.clipped()');
        }

        if (border?.width && border.color) {
            const styledBorderModifier = buildSwiftUniformStyledBorderModifier(border, radius);
            if (styledBorderModifier) {
                modifiers.push(styledBorderModifier);
            } else {
                const radiusValue = radius ?? '0';
                modifiers.push(`.overlay(RoundedRectangle(cornerRadius: ${radiusValue}).stroke(${toSwiftColorLiteral(border.color)}, lineWidth: ${border.width}))`);
            }
        } else {
            const sideBorderOverlay = buildSwiftSideBorderOverlay(border ?? {}, radius);
            if (sideBorderOverlay) {
                modifiers.push(sideBorderOverlay);
            }
        }

        if (shadows.length > 0) {
            for (const entry of shadows) {
                modifiers.push(`.shadow(color: ${toSwiftColorLiteral(entry.color)}, radius: ${toSwiftShadowRadius(entry)}, x: ${formatFloat(entry.offsetX)}, y: ${formatFloat(entry.offsetY)})`);
            }
        }

        const positionUsesEndX = positionInsets.left === undefined && positionInsets.right !== undefined;
        const positionUsesEndY = positionInsets.top === undefined && positionInsets.bottom !== undefined;
        const combinedOffsetX = (positionInsets.left ?? (positionInsets.right !== undefined ? -positionInsets.right : 0)) + (transform?.translateX ?? 0);
        const combinedOffsetY = (positionInsets.top ?? (positionInsets.bottom !== undefined ? -positionInsets.bottom : 0)) + (transform?.translateY ?? 0);
        if ((positionMode === 'absolute' || positionMode === 'fixed') && hints.absoluteOverlay) {
            modifiers.push(`.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: ${positionUsesEndY ? '.bottom' : '.top'}${positionUsesEndX ? 'Trailing' : 'Leading'})`);
        }
        if (combinedOffsetX !== 0 || combinedOffsetY !== 0) {
            modifiers.push(`.offset(x: ${formatFloat(combinedOffsetX)}, y: ${formatFloat(combinedOffsetY)})`);
        }
        if (transform?.scaleX !== undefined || transform?.scaleY !== undefined) {
            modifiers.push(`.scaleEffect(x: ${formatFloat(transform.scaleX ?? 1)}, y: ${formatFloat(transform.scaleY ?? 1)}, anchor: .center)`);
        }
        if (transform?.rotationDegrees !== undefined) {
            modifiers.push(`.rotationEffect(.degrees(${formatFloat(transform.rotationDegrees)}))`);
        }

        if (selfAlignment) {
            modifiers.push(selfAlignment);
        }

        if (opacity !== undefined && opacity < 1) modifiers.push(`.opacity(${formatFloat(opacity)})`);
        if (zIndex !== undefined && zIndex !== 0) modifiers.push(`.zIndex(${formatFloat(zIndex)})`);

        if (color) modifiers.push(`.foregroundStyle(${toSwiftColorLiteral(color)})`);
        if (fontSize || fontWeight || fontDesign) {
            const args = [`size: ${fontSize ?? '17'}`];
            if (fontWeight) args.push(`weight: ${fontWeight}`);
            if (fontDesign) args.push(`design: ${fontDesign}`);
            modifiers.push(`.font(.system(${args.join(', ')}))`);
        }
        if (letterSpacing) modifiers.push(`.kerning(${letterSpacing})`);
        if (lineSpacing) modifiers.push(`.lineSpacing(${lineSpacing})`);
        if (textAlign) modifiers.push(`.multilineTextAlignment(${textAlign})`);
        if (textDecoration?.underline) modifiers.push('.underline()');
        if (textDecoration?.strikethrough) modifiers.push('.strikethrough()');
        if (flexValue !== undefined && Number.isFinite(flexValue) && flexValue > 0) {
            modifiers.push('.frame(maxWidth: .infinity, alignment: .leading)');
            modifiers.push(`.layoutPriority(${formatFloat(flexValue)})`);
        }

        modifiers.push(...marginModifiers);
        modifiers.push(...autoMarginModifiers);
    }

    if (!style && hints.fillWidth) {
        modifiers.push('.frame(maxWidth: .infinity, alignment: .leading)');
    }

    modifiers.push(...buildSwiftAccessibilityModifiers(node));

    return modifiers;
}

export function resolveSwiftRowAlignment(
    style: Record<string, NativePropValue> | undefined,
    children: NativeNode[] = [],
    resolvedStyles?: NativeResolvedStyleMap,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): string {
    return resolveSwiftRowAlignmentFromStyle(
        style,
        resolveRowBaselineAlignmentValues(
            children.flatMap((child) => child.kind === 'element' && child.component === 'Text'
                ? [getStyleObject(child, resolvedStyles, styleResolveOptions)?.alignSelf]
                : []),
        ),
    );
}