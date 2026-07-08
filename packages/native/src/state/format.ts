import type { NativeStateDescriptor } from '../types';
import { quoteKotlinString, quoteSwiftString } from '../strings';
import { formatFloat } from '../units';

export function formatKotlinStringList(values: readonly string[]): string {
    return values.length > 0
        ? `listOf(${values.map((value) => quoteKotlinString(String(value))).join(', ')})`
        : 'emptyList<String>()';
}

export function formatSwiftStringList(values: readonly string[]): string {
    return `[${values.map((value) => quoteSwiftString(String(value))).join(', ')}]`;
}

export function formatNativeNumberLiteral(value: number): string {
    const formatted = formatFloat(value);
    return formatted.includes('.') ? formatted : `${formatted}.0`;
}

export function formatComposeStateInitialValue(descriptor: NativeStateDescriptor): string {
    if (descriptor.type === 'string-array') {
        const values = Array.isArray(descriptor.initialValue) ? descriptor.initialValue : [];
        return formatKotlinStringList(values);
    }

    if (descriptor.type === 'string') {
        return quoteKotlinString(String(descriptor.initialValue));
    }

    if (descriptor.type === 'number') {
        return formatNativeNumberLiteral(Number(descriptor.initialValue));
    }

    return String(descriptor.initialValue);
}

export function formatSwiftStateInitialValue(descriptor: NativeStateDescriptor): string {
    if (descriptor.type === 'string-array') {
        const values = Array.isArray(descriptor.initialValue) ? descriptor.initialValue : [];
        return formatSwiftStringList(values);
    }

    if (descriptor.type === 'string') {
        return quoteSwiftString(String(descriptor.initialValue));
    }

    if (descriptor.type === 'number') {
        return formatNativeNumberLiteral(Number(descriptor.initialValue));
    }

    return String(descriptor.initialValue);
}