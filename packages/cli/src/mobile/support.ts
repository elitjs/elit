import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import type { MobileNativeConfig } from '@elitjs/config';
import {
    ANDROID_GENERATED_SCREEN_NAME,
    IOS_GENERATED_SCREEN_NAME,
    type MobileResolvedNativeOptions,
} from './shared';

export function resolveRequestedTarget(cliTarget?: string, configuredTarget?: string): string | undefined {
    return cliTarget ?? configuredTarget;
}

export function toPackagePath(packageName: string): string {
    return packageName.replace(/\./g, '/');
}

export function resolveMobileNativeOptions(
    projectRoot: string,
    appId: string,
    nativeConfig?: MobileNativeConfig,
): MobileResolvedNativeOptions | undefined {
    if (!nativeConfig?.entry) {
        return undefined;
    }

    const androidPackageName = nativeConfig.android?.packageName ?? appId;
    return {
        entryPath: resolve(projectRoot, nativeConfig.entry),
        exportName: nativeConfig.exportName,
        android: {
            enabled: nativeConfig.android?.enabled ?? true,
            outputPath: resolve(
                projectRoot,
                nativeConfig.android?.output ?? join('android', 'app', 'src', 'main', 'java', toPackagePath(androidPackageName), `${ANDROID_GENERATED_SCREEN_NAME}.kt`),
            ),
            packageName: androidPackageName,
        },
        ios: {
            enabled: nativeConfig.ios?.enabled ?? true,
            outputPath: resolve(projectRoot, nativeConfig.ios?.output ?? join('ios', 'App', `${IOS_GENERATED_SCREEN_NAME}.swift`)),
        },
    };
}

export function copyDirectory(sourceDir: string, targetDir: string): void {
    if (existsSync(targetDir)) {
        rmSync(targetDir, { recursive: true, force: true });
    }
    mkdirSync(targetDir, { recursive: true });

    const stack: Array<{ from: string; to: string }> = [{ from: sourceDir, to: targetDir }];
    while (stack.length > 0) {
        const current = stack.pop();
        if (!current) continue;

        const entries = readdirSync(current.from);
        for (const entry of entries) {
            const fromPath = join(current.from, entry);
            const toPath = join(current.to, entry);
            const stats = statSync(fromPath);
            if (stats.isDirectory()) {
                mkdirSync(toPath, { recursive: true });
                stack.push({ from: fromPath, to: toPath });
            } else if (stats.isFile()) {
                copyFileSync(fromPath, toPath);
            }
        }
    }
}

export function escapeSingleQuote(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}