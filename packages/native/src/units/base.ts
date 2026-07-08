import { type NativeStyleResolveOptions } from '../../client/style';
import type { NativePlatform } from '../types';

export function formatFloat(value: number): string {
    return Number(value.toFixed(3)).toString();
}

export function getNativeStyleResolveOptions(platform: NativePlatform): NativeStyleResolveOptions {
    return {
        viewportWidth: platform === 'generic' ? 1024 : 390,
        viewportHeight: platform === 'generic' ? 768 : 844,
        colorScheme: 'light',
        mediaType: 'screen',
    };
}