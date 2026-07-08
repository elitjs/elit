import { isExternalDestination } from '../link';
import { quoteKotlinString, quoteSwiftString } from '../strings';
import type {
    NativeBindingReference,
    NativeControlEventExpressionOptions,
    NativeElementNode,
    NativePropValue,
} from '../types';
import { isNativeMultiple, resolveNativeInputTypeValue } from './controls';

export function serializeNativePayload(value: NativePropValue | undefined): string | undefined {
    if (value === undefined) return undefined;
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
}

export function resolveNativeAction(node: NativeElementNode): string | undefined {
    return typeof node.props.nativeAction === 'string' && node.props.nativeAction.trim()
        ? node.props.nativeAction
        : undefined;
}

export function resolveNativeRoute(node: NativeElementNode): string | undefined {
    if (typeof node.props.nativeRoute === 'string' && node.props.nativeRoute.trim()) {
        return node.props.nativeRoute;
    }

    const destination = typeof node.props.destination === 'string' ? node.props.destination : undefined;
    if (destination && !isExternalDestination(destination)) {
        return destination;
    }

    return undefined;
}

export function buildComposeBridgeInvocation(action?: string, route?: string, payloadJson?: string): string | undefined {
    const args: string[] = [];

    if (action) args.push(`action = ${quoteKotlinString(action)}`);
    if (route) args.push(`route = ${quoteKotlinString(route)}`);
    if (payloadJson) args.push(`payloadJson = ${quoteKotlinString(payloadJson)}`);

    return args.length > 0 ? `ElitNativeBridge.dispatch(${args.join(', ')})` : undefined;
}

export function buildSwiftBridgeInvocation(action?: string, route?: string, payloadJson?: string): string | undefined {
    const args: string[] = [];

    if (action) args.push(`action: ${quoteSwiftString(action)}`);
    if (route) args.push(`route: ${quoteSwiftString(route)}`);
    if (payloadJson) args.push(`payloadJson: ${quoteSwiftString(payloadJson)}`);

    return args.length > 0 ? `ElitNativeBridge.dispatch(${args.join(', ')})` : undefined;
}

function resolveNativeControlEventInputType(node: NativeElementNode): string | undefined {
    if (node.component === 'Picker') {
        return isNativeMultiple(node) ? 'select-multiple' : 'select-one';
    }

    if (node.component === 'Toggle') {
        return typeof node.props.type === 'string' && node.props.type.trim()
            ? node.props.type.trim().toLowerCase()
            : 'checkbox';
    }

    if (node.component === 'Slider') {
        return 'range';
    }

    return resolveNativeInputTypeValue(node.sourceTag, node.props);
}

function shouldDispatchNativeControlEvent(node: NativeElementNode, eventName: 'input' | 'change' | 'submit'): boolean {
    if (!node.events.includes(eventName)) {
        return false;
    }

    return !(eventName === 'input' && getNativeBindingReference(node) && node.events.every((candidate) => candidate === 'input'));
}

function resolveNativeControlEventAction(node: NativeElementNode, eventName: 'input' | 'change' | 'submit'): string {
    return resolveNativeAction(node) ?? `elit.event.${eventName}`;
}

function buildComposeControlEventPayloadInvocation(
    node: NativeElementNode,
    eventName: 'input' | 'change' | 'submit',
    options: NativeControlEventExpressionOptions = {},
): string {
    const args = [
        `event = ${quoteKotlinString(eventName)}`,
        `sourceTag = ${quoteKotlinString(node.sourceTag)}`,
    ];
    const inputType = resolveNativeControlEventInputType(node);
    const detailJson = serializeNativePayload(node.props.nativePayload);

    if (inputType) {
        args.push(`inputType = ${quoteKotlinString(inputType)}`);
    }
    if (options.valueExpression) {
        args.push(`value = ${options.valueExpression}`);
    }
    if (options.valuesExpression) {
        args.push(`values = ${options.valuesExpression}`);
    }
    if (options.checkedExpression) {
        args.push(`checked = ${options.checkedExpression}`);
    }
    if (detailJson) {
        args.push(`detailJson = ${quoteKotlinString(detailJson)}`);
    }

    return `ElitNativeBridge.controlEventPayload(${args.join(', ')})`;
}

