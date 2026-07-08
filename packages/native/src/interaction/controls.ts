import { type NativeStyleResolveOptions } from '../../client/style';
import { prependComposeModifierCall } from '../canvas';
import { parseCssColor, toComposeColorLiteral } from '../color';
import { buildComposeTextStyleLiteralFromStyle } from '../typography';
import type { NativeElementNode, NativePropValue } from '../types';
import { getNativeStyleResolveOptions, parsePlainNumericValue } from '../units';

const NATIVE_PATTERN_MAX_LENGTH = 500;
const REDOS_NESTED_QUANTIFIER = /\([^()]*[+*][^()]*\)[+*]/;

export function resolveNativeInputTypeValue(sourceTag: string, props: Record<string, NativePropValue>): string | undefined {
    if (sourceTag === 'textarea') {
        return 'textarea';
    }

    if (sourceTag !== 'input') {
        return undefined;
    }

    return typeof props.type === 'string' && props.type.trim()
        ? props.type.trim().toLowerCase()
        : 'text';
}

export function isCheckboxInput(sourceTag: string, props: Record<string, NativePropValue>): boolean {
    return resolveNativeInputTypeValue(sourceTag, props) === 'checkbox';
}

export function isRangeInput(sourceTag: string, props: Record<string, NativePropValue>): boolean {
    return resolveNativeInputTypeValue(sourceTag, props) === 'range';
}

export function toNativeBoolean(value: NativePropValue | undefined): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        return normalized === 'true' || normalized === '1' || normalized === 'on' || normalized === 'yes';
    }
    return false;
}

export function isNativeDisabled(node: NativeElementNode): boolean {
    return toNativeBoolean(node.props.disabled) || toNativeBoolean(node.props['aria-disabled']);
}

export function isNativeFormControl(node: NativeElementNode): boolean {
    return node.component === 'TextInput' || node.component === 'Toggle' || node.component === 'Picker' || node.component === 'Slider';
}

export function isNativeEnabled(node: NativeElementNode): boolean {
    return (node.component === 'Button' || isNativeFormControl(node)) && !isNativeDisabled(node);
}

export function isNativeChecked(node: NativeElementNode): boolean {
    return toNativeBoolean(node.props.checked) || toNativeBoolean(node.props['aria-checked']);
}

export function isNativeSelected(node: NativeElementNode): boolean {
    return toNativeBoolean(node.props.selected)
        || toNativeBoolean(node.props['aria-selected'])
        || typeof node.props['aria-current'] === 'string';
}

export function hasNativePressedAccessibilityState(node: NativeElementNode): boolean {
    return node.props['aria-pressed'] !== undefined;
}

export function isNativePressed(node: NativeElementNode): boolean {
    return toNativeBoolean(node.props['aria-pressed'])
        || toNativeBoolean(node.props.pressed)
        || toNativeBoolean(node.props.active);
}

export function isNativeActive(node: NativeElementNode): boolean {
    return !isNativeDisabled(node) && isNativePressed(node);
}

export function isNativeRequired(node: NativeElementNode): boolean {
    return toNativeBoolean(node.props.required) || toNativeBoolean(node.props['aria-required']);
}

export function isNativeMultiple(node: NativeElementNode): boolean {
    return node.component === 'Picker' && toNativeBoolean(node.props.multiple);
}

export function isNativeReadOnly(node: NativeElementNode): boolean {
    return toNativeBoolean(node.props.readOnly) || toNativeBoolean(node.props.readonly);
}

export function buildComposeButtonModifier(
    modifier: string,
    onClickExpression?: string,
    enabled = true,
    interactionSourceName?: string,
): string {
    if (!onClickExpression || !enabled) {
        return modifier;
    }

    return prependComposeModifierCall(
        modifier,
        interactionSourceName
            ? `clickable(interactionSource = ${interactionSourceName}, indication = LocalIndication.current) { ${onClickExpression} }`
            : `clickable { ${onClickExpression} }`,
    );
}

export function buildComposeTextInputArgsFromStyle(
    node: NativeElementNode,
    style: Record<string, NativePropValue> | undefined,
    submitActionExpression?: string,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): string[] {
    const args: string[] = [];
    if (style) {
        const textStyle = buildComposeTextStyleLiteralFromStyle(style, styleResolveOptions);
        if (textStyle) {
            args.push(`textStyle = ${textStyle}`);
        }

        const color = parseCssColor(style.color);
        if (color) {
            args.push(`cursorBrush = SolidColor(${toComposeColorLiteral(color)})`);
        }
    }

    if (isNativeDisabled(node)) {
        args.push('enabled = false');
    }

    if (isNativeReadOnly(node)) {
        args.push('readOnly = true');
    }

    const keyboardType = resolveComposeKeyboardType(node);
    if (keyboardType || submitActionExpression) {
        const keyboardArgs: string[] = [];
        if (keyboardType) {
            keyboardArgs.push(`keyboardType = ${keyboardType}`);
        }
        if (submitActionExpression) {
            keyboardArgs.push('imeAction = androidx.compose.ui.text.input.ImeAction.Done');
        }
        args.push(`keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(${keyboardArgs.join(', ')})`);
    }

    if (submitActionExpression) {
        args.push(`keyboardActions = androidx.compose.foundation.text.KeyboardActions(onDone = { ${submitActionExpression} })`);
    }

    if (resolveNativeTextInputType(node) === 'password') {
        args.push('visualTransformation = androidx.compose.ui.text.input.PasswordVisualTransformation()');
    }

    args.push(`singleLine = ${node.sourceTag === 'textarea' ? 'false' : 'true'}`);
    if (node.sourceTag === 'textarea') {
        args.push('minLines = 4');
    }

    return args;
}

