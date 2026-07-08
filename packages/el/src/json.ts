import type { Child, Children, JsonNode, Props, VNode } from '@elitjs/core';
import { isStateLike } from './helpers';

function unwrap(value: unknown): unknown {
    return isStateLike(value) ? (value as { value: unknown }).value : value;
}

export function jsonToVNode(
    json: JsonNode | string | number | boolean | null | undefined,
): VNode | string | number | boolean | null {
    if (json == null || typeof json !== 'object') {
        return json as VNode | string | number | boolean | null;
    }

    const { tag, attributes = {}, children } = json as JsonNode;
    const props: Props = {};

    for (const key in attributes) {
        const value = unwrap(attributes[key]) as Props[string];
        if (key === 'class') {
            props.className = value as string | string[] | undefined;
        } else {
            props[key] = value;
        }
    }

    const childrenArray: Children = [];
    if (children != null) {
        if (Array.isArray(children)) {
            for (const child of children) {
                const converted = jsonToVNode(child);
                if (converted != null && converted !== false) {
                    childrenArray.push(converted as Child);
                }
            }
        } else if (typeof children === 'object' && children !== null && 'tag' in children) {
            const converted = jsonToVNode(children as JsonNode);
            if (converted != null && converted !== false) {
                childrenArray.push(converted as Child);
            }
        } else {
            const value = unwrap(children);
            if (value != null && value !== false) {
                childrenArray.push(value as Child);
            }
        }
    }

    return { tagName: tag, props, children: childrenArray };
}
