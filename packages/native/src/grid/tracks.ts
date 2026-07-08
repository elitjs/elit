import { type NativeStyleResolveOptions } from '../../client/style';
import type {
    NativeGridColumnTrackSizeSpec,
    NativeGridTrackDefinition,
    NativeGridTrackSizeSpec,
    NativePropValue,
} from '../types';
import { toScaledUnitNumber } from '../units';

function splitCssTrackList(value: string): string[] {
    const tracks: string[] = [];
    let token = '';
    let functionDepth = 0;
    let bracketDepth = 0;

    for (const char of value.trim()) {
        if (char === '(') {
            functionDepth += 1;
        } else if (char === ')' && functionDepth > 0) {
            functionDepth -= 1;
        } else if (char === '[') {
            bracketDepth += 1;
        } else if (char === ']' && bracketDepth > 0) {
            bracketDepth -= 1;
        }

        if (/\s/.test(char) && functionDepth === 0 && bracketDepth === 0) {
            const trimmed = token.trim();
            if (trimmed) {
                tracks.push(trimmed);
                token = '';
            }
            continue;
        }

        token += char;
    }

    const trailing = token.trim();
    if (trailing) {
        tracks.push(trailing);
    }

    return tracks;
}

function extractNativeGridLineNames(token: string): string[] | undefined {
    const trimmed = token.trim();
    if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
        return undefined;
    }

    const names = trimmed.slice(1, -1).trim().split(/\s+/).filter(Boolean);
    return names.length > 0 ? names : undefined;
}

function expandRepeatTrackList(value: string): string[] | undefined {
    const trimmed = value.trim();
    if (!trimmed.endsWith(')') || !trimmed.toLowerCase().startsWith('repeat(')) {
        return undefined;
    }

    const commaIdx = trimmed.indexOf(',', 'repeat('.length);
    if (commaIdx < 0) {
        return undefined;
    }

    const countStr = trimmed.slice('repeat('.length, commaIdx).trim();
    if (!/^\d+$/.test(countStr)) {
        return undefined;
    }

    const count = Number(countStr);
    if (!Number.isFinite(count) || count <= 0) {
        return undefined;
    }

    const inner = trimmed.slice(commaIdx + 1, -1).trim();
    if (!inner) {
        return undefined;
    }

    const innerTracks = splitCssTrackList(inner);
    if (innerTracks.length === 0) {
        return undefined;
    }

    return Array.from({ length: count }, () => innerTracks).flat();
}

function parseFractionTrackWeight(track: string): number | undefined {
    const directMatch = track.trim().match(/^(-?\d+(?:\.\d+)?)fr$/i);
    if (directMatch) {
        return Number(directMatch[1]);
    }

    const minmaxMatch = track.trim().match(/^minmax\([^,()]*,\s*(-?\d+(?:\.\d+)?)fr\s*\)$/i);
    return minmaxMatch ? Number(minmaxMatch[1]) : undefined;
}

export function parseNativeGridTrackDefinition(value: string): NativeGridTrackDefinition | undefined {
    const tokens = expandRepeatTrackList(value.trim()) ?? splitCssTrackList(value.trim());
    if (tokens.length === 0) {
        return undefined;
    }

    const tracks: string[] = [];
    const lineNames = new Map<string, number[]>();
    let lineIndex = 1;

    for (const token of tokens) {
        const names = extractNativeGridLineNames(token);
        if (names) {
            for (const name of names) {
                const normalizedName = name.toLowerCase();
                const existing = lineNames.get(normalizedName) ?? [];
                existing.push(lineIndex);
                lineNames.set(normalizedName, existing);
            }
            continue;
        }

        tracks.push(token);
        lineIndex += 1;
    }

    return tracks.length > 0 ? { tracks, lineNames, lineCount: lineIndex } : undefined;
}

