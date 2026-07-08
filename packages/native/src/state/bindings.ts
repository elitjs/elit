import type { NativeStateDescriptor } from '../types';
import { quoteKotlinString, quoteSwiftString } from '../strings';
import { formatKotlinStringList, formatSwiftStringList } from './format';

export function buildComposeStateStringAssignment(variableName: string, descriptor: NativeStateDescriptor, value: string): string {
    const literal = quoteKotlinString(value);

    if (descriptor.type === 'string-array') {
        return `${variableName} = listOf(${literal})`;
    }

    if (descriptor.type === 'number') {
        return `${variableName} = ${literal}.toDoubleOrNull() ?: ${variableName}`;
    }

    if (descriptor.type === 'boolean') {
        return `${variableName} = ${literal}.equals("true", ignoreCase = true)`;
    }

    return `${variableName} = ${literal}`;
}

export function buildSwiftStateStringAssignment(variableName: string, descriptor: NativeStateDescriptor, valueExpression: string): string {
    if (descriptor.type === 'string-array') {
        return `${variableName} = ${valueExpression}.split(separator: ",").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }`;
    }

    if (descriptor.type === 'number') {
        return `if let parsed = Double(${valueExpression}) { ${variableName} = parsed }`;
    }

    if (descriptor.type === 'boolean') {
        return `${variableName} = ${valueExpression}.compare("true", options: .caseInsensitive) == .orderedSame`;
    }

    return `${variableName} = ${valueExpression}`;
}

export function buildComposeStateStringArrayToggleAssignment(variableName: string, value: string, optionValues: readonly string[]): string {
    const orderedValues = formatKotlinStringList(optionValues);
    const literal = quoteKotlinString(value);
    return `${variableName} = ${orderedValues}.filter { candidate -> if (candidate == ${literal}) checked else ${variableName}.contains(candidate) }`;
}

export function buildSwiftStringBindingExpression(
    variableName: string,
    descriptor: NativeStateDescriptor,
    additionalSetterStatements: string[] = [],
): string {
    const setterSuffix = additionalSetterStatements.length > 0
        ? `; ${additionalSetterStatements.join('; ')}`
        : '';

    if (descriptor.type === 'string') {
        return additionalSetterStatements.length > 0
            ? `Binding(get: { ${variableName} }, set: { nextValue in ${variableName} = nextValue${setterSuffix} })`
            : `$${variableName}`;
    }

    if (descriptor.type === 'string-array') {
        return `Binding(get: { ${variableName}.joined(separator: ", ") }, set: { nextValue in ${variableName} = nextValue.split(separator: ",").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }${setterSuffix} })`;
    }

    if (descriptor.type === 'number') {
        return `Binding(get: { String(${variableName}) }, set: { nextValue in if let parsed = Double(nextValue) { ${variableName} = parsed }${setterSuffix} })`;
    }

    return `Binding(get: { ${variableName} ? "true" : "false" }, set: { nextValue in ${variableName} = nextValue.compare("true", options: .caseInsensitive) == .orderedSame${setterSuffix} })`;
}

export function buildSwiftStateStringArrayToggleBinding(
    variableName: string,
    value: string,
    optionValues: readonly string[],
    additionalSetterStatements: string[] = [],
): string {
    const literal = quoteSwiftString(value);
    const orderedValues = formatSwiftStringList(optionValues);
    const setterSuffix = additionalSetterStatements.length > 0
        ? `; ${additionalSetterStatements.join('; ')}`
        : '';
    return `Binding(get: { ${variableName}.contains(${literal}) }, set: { isOn in ${variableName} = ${orderedValues}.filter { option in option == ${literal} ? isOn : ${variableName}.contains(option) }${setterSuffix} })`;
}

export function buildSwiftReadOnlyBindingExpression(valueExpression: string): string {
    return `Binding(get: { ${valueExpression} }, set: { _ in })`;
}