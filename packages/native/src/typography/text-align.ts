import type { NativePropValue } from '../types';

export function resolveComposeTextAlign(value: NativePropValue | undefined): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    switch (value.trim().toLowerCase()) {
        case 'center':
            return 'TextAlign.Center';
        case 'right':
        case 'end':
            return 'TextAlign.End';
        case 'left':
        case 'start':
            return 'TextAlign.Start';
        default:
            return undefined;
    }
}

export function resolveSwiftTextAlign(value: NativePropValue | undefined): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    switch (value.trim().toLowerCase()) {
        case 'center':
            return '.center';
        case 'right':
        case 'end':
            return '.trailing';
        case 'left':
        case 'start':
            return '.leading';
        default:
            return undefined;
    }
}