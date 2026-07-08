import type { NativeElementNode } from '../types';

export function resolveNativeLinkTarget(node: NativeElementNode): string | undefined {
    return node.component === 'Link' && typeof node.props.target === 'string' && node.props.target.trim()
        ? node.props.target.trim().toLowerCase()
        : undefined;
}

export function resolveNativeLinkRelTokens(node: NativeElementNode): string[] {
    if (node.component !== 'Link' || typeof node.props.rel !== 'string') {
        return [];
    }

    return node.props.rel
        .split(/\s+/)
        .map((token) => token.trim().toLowerCase())
        .filter(Boolean);
}