export function parseGridTrackSizeSpec(
    track: string,
    styleResolveOptions: NativeStyleResolveOptions,
): NativeGridTrackSizeSpec | undefined {
    const trimmed = track.trim();
    if (!trimmed) {
        return undefined;
    }

    const direct = toScaledUnitNumber(trimmed, styleResolveOptions);
    if (direct !== undefined && direct >= 0) {
        return { minHeight: direct, height: direct };
    }

    const normalized = trimmed.toLowerCase();
    if (normalized === 'auto') {
        return { stretchEligible: true };
    }

    if (normalized === 'min-content' || normalized === 'max-content') {
        return { intrinsicHeight: true };
    }

    const fitContentMatch = trimmed.match(/^fit-content\(([^()]+)\)$/i);
    if (fitContentMatch) {
        const fitContent = toScaledUnitNumber(fitContentMatch[1].trim(), styleResolveOptions);
        return fitContent !== undefined && fitContent >= 0 ? { maxHeight: fitContent } : undefined;
    }

    const minmaxMatch = trimmed.match(/^minmax\(([^,()]+),([^,()]+)\)$/i);
    if (minmaxMatch) {
        const minToken = minmaxMatch[1].trim();
        const maxToken = minmaxMatch[2].trim();
        const normalizedMinToken = minToken.toLowerCase();
        const normalizedMaxToken = maxToken.toLowerCase();
        const minTrack = toScaledUnitNumber(minToken, styleResolveOptions);
        const maxTrack = toScaledUnitNumber(maxToken, styleResolveOptions);
        const trackWeight = parseFractionTrackWeight(trimmed);
        const hasFixedTrack = minTrack !== undefined && maxTrack !== undefined && Math.abs(minTrack - maxTrack) < 0.001;

        return {
            ...(minTrack !== undefined && minTrack >= 0 ? { minHeight: minTrack } : {}),
            ...((normalizedMinToken === 'min-content' || normalizedMinToken === 'max-content') ? { intrinsicMinHeight: true } : {}),
            ...(hasFixedTrack && maxTrack !== undefined ? { height: maxTrack } : {}),
            ...(!hasFixedTrack && maxTrack !== undefined && maxTrack >= 0 ? { maxHeight: maxTrack } : {}),
            ...((normalizedMaxToken === 'min-content' || normalizedMaxToken === 'max-content') ? { intrinsicMaxHeight: true } : {}),
            ...(minTrack === undefined && maxTrack === undefined && normalizedMinToken === 'auto' && normalizedMaxToken === 'auto' && trackWeight === undefined ? { stretchEligible: true } : {}),
            ...(trackWeight !== undefined && Number.isFinite(trackWeight) && trackWeight > 0 ? { trackWeight } : {}),
        };
    }

    const directWeight = parseFractionTrackWeight(trimmed);
    if (directWeight !== undefined && Number.isFinite(directWeight) && directWeight > 0) {
        return { trackWeight: directWeight };
    }

    return undefined;
}

