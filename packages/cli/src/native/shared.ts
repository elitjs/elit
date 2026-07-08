import type { NativePlatform } from '@elitjs/native';
import type { DesktopRenderOptions } from '@elitjs/render-context';
import type { Child } from '@elitjs/core';

export type NativeTarget = 'android' | 'ios' | 'ir';
export type NativeEntryRuntimeTarget = 'mobile' | 'desktop';

export interface LoadedNativeEntryResult {
    entry: Child;
    desktopRenderOptions?: DesktopRenderOptions;
}

export interface NativeEntryRenderOptions {
    entryPath: string;
    exportName?: string;
    includePreview?: boolean;
    name?: string;
    packageName?: string;
    platform?: NativePlatform;
    target: NativeTarget;
}

export interface NativeGenerateOptions {
    cwd: string;
    entryPath: string;
    exportName?: string;
    includePreview: boolean;
    name: string;
    outputPath?: string;
    packageName?: string;
    platform: NativePlatform;
    target: NativeTarget;
}

export const DEFAULT_ENTRY_EXPORTS = ['default', 'screen', 'app', 'view', 'root', 'native', 'Screen', 'App', 'View', 'Root'] as const;