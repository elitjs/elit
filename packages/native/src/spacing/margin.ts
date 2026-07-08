import { type NativeStyleResolveOptions } from '../../client/style';
import type { NativePropValue } from '../types';
import { formatFloat, getNativeStyleResolveOptions } from '../units';
import { resolveNumericDirectionalSpacing } from './directional';

export function buildComposeMarginPaddingCalls(
    style: Record<string, NativePropValue> | undefined,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): string[] {
    if (!style) {
        return [];
    }

    const spacing = resolveNumericDirectionalSpacing(style, 'margin', styleResolveOptions);
    const args: string[] = [];
    if (spacing.top) args.push(`top = ${formatFloat(spacing.top)}.dp`);
    if (spacing.right) args.push(`end = ${formatFloat(spacing.right)}.dp`);
    if (spacing.bottom) args.push(`bottom = ${formatFloat(spacing.bottom)}.dp`);
    if (spacing.left) args.push(`start = ${formatFloat(spacing.left)}.dp`);

    return args.length > 0 ? [`padding(${args.join(', ')})`] : [];
}

export function buildSwiftMarginPaddingModifiers(
    style: Record<string, NativePropValue> | undefined,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): string[] {
    if (!style) {
        return [];
    }

    const spacing = resolveNumericDirectionalSpacing(style, 'margin', styleResolveOptions);
    const modifiers: string[] = [];
    if (spacing.top) modifiers.push(`.padding(.top, ${formatFloat(spacing.top)})`);
    if (spacing.right) modifiers.push(`.padding(.trailing, ${formatFloat(spacing.right)})`);
    if (spacing.bottom) modifiers.push(`.padding(.bottom, ${formatFloat(spacing.bottom)})`);
    if (spacing.left) modifiers.push(`.padding(.leading, ${formatFloat(spacing.left)})`);

    return modifiers;
}