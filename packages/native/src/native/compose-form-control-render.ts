import type {
    AndroidComposeContext,
    NativeElementNode,
    NativeRenderHints,
} from '../types';
import { formatFloat } from '../units';
import {
    toNativeBoolean,
    buildComposeButtonModifier,
    buildComposeTextInputArgsFromStyle,
    isNativeDisabled,
    isNativeMultiple,
    isNativeReadOnly,
    shouldNativeAutoFocus,
    resolveNativeRangeMin,
    resolveNativeRangeMax,
    resolveNativeRangeInitialValue,
    resolveComposeSliderSteps,
    buildComposeControlEventDispatchInvocation,
    buildComposeControlEventDispatchStatements,
    getNativeBindingReference,
    resolveNativePickerOptionLabel,
    resolveNativePickerOptions,
    resolveNativePickerInitialSelection,
    resolveNativePickerInitialSelections,
    resolveNativePickerDisplayLabel,
    buildComposePickerLabelExpression,
    resolveNativeProgressFraction,
} from '../interaction';
import { quoteKotlinString } from '../strings';
import { prependComposeModifierCall } from '../canvas';
import {
    ensureComposeStateVariable,
    toComposeTextValueExpression,
    buildComposeStateStringAssignment,
    buildComposeStateStringArrayToggleAssignment,
    buildComposeTextExpression,
} from '../state';
import { buildComposeTextStyleArgsFromStyle } from '../typography';
import { getStyleObject } from './style-resolve';
import { buildComposeLabelText } from './compose-style';

function indent(level: number): string {
    return '    '.repeat(level);
}

