import { flattenTextContent } from '../strings';
import type { NativeElementNode, NativePropValue } from '../types';
import { parsePlainNumericValue } from '../units';
import { toNativeBoolean } from './controls';

const IMAGE_FALLBACK_STOP_WORDS = new Set([
    'image',
    'icon',
    'public',
    'assets',
    'asset',
    'favicon',
    'svg',
    'png',
    'jpg',
    'jpeg',
    'webp',
]);

export function isNativeMuted(node: NativeElementNode): boolean {
    return toNativeBoolean(node.props.muted);
}

export function shouldNativeShowVideoControls(node: NativeElementNode): boolean {
    return node.sourceTag === 'video' && toNativeBoolean(node.props.controls);
}

export function resolveNativeVideoPoster(node: NativeElementNode): string | undefined {
    return node.sourceTag === 'video' && typeof node.props.poster === 'string' && node.props.poster.trim()
        ? node.props.poster.trim()
        : undefined;
}

export function shouldNativePlayInline(node: NativeElementNode): boolean {
    return node.sourceTag === 'video' && (
        toNativeBoolean(node.props.playsInline)
        || toNativeBoolean(node.props.playsinline)
    );
}

export function resolveNativeMediaLabel(node: NativeElementNode): string {
    const explicitLabel = typeof node.props['aria-label'] === 'string' && node.props['aria-label'].trim()
        ? node.props['aria-label'].trim()
        : typeof node.props.title === 'string' && node.props.title.trim()
            ? node.props.title.trim()
            : undefined;

    if (explicitLabel) {
        return explicitLabel;
    }

    const textContent = flattenTextContent(node.children).trim();
    if (textContent) {
        return textContent;
    }

    return node.sourceTag === 'audio' ? 'Audio' : 'Video';
}

function tokenizeImageFallbackWords(value: string): string[] {
    return value
        .split(/[^a-zA-Z0-9]+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 0)
        .filter((token) => !/^\d+$/.test(token))
        .filter((token) => !IMAGE_FALLBACK_STOP_WORDS.has(token.toLowerCase()));
}

export function resolveImageFallbackLabel(source: string, alt?: string): string {
    const altTokens = alt ? tokenizeImageFallbackWords(alt) : [];
    const sourceTokens = tokenizeImageFallbackWords(source.replace(/\.[a-z0-9]+$/i, ''));
    const tokens = altTokens.length > 0 ? altTokens : sourceTokens;

    if (tokens.length === 0) {
        return 'IMG';
    }

    if (tokens.length === 1) {
        return tokens[0]!.slice(0, 2).toUpperCase();
    }

    const initials = tokens
        .slice(0, 2)
        .map((token) => token[0]!.toUpperCase())
        .join('');

    return initials || 'IMG';
}

export function resolveNativeProgressFraction(props: Record<string, NativePropValue>): number | undefined {
    const value = parsePlainNumericValue(props.value);
    if (value === undefined) {
        return undefined;
    }

    const max = parsePlainNumericValue(props.max);
    const denominator = max !== undefined && max > 0 ? max : 1;
    return Math.max(0, Math.min(1, value / denominator));
}

export function resolveNativeSurfaceSource(node: NativeElementNode): string | undefined {
    const source = typeof node.props.source === 'string' && node.props.source.trim()
        ? node.props.source.trim()
        : typeof node.props.src === 'string' && node.props.src.trim()
            ? node.props.src.trim()
            : typeof node.props.data === 'string' && node.props.data.trim()
                ? node.props.data.trim()
                : typeof node.props.destination === 'string' && node.props.destination.trim()
                    ? node.props.destination.trim()
                    : undefined;

    return source && source.length > 0 ? source : undefined;
}