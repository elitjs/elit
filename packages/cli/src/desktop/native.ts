import { randomUUID } from 'node:crypto';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';

import { renderMaterializedNativeTree } from '@elitjs/native';
import type { DesktopRenderOptions } from '@elitjs/render-context';
import { loadNativeEntryResult } from '../native';
import type {
    DesktopNativeInteractionOutput,
    DesktopNativePayload,
    DesktopNativeWindowOptions,
    DesktopRunOptions,
    PreparedDesktopNativePayload,
} from './shared';
import { resolveDesktopEntryDisplayName, resolveDesktopIcon } from './support';

function resolveDesktopNativeWindowIcon(entryPath: string, desktopRenderOptions?: DesktopRenderOptions): string | undefined {
    const configuredIcon = desktopRenderOptions?.icon;
    if (configuredIcon) {
        const candidate = /^(?:[a-z]+:)?[/\\]/i.test(configuredIcon)
            ? configuredIcon
            : resolve(dirname(resolve(entryPath)), configuredIcon);

        if (existsSync(candidate)) {
            return candidate;
        }
    }

    return resolveDesktopIcon(entryPath);
}

function resolveDesktopNativeWindowOptions(
    entryPath: string,
    appName: string,
    desktopRenderOptions?: DesktopRenderOptions,
): DesktopNativeWindowOptions {
    return {
        title: desktopRenderOptions?.title ?? `${resolveDesktopEntryDisplayName(entryPath, appName)} Desktop`,
        width: desktopRenderOptions?.width ?? 1080,
        height: desktopRenderOptions?.height ?? 720,
        center: desktopRenderOptions?.center ?? true,
        autoClose: desktopRenderOptions?.autoClose ?? false,
        ...(resolveDesktopNativeWindowIcon(entryPath, desktopRenderOptions)
            ? { icon: resolveDesktopNativeWindowIcon(entryPath, desktopRenderOptions) }
            : {}),
    };
}

function resolveDesktopNativeInteractionOutput(
    entryPath: string,
    desktopRenderOptions?: DesktopRenderOptions,
): DesktopNativeInteractionOutput | undefined {
    const output = desktopRenderOptions?.interactionOutput;
    if (!output || (!output.file && output.stdout !== true)) {
        return undefined;
    }

    const resolvedFile = output.file
        ? (/^(?:[a-z]+:)?[/\\]/i.test(output.file)
            ? output.file
            : resolve(dirname(resolve(entryPath)), output.file))
        : undefined;

    return {
        ...(resolvedFile ? { file: resolvedFile } : {}),
        ...(output.stdout ? { stdout: true } : {}),
        ...(output.emitReady ? { emitReady: true } : {}),
    };
}

export async function prepareDesktopNativePayload(
    options: Pick<DesktopRunOptions, 'entry' | 'exportName'>,
): Promise<PreparedDesktopNativePayload> {
    const entryPath = resolve(options.entry!);

    if (!existsSync(entryPath)) {
        throw new Error(`Desktop native entry not found: ${entryPath}`);
    }

    const appName = basename(entryPath, extname(entryPath));
    const loadedEntry = await loadNativeEntryResult(entryPath, options.exportName, 'desktop');
    const payloadPath = join(dirname(entryPath), `.elit-desktop-native-${appName}-${randomUUID()}.json`);
    const interactionOutput = resolveDesktopNativeInteractionOutput(entryPath, loadedEntry.desktopRenderOptions);
    const payload: DesktopNativePayload = {
        window: resolveDesktopNativeWindowOptions(entryPath, appName, loadedEntry.desktopRenderOptions),
        resourceBaseDir: dirname(entryPath),
        ...(interactionOutput ? { interactionOutput } : {}),
        tree: renderMaterializedNativeTree(loadedEntry.entry, { platform: 'generic' }),
    };

    writeFileSync(payloadPath, JSON.stringify(payload, null, 2), 'utf8');

    return {
        appName,
        payloadPath,
        cleanupPath: payloadPath,
    };
}

export function cleanupPreparedDesktopNativePayload(payload: PreparedDesktopNativePayload): void {
    if (payload.cleanupPath && existsSync(payload.cleanupPath)) {
        rmSync(payload.cleanupPath, { force: true });
    }
}