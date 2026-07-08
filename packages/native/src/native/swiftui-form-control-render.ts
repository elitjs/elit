import type {
    NativeElementNode,
    NativeRenderHints,
    SwiftUIContext,
} from '../types';
import { formatFloat } from '../units';
import {
    toNativeBoolean,
    isNativeDisabled,
    isNativeMultiple,
    isNativeReadOnly,
    shouldNativeAutoFocus,
    resolveNativeTextInputType,
    resolveNativeRangeMin,
    resolveNativeRangeMax,
    resolveNativeRangeInitialValue,
    resolveNativeStepConstraint,
    resolveSwiftKeyboardTypeModifier,
    shouldDisableNativeTextCapitalization,
    buildSwiftControlEventDispatchInvocation,
    buildSwiftControlEventDispatchStatements,
    getNativeBindingReference,
    resolveNativePickerOptionLabel,
    resolveNativePickerOptions,
    resolveNativePickerInitialSelection,
    resolveNativePickerInitialSelections,
    resolveNativeProgressFraction,
} from '../interaction';
import { quoteSwiftString } from '../strings';
import { appendSwiftUIModifiers } from '../render-support';
import {
    ensureSwiftStateVariable,
    toSwiftTextValueExpression,
    buildSwiftStateStringAssignment,
    buildSwiftStringBindingExpression,
    buildSwiftStateStringArrayToggleBinding,
    buildSwiftReadOnlyBindingExpression,
    buildSwiftTextExpression,
    formatNativeNumberLiteral,
} from '../state';
import { resolveTextTransform, applyTextTransform } from '../typography';
import { getStyleObject } from './style-resolve';
import { buildSwiftUIModifiers } from './swiftui-style';

function indent(level: number): string {
    return '    '.repeat(level);
}

