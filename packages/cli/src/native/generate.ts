import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { renderAndroidCompose, renderNativeJson, renderSwiftUI } from '@elitjs/native';
import { parseNativeGenerateArgs } from './config';
import { loadNativeEntryValue } from './entry';
import type { NativeEntryRenderOptions } from './shared';

export async function generateNativeFromCli(args: string[]): Promise<void> {
    const options = await parseNativeGenerateArgs(args);
    const output = await generateNativeEntryOutput({
        entryPath: options.entryPath,
        exportName: options.exportName,
        includePreview: options.includePreview,
        name: options.name,
        packageName: options.packageName,
        platform: options.platform,
        target: options.target,
    });

    if (options.outputPath) {
        mkdirSync(dirname(options.outputPath), { recursive: true });
        writeFileSync(options.outputPath, output);
        console.log(`[native] Generated ${options.target} output at ${options.outputPath}`);
        return;
    }

    process.stdout.write(output);
    if (!output.endsWith('\n')) {
        process.stdout.write('\n');
    }
}

export async function generateNativeEntryOutput(options: NativeEntryRenderOptions): Promise<string> {
    const entry = await loadNativeEntryValue(options.entryPath, options.exportName);

    switch (options.target) {
        case 'android':
            return renderAndroidCompose(entry, {
                functionName: options.name ?? 'GeneratedScreen',
                includePreview: options.includePreview ?? true,
                packageName: options.packageName,
            });
        case 'ios':
            return renderSwiftUI(entry, {
                includePreview: options.includePreview ?? true,
                structName: options.name ?? 'GeneratedScreen',
            });
        case 'ir':
        default:
            return renderNativeJson(entry, { platform: options.platform ?? 'generic' });
    }
}