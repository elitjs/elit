import type { Props } from './types';

export type UniversalPayload =
    | string
    | number
    | boolean
    | null
    | UniversalPayload[]
    | { [key: string]: UniversalPayload };

export interface UniversalBridgeOptions {
    action?: string;
    route?: string;
    payload?: UniversalPayload;
    desktopMessage?: string;
}

function serializePayload(payload: UniversalPayload | undefined): string | undefined {
    if (payload === undefined) return undefined;
    return JSON.stringify(payload);
}

export function isExternalUniversalDestination(destination: string): boolean {
    return /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(destination);
}

export function createUniversalBridgeProps(options: UniversalBridgeOptions): Props {
    const props: Props = {};
    const payloadJson = serializePayload(options.payload);
    const desktopMessage = options.desktopMessage ?? options.action ?? options.route;

    if (options.action) {
        props.nativeAction = options.action;
        props['data-elit-action'] = options.action;
    }

    if (options.route) {
        props.nativeRoute = options.route;
        props['data-elit-route'] = options.route;
    }

    if (payloadJson) {
        props.nativePayload = payloadJson;
        props['data-elit-payload'] = payloadJson;
    }

    if (desktopMessage) {
        props['data-desktop-message'] = desktopMessage;
    }

    return props;
}

export function createUniversalLinkProps(destination: string, options: UniversalBridgeOptions = {}): Props {
    const external = isExternalUniversalDestination(destination);
    const route = options.route ?? (external ? undefined : destination);
    const props = createUniversalBridgeProps({
        ...options,
        route,
    });

    props.href = destination;

    if (external) {
        props.target = '_blank';
        props.rel = 'noreferrer';
    }

    return props;
}

export function mergeUniversalProps(...sources: Array<Props | undefined | null>): Props {
    const merged: Props = {};

    for (const source of sources) {
        if (!source) continue;
        Object.assign(merged, source);
    }

    return merged;
}
