import type { Child } from '../../core/types';

export const hasDocument = typeof document !== 'undefined';

export function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function bindDocMethod<T extends (...args: any[]) => any>(target: Document | undefined, method: T | undefined): T | undefined {
    return target && method ? method.bind(target) as T : undefined as any;
}

export function isStateLike(value: unknown): boolean {
    return !!value && typeof value === 'object' && 'value' in value && 'subscribe' in value;
}

export function isVNodeLike(value: unknown): boolean {
    return !!value && typeof value === 'object' && 'tagName' in value;
}

export function flattenChildren(children: Child[]): Child[] {
    const flatChildren: Child[] = [];

    for (let i = 0, len = children.length; i < len; i++) {
        const child = children[i];
        if (child == null || child === false) continue;

        if (Array.isArray(child)) {
            for (let j = 0, childLen = child.length; j < childLen; j++) {
                const nestedChild = child[j];
                if (nestedChild != null && nestedChild !== false) {
                    flatChildren.push(nestedChild);
                }
            }
        } else {
            flatChildren.push(child);
        }
    }

    return flatChildren;
}