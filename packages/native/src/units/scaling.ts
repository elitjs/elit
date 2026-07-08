import { type NativeStyleResolveOptions } from '../../client/style';
import type { NativePropValue } from '../types';
import { formatFloat, getNativeStyleResolveOptions } from './base';
import { parseCssUnitValue } from './parsing';

export function splitCssFunctionArguments(value: string): string[] {
    const args: string[] = [];
    let token = '';
    let depth = 0;

    for (const char of value.trim()) {
        if (char === '(') {
            depth += 1;
        } else if (char === ')' && depth > 0) {
            depth -= 1;
        }

        if (char === ',' && depth === 0) {
            const trimmed = token.trim();
            if (trimmed) {
                args.push(trimmed);
            }
            token = '';
            continue;
        }

        token += char;
    }

    const trailing = token.trim();
    if (trailing) {
        args.push(trailing);
    }

    return args;
}

export function evaluateCssLengthExpression(value: string, styleResolveOptions: NativeStyleResolveOptions): number | undefined {
    let total = 0;
    let token = '';
    let depth = 0;
    let operator: 1 | -1 = 1;
    let hasValue = false;
    let invalid = false;

    const flushToken = (): void => {
        const trimmed = token.trim();
        token = '';

        if (!trimmed) {
            return;
        }

        const resolved = toScaledUnitNumber(trimmed, styleResolveOptions);
        if (resolved === undefined) {
            invalid = true;
            return;
        }

        total += operator * resolved;
        hasValue = true;
    };

    for (const char of value.trim()) {
        if (char === '(') {
            depth += 1;
        } else if (char === ')' && depth > 0) {
            depth -= 1;
        }

        if (depth === 0 && (char === '+' || char === '-')) {
            if (token.trim().length === 0) {
                token += char;
                continue;
            }

            flushToken();
            operator = char === '+' ? 1 : -1;
            continue;
        }

        token += char;
    }

    flushToken();
    return invalid || !hasValue ? undefined : total;
}

export function toScaledUnitNumber(
    value: NativePropValue | undefined,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): number | undefined {
    const parsed = parseCssUnitValue(value);
    if (parsed) {
        if (parsed.unit === 'rem' || parsed.unit === 'em') {
            return parsed.value * 16;
        }

        if (parsed.unit === 'vw') {
            return (styleResolveOptions.viewportWidth ?? 1024) * (parsed.value / 100);
        }

        if (parsed.unit === 'vh') {
            return (styleResolveOptions.viewportHeight ?? 768) * (parsed.value / 100);
        }

        if (parsed.unit === 'vmin') {
            const viewportWidth = styleResolveOptions.viewportWidth ?? 1024;
            const viewportHeight = styleResolveOptions.viewportHeight ?? 768;
            return Math.min(viewportWidth, viewportHeight) * (parsed.value / 100);
        }

        if (parsed.unit === 'vmax') {
            const viewportWidth = styleResolveOptions.viewportWidth ?? 1024;
            const viewportHeight = styleResolveOptions.viewportHeight ?? 768;
            return Math.max(viewportWidth, viewportHeight) * (parsed.value / 100);
        }

        return parsed.value;
    }

    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    const openParen = trimmed.indexOf('(');
    if (openParen <= 0 || !trimmed.endsWith(')')) {
        return undefined;
    }

    const functionName = trimmed.slice(0, openParen).toLowerCase();
    if (!/^[a-z]+$/.test(functionName)) {
        return undefined;
    }

    const innerValue = trimmed.slice(openParen + 1, -1).trim();
    if (functionName === 'calc') {
        return evaluateCssLengthExpression(innerValue, styleResolveOptions);
    }

    if (functionName !== 'clamp' && functionName !== 'min' && functionName !== 'max') {
        return undefined;
    }

    const resolvedArguments = splitCssFunctionArguments(innerValue)
        .map((entry) => toScaledUnitNumber(entry, styleResolveOptions));
    if (resolvedArguments.length === 0 || resolvedArguments.some((entry) => entry === undefined)) {
        return undefined;
    }

    const numericArguments = resolvedArguments as number[];
    if (functionName === 'clamp') {
        if (numericArguments.length !== 3) {
            return undefined;
        }

        return Math.min(numericArguments[2], Math.max(numericArguments[0], numericArguments[1]));
    }

    return functionName === 'min'
        ? Math.min(...numericArguments)
        : Math.max(...numericArguments);
}

export function toDpLiteral(
    value: NativePropValue | undefined,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): string | undefined {
    const resolved = toScaledUnitNumber(value, styleResolveOptions);
    return resolved !== undefined ? `${formatFloat(resolved)}.dp` : undefined;
}

export function toPointLiteral(
    value: NativePropValue | undefined,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): string | undefined {
    const resolved = toScaledUnitNumber(value, styleResolveOptions);
    return resolved !== undefined ? formatFloat(resolved) : undefined;
}

export function toSpLiteral(
    value: NativePropValue | undefined,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): string | undefined {
    const resolved = toScaledUnitNumber(value, styleResolveOptions);
    return resolved !== undefined ? `${formatFloat(resolved)}.sp` : undefined;
}