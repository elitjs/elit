import type { NativeAutoMarginFlags, NativePropValue } from '../types';
import { isFillValue } from '../color';

function parseAutoMarginFlags(style: Record<string, NativePropValue> | undefined): NativeAutoMarginFlags {
    const flags: NativeAutoMarginFlags = {
        top: false,
        right: false,
        bottom: false,
        left: false,
    };

    if (!style) {
        return flags;
    }

    const markValue = (value: NativePropValue | undefined, sides: Array<keyof NativeAutoMarginFlags>): void => {
        if (typeof value === 'string' && value.trim().toLowerCase() === 'auto') {
            sides.forEach((side) => {
                flags[side] = true;
            });
        }
    };

    markValue(style.marginTop, ['top']);
    markValue(style.marginRight ?? style.marginEnd, ['right']);
    markValue(style.marginBottom, ['bottom']);
    markValue(style.marginLeft ?? style.marginStart, ['left']);

    if (typeof style.margin === 'string') {
        const values = style.margin.trim().split(/\s+/).filter(Boolean);
        const resolved = [values[0], values[1] ?? values[0], values[2] ?? values[0], values[3] ?? values[1] ?? values[0]];
        markValue(resolved[0], ['top']);
        markValue(resolved[1], ['right']);
        markValue(resolved[2], ['bottom']);
        markValue(resolved[3], ['left']);
    }

    return flags;
}

function hasHorizontalAutoMargins(style: Record<string, NativePropValue> | undefined): boolean {
    const flags = parseAutoMarginFlags(style);
    return flags.left && flags.right;
}

export function shouldCenterConstrainedHorizontalAutoMargins(style: Record<string, NativePropValue> | undefined): boolean {
    if (!style || !hasHorizontalAutoMargins(style)) {
        return false;
    }

    if (isFillValue(style.width)) {
        return false;
    }

    return style.width !== undefined || style.minWidth !== undefined || style.maxWidth !== undefined;
}

export function buildComposeAutoMarginCalls(style: Record<string, NativePropValue> | undefined): string[] {
    if (!shouldCenterConstrainedHorizontalAutoMargins(style)) {
        return [];
    }

    return ['wrapContentWidth(Alignment.CenterHorizontally)'];
}

export function buildSwiftAutoMarginModifiers(style: Record<string, NativePropValue> | undefined): string[] {
    if (!hasHorizontalAutoMargins(style)) {
        return [];
    }

    return ['.frame(maxWidth: .infinity, alignment: .center)'];
}