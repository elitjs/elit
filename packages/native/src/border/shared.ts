import type { NativeBorderValue } from '../types';

export function hasNativeSideBorders(border: NativeBorderValue | undefined): boolean {
    return Boolean(border?.top || border?.right || border?.bottom || border?.left);
}

export function parseNativeBorderNumericWidth(width: string): number {
    const parsedWidth = Number.parseFloat(width);
    return Number.isFinite(parsedWidth) && parsedWidth > 0 ? parsedWidth : 1;
}