export function renderComposeFormControlNode(
    node: NativeElementNode,
    level: number,
    context: AndroidComposeContext,
    _hints: NativeRenderHints,
    modifier: string,
    baseLines: string[] = [],
): string[] | undefined {
    const lines = [...baseLines];

    if (node.component === 'Toggle') {
        const binding = getNativeBindingReference(node);
        const stateName = binding?.kind === 'checked'
            ? ensureComposeStateVariable(context, binding.id).variableName
            : `toggleValue${context.toggleIndex++}`;
        const disabled = isNativeDisabled(node);
        const toggleEventStatements = disabled
            ? []
            : buildComposeControlEventDispatchStatements(node, { checkedExpression: 'checked' });

        if (!binding || binding.kind !== 'checked') {
            context.stateDeclarations.push(`${indent(1)}var ${stateName} by remember { mutableStateOf(${toNativeBoolean(node.props.checked) ? 'true' : 'false'}) }`);
        }

        if (toggleEventStatements.length > 0) {
            context.helperFlags.add('bridge');
        }

        lines.push(`${indent(level)}Checkbox(`);
        lines.push(`${indent(level + 1)}checked = ${stateName},`);
        lines.push(`${indent(level + 1)}onCheckedChange = { checked -> ${stateName} = checked${toggleEventStatements.length > 0 ? `; ${toggleEventStatements.join('; ')}` : ''} },`);
        if (disabled) {
            lines.push(`${indent(level + 1)}enabled = false,`);
        }
        lines.push(`${indent(level + 1)}modifier = ${modifier}`);
        lines.push(`${indent(level)})`);
        return lines;
    }

    if (node.component === 'TextInput') {
        const binding = getNativeBindingReference(node);
        const textFieldId = context.textFieldIndex++;
        let stateName = `textFieldValue${textFieldId}`;
        let valueExpression = stateName;
        let onValueChange = `${stateName} = nextValue`;
        const disabled = isNativeDisabled(node);
        const readOnly = isNativeReadOnly(node);
        const autoFocus = !disabled && shouldNativeAutoFocus(node);
        const focusRequesterName = `textFieldFocusRequester${textFieldId}`;
        const textInputStyle = getStyleObject(node, context.resolvedStyles, context.styleResolveOptions);

        if (binding?.kind === 'value') {
            const { descriptor, variableName } = ensureComposeStateVariable(context, binding.id);
            stateName = variableName;
            valueExpression = toComposeTextValueExpression(variableName, descriptor);
            if (descriptor.type === 'string') {
                onValueChange = `${variableName} = nextValue`;
            } else if (descriptor.type === 'number') {
                onValueChange = `${variableName} = nextValue.toDoubleOrNull() ?: ${variableName}`;
            } else {
                onValueChange = `${variableName} = nextValue.equals("true", ignoreCase = true)`;
            }
        } else {
            const initialValue = typeof node.props.value === 'string' || typeof node.props.value === 'number'
                ? String(node.props.value)
                : '';
            context.stateDeclarations.push(`${indent(1)}var ${stateName} by remember { mutableStateOf(${quoteKotlinString(initialValue)}) }`);
        }

        const textInputEventStatements = !disabled && !readOnly
            ? buildComposeControlEventDispatchStatements(node, { valueExpression: 'nextValue' })
            : [];
        const submitEventStatement = !disabled && !readOnly && node.sourceTag !== 'textarea' && node.events.includes('submit')
            ? buildComposeControlEventDispatchInvocation(node, 'submit', { valueExpression: valueExpression })
            : undefined;

        if (textInputEventStatements.length > 0 || submitEventStatement) {
            context.helperFlags.add('bridge');
        }

        if (autoFocus) {
            context.stateDeclarations.push(`${indent(1)}val ${focusRequesterName} = remember { androidx.compose.ui.focus.FocusRequester() }`);
            lines.push(`${indent(level)}LaunchedEffect(Unit) {`);
            lines.push(`${indent(level + 1)}${focusRequesterName}.requestFocus()`);
            lines.push(`${indent(level)}}`);
        }

        lines.push(`${indent(level)}BasicTextField(`);
        lines.push(`${indent(level + 1)}value = ${valueExpression},`);
        lines.push(`${indent(level + 1)}onValueChange = { nextValue -> ${onValueChange}${textInputEventStatements.length > 0 ? `; ${textInputEventStatements.join('; ')}` : ''} },`);
        lines.push(`${indent(level + 1)}modifier = ${autoFocus ? prependComposeModifierCall(modifier, `focusRequester(${focusRequesterName})`) : modifier},`);

        const textInputArgs = buildComposeTextInputArgsFromStyle(
            node,
            textInputStyle,
            submitEventStatement,
            context.styleResolveOptions,
        );
        textInputArgs.forEach((arg) => {
            lines.push(`${indent(level + 1)}${arg},`);
        });

        if (typeof node.props.placeholder === 'string') {
            const placeholderArgs = buildComposeTextStyleArgsFromStyle(textInputStyle, context.styleResolveOptions)
                .filter((arg) => !arg.startsWith('textDecoration = '));
            const placeholder = placeholderArgs.length > 0
                ? `Text(text = ${quoteKotlinString(node.props.placeholder)}, ${placeholderArgs.join(', ')})`
                : `Text(text = ${quoteKotlinString(node.props.placeholder)})`;
            const contentAlignment = node.sourceTag === 'textarea' ? 'Alignment.TopStart' : 'Alignment.CenterStart';

            lines.push(`${indent(level + 1)}decorationBox = { innerTextField ->`);
            lines.push(`${indent(level + 2)}Box(modifier = Modifier.fillMaxWidth(), contentAlignment = ${contentAlignment}) {`);
            lines.push(`${indent(level + 3)}if (${valueExpression}.isEmpty()) {`);
            lines.push(`${indent(level + 4)}${placeholder}`);
            lines.push(`${indent(level + 3)}}`);
            lines.push(`${indent(level + 3)}innerTextField()`);
            lines.push(`${indent(level + 2)}}`);
            lines.push(`${indent(level + 1)}},`);
        }

        lines.push(`${indent(level)})`);
        return lines;
    }

    if (node.component === 'Slider') {
        const binding = getNativeBindingReference(node);
        const sliderId = context.sliderIndex++;
        const disabled = isNativeDisabled(node);
        const min = resolveNativeRangeMin(node);
        const max = resolveNativeRangeMax(node);
        const initialValue = resolveNativeRangeInitialValue(node);
        const steps = resolveComposeSliderSteps(node);
        let stateName = `sliderValue${sliderId}`;
        let valueExpression = stateName;
        let onValueChange = `${stateName} = nextValue`;

        if (binding?.kind === 'value') {
            const { descriptor, variableName } = ensureComposeStateVariable(context, binding.id);
            stateName = variableName;
            if (descriptor.type === 'number') {
                valueExpression = `${variableName}.toFloat()`;
                onValueChange = `${variableName} = nextValue.toDouble()`;
            } else {
                valueExpression = `${variableName}.toFloatOrNull() ?: ${formatFloat(initialValue)}f`;
                onValueChange = `${variableName} = nextValue.toString()`;
            }
        } else {
            context.stateDeclarations.push(`${indent(1)}var ${stateName} by remember { mutableStateOf(${formatFloat(initialValue)}f) }`);
        }

        const sliderEventStatements = disabled
            ? []
            : buildComposeControlEventDispatchStatements(node, { valueExpression: 'nextValue.toString()' });
        if (sliderEventStatements.length > 0) {
            context.helperFlags.add('bridge');
        }

        lines.push(`${indent(level)}Slider(`);
        lines.push(`${indent(level + 1)}value = ${valueExpression},`);
        lines.push(`${indent(level + 1)}onValueChange = { nextValue -> ${onValueChange}${sliderEventStatements.length > 0 ? `; ${sliderEventStatements.join('; ')}` : ''} },`);
        lines.push(`${indent(level + 1)}valueRange = ${formatFloat(min)}f..${formatFloat(max)}f,`);
        if (steps !== undefined) {
            lines.push(`${indent(level + 1)}steps = ${steps},`);
        }
        if (disabled) {
            lines.push(`${indent(level + 1)}enabled = false,`);
        }
        lines.push(`${indent(level + 1)}modifier = ${modifier}`);
        lines.push(`${indent(level)})`);
        return lines;
    }

    if (node.component === 'Picker') {
        const binding = getNativeBindingReference(node);
        const pickerId = context.pickerIndex++;
        const pickerOptions = resolveNativePickerOptions(node);
        const initialSelection = resolveNativePickerInitialSelection(node, pickerOptions);
        const initialSelections = resolveNativePickerInitialSelections(node, pickerOptions);
        const expandedName = `pickerExpanded${pickerId}`;
        const disabled = isNativeDisabled(node);
        const isMultiple = isNativeMultiple(node);

        if (isMultiple) {
            const optionValues = pickerOptions.map((option) => option.value);
            let selectionName = `pickerValues${pickerId}`;
            let usesBoundArrayState = false;

            if (binding?.kind === 'value') {
                const { descriptor, variableName } = ensureComposeStateVariable(context, binding.id);
                if (descriptor.type === 'string-array') {
                    selectionName = variableName;
                    usesBoundArrayState = true;
                }
            }

            if (!usesBoundArrayState) {
                const initialSet = initialSelections.length > 0
                    ? `setOf(${initialSelections.map((value) => quoteKotlinString(value)).join(', ')})`
                    : 'emptySet<String>()';

                context.stateDeclarations.push(`${indent(1)}var ${selectionName} by remember { mutableStateOf(${initialSet}) }`);
            }

            lines.push(`${indent(level)}Column(modifier = ${modifier}) {`);
            pickerOptions.forEach((option) => {
                const optionDisabled = disabled || option.disabled;
                const selectionUpdate = optionDisabled
                    ? undefined
                    : usesBoundArrayState
                        ? buildComposeStateStringArrayToggleAssignment(selectionName, option.value, optionValues)
                        : `${selectionName} = if (checked) ${selectionName} + ${quoteKotlinString(option.value)} else ${selectionName} - ${quoteKotlinString(option.value)}`;
                const pickerValuesExpression = usesBoundArrayState ? selectionName : `${selectionName}.toList().sorted()`;
                const pickerEventStatements = optionDisabled
                    ? []
                    : buildComposeControlEventDispatchStatements(node, { valuesExpression: pickerValuesExpression });

                if (pickerEventStatements.length > 0) {
                    context.helperFlags.add('bridge');
                }

                lines.push(`${indent(level + 1)}Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {`);
                lines.push(`${indent(level + 2)}Checkbox(`);
                lines.push(`${indent(level + 3)}checked = ${selectionName}.contains(${quoteKotlinString(option.value)}),`);
                lines.push(`${indent(level + 3)}onCheckedChange = ${selectionUpdate ? `{ checked -> ${selectionUpdate}${pickerEventStatements.length > 0 ? `; ${pickerEventStatements.join('; ')}` : ''} }` : 'null'},`);
                if (optionDisabled) {
                    lines.push(`${indent(level + 3)}enabled = false,`);
                }
                lines.push(`${indent(level + 2)})`);
                lines.push(`${indent(level + 2)}Text(text = ${quoteKotlinString(option.label)})`);
                lines.push(`${indent(level + 1)}}`);
            });
            lines.push(`${indent(level)}}`);
            return lines;
        }

        let selectionExpression = `pickerValue${pickerId}`;
        let optionAssignments = pickerOptions.map((option) => `${selectionExpression} = ${quoteKotlinString(option.value)}`);
        let labelExpression = quoteKotlinString(resolveNativePickerDisplayLabel(initialSelection || 'Select', pickerOptions));

        if (binding?.kind === 'value') {
            const { descriptor, variableName } = ensureComposeStateVariable(context, binding.id);
            selectionExpression = toComposeTextValueExpression(variableName, descriptor);
            optionAssignments = pickerOptions.map((option) => buildComposeStateStringAssignment(variableName, descriptor, option.value));
            labelExpression = buildComposePickerLabelExpression(selectionExpression, pickerOptions, initialSelection === '' ? 'Select' : undefined);
        } else {
            context.stateDeclarations.push(`${indent(1)}var ${selectionExpression} by remember { mutableStateOf(${quoteKotlinString(initialSelection)}) }`);
        }

        context.stateDeclarations.push(`${indent(1)}var ${expandedName} by remember { mutableStateOf(false) }`);
        const pickerEventStatements = disabled
            ? []
            : buildComposeControlEventDispatchStatements(node, { valueExpression: selectionExpression });
        if (pickerEventStatements.length > 0) {
            context.helperFlags.add('bridge');
        }

        lines.push(`${indent(level)}Box(modifier = ${buildComposeButtonModifier(modifier, `${expandedName} = true`, !disabled)}) {`);
        lines.push(`${indent(level + 1)}${buildComposeLabelText(node, resolveNativePickerDisplayLabel(initialSelection || 'Select', pickerOptions), context.resolvedStyles, labelExpression, context.styleResolveOptions)}`);
        lines.push(`${indent(level + 1)}DropdownMenu(expanded = ${expandedName}, onDismissRequest = { ${expandedName} = false }) {`);

        pickerOptions.forEach((option, index) => {
            lines.push(`${indent(level + 2)}DropdownMenuItem(text = { Text(text = ${quoteKotlinString(option.label)}) }, onClick = { ${optionAssignments[index]}${pickerEventStatements.length > 0 ? `; ${pickerEventStatements.join('; ')}` : ''}; ${expandedName} = false })`);
        });

        lines.push(`${indent(level + 1)}}`);
        lines.push(`${indent(level)}}`);
        return lines;
    }

    if (node.component === 'Option') {
        const label = resolveNativePickerOptionLabel(node);
        return [...lines, `${indent(level)}${buildComposeLabelText(node, label, context.resolvedStyles, buildComposeTextExpression(node.children, context), context.styleResolveOptions)}`];
    }

    if (node.component === 'Divider') {
        return [...lines, `${indent(level)}HorizontalDivider(modifier = ${modifier})`];
    }

    if (node.component === 'Progress') {
        const progress = resolveNativeProgressFraction(node.props);
        return [...lines, progress !== undefined
            ? `${indent(level)}LinearProgressIndicator(progress = ${formatFloat(progress)}f, modifier = ${modifier})`
            : `${indent(level)}LinearProgressIndicator(modifier = ${modifier})`];
    }

    return undefined;
}