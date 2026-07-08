import type { NativeElementNode } from '../types';
import { shouldNativeDownloadLink } from './download';
import { isExternalDestination } from './external';
import { resolveNativeLinkRelTokens, resolveNativeLinkTarget } from './metadata';

export function resolveNativeLinkHint(node: NativeElementNode): string | undefined {
    if (node.component !== 'Link') {
        return undefined;
    }

    const parts: string[] = [];
    const destination = typeof node.props.destination === 'string' ? node.props.destination : undefined;
    const target = resolveNativeLinkTarget(node);
    const relTokens = resolveNativeLinkRelTokens(node);

    if (shouldNativeDownloadLink(node)) {
        parts.push('Downloads file');
    }

    if (destination && (isExternalDestination(destination) || target === '_blank' || target === '_system' || relTokens.includes('external'))) {
        parts.push('Opens externally');
    }

    return parts.length > 0 ? parts.join(', ') : undefined;
}