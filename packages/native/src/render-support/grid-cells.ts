import type {
    NativeGridColumnTrackSizeSpec,
    NativeGridItemAlignment,
} from '../types';
import { appendComposeModifierCall } from '../canvas';
import { formatFloat } from '../units';

export function hasNativeGridColumnConstraint(spec: NativeGridColumnTrackSizeSpec | undefined): boolean {
    return Boolean(spec && (spec.width !== undefined || spec.minWidth !== undefined || spec.maxWidth !== undefined));
}

export function buildComposeGridCellModifier(
    weight: number | undefined,
    shouldExpandWidth: boolean,
    shouldExpandHeight: boolean,
    columnSize: NativeGridColumnTrackSizeSpec | undefined,
): string {
    let modifier = 'Modifier';

    if (weight !== undefined) {
        modifier = appendComposeModifierCall(modifier, `weight(${formatFloat(weight)}f)`);
    }

    if (shouldExpandWidth) {
        modifier = appendComposeModifierCall(modifier, 'fillMaxWidth()');
    }
    if (shouldExpandHeight) {
        modifier = appendComposeModifierCall(modifier, 'fillMaxHeight()');
    }

    if (columnSize?.width !== undefined) {
        modifier = appendComposeModifierCall(modifier, `width(${formatFloat(columnSize.width)}.dp)`);
    } else if (columnSize?.minWidth !== undefined || columnSize?.maxWidth !== undefined) {
        const widthInArgs: string[] = [];
        if (columnSize.minWidth !== undefined) {
            widthInArgs.push(`min = ${formatFloat(columnSize.minWidth)}.dp`);
        }
        if (columnSize.maxWidth !== undefined) {
            widthInArgs.push(`max = ${formatFloat(columnSize.maxWidth)}.dp`);
        }
        modifier = appendComposeModifierCall(modifier, `widthIn(${widthInArgs.join(', ')})`);
    }

    return modifier;
}

export function resolveComposeGridCellContentAlignment(
    horizontal: NativeGridItemAlignment | undefined,
    vertical: NativeGridItemAlignment | undefined,
): string | undefined {
    const resolvedHorizontal = horizontal && horizontal !== 'stretch' ? horizontal : undefined;
    const resolvedVertical = vertical && vertical !== 'stretch' ? vertical : undefined;
    if (!resolvedHorizontal && !resolvedVertical) {
        return undefined;
    }

    const horizontalToken = resolvedHorizontal === 'center'
        ? 'Center'
        : resolvedHorizontal === 'end'
            ? 'End'
            : 'Start';
    const verticalToken = resolvedVertical === 'center'
        ? 'Center'
        : resolvedVertical === 'end'
            ? 'Bottom'
            : 'Top';

    return verticalToken === 'Center' && horizontalToken === 'Center'
        ? 'Alignment.Center'
        : `Alignment.${verticalToken}${horizontalToken}`;
}

export function resolveSwiftGridCellFrameAlignment(
    horizontal: NativeGridItemAlignment | undefined,
    vertical: NativeGridItemAlignment | undefined,
): string | undefined {
    const resolvedHorizontal = horizontal && horizontal !== 'stretch' ? horizontal : undefined;
    const resolvedVertical = vertical && vertical !== 'stretch' ? vertical : undefined;
    if (!resolvedHorizontal && !resolvedVertical) {
        return undefined;
    }

    const horizontalToken = resolvedHorizontal === 'center'
        ? 'center'
        : resolvedHorizontal === 'end'
            ? 'trailing'
            : 'leading';
    const verticalToken = resolvedVertical === 'center'
        ? 'center'
        : resolvedVertical === 'end'
            ? 'bottom'
            : 'top';

    if (verticalToken === 'center') {
        if (horizontalToken === 'center') {
            return '.center';
        }

        return horizontalToken === 'trailing' ? '.trailing' : '.leading';
    }

    if (horizontalToken === 'center') {
        return verticalToken === 'bottom' ? '.bottom' : '.top';
    }

    return `.${verticalToken}${horizontalToken === 'trailing' ? 'Trailing' : 'Leading'}`;
}

export function resolveNativeGridCellFillWidth(defaultFillWidth: boolean, horizontalAlignment: NativeGridItemAlignment | undefined): boolean {
    if (!horizontalAlignment) {
        return defaultFillWidth;
    }

    return horizontalAlignment === 'stretch';
}

export function buildSwiftGridCellFrameModifier(
    shouldExpandWidth: boolean,
    shouldExpandHeight: boolean,
    alignment: string | undefined,
    columnSize?: NativeGridColumnTrackSizeSpec,
): string | undefined {
    const frameArgs: string[] = [];
    if (columnSize?.width !== undefined) {
        frameArgs.push(`width: ${formatFloat(columnSize.width)}`);
    } else {
        if (columnSize?.minWidth !== undefined) {
            frameArgs.push(`minWidth: ${formatFloat(columnSize.minWidth)}`);
        }
        if (columnSize?.maxWidth !== undefined) {
            frameArgs.push(`maxWidth: ${formatFloat(columnSize.maxWidth)}`);
        }
    }
    if (shouldExpandWidth) {
        frameArgs.push('maxWidth: .infinity');
    }
    if (shouldExpandHeight) {
        frameArgs.push('maxHeight: .infinity');
    }
    if (alignment) {
        frameArgs.push(`alignment: ${alignment}`);
    } else if (frameArgs.length > 0) {
        frameArgs.push(`alignment: ${shouldExpandHeight ? '.topLeading' : '.leading'}`);
    }

    return frameArgs.length > 0 ? `.frame(${frameArgs.join(', ')})` : undefined;
}