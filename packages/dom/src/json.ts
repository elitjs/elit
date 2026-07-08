import type { Child, Children, JsonNode, Props, State, VNode, VNodeJson } from '../../core/types';
import { isPrimitiveJson, isState } from './helpers';
import type { ReactiveNodes } from './reactive';
import { createReactiveChild } from './reactive';
import { render } from './dom-render';
import { renderToString } from './string-render';

export function jsonToVNode(
    json: JsonNode | string | number | boolean | null | undefined | State<any>,
    reactiveNodes: ReactiveNodes,
): Child {
    if (isState(json)) {
        return createReactiveChild(json, reactiveNodes, (value: any) => value);
    }

    if (isPrimitiveJson(json)) {
        return json as Child;
    }

    const { tag, attributes = {}, children } = json;
    const props: Props = {};

    for (const key in attributes) {
        const value = attributes[key];
        if (key === 'class') {
            props.className = isState(value) ? value.value : value;
        } else {
            props[key] = isState(value) ? value.value : value;
        }
    }

    const childrenArray: Children = [];
    if (children != null) {
        if (Array.isArray(children)) {
            for (const child of children) {
                if (isState(child)) {
                    childrenArray.push(createReactiveChild(child, reactiveNodes, (value: any) => value));
                } else {
                    const converted = jsonToVNode(child, reactiveNodes);
                    if (converted != null && converted !== false) {
                        childrenArray.push(converted);
                    }
                }
            }
        } else if (isState(children)) {
            childrenArray.push(createReactiveChild(children, reactiveNodes, (value: any) => value));
        } else if (typeof children === 'object' && children !== null && 'tag' in children) {
            const converted = jsonToVNode(children, reactiveNodes);
            if (converted != null && converted !== false) {
                childrenArray.push(converted);
            }
        } else {
            childrenArray.push(children as Child);
        }
    }

    return { tagName: tag, props, children: childrenArray };
}

export function vNodeJsonToVNode(json: VNodeJson | State<any>, reactiveNodes: ReactiveNodes): Child {
    if (isState(json)) {
        return createReactiveChild(json, reactiveNodes, (value: any) => value);
    }

    if (isPrimitiveJson(json)) {
        return json as Child;
    }

    const { tagName, props = {}, children = [] } = json;
    const resolvedProps: Props = {};

    for (const key in props) {
        const value = props[key];
        resolvedProps[key] = isState(value) ? value.value : value;
    }

    const childrenArray: Children = [];
    for (const child of children) {
        if (isState(child)) {
            childrenArray.push(createReactiveChild(child, reactiveNodes, (value: any) => value));
        } else {
            const converted = vNodeJsonToVNode(child, reactiveNodes);
            if (converted != null && converted !== false) {
                childrenArray.push(converted);
            }
        }
    }

    return { tagName, props: resolvedProps, children: childrenArray };
}

export function renderJson(rootElement: string | HTMLElement, json: JsonNode, reactiveNodes: ReactiveNodes): HTMLElement {
    const vNode = jsonToVNode(json, reactiveNodes);
    if (!vNode || typeof vNode !== 'object' || !('tagName' in vNode)) {
        throw new Error('Invalid JSON structure');
    }
    return render(rootElement, vNode as VNode);
}

export function renderVNode(rootElement: string | HTMLElement, json: VNodeJson, reactiveNodes: ReactiveNodes): HTMLElement {
    const vNode = vNodeJsonToVNode(json, reactiveNodes);
    if (!vNode || typeof vNode !== 'object' || !('tagName' in vNode)) {
        throw new Error('Invalid VNode JSON structure');
    }
    return render(rootElement, vNode as VNode);
}

export function renderJsonToString(
    json: JsonNode,
    reactiveNodes: ReactiveNodes,
    options: { pretty?: boolean; indent?: number } = {},
): string {
    const vNode = jsonToVNode(json, reactiveNodes);
    return renderToString(vNode, options);
}

export function renderVNodeToString(
    json: VNodeJson,
    reactiveNodes: ReactiveNodes,
    options: { pretty?: boolean; indent?: number } = {},
): string {
    const vNode = vNodeJsonToVNode(json, reactiveNodes);
    return renderToString(vNode, options);
}