export function buildSwiftUIButtonModifiersFromStyle(
    node: NativeElementNode,
    modifiers: string[],
    style: Record<string, NativePropValue> | undefined,
): string[] {
    const interactiveModifiers = [
        ...(node.sourceTag === 'button' && isNativeDisabled(node) ? ['.disabled(true)'] : []),
        ...modifiers,
    ];
    return style ? ['.buttonStyle(.plain)', ...interactiveModifiers] : interactiveModifiers;
}

export function resolveNativeTextInputValue(node: NativeElementNode): string {
    return typeof node.props.value === 'string' || typeof node.props.value === 'number'
        ? String(node.props.value)
        : '';
}

function parseNativeNonNegativeIntegerConstraint(value: NativePropValue | undefined): number | undefined {
    const parsed = parsePlainNumericValue(value);
    return parsed !== undefined && Number.isInteger(parsed) && parsed >= 0
        ? parsed
        : undefined;
}

export function resolveNativeTextInputMinLength(node: NativeElementNode): number | undefined {
    return parseNativeNonNegativeIntegerConstraint(node.props.minLength ?? node.props.minlength);
}

export function resolveNativeTextInputMaxLength(node: NativeElementNode): number | undefined {
    return parseNativeNonNegativeIntegerConstraint(node.props.maxLength ?? node.props.maxlength);
}

export function resolveNativePatternExpression(node: NativeElementNode): RegExp | undefined {
    if (node.component !== 'TextInput' || typeof node.props.pattern !== 'string' || !node.props.pattern.trim()) {
        return undefined;
    }

    const pattern = node.props.pattern.trim();
    if (pattern.length > NATIVE_PATTERN_MAX_LENGTH || REDOS_NESTED_QUANTIFIER.test(pattern)) {
        return undefined;
    }

    try {
        return new RegExp(`^(?:${pattern})$`);
    } catch {
        return undefined;
    }
}

export function resolveNativeNumericConstraint(value: NativePropValue | undefined): number | undefined {
    return parsePlainNumericValue(value);
}

export function resolveNativeStepConstraint(node: NativeElementNode): number | undefined {
    if (node.props.step === undefined) {
        return undefined;
    }

    if (typeof node.props.step === 'string' && node.props.step.trim().toLowerCase() === 'any') {
        return undefined;
    }

    const parsed = resolveNativeNumericConstraint(node.props.step);
    return parsed !== undefined && parsed > 0 ? parsed : undefined;
}

export function resolveNativeTextInputType(node: NativeElementNode): 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search' | 'textarea' {
    const inputType = resolveNativeInputTypeValue(node.sourceTag, node.props);

    switch (inputType) {
        case 'password':
        case 'email':
        case 'number':
        case 'tel':
        case 'url':
        case 'search':
            return inputType;
        default:
            return 'text';
    }
}

export function resolveNativeRangeMin(node: NativeElementNode): number {
    return resolveNativeNumericConstraint(node.props.min) ?? 0;
}

export function resolveNativeRangeMax(node: NativeElementNode): number {
    const min = resolveNativeRangeMin(node);
    const max = resolveNativeNumericConstraint(node.props.max);
    return max !== undefined && max > min ? max : min + 100;
}

export function resolveNativeRangeInitialValue(node: NativeElementNode): number {
    const min = resolveNativeRangeMin(node);
    const max = resolveNativeRangeMax(node);
    const value = resolveNativeNumericConstraint(node.props.value);
    const candidate = value !== undefined ? value : min;
    return Math.min(max, Math.max(min, candidate));
}

export function resolveComposeSliderSteps(node: NativeElementNode): number | undefined {
    const step = resolveNativeStepConstraint(node);
    if (step === undefined) {
        return undefined;
    }

    const intervals = (resolveNativeRangeMax(node) - resolveNativeRangeMin(node)) / step;
    if (!Number.isFinite(intervals)) {
        return undefined;
    }

    const roundedIntervals = Math.round(intervals);
    if (roundedIntervals < 1 || Math.abs(intervals - roundedIntervals) > 1e-7) {
        return undefined;
    }

    return Math.max(0, roundedIntervals - 1);
}

export function resolveComposeKeyboardType(node: NativeElementNode): string | undefined {
    switch (resolveNativeTextInputType(node)) {
        case 'email':
            return 'androidx.compose.ui.text.input.KeyboardType.Email';
        case 'number':
            return 'androidx.compose.ui.text.input.KeyboardType.Decimal';
        case 'password':
            return 'androidx.compose.ui.text.input.KeyboardType.Password';
        case 'tel':
            return 'androidx.compose.ui.text.input.KeyboardType.Phone';
        case 'url':
            return 'androidx.compose.ui.text.input.KeyboardType.Uri';
        case 'search':
            return 'androidx.compose.ui.text.input.KeyboardType.Text';
        default:
            return undefined;
    }
}

export function resolveSwiftKeyboardTypeModifier(node: NativeElementNode): string | undefined {
    switch (resolveNativeTextInputType(node)) {
        case 'email':
            return '.keyboardType(.emailAddress)';
        case 'number':
            return '.keyboardType(.decimalPad)';
        case 'tel':
            return '.keyboardType(.phonePad)';
        case 'url':
            return '.keyboardType(.URL)';
        case 'search':
            return '.keyboardType(.webSearch)';
        default:
            return undefined;
    }
}

export function shouldDisableNativeTextCapitalization(node: NativeElementNode): boolean {
    const inputType = resolveNativeTextInputType(node);
    return inputType === 'email' || inputType === 'password' || inputType === 'url';
}