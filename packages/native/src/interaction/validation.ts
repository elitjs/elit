import type { NativeElementNode } from '../types';
import {
    isNativeChecked,
    isNativeDisabled,
    isNativeFormControl,
    isNativeMultiple,
    isNativeReadOnly,
    isNativeRequired,
    resolveNativeNumericConstraint,
    resolveNativePatternExpression,
    resolveNativeStepConstraint,
    resolveNativeTextInputMaxLength,
    resolveNativeTextInputMinLength,
    resolveNativeTextInputType,
    resolveNativeTextInputValue,
    toNativeBoolean,
} from './controls';
import {
    resolveNativePickerInitialSelection,
    resolveNativePickerInitialSelections,
    resolveNativePickerOptions,
} from './picker';

function canNativeParticipateInValidation(node: NativeElementNode): boolean {
    return isNativeFormControl(node) && !isNativeDisabled(node);
}

function supportsNativePatternValidation(node: NativeElementNode): boolean {
    switch (resolveNativeTextInputType(node)) {
        case 'text':
        case 'password':
        case 'email':
        case 'tel':
        case 'url':
        case 'search':
            return true;
        default:
            return false;
    }
}

function isNativeEmailValue(value: string): boolean {
    return /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(value);
}

function isNativeUrlValue(value: string): boolean {
    try {
        const parsed = new URL(value);
        return Boolean(parsed.protocol && parsed.hostname);
    } catch {
        return false;
    }
}

export function hasNativeValidationConstraint(node: NativeElementNode): boolean {
    if (node.props['aria-invalid'] !== undefined) {
        return true;
    }

    if (node.component === 'TextInput') {
        return isNativeRequired(node)
            || resolveNativeTextInputMinLength(node) !== undefined
            || resolveNativeTextInputMaxLength(node) !== undefined
            || resolveNativePatternExpression(node) !== undefined
            || resolveNativeNumericConstraint(node.props.min) !== undefined
            || resolveNativeNumericConstraint(node.props.max) !== undefined
            || resolveNativeStepConstraint(node) !== undefined
            || resolveNativeTextInputType(node) === 'email'
            || resolveNativeTextInputType(node) === 'url'
            || resolveNativeTextInputType(node) === 'number';
    }

    return isNativeRequired(node);
}

function isNativeTextInputConstraintInvalid(node: NativeElementNode): boolean {
    const value = resolveNativeTextInputValue(node);
    const trimmedValue = value.trim();

    if (isNativeRequired(node) && trimmedValue.length === 0) {
        return true;
    }

    if (trimmedValue.length === 0) {
        return false;
    }

    const inputType = resolveNativeTextInputType(node);
    if (inputType === 'email' && !isNativeEmailValue(trimmedValue)) {
        return true;
    }

    if (inputType === 'url' && !isNativeUrlValue(trimmedValue)) {
        return true;
    }

    const minLength = resolveNativeTextInputMinLength(node);
    if (minLength !== undefined && value.length < minLength) {
        return true;
    }

    const maxLength = resolveNativeTextInputMaxLength(node);
    if (maxLength !== undefined && value.length > maxLength) {
        return true;
    }

    const patternExpression = supportsNativePatternValidation(node)
        ? resolveNativePatternExpression(node)
        : undefined;
    if (patternExpression && !patternExpression.test(value)) {
        return true;
    }

    if (inputType === 'number') {
        const numericValue = Number(trimmedValue);
        if (!Number.isFinite(numericValue)) {
            return true;
        }

        const min = resolveNativeNumericConstraint(node.props.min);
        if (min !== undefined && numericValue < min) {
            return true;
        }

        const max = resolveNativeNumericConstraint(node.props.max);
        if (max !== undefined && numericValue > max) {
            return true;
        }

        const step = resolveNativeStepConstraint(node);
        if (step !== undefined) {
            const stepBase = resolveNativeNumericConstraint(node.props.min) ?? 0;
            const steps = (numericValue - stepBase) / step;
            if (Math.abs(steps - Math.round(steps)) > 1e-7) {
                return true;
            }
        }
    }

    return false;
}

export function isNativePlaceholderShown(node: NativeElementNode): boolean {
    return node.component === 'TextInput'
        && typeof node.props.placeholder === 'string'
        && node.props.placeholder.length > 0
        && resolveNativeTextInputValue(node).length === 0;
}

