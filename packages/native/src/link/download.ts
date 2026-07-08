import type { NativeElementNode } from '../types';

function canNativeDownloadDestination(destination: string): boolean {
    return /^https?:/i.test(destination);
}

export function shouldNativeDownloadLink(node: NativeElementNode): boolean {
    if (node.component !== 'Link' || node.props.download === undefined) {
        return false;
    }

    const destination = typeof node.props.destination === 'string' ? node.props.destination : undefined;
    return Boolean(destination && canNativeDownloadDestination(destination));
}

export function resolveNativeDownloadSuggestedName(node: NativeElementNode): string | undefined {
    if (!shouldNativeDownloadLink(node)) {
        return undefined;
    }

    if (typeof node.props.download === 'string' && node.props.download.trim()) {
        return node.props.download.trim();
    }

    const destination = typeof node.props.destination === 'string' ? node.props.destination : undefined;
    if (!destination) {
        return undefined;
    }

    const normalized = destination.split(/[?#]/, 1)[0];
    const segments = normalized.split('/').filter(Boolean);
    const tail = segments[segments.length - 1];
    return tail && !tail.includes(':') ? tail : undefined;
}