export function parseGridColumnTrackSizeSpec(
    track: string,
    styleResolveOptions: NativeStyleResolveOptions,
): NativeGridColumnTrackSizeSpec | undefined {
    const trimmed = track.trim();
    if (!trimmed) {
        return undefined;
    }

    const direct = toScaledUnitNumber(trimmed, styleResolveOptions);
    if (direct !== undefined && direct >= 0) {
        return { minWidth: direct, width: direct };
    }

    const normalized = trimmed.toLowerCase();
    if (normalized === 'auto') {
        return { trackWeight: 1 };
    }

    if (normalized === 'min-content' || normalized === 'max-content') {
        return { intrinsicWidth: true };
    }

    const fitContentMatch = trimmed.match(/^fit-content\(([^()]+)\)$/i);
    if (fitContentMatch) {
        const fitContent = toScaledUnitNumber(fitContentMatch[1].trim(), styleResolveOptions);
        return fitContent !== undefined && fitContent >= 0 ? { maxWidth: fitContent } : undefined;
    }

    const minmaxMatch = trimmed.match(/^minmax\(([^,()]+),([^,()]+)\)$/i);
    if (minmaxMatch) {
        const minToken = minmaxMatch[1].trim();
        const maxToken = minmaxMatch[2].trim();
        const normalizedMinToken = minToken.toLowerCase();
        const normalizedMaxToken = maxToken.toLowerCase();
        const minTrack = toScaledUnitNumber(minToken, styleResolveOptions);
        const maxTrack = toScaledUnitNumber(maxToken, styleResolveOptions);
        const trackWeight = parseFractionTrackWeight(trimmed);
        const hasFixedTrack = minTrack !== undefined && maxTrack !== undefined && Math.abs(minTrack - maxTrack) < 0.001;

        return {
            ...(minTrack !== undefined && minTrack >= 0 ? { minWidth: minTrack } : {}),
            ...((normalizedMinToken === 'min-content' || normalizedMinToken === 'max-content') ? { intrinsicMinWidth: true } : {}),
            ...(hasFixedTrack && maxTrack !== undefined ? { width: maxTrack } : {}),
            ...(!hasFixedTrack && maxTrack !== undefined && maxTrack >= 0 ? { maxWidth: maxTrack } : {}),
            ...((normalizedMaxToken === 'min-content' || normalizedMaxToken === 'max-content') ? { intrinsicMaxWidth: true } : {}),
            ...(minTrack === undefined && maxTrack === undefined && normalizedMinToken === 'auto' && normalizedMaxToken === 'auto' && trackWeight === undefined ? { trackWeight: 1 } : {}),
            ...(trackWeight !== undefined && Number.isFinite(trackWeight) && trackWeight > 0 ? { trackWeight } : {}),
        };
    }

    const directWeight = parseFractionTrackWeight(trimmed);
    if (directWeight !== undefined && Number.isFinite(directWeight) && directWeight > 0) {
        return { trackWeight: directWeight };
    }

    return { trackWeight: 1 };
}

export function resolveGridTrackSizeSpecs(
    value: NativePropValue | undefined,
    styleResolveOptions: NativeStyleResolveOptions,
): Array<NativeGridTrackSizeSpec | undefined> | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const tracks = parseNativeGridTrackDefinition(value.trim())?.tracks ?? [];
    if (tracks.length === 0) {
        return undefined;
    }

    return tracks.map((track) => parseGridTrackSizeSpec(track, styleResolveOptions));
}

export function resolveGridColumnTrackSizeSpecs(
    value: NativePropValue | undefined,
    styleResolveOptions: NativeStyleResolveOptions,
    columnGap: number,
): Array<NativeGridColumnTrackSizeSpec | undefined> | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    const viewportWidth = styleResolveOptions.viewportWidth ?? 390;
    const autoRepeatMatch = trimmed.match(/^repeat\(\s*auto-(?:fit|fill)\s*,\s*(minmax\([^,()]+,[^,()]+\))\s*\)$/i);
    if (autoRepeatMatch) {
        const repeatedSpec = parseGridColumnTrackSizeSpec(autoRepeatMatch[1].trim(), styleResolveOptions);
        const minWidth = repeatedSpec?.width ?? repeatedSpec?.minWidth;
        if (minWidth === undefined || minWidth <= 0) {
            return undefined;
        }

        const columnCount = Math.max(1, Math.floor((viewportWidth + columnGap) / (minWidth + columnGap)));
        return Array.from({ length: columnCount }, () => repeatedSpec ? { ...repeatedSpec } : { trackWeight: 1 });
    }

    const tracks = parseNativeGridTrackDefinition(trimmed)?.tracks ?? [];
    if (tracks.length === 0) {
        return undefined;
    }

    return tracks.map((track) => parseGridColumnTrackSizeSpec(track, styleResolveOptions));
}

export function resolveGridTrackCount(value: NativePropValue | undefined): number | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const tracks = parseNativeGridTrackDefinition(value.trim())?.tracks ?? [];
    return tracks.length > 0 ? tracks.length : undefined;
}