export function renderSwiftUIFormControlNode(
    node: NativeElementNode,
    level: number,
    context: SwiftUIContext,
    hints: NativeRenderHints,
    baseLines: string[] = [],
): string[] | undefined {
    if (node.component === 'Toggle') {
        const binding = getNativeBindingReference(node);
        const stateName = binding?.kind === 'checked'
            ? ensureSwiftStateVariable(context, binding.id).variableName
            : `toggleValue${context.toggleIndex++}`;
        const disabled = isNativeDisabled(node);
        const toggleEventStatements = disabled
            ? []
            : buildSwiftControlEventDispatchStatements(node, { checkedExpression: 'nextChecked' });
        const toggleBinding = toggleEventStatements.length > 0
            ? `Binding(get: { ${stateName} }, set: { nextChecked in ${stateName} = nextChecked; ${toggleEventStatements.join('; ')} })`
            : `$${stateName}`;

        if (!binding || binding.kind !== 'checked') {
            context.stateDeclarations.push(`${indent(1)}@State private var ${stateName} = ${toNativeBoolean(node.props.checked) ? 'true' : 'false'}`);
        }

        if (toggleEventStatements.length > 0) {
            context.helperFlags.add('bridge');
        }

        return appendSwiftUIModifiers(
            [
                ...baseLines,
                `${indent(level)}Toggle("", isOn: ${toggleBinding})`,
            ],
            ['.labelsHidden()', ...(disabled ? ['.disabled(true)'] : []), ...buildSwiftUIModifiers(node, context.resolvedStyles, hints, context.styleResolveOptions)],
            level,
        );
    }

    if (node.component === 'TextInput') {
        const binding = getNativeBindingReference(node);
        const textFieldId = context.textFieldIndex++;
        let textFieldBinding = `$textFieldValue${textFieldId}`;
        let textValueExpression = textFieldBinding.slice(1);
        const disabled = isNativeDisabled(node);
        const readOnly = isNativeReadOnly(node);
        const autoFocus = !disabled && shouldNativeAutoFocus(node);
        const focusStateName = `textFieldFocus${textFieldId}`;
        let textFieldSetter = `${textValueExpression} = nextValue`;

        if (binding?.kind === 'value') {
            const { descriptor, variableName } = ensureSwiftStateVariable(context, binding.id);
            textValueExpression = toSwiftTextValueExpression(variableName, descriptor);
            textFieldSetter = buildSwiftStateStringAssignment(variableName, descriptor, 'nextValue');
            textFieldBinding = buildSwiftStringBindingExpression(variableName, descriptor);
        } else {
            const stateName = textFieldBinding.slice(1);
            const initialValue = typeof node.props.value === 'string' || typeof node.props.value === 'number'
                ? String(node.props.value)
                : '';
            context.stateDeclarations.push(`${indent(1)}@State private var ${stateName} = ${quoteSwiftString(initialValue)}`);
            textValueExpression = stateName;
            textFieldSetter = `${stateName} = nextValue`;
        }

        const textInputEventStatements = !disabled && !readOnly
            ? buildSwiftControlEventDispatchStatements(node, { valueExpression: 'nextValue' })
            : [];
        const submitEventStatement = !disabled && !readOnly && node.sourceTag !== 'textarea' && node.events.includes('submit')
            ? buildSwiftControlEventDispatchInvocation(node, 'submit', { valueExpression: textValueExpression })
            : undefined;

        if (textInputEventStatements.length > 0 || submitEventStatement) {
            context.helperFlags.add('bridge');
        }

        if (!readOnly && textInputEventStatements.length > 0) {
            textFieldBinding = `Binding(get: { ${textValueExpression} }, set: { nextValue in ${textFieldSetter}; ${textInputEventStatements.join('; ')} })`;
        }

        if (readOnly) {
            textFieldBinding = buildSwiftReadOnlyBindingExpression(textValueExpression);
        }

        if (autoFocus) {
            context.stateDeclarations.push(`${indent(1)}@FocusState private var ${focusStateName}: Bool`);
        }

        const placeholder = typeof node.props.placeholder === 'string' ? node.props.placeholder : '';
        const isTextarea = node.sourceTag === 'textarea';
        const inputType = resolveNativeTextInputType(node);
        const keyboardTypeModifier = resolveSwiftKeyboardTypeModifier(node);
        const textInputLine = inputType === 'password' && !isTextarea
            ? `${indent(level)}SecureField(${quoteSwiftString(placeholder)}, text: ${textFieldBinding})`
            : isTextarea
                ? `${indent(level)}TextField(${quoteSwiftString(placeholder)}, text: ${textFieldBinding}, axis: .vertical)`
                : `${indent(level)}TextField(${quoteSwiftString(placeholder)}, text: ${textFieldBinding})`;

        return appendSwiftUIModifiers(
            [
                ...baseLines,
                textInputLine,
            ],
            [
                '.textFieldStyle(.plain)',
                ...(isTextarea ? ['.lineLimit(4, reservesSpace: true)'] : []),
                ...(keyboardTypeModifier ? [keyboardTypeModifier] : []),
                ...(submitEventStatement ? ['.submitLabel(.done)', `.onSubmit { ${submitEventStatement} }`] : []),
                ...(shouldDisableNativeTextCapitalization(node) ? ['.textInputAutocapitalization(.never)'] : []),
                ...(autoFocus ? [`.focused($${focusStateName})`, `.onAppear { ${focusStateName} = true }`] : []),
                ...(disabled ? ['.disabled(true)'] : []),
                ...buildSwiftUIModifiers(node, context.resolvedStyles, hints, context.styleResolveOptions),
            ],
            level,
        );
    }

    if (node.component === 'Slider') {
        const binding = getNativeBindingReference(node);
        const sliderId = context.sliderIndex++;
        const min = resolveNativeRangeMin(node);
        const max = resolveNativeRangeMax(node);
        const initialValue = resolveNativeRangeInitialValue(node);
        const step = resolveNativeStepConstraint(node);
        const disabled = isNativeDisabled(node);
        let stateName = `sliderValue${sliderId}`;
        let sliderBinding = `$${stateName}`;

        if (binding?.kind === 'value') {
            const { descriptor, variableName } = ensureSwiftStateVariable(context, binding.id);
            stateName = variableName;
            if (descriptor.type === 'number') {
                sliderBinding = `$${variableName}`;
            } else {
                sliderBinding = `Binding(get: { Double(${variableName}) ?? ${formatNativeNumberLiteral(initialValue)} }, set: { nextValue in ${variableName} = String(nextValue) })`;
            }
        } else {
            context.stateDeclarations.push(`${indent(1)}@State private var ${stateName}: Double = ${formatNativeNumberLiteral(initialValue)}`);
        }

        const sliderEventStatements = disabled
            ? []
            : buildSwiftControlEventDispatchStatements(node, { valueExpression: 'String(nextValue)' });
        if (sliderEventStatements.length > 0) {
            context.helperFlags.add('bridge');
            if (binding?.kind === 'value') {
                const { descriptor, variableName } = ensureSwiftStateVariable(context, binding.id);
                if (descriptor.type === 'number') {
                    sliderBinding = `Binding(get: { ${variableName} }, set: { nextValue in ${variableName} = nextValue; ${sliderEventStatements.join('; ')} })`;
                } else {
                    sliderBinding = `Binding(get: { Double(${variableName}) ?? ${formatNativeNumberLiteral(initialValue)} }, set: { nextValue in ${variableName} = String(nextValue); ${sliderEventStatements.join('; ')} })`;
                }
            } else {
                sliderBinding = `Binding(get: { ${stateName} }, set: { nextValue in ${stateName} = nextValue; ${sliderEventStatements.join('; ')} })`;
            }
        }

        return appendSwiftUIModifiers(
            [
                ...baseLines,
                `${indent(level)}Slider(value: ${sliderBinding}, in: ${formatFloat(min)}...${formatFloat(max)}${step !== undefined ? `, step: ${formatFloat(step)}` : ''})`,
            ],
            [...(disabled ? ['.disabled(true)'] : []), ...buildSwiftUIModifiers(node, context.resolvedStyles, hints, context.styleResolveOptions)],
            level,
        );
    }

    if (node.component === 'Picker') {
        const binding = getNativeBindingReference(node);
        const pickerId = context.pickerIndex++;
        const pickerOptions = resolveNativePickerOptions(node);
        const initialSelection = resolveNativePickerInitialSelection(node, pickerOptions);
        const initialSelections = resolveNativePickerInitialSelections(node, pickerOptions);
        const disabled = isNativeDisabled(node);
        const isMultiple = isNativeMultiple(node);

        if (isMultiple) {
            const optionValues = pickerOptions.map((option) => option.value);
            let selectionName = `pickerValues${pickerId}`;
            let usesBoundArrayState = false;

            if (binding?.kind === 'value') {
                const { descriptor, variableName } = ensureSwiftStateVariable(context, binding.id);
                if (descriptor.type === 'string-array') {
                    selectionName = variableName;
                    usesBoundArrayState = true;
                }
            }

            if (!usesBoundArrayState) {
                context.stateDeclarations.push(`${indent(1)}@State private var ${selectionName}: Set<String> = [${initialSelections.map((value) => quoteSwiftString(value)).join(', ')}]`);
            }

            const lines = [
                ...baseLines,
                `${indent(level)}VStack(alignment: .leading, spacing: 8) {`,
                ...pickerOptions.flatMap((option) => {
                    const optionDisabled = disabled || option.disabled;
                    const pickerEventStatements = optionDisabled
                        ? []
                        : buildSwiftControlEventDispatchStatements(node, { valuesExpression: usesBoundArrayState ? selectionName : `Array(${selectionName}).sorted()` });
                    const toggleBinding = usesBoundArrayState
                        ? buildSwiftStateStringArrayToggleBinding(selectionName, option.value, optionValues, pickerEventStatements)
                        : `Binding(get: { ${selectionName}.contains(${quoteSwiftString(option.value)}) }, set: { isOn in if isOn { ${selectionName}.insert(${quoteSwiftString(option.value)}) } else { ${selectionName}.remove(${quoteSwiftString(option.value)}) }${pickerEventStatements.length > 0 ? `; ${pickerEventStatements.join('; ')}` : ''} })`;
                    if (pickerEventStatements.length > 0) {
                        context.helperFlags.add('bridge');
                    }
                    return [
                        `${indent(level + 1)}Toggle(isOn: ${toggleBinding}) {`,
                        `${indent(level + 2)}Text(${quoteSwiftString(option.label)})`,
                        `${indent(level + 1)}}`,
                        ...(optionDisabled ? [`${indent(level + 1)}.disabled(true)`] : []),
                    ];
                }),
                `${indent(level)}}`,
            ];

            return appendSwiftUIModifiers(lines, buildSwiftUIModifiers(node, context.resolvedStyles, hints, context.styleResolveOptions), level);
        }

        let selectionBinding = `$pickerValue${pickerId}`;
        let selectionValueExpression = `pickerValue${pickerId}`;

        if (binding?.kind === 'value') {
            const { descriptor, variableName } = ensureSwiftStateVariable(context, binding.id);
            selectionValueExpression = toSwiftTextValueExpression(variableName, descriptor);
            selectionBinding = buildSwiftStringBindingExpression(variableName, descriptor);
        } else {
            context.stateDeclarations.push(`${indent(1)}@State private var pickerValue${pickerId} = ${quoteSwiftString(initialSelection)}`);
        }

        const pickerEventStatements = disabled
            ? []
            : buildSwiftControlEventDispatchStatements(node, { valueExpression: 'nextValue' });
        if (pickerEventStatements.length > 0) {
            context.helperFlags.add('bridge');
            if (binding?.kind === 'value') {
                const { descriptor, variableName } = ensureSwiftStateVariable(context, binding.id);
                selectionBinding = buildSwiftStringBindingExpression(variableName, descriptor, pickerEventStatements);
            } else {
                selectionBinding = `Binding(get: { ${selectionValueExpression} }, set: { nextValue in ${selectionValueExpression} = nextValue; ${pickerEventStatements.join('; ')} })`;
            }
        }

        const lines = [
            ...baseLines,
            `${indent(level)}Picker("", selection: ${selectionBinding}) {`,
            ...(initialSelection === '' ? [`${indent(level + 1)}Text("Select").tag("")`] : []),
            ...pickerOptions.map((option) => `${indent(level + 1)}Text(${quoteSwiftString(option.label)}).tag(${quoteSwiftString(option.value)})`),
            `${indent(level)}}`,
        ];

        return appendSwiftUIModifiers(lines, ['.labelsHidden()', ...(disabled ? ['.disabled(true)'] : []), ...buildSwiftUIModifiers(node, context.resolvedStyles, hints, context.styleResolveOptions)], level);
    }

    if (node.component === 'Option') {
        const style = getStyleObject(node, context.resolvedStyles, context.styleResolveOptions);
        const dynamicText = buildSwiftTextExpression(node.children, context, resolveTextTransform(style?.textTransform));
        const staticText = applyTextTransform(resolveNativePickerOptionLabel(node), resolveTextTransform(style?.textTransform));
        return appendSwiftUIModifiers(
            [...baseLines, `${indent(level)}Text(${dynamicText ?? quoteSwiftString(staticText)})`],
            buildSwiftUIModifiers(node, context.resolvedStyles, hints, context.styleResolveOptions),
            level,
        );
    }

    if (node.component === 'Divider') {
        return appendSwiftUIModifiers(
            [...baseLines, `${indent(level)}Divider()`],
            buildSwiftUIModifiers(node, context.resolvedStyles, hints, context.styleResolveOptions),
            level,
        );
    }

    if (node.component === 'Progress') {
        const progress = resolveNativeProgressFraction(node.props);
        return appendSwiftUIModifiers(
            [...baseLines, `${indent(level)}${progress !== undefined ? `ProgressView(value: ${formatFloat(progress)})` : 'ProgressView()'}`],
            buildSwiftUIModifiers(node, context.resolvedStyles, hints, context.styleResolveOptions),
            level,
        );
    }

    return undefined;
}