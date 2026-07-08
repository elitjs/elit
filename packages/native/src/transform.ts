import { type NativeStyleResolveOptions } from '../client/style';
import type { NativePropValue } from './types';
import {
    splitCssFunctionArguments,
    parsePlainNumericValue,
    toScaledUnitNumber,
    getNativeStyleResolveOptions,
} from './units';

interface NativeTransformValue {
    translateX?: number;
    translateY?: number;
    scaleX?: number;
    scaleY?: number;
    rotationDegrees?: number;
}

function parseCssAngleDegrees(value: string): number | undefined {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === '0') {
        return 0;
    }

    const match = trimmed.match(/^(-?(?:\d+(?:\.\d*)?|\.\d+))deg$/);
    if (!match) {
        return undefined;
    }

    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseNativeTransform(
    value: NativePropValue | undefined,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): NativeTransformValue | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    if (!trimmed || trimmed.toLowerCase() === 'none') {
        return undefined;
    }

    const transform: NativeTransformValue = {};
    const pattern = /(translate[xy]?|scale[xy]?|rotate)\(([^()]*)\)/gi;
    let matched = false;

    for (const match of trimmed.matchAll(pattern)) {
        matched = true;
        const functionName = match[1].toLowerCase();
        const args = splitCssFunctionArguments(match[2]);

        if (functionName === 'translate') {
            const x = toScaledUnitNumber(args[0], styleResolveOptions);
            const y = args[1] ? toScaledUnitNumber(args[1], styleResolveOptions) : 0;
            if (x !== undefined) {
                transform.translateX = (transform.translateX ?? 0) + x;
            }
            if (y !== undefined) {
                transform.translateY = (transform.translateY ?? 0) + y;
            }
            continue;
        }

        if (functionName === 'translatex') {
            const x = toScaledUnitNumber(args[0], styleResolveOptions);
            if (x !== undefined) {
                transform.translateX = (transform.translateX ?? 0) + x;
            }
            continue;
        }

        if (functionName === 'translatey') {
            const y = toScaledUnitNumber(args[0], styleResolveOptions);
            if (y !== undefined) {
                transform.translateY = (transform.translateY ?? 0) + y;
            }
            continue;
        }

        if (functionName === 'scale') {
            const x = parsePlainNumericValue(args[0]);
            const y = args[1] ? parsePlainNumericValue(args[1]) : x;
            if (x !== undefined) {
                transform.scaleX = (transform.scaleX ?? 1) * x;
            }
            if (y !== undefined) {
                transform.scaleY = (transform.scaleY ?? 1) * y;
            }
            continue;
        }

        if (functionName === 'scalex') {
            const x = parsePlainNumericValue(args[0]);
            if (x !== undefined) {
                transform.scaleX = (transform.scaleX ?? 1) * x;
            }
            continue;
        }

        if (functionName === 'scaley') {
            const y = parsePlainNumericValue(args[0]);
            if (y !== undefined) {
                transform.scaleY = (transform.scaleY ?? 1) * y;
            }
            continue;
        }

        if (functionName === 'rotate') {
            const rotation = parseCssAngleDegrees(args[0] ?? '');
            if (rotation !== undefined) {
                transform.rotationDegrees = (transform.rotationDegrees ?? 0) + rotation;
            }
        }
    }

    return matched && Object.keys(transform).length > 0 ? transform : undefined;
}