export function buildComposeControlEventDispatchInvocation(
    node: NativeElementNode,
    eventName: 'input' | 'change' | 'submit',
    options: NativeControlEventExpressionOptions = {},
): string {
    return `ElitNativeBridge.dispatch(action = ${quoteKotlinString(resolveNativeControlEventAction(node, eventName))}, payloadJson = ${buildComposeControlEventPayloadInvocation(node, eventName, options)})`;
}

export function buildComposeControlEventDispatchStatements(
    node: NativeElementNode,
    options: NativeControlEventExpressionOptions = {},
): string[] {
    const statements: string[] = [];
    if (shouldDispatchNativeControlEvent(node, 'input')) {
        statements.push(buildComposeControlEventDispatchInvocation(node, 'input', options));
    }
    if (shouldDispatchNativeControlEvent(node, 'change')) {
        statements.push(buildComposeControlEventDispatchInvocation(node, 'change', options));
    }
    return statements;
}

function buildSwiftControlEventPayloadInvocation(
    node: NativeElementNode,
    eventName: 'input' | 'change' | 'submit',
    options: NativeControlEventExpressionOptions = {},
): string {
    const args = [
        `event: ${quoteSwiftString(eventName)}`,
        `sourceTag: ${quoteSwiftString(node.sourceTag)}`,
    ];
    const inputType = resolveNativeControlEventInputType(node);
    const detailJson = serializeNativePayload(node.props.nativePayload);

    if (inputType) {
        args.push(`inputType: ${quoteSwiftString(inputType)}`);
    }
    if (options.valueExpression) {
        args.push(`value: ${options.valueExpression}`);
    }
    if (options.valuesExpression) {
        args.push(`values: ${options.valuesExpression}`);
    }
    if (options.checkedExpression) {
        args.push(`checked: ${options.checkedExpression}`);
    }
    if (detailJson) {
        args.push(`detailJson: ${quoteSwiftString(detailJson)}`);
    }

    return `ElitNativeBridge.controlEventPayload(${args.join(', ')})`;
}

export function buildSwiftControlEventDispatchInvocation(
    node: NativeElementNode,
    eventName: 'input' | 'change' | 'submit',
    options: NativeControlEventExpressionOptions = {},
): string {
    return `ElitNativeBridge.dispatch(action: ${quoteSwiftString(resolveNativeControlEventAction(node, eventName))}, payloadJson: ${buildSwiftControlEventPayloadInvocation(node, eventName, options)})`;
}

export function buildSwiftControlEventDispatchStatements(
    node: NativeElementNode,
    options: NativeControlEventExpressionOptions = {},
): string[] {
    const statements: string[] = [];
    if (shouldDispatchNativeControlEvent(node, 'input')) {
        statements.push(buildSwiftControlEventDispatchInvocation(node, 'input', options));
    }
    if (shouldDispatchNativeControlEvent(node, 'change')) {
        statements.push(buildSwiftControlEventDispatchInvocation(node, 'change', options));
    }
    return statements;
}

export function getNativeBindingReference(node: NativeElementNode): NativeBindingReference | undefined {
    const binding = node.props.nativeBinding;
    if (!binding || typeof binding !== 'object' || Array.isArray(binding)) {
        return undefined;
    }

    const id = typeof binding.id === 'string' ? binding.id : undefined;
    const kind = binding.kind === 'value' || binding.kind === 'checked' ? binding.kind : undefined;
    const valueType = binding.valueType === 'boolean' || binding.valueType === 'number' || binding.valueType === 'string' || binding.valueType === 'string-array'
        ? binding.valueType
        : undefined;

    if (!id || !kind || !valueType) {
        return undefined;
    }

    return { id, kind, valueType };
}