export function isNativeReadOnlyState(node: NativeElementNode): boolean {
    return node.component === 'TextInput' && (isNativeReadOnly(node) || isNativeDisabled(node));
}

export function isNativeReadWrite(node: NativeElementNode): boolean {
    return node.component === 'TextInput' && !isNativeReadOnlyState(node);
}

export function isNativeElementEmpty(node: NativeElementNode): boolean {
    return node.children.every((child) => child.kind === 'text' && child.value.length === 0);
}

export function isNativeFocusWithin(node: NativeElementNode): boolean {
    if (isNativePseudoFocused(node)) {
        return true;
    }

    return node.children.some((child) => child.kind === 'element' && isNativeFocusWithin(child));
}

function isNativeAriaInvalid(node: NativeElementNode): boolean {
    const value = node.props['aria-invalid'];
    if (value === undefined || value === null || value === false) {
        return false;
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        return normalized.length > 0 && normalized !== 'false';
    }

    return toNativeBoolean(value);
}

export function isNativeInvalid(node: NativeElementNode): boolean {
    if (isNativeAriaInvalid(node)) {
        return true;
    }

    if (!isNativeFormControl(node)) {
        return false;
    }

    if (!canNativeParticipateInValidation(node)) {
        return false;
    }

    if (node.component === 'TextInput') {
        return isNativeTextInputConstraintInvalid(node);
    }

    if (!isNativeRequired(node)) {
        return false;
    }

    if (node.component === 'Toggle') {
        return !isNativeChecked(node);
    }

    if (node.component === 'Picker') {
        const options = resolveNativePickerOptions(node);
        return isNativeMultiple(node)
            ? resolveNativePickerInitialSelections(node, options).length === 0
            : resolveNativePickerInitialSelection(node, options).trim().length === 0;
    }

    return false;
}

export function isNativeValid(node: NativeElementNode): boolean {
    return canNativeParticipateInValidation(node) && !isNativeInvalid(node);
}

export function isNativeOptional(node: NativeElementNode): boolean {
    return isNativeFormControl(node) && !isNativeRequired(node);
}

function parseNativeTabIndex(node: NativeElementNode): number | undefined {
    const rawValue = node.props.tabIndex ?? node.props.tabindex;
    if (typeof rawValue === 'number' && Number.isInteger(rawValue)) {
        return rawValue;
    }

    if (typeof rawValue === 'string' && /^-?\d+$/.test(rawValue.trim())) {
        return Number(rawValue.trim());
    }

    return undefined;
}

function hasNativeExplicitFocusSignal(node: NativeElementNode): boolean {
    return toNativeBoolean(node.props.autoFocus)
        || toNativeBoolean(node.props.autofocus)
        || toNativeBoolean(node.props.focused)
        || toNativeBoolean(node.props['aria-focused']);
}

function isNativeFocusableRole(node: NativeElementNode): boolean {
    const role = typeof node.props.role === 'string'
        ? node.props.role.trim().toLowerCase()
        : undefined;

    return role === 'button'
        || role === 'link'
        || role === 'checkbox'
        || role === 'switch'
        || role === 'tab'
        || role === 'textbox'
        || role === 'combobox';
}

function isNativeFocusableElement(node: NativeElementNode): boolean {
    if (isNativeDisabled(node)) {
        return false;
    }

    const tabIndex = parseNativeTabIndex(node);
    if (tabIndex !== undefined) {
        return tabIndex >= 0;
    }

    if (toNativeBoolean(node.props.contentEditable) || toNativeBoolean(node.props.contenteditable)) {
        return true;
    }

    if (node.component === 'TextInput' || node.component === 'Button' || node.component === 'Link' || node.component === 'Toggle' || node.component === 'Picker' || node.component === 'Slider') {
        return true;
    }

    return isNativeFocusableRole(node);
}

export function isNativePseudoFocused(node: NativeElementNode): boolean {
    return hasNativeExplicitFocusSignal(node) && isNativeFocusableElement(node);
}

export function shouldNativeAutoFocus(node: NativeElementNode): boolean {
    return node.component === 'TextInput' && hasNativeExplicitFocusSignal(node) && !isNativeDisabled(node);
}