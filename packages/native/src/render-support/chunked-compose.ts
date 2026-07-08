import { type NativeStyleResolveOptions } from '../../client/style';
import type {
    NativeChunkedLayout,
    NativeChunkedRow,
    NativeContentStackAlignment,
    NativePropValue,
} from '../types';
import { appendComposeModifierCall } from '../canvas';
import { buildComposeArrangement, buildComposeCrossAlignment } from '../layout';
import { formatFloat, getNativeStyleResolveOptions } from '../units';

export function resolveNativeStretchChunkedRows(
    rows: NativeChunkedRow[],
    contentAlignment: NativeContentStackAlignment | undefined,
): NativeChunkedRow[] {
    if (contentAlignment !== 'stretch') {
        return rows;
    }

    return rows.map((row) => row.trackWeight === undefined && row.stretchEligible && row.height === undefined
        ? { ...row, trackWeight: 1 }
        : row);
}

export function resolveEffectiveChunkedContentAlignment(layout: NativeChunkedLayout): NativeContentStackAlignment | undefined {
    return layout.kind === 'grid' && layout.rows.some((row) => row.trackWeight !== undefined)
        ? undefined
        : layout.contentAlignment;
}

export function buildComposeChunkedRowArguments(
    style: Record<string, NativePropValue> | undefined,
    modifier: string,
    columnGap?: number,
    styleResolveOptions: NativeStyleResolveOptions = getNativeStyleResolveOptions('generic'),
): string {
    const args = [`modifier = ${modifier}`];
    const arrangement = buildComposeArrangement(
        'Row',
        style,
        styleResolveOptions,
        columnGap !== undefined ? `${formatFloat(columnGap)}.dp` : undefined,
    );
    if (arrangement) {
        args.push(`horizontalArrangement = ${arrangement}`);
    }

    const alignment = buildComposeCrossAlignment('Row', style);
    if (alignment) {
        args.push(`verticalAlignment = ${alignment}`);
    }

    return args.join(', ');
}

export function buildComposeChunkedTrackModifier(
    baseModifier: string,
    row: NativeChunkedRow,
    options: { fillWidth?: boolean } = {},
): string {
    const fillWidth = options.fillWidth ?? true;
    let modifier = baseModifier;

    if (row.trackWeight !== undefined) {
        modifier = appendComposeModifierCall(modifier, `weight(${formatFloat(row.trackWeight)}f, fill = true)`);
    }

    if (row.height !== undefined) {
        modifier = appendComposeModifierCall(modifier, `height(${formatFloat(row.height)}.dp)`);
    } else if (row.minHeight !== undefined || row.maxHeight !== undefined) {
        const heightInArgs: string[] = [];
        if (row.minHeight !== undefined) {
            heightInArgs.push(`min = ${formatFloat(row.minHeight)}.dp`);
        }
        if (row.maxHeight !== undefined) {
            heightInArgs.push(`max = ${formatFloat(row.maxHeight)}.dp`);
        }
        modifier = appendComposeModifierCall(modifier, `heightIn(${heightInArgs.join(', ')})`);
    }

    return fillWidth ? appendComposeModifierCall(modifier, 'fillMaxWidth()') : modifier;
}

export function buildComposeChunkedColumnArrangement(layout: NativeChunkedLayout): string | undefined {
    const contentAlignment = resolveEffectiveChunkedContentAlignment(layout);
    const gap = layout.rowGap !== undefined ? `${formatFloat(layout.rowGap)}.dp` : undefined;

    switch (contentAlignment) {
        case 'center':
            return gap ? `Arrangement.spacedBy(${gap}, Alignment.CenterVertically)` : 'Arrangement.Center';
        case 'end':
            return gap ? `Arrangement.spacedBy(${gap}, Alignment.Bottom)` : 'Arrangement.Bottom';
        case 'space-between':
            return 'Arrangement.SpaceBetween';
        case 'space-around':
            return 'Arrangement.SpaceAround';
        case 'space-evenly':
            return 'Arrangement.SpaceEvenly';
        default:
            return gap ? `Arrangement.spacedBy(${gap})` : undefined;
    }
}