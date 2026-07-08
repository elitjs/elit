import { resolveNativeLinkHint } from '../link';
import { flattenTextContent, quoteKotlinString, quoteSwiftString } from '../strings';
import type { NativeElementNode } from '../types';
import {
    hasNativePressedAccessibilityState,
    isNativeChecked,
    isNativeDisabled,
    isNativeMultiple,
    isNativePressed,
    isNativeRequired,
    isNativeSelected,
    toNativeBoolean,
} from './controls';
import { resolveNativeMediaLabel } from './media';
import { hasNativeValidationConstraint, isNativeInvalid, isNativeValid } from './validation';

export function resolveNativeExplicitAccessibilityLabel(node: NativeElementNode): string | undefined {
    const explicitLabel = typeof node.props['aria-label'] === 'string' && node.props['aria-label'].trim()
        ? node.props['aria-label'].trim()
        : typeof node.props.title === 'string' && node.props.title.trim()
            ? node.props.title.trim()
            : undefined;

    if (explicitLabel) {
        return explicitLabel;
    }

    if (typeof node.props.alt === 'string' && node.props.alt.trim()) {
        return node.props.alt.trim();
    }

    return undefined;
}

export function resolveNativeAccessibilityLabel(node: NativeElementNode): string | undefined {
    const explicitLabel = resolveNativeExplicitAccessibilityLabel(node);

    if (explicitLabel) {
        return explicitLabel;
    }

    if (node.component === 'Picker') {
        if (typeof node.props.placeholder === 'string' && node.props.placeholder.trim()) {
            return node.props.placeholder.trim();
        }

        return isNativeMultiple(node) ? 'Selection list' : 'Select';
    }

    const textContent = flattenTextContent(node.children).trim();
    if (textContent) {
        return textContent;
    }

    if (typeof node.props.placeholder === 'string' && node.props.placeholder.trim()) {
        return node.props.placeholder.trim();
    }

    if (node.component === 'Media') {
        return resolveNativeMediaLabel(node);
    }

    if (node.component === 'WebView') {
        return 'Web content';
    }

    return undefined;
}

export function resolveNativeAccessibilityHint(node: NativeElementNode): string | undefined {
    const parts: string[] = [];

    if (typeof node.props['aria-description'] === 'string' && node.props['aria-description'].trim()) {
        parts.push(node.props['aria-description'].trim());
    }

    const linkHint = resolveNativeLinkHint(node);
    if (linkHint) {
        parts.push(linkHint);
    }

    return parts.length > 0 ? parts.join(', ') : undefined;
}

export function resolveNativeAccessibilityRole(node: NativeElementNode): 'button' | 'link' | 'checkbox' | 'switch' | 'tab' | 'image' | 'heading' | undefined {
    const explicitRole = typeof node.props.role === 'string'
        ? node.props.role.trim().toLowerCase()
        : undefined;

    switch (explicitRole) {
        case 'button':
        case 'link':
        case 'checkbox':
        case 'switch':
        case 'tab':
        case 'image':
        case 'heading':
            return explicitRole;
        case 'img':
            return 'image';
        default:
            break;
    }

    return undefined;
}

export function hasExplicitNativeAccessibilitySignal(node: NativeElementNode): boolean {
    return Boolean(
        resolveNativeExplicitAccessibilityLabel(node)
        || resolveNativeAccessibilityHint(node)
        || resolveNativeLinkHint(node)
        || (typeof node.props.role === 'string' && node.props.role.trim())
        || node.props['aria-selected'] !== undefined
        || node.props['aria-checked'] !== undefined
        || node.props['aria-pressed'] !== undefined
        || node.props['aria-disabled'] !== undefined
        || node.props['aria-expanded'] !== undefined
        || node.props['aria-invalid'] !== undefined
        || node.props['aria-current'] !== undefined
        || node.props['aria-valuetext'] !== undefined
        || node.props['aria-required'] !== undefined
        || toNativeBoolean(node.props.required)
        || isNativeMultiple(node)
    );
}

export function shouldEmitNativeAccessibilityLabel(node: NativeElementNode): boolean {
    return hasExplicitNativeAccessibilitySignal(node);
}

export function resolveNativeAccessibilityStateParts(node: NativeElementNode): string[] {
    const parts: string[] = [];
    const role = resolveNativeAccessibilityRole(node);
    const hasSelectedState = node.props['aria-selected'] !== undefined || typeof node.props['aria-current'] === 'string' || role === 'tab';
    const hasCheckedState = node.component === 'Toggle' || node.props['aria-checked'] !== undefined || role === 'checkbox' || role === 'switch';
    const hasPressedState = hasNativePressedAccessibilityState(node);

    if (isNativeRequired(node)) {
        parts.push('Required');
    }

    if (isNativeInvalid(node)) {
        parts.push('Invalid');
    }

    if (!isNativeInvalid(node) && hasNativeValidationConstraint(node) && isNativeValid(node)) {
        parts.push('Valid');
    }

    if (isNativeDisabled(node)) {
        parts.push('Disabled');
    }

    if (hasSelectedState) {
        parts.push(isNativeSelected(node) ? 'Selected' : 'Not selected');
    }

    if (hasCheckedState) {
        parts.push(isNativeChecked(node) ? 'Checked' : 'Unchecked');
    }

    if (hasPressedState) {
        parts.push(isNativePressed(node) ? 'Pressed' : 'Not pressed');
    }

    if (node.props['aria-expanded'] !== undefined) {
        parts.push(toNativeBoolean(node.props['aria-expanded']) ? 'Expanded' : 'Collapsed');
    }

    if (typeof node.props['aria-valuetext'] === 'string' && node.props['aria-valuetext'].trim()) {
        parts.push(node.props['aria-valuetext'].trim());
    }

    return [...new Set(parts)];
}

function resolveComposeAccessibilityRoleExpression(node: NativeElementNode): string | undefined {
    switch (resolveNativeAccessibilityRole(node)) {
        case 'button':
        case 'link':
            return 'Role.Button';
        case 'checkbox':
            return 'Role.Checkbox';
        case 'switch':
            return 'Role.Switch';
        case 'tab':
            return 'Role.Tab';
        case 'image':
            return 'Role.Image';
        default:
            return undefined;
    }
}

export function buildComposeAccessibilityModifier(node: NativeElementNode): string | undefined {
    if (!hasExplicitNativeAccessibilitySignal(node)) {
        return undefined;
    }

    const statements: string[] = [];
    const label = shouldEmitNativeAccessibilityLabel(node) ? resolveNativeAccessibilityLabel(node) : undefined;
    const hint = resolveNativeAccessibilityHint(node);
    const stateParts = resolveNativeAccessibilityStateParts(node);
    const stateDescription = [hint, ...stateParts].filter((value): value is string => Boolean(value)).join(', ');
    const roleExpression = resolveComposeAccessibilityRoleExpression(node);
    const role = resolveNativeAccessibilityRole(node);

    if (label) {
        statements.push(`contentDescription = ${quoteKotlinString(label)}`);
    }

    if (roleExpression) {
        statements.push(`role = ${roleExpression}`);
    }

    if ((node.props['aria-selected'] !== undefined || typeof node.props['aria-current'] === 'string' || role === 'tab') && isNativeSelected(node)) {
        statements.push('selected = true');
    }

    if (stateDescription) {
        statements.push(`stateDescription = ${quoteKotlinString(stateDescription)}`);
    }

    if (role === 'heading') {
        statements.push('heading()');
    }

    if (node.props['aria-disabled'] !== undefined) {
        statements.push('disabled()');
    }

    return statements.length > 0
        ? `semantics(mergeDescendants = true) { ${statements.join('; ')} }`
        : undefined;
}

export function buildSwiftAccessibilityModifiers(node: NativeElementNode): string[] {
    if (!hasExplicitNativeAccessibilitySignal(node)) {
        return [];
    }

    const modifiers: string[] = [];
    const label = shouldEmitNativeAccessibilityLabel(node) ? resolveNativeAccessibilityLabel(node) : undefined;
    const hint = resolveNativeAccessibilityHint(node);
    const value = resolveNativeAccessibilityStateParts(node).join(', ');
    const role = resolveNativeAccessibilityRole(node);

    if (label) {
        modifiers.push(`.accessibilityLabel(${quoteSwiftString(label)})`);
    }

    if (hint) {
        modifiers.push(`.accessibilityHint(${quoteSwiftString(hint)})`);
    }

    if (value) {
        modifiers.push(`.accessibilityValue(${quoteSwiftString(value)})`);
    }

    if (role === 'button') {
        modifiers.push('.accessibilityAddTraits(.isButton)');
    } else if (role === 'link') {
        modifiers.push('.accessibilityAddTraits(.isLink)');
    } else if (role === 'image') {
        modifiers.push('.accessibilityAddTraits(.isImage)');
    } else if (role === 'heading') {
        modifiers.push('.accessibilityAddTraits(.isHeader)');
    }

    if ((node.props['aria-selected'] !== undefined || typeof node.props['aria-current'] === 'string' || role === 'tab') && isNativeSelected(node)) {
        modifiers.push('.accessibilityAddTraits(.isSelected)');
    }

    return modifiers;
}