import { resolve } from 'node:path';

import { loadConfig, type MobileConfig, type MobileMode } from '@elitjs/config';
import { IOS_PROJECT_NAME, type MobileCommandOptions, type MobileInitOptions, type MobilePlatform } from './shared';
import { resolveMobileNativeOptions } from './support';

export function parseInitArgs(args: string[], config?: MobileConfig): MobileInitOptions {
    const options: MobileInitOptions = {
        directory: config?.cwd ?? process.cwd(),
        appId: config?.appId ?? 'com.elit.app',
        appName: config?.appName ?? 'Elit App',
        webDir: config?.webDir ?? 'dist',
        icon: config?.icon,
        permissions: Array.isArray(config?.permissions) ? [...config.permissions] : undefined,
    };

    if (args.length > 0 && !args[0].startsWith('-')) {
        options.directory = resolve(args[0]);
    }

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
            case '--app-id': {
                const value = args[++i];
                if (!value) throw new Error('Missing value for --app-id');
                options.appId = value;
                break;
            }
            case '--app-name': {
                const value = args[++i];
                if (!value) throw new Error('Missing value for --app-name');
                options.appName = value;
                break;
            }
            case '--web-dir': {
                const value = args[++i];
                if (!value) throw new Error('Missing value for --web-dir');
                options.webDir = value;
                break;
            }
            case '--icon': {
                const value = args[++i];
                if (!value) throw new Error('Missing value for --icon');
                options.icon = value;
                break;
            }
            case '--permission': {
                const value = args[++i];
                if (!value) throw new Error('Missing value for --permission');
                if (!options.permissions) options.permissions = [];
                options.permissions.push(value);
                break;
            }
            case '--permissions': {
                const value = args[++i];
                if (!value) throw new Error('Missing value for --permissions');
                options.permissions = value
                    .split(',')
                    .map((permission) => permission.trim())
                    .filter(Boolean);
                break;
            }
        }
    }

    return options;
}

export async function parseCommandOptions(args: string[]): Promise<MobileCommandOptions> {
    const cwdArg = readArgValue(args, '--cwd');
    const cwd = cwdArg ? resolve(cwdArg) : process.cwd();
    const config = await loadConfig(cwd);
    const mobileConfig = config?.mobile;

    const options: MobileCommandOptions = {
        cwd: mobileConfig?.cwd ? resolve(cwd, mobileConfig.cwd) : cwd,
        webDir: mobileConfig?.webDir ?? 'dist',
        mode: getDefaultMobileMode(mobileConfig),
        appId: mobileConfig?.appId ?? 'com.elit.app',
        appName: mobileConfig?.appName ?? 'Elit App',
        androidTarget: mobileConfig?.android?.target,
        icon: mobileConfig?.icon,
        iosTarget: mobileConfig?.ios?.target,
        permissions: Array.isArray(mobileConfig?.permissions) ? [...mobileConfig.permissions] : undefined,
        native: undefined,
        json: false,
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--cwd') {
            const value = args[++i];
            if (!value) throw new Error('Missing value for --cwd');
            options.cwd = resolve(value);
        } else if (arg === '--mode') {
            const value = args[++i];
            if (!value) throw new Error('Missing value for --mode');
            options.mode = parseMobileMode(value, '--mode');
        } else if (arg === '--web-dir') {
            const value = args[++i];
            if (!value) throw new Error('Missing value for --web-dir');
            options.webDir = value;
        } else if (arg === '--icon') {
            const value = args[++i];
            if (!value) throw new Error('Missing value for --icon');
            options.icon = value;
        } else if (arg === '--permission') {
            const value = args[++i];
            if (!value) throw new Error('Missing value for --permission');
            if (!options.permissions) options.permissions = [];
            options.permissions.push(value);
        } else if (arg === '--permissions') {
            const value = args[++i];
            if (!value) throw new Error('Missing value for --permissions');
            options.permissions = value
                .split(',')
                .map((permission) => permission.trim())
                .filter(Boolean);
        } else if (arg === '--json') {
            options.json = true;
        }
    }

    options.native = resolveMobileNativeOptions(options.cwd, options.appId, mobileConfig?.native);

    return options;
}

export function parsePlatformArg(value: string | undefined): MobilePlatform {
    if (value === 'android' || value === 'ios') {
        return value;
    }

    throw new Error('Mobile command requires a platform: android or ios');
}

export function readArgValue(args: string[], key: string): string | undefined {
    const index = args.indexOf(key);
    if (index === -1) return undefined;
    return args[index + 1];
}

export function parseMobileMode(value: string, source: string): MobileMode {
    if (value === 'native' || value === 'hybrid') {
        return value;
    }

    throw new Error(`Invalid ${source}: ${value}. Expected "native" or "hybrid".`);
}

export function getDefaultMobileMode(config?: MobileConfig): MobileMode {
    if (config?.mode) {
        return parseMobileMode(config.mode, 'mobile.mode');
    }

    return config?.native?.entry ? 'native' : 'hybrid';
}

export function resolvePlatformMobileMode(mode: MobileMode, nativeEnabled: boolean): MobileMode {
    return mode === 'native' && nativeEnabled ? 'native' : 'hybrid';
}

export function printMobileHelp(): void {
    console.log(`
Mobile command (native app workflow owned by elit)

Usage:
    elit mobile init [directory] [--app-id id] [--app-name name] [--web-dir dist] [--icon ./icon.png] [--permission android.permission.CAMERA]
    elit mobile doctor [--cwd dir] [--mode native|hybrid] [--json]
    elit mobile devices android|ios [--cwd dir] [--json]
    elit mobile sync [--cwd dir] [--mode native|hybrid] [--web-dir dist] [--icon ./icon.png] [--permission android.permission.CAMERA]
    elit mobile open android|ios
    elit mobile run android|ios [--cwd dir] [--mode native|hybrid] [--web-dir dist] [--icon ./icon.png] [--permission android.permission.CAMERA] [--target <id|name|booted>] [--prod]
    elit mobile build android|ios [--cwd dir] [--mode native|hybrid] [--web-dir dist] [--icon ./icon.png] [--permission android.permission.CAMERA] [--target <id|name|booted>] [--prod]

Notes:
    - No external mobile framework is required.
    - Android scaffold can run either WebView assets or generated Compose UI.
    - Set mobile.native.entry in elit.config.* to auto-generate Android Compose and iOS SwiftUI during sync/build/run.
    - Set mobile.mode to native or hybrid. When omitted, projects with mobile.native.entry default to native; otherwise they default to hybrid.
    - If mobile.mode is native and mobile.native.entry is set, sync can still continue when the web build is missing.
    - iOS scaffold now creates ${IOS_PROJECT_NAME}.xcodeproj and SwiftUI/WebView source files under ios/App.
    - iOS build automation uses xcodebuild on macOS.
    - iOS run automation uses xcrun simctl on macOS and accepts --target booted, a simulator name, or a simulator UDID.
    - Without --target, iOS run prefers a booted simulator and otherwise falls back to the best available iPhone simulator.
    - Use "elit mobile devices ios --json" to inspect available iOS simulators and the preferred fallback choice.
    - Run "elit mobile doctor --json" for CI-friendly machine-readable checks.
    - Set default values in elit.config.* under { mobile: { cwd, appId, appName, webDir, mode, icon, permissions, android, ios, native } }.
     - Use mobile.android.target or mobile.ios.target when you want a default device or simulator without repeating --target.
    - Android permissions can be set by config mobile.permissions or repeated --permission flags.
    - Android icon expects a .png or .webp file path.
`);
}