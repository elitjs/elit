import { flattenTextContent, quoteKotlinString } from '../strings';
import type { NativeElementNode, NativeNode, NativePickerOption } from '../types';
import {
    isNativeDisabled,
    isNativeMultiple,
    isNativeRequired,
    isNativeSelected,
} from './controls';

function collectNativePickerOptionNodes(nodes: NativeNode[]): NativeElementNode[] {
    const options: NativeElementNode[] = [];

    for (const node of nodes) {
        if (node.kind !== 'element') {
            continue;
        }

        if (node.component === 'Option') {
            options.push(node);
            continue;
        }

        if (node.sourceTag === 'optgroup') {
            options.push(...collectNativePickerOptionNodes(node.children));
        }
    }

    return options;
}

export function resolveNativePickerOptionLabel(node: NativeElementNode): string {
    if (typeof node.props.label === 'string' && node.props.label.trim()) {
        return node.props.label;
    }

    const textContent = flattenTextContent(node.children).trim();
    if (textContent) {
        return textContent;
    }

    if (typeof node.props.value === 'string' || typeof node.props.value === 'number' || typeof node.props.value === 'boolean') {
        return String(node.props.value);
    }

    return 'Option';
}

function resolveNativePickerOptionValue(node: NativeElementNode): string {
    if (typeof node.props.value === 'string' || typeof node.props.value === 'number' || typeof node.props.value === 'boolean') {
        return String(node.props.value);
    }

    return resolveNativePickerOptionLabel(node);
}

export function resolveNativePickerOptions(node: NativeElementNode): NativePickerOption[] {
    return collectNativePickerOptionNodes(node.children).map((optionNode) => ({
        label: resolveNativePickerOptionLabel(optionNode),
        value: resolveNativePickerOptionValue(optionNode),
        selected: isNativeSelected(optionNode),
        disabled: isNativeDisabled(optionNode),
    }));
}

export function resolveNativePickerInitialSelection(node: NativeElementNode, options: NativePickerOption[]): string {
    if (isNativeMultiple(node)) {
        return resolveNativePickerInitialSelections(node, options)[0] ?? '';
    }

    const explicitValue = typeof node.props.value === 'string' || typeof node.props.value === 'number' || typeof node.props.value === 'boolean'
        ? String(node.props.value)
        : undefined;

    if (explicitValue && options.some((option) => option.value === explicitValue)) {
        return explicitValue;
    }

    const selectedOption = options.find((option) => option.selected);

    if (selectedOption) {
        return selectedOption.value;
    }

    if (isNativeRequired(node)) {
        return '';
    }

    return options[0]?.value ?? '';
}

export function resolveNativePickerInitialSelections(node: NativeElementNode, options: NativePickerOption[]): string[] {
    if (Array.isArray(node.props.value)) {
        const explicitValues = node.props.value
            .filter((value): value is string | number | boolean => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
            .map((value) => String(value));

        return explicitValues.filter((value, index) => explicitValues.indexOf(value) === index && options.some((option) => option.value === value));
    }

    const explicitValue = typeof node.props.value === 'string' || typeof node.props.value === 'number' || typeof node.props.value === 'boolean'
        ? String(node.props.value)
        : undefined;

    if (explicitValue && options.some((option) => option.value === explicitValue)) {
        return [explicitValue];
    }

    return options
        .filter((option) => option.selected)
        .map((option) => option.value);
}

export function resolveNativePickerDisplayLabel(value: string, options: NativePickerOption[]): string {
    return options.find((option) => option.value === value)?.label ?? value;
}

export function buildComposePickerLabelExpression(selectionExpression: string, options: NativePickerOption[], placeholder?: string): string {
    const fallbackLabel = placeholder ? quoteKotlinString(placeholder) : undefined;

    if (options.length === 0 || options.every((option) => option.value === option.label)) {
        return fallbackLabel
            ? `if (${selectionExpression}.isEmpty()) ${fallbackLabel} else ${selectionExpression}`
            : selectionExpression;
    }

    const branches = options.map((option) => `${quoteKotlinString(option.value)} -> ${quoteKotlinString(option.label)}`).join('; ');
    return fallbackLabel
        ? `when (${selectionExpression}) { "" -> ${fallbackLabel}; ${branches}; else -> ${selectionExpression} }`
        : `when (${selectionExpression}) { ${branches}; else -> ${selectionExpression} }`;
}