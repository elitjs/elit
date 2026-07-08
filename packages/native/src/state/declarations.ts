import type {
    AndroidComposeContext,
    NativeStateDescriptor,
    NativeTree,
    SwiftUIContext,
} from '../types';
import {
    formatComposeStateInitialValue,
    formatNativeNumberLiteral,
    formatSwiftStateInitialValue,
} from './format';

function indent(level: number): string {
    return '    '.repeat(level);
}

function toNativeStateVariableName(id: string): string {
    const suffix = id.replace(/[^a-zA-Z0-9_]/g, '_');
    return suffix ? `native${suffix.charAt(0).toUpperCase()}${suffix.slice(1)}` : 'nativeState';
}

export function createNativeStateDescriptorMap(tree: NativeTree): Map<string, NativeStateDescriptor> {
    return new Map((tree.stateDescriptors ?? []).map((descriptor) => [descriptor.id, descriptor]));
}

export { formatNativeNumberLiteral };

export function ensureComposeStateVariable(context: AndroidComposeContext, stateId: string): { descriptor: NativeStateDescriptor; variableName: string } {
    const descriptor = context.stateDescriptors.get(stateId);
    if (!descriptor) {
        throw new Error(`Unknown native state descriptor: ${stateId}`);
    }

    const variableName = toNativeStateVariableName(stateId);
    if (!context.declaredStateIds.has(stateId)) {
        context.declaredStateIds.add(stateId);
        context.stateDeclarations.push(`${indent(1)}var ${variableName} by remember { mutableStateOf(${formatComposeStateInitialValue(descriptor)}) }`);
    }

    return { descriptor, variableName };
}

export function ensureSwiftStateVariable(context: SwiftUIContext, stateId: string): { descriptor: NativeStateDescriptor; variableName: string } {
    const descriptor = context.stateDescriptors.get(stateId);
    if (!descriptor) {
        throw new Error(`Unknown native state descriptor: ${stateId}`);
    }

    const variableName = toNativeStateVariableName(stateId);
    if (!context.declaredStateIds.has(stateId)) {
        context.declaredStateIds.add(stateId);
        const annotation = descriptor.type === 'string-array'
            ? ': [String]'
            : descriptor.type === 'number'
                ? ': Double'
                : '';
        context.stateDeclarations.push(`${indent(1)}@State private var ${variableName}${annotation} = ${formatSwiftStateInitialValue(descriptor)}`);
    }

    return { descriptor, variableName };
}

export function toComposeTextValueExpression(variableName: string, descriptor: NativeStateDescriptor): string {
    if (descriptor.type === 'string') {
        return variableName;
    }

    if (descriptor.type === 'string-array') {
        return `${variableName}.joinToString(", ")`;
    }

    return `${variableName}.toString()`;
}

export function toSwiftTextValueExpression(variableName: string, descriptor: NativeStateDescriptor): string {
    if (descriptor.type === 'string') {
        return variableName;
    }

    if (descriptor.type === 'string-array') {
        return `${variableName}.joined(separator: ", ")`;
    }

    return `String(${variableName})`;
}