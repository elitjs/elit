import type { MobileMode } from '@elitjs/config';

export type MobilePlatform = 'android' | 'ios';

export const ANDROID_GENERATED_SCREEN_NAME = 'ElitGeneratedScreen';
export const ANDROID_RUNTIME_CONFIG_NAME = 'ElitRuntimeConfig';
export const IOS_GENERATED_SCREEN_NAME = 'ElitGeneratedScreen';
export const IOS_PROJECT_NAME = 'ElitMobileApp';
export const IOS_RUNTIME_CONFIG_NAME = 'ElitRuntimeConfig';
export const IOS_DERIVED_DATA_DIR = '.elit-xcode-build';
export const MANAGED_ANDROID_MAIN_ACTIVITY_MARKER = '// ELIT-MOBILE-MAIN-ACTIVITY';
export const MANAGED_ANDROID_MAIN_ACTIVITY_URLS = new Set([
    'file:///android_asset/public/index.html',
    'https://appassets.androidplatform.net/assets/public/index.html',
]);

export interface IosSimulatorDevice {
    udid: string;
    name: string;
    state: string;
    isAvailable?: boolean;
}

export interface AndroidConnectedDevice {
    id: string;
    state: string;
}

export interface MobileInitOptions {
    directory: string;
    appId: string;
    appName: string;
    webDir: string;
    icon?: string;
    permissions?: string[];
}

export interface MobileResolvedNativeOptions {
    entryPath: string;
    exportName?: string;
    android: {
        enabled: boolean;
        outputPath: string;
        packageName: string;
    };
    ios: {
        enabled: boolean;
        outputPath: string;
    };
}

export interface MobileCommandOptions {
    cwd: string;
    webDir: string;
    mode: MobileMode;
    appId: string;
    appName: string;
    androidTarget?: string;
    icon?: string;
    iosTarget?: string;
    permissions?: string[];
    native?: MobileResolvedNativeOptions;
    json: boolean;
}

export interface MobileDoctorCheck {
    name: string;
    ok: boolean;
    details?: string;
}

export interface MobileDoctorReport {
    ok: boolean;
    failed: number;
    checks: MobileDoctorCheck[];
}