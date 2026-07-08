import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { ELIT_CONFIG_FILES } from '@elitjs/config';
import { generateNativeEntryOutput } from '../native';
import {
    applyAndroidIcon,
    applyAndroidPermissions,
    createAndroidScaffold,
    detectAndroidSdkPath,
    ensureAndroidComposeBuildSupport,
    ensureManagedAndroidMainActivity,
    listAndroidConnectedDevices,
    resolveGradleCommand,
    runGradle,
    writeAndroidRuntimeSupportFiles,
} from './android';
import { commandExists, runCommand } from './command';
import { readArgValue, resolvePlatformMobileMode } from './config';
import {
    bootIosSimulatorIfNeeded,
    buildIosXcodebuildArgs,
    createIosScaffold,
    getIosAppPath,
    getIosBuiltAppPath,
    getIosProjectPath,
    listIosSimulatorDevices,
    pickPreferredIosSimulatorDevice,
    resolveIosBuildDestinationArg,
    resolveIosSimulatorDevice,
    writeIosRuntimeSupportFiles,
} from './ios';
import {
    ANDROID_GENERATED_SCREEN_NAME,
    ANDROID_RUNTIME_CONFIG_NAME,
    IOS_GENERATED_SCREEN_NAME,
    IOS_PROJECT_NAME,
    IOS_RUNTIME_CONFIG_NAME,
    type MobileCommandOptions,
    type MobileDoctorCheck,
    type MobileDoctorReport,
    type MobileInitOptions,
    type MobilePlatform,
} from './shared';
import { copyDirectory, resolveRequestedTarget, toPackagePath } from './support';

export function initMobileProject(options: MobileInitOptions): void {
    const directory = resolve(options.directory);

    if (!existsSync(directory)) {
        mkdirSync(directory, { recursive: true });
    }

    createAndroidScaffold(directory, {
        appId: options.appId,
        appName: options.appName,
    });

    applyAndroidPermissions(directory, options.permissions);

    if (options.icon) {
        applyAndroidIcon(directory, options.icon);
    }

    createIosScaffold(directory, {
        appId: options.appId,
        appName: options.appName,
    });

    console.log('[mobile] Native scaffold ready. Next steps:');
    console.log('  Configure mobile defaults in elit.config.* under { mobile: { ... } }');
    console.log('  elit build --entry ./src/main.ts --out-dir dist');
    console.log('  elit mobile sync --cwd .');
    console.log('  elit mobile build android --cwd .');
    console.log('  elit mobile run android --cwd .');
}

export async function syncMobileAssets(options: MobileCommandOptions): Promise<void> {
    if (options.mode === 'native' && !options.native) {
        throw new Error('mobile.mode="native" requires mobile.native.entry. Use mobile.mode="hybrid" for the WebView shell.');
    }

    const webRoot = resolve(options.cwd, options.webDir);
    const hasWebAssets = existsSync(webRoot);
    const requiresWebAssets = options.mode === 'hybrid' || !options.native;
    if (!hasWebAssets && requiresWebAssets) {
        const hint = options.native
            ? ' Build your app first or switch mobile.mode to "native".'
            : ' Build your app first.';
        throw new Error(`Web directory not found: ${webRoot}.${hint}`);
    }

    if (hasWebAssets) {
        const androidPublic = join(options.cwd, 'android', 'app', 'src', 'main', 'assets', 'public');
        copyDirectory(webRoot, androidPublic);
        console.log(`[mobile] Synced web assets to ${androidPublic}`);
    } else {
        console.log(`[mobile] Skipped web asset sync because ${webRoot} was not found and mobile.mode is "native".`);
    }

    applyAndroidPermissions(options.cwd, options.permissions);

    if (options.icon) {
        applyAndroidIcon(options.cwd, options.icon);
    }

    const iosPublic = join(options.cwd, 'ios', 'App', 'www');
    if (hasWebAssets && existsSync(dirname(iosPublic))) {
        copyDirectory(webRoot, iosPublic);
        console.log(`[mobile] Synced web assets to ${iosPublic}`);
    }

    if (options.native) {
        await syncNativeMobileTargets(options);
    }
}

export async function buildMobilePlatform(
    platform: MobilePlatform,
    args: string[],
    options: MobileCommandOptions,
): Promise<void> {
    await syncMobileAssets(options);

    if (platform === 'android') {
        const release = args.includes('--prod') || args.includes('--release');
        runGradle(options.cwd, [release ? 'assembleRelease' : 'assembleDebug']);
        return;
    }

    if (process.platform !== 'darwin') {
        throw new Error(`iOS build automation requires macOS. Open ${getIosProjectPath(options.cwd)} in Xcode on a Mac.`);
    }

    const projectPath = getIosProjectPath(options.cwd);
    if (!existsSync(projectPath)) {
        throw new Error(`iOS project not found at ${projectPath}. Run "elit mobile init" first.`);
    }

    const release = args.includes('--prod') || args.includes('--release');
    const requestedTarget = resolveRequestedTarget(readArgValue(args, '--target'), options.iosTarget);
    const destination = release
        ? (requestedTarget && requestedTarget.includes('platform=') ? requestedTarget : 'generic/platform=iOS')
        : resolveIosBuildDestinationArg(options.cwd, requestedTarget);

    runCommand('xcodebuild', buildIosXcodebuildArgs({
        configuration: release ? 'Release' : 'Debug',
        cwd: options.cwd,
        destination,
        projectPath,
        sdk: release ? 'iphoneos' : 'iphonesimulator',
    }), options.cwd);
}

export async function runMobilePlatform(
    platform: MobilePlatform,
    args: string[],
    options: MobileCommandOptions,
): Promise<void> {
    await syncMobileAssets(options);

    if (platform === 'android') {
        const release = args.includes('--prod') || args.includes('--release');
        const target = resolveRequestedTarget(readArgValue(args, '--target'), options.androidTarget);
        runGradle(options.cwd, [release ? 'installRelease' : 'installDebug']);

        const adbArgs = [
            ...(target ? ['-s', target] : []),
            'shell',
            'am',
            'start',
            '-n',
            `${options.appId}/.MainActivity`,
        ];
        runCommand('adb', adbArgs, options.cwd);
        return;
    }

    if (process.platform !== 'darwin') {
        throw new Error(`iOS run automation requires macOS. Open ${getIosProjectPath(options.cwd)} in Xcode on a Mac.`);
    }

    if (args.includes('--prod') || args.includes('--release')) {
        throw new Error('iOS run automation currently supports Debug simulator builds only. Use "elit mobile build ios --prod" for a release build.');
    }

    const projectPath = getIosProjectPath(options.cwd);
    if (!existsSync(projectPath)) {
        throw new Error(`iOS project not found at ${projectPath}. Run "elit mobile init" first.`);
    }

    const simulator = resolveIosSimulatorDevice(options.cwd, resolveRequestedTarget(readArgValue(args, '--target'), options.iosTarget));
    bootIosSimulatorIfNeeded(options.cwd, simulator);

    runCommand('xcodebuild', buildIosXcodebuildArgs({
        configuration: 'Debug',
        cwd: options.cwd,
        destination: `id=${simulator.udid}`,
        projectPath,
        sdk: 'iphonesimulator',
    }), options.cwd);

    const appPath = getIosBuiltAppPath(options.cwd, 'Debug', 'iphonesimulator');
    if (!existsSync(appPath)) {
        throw new Error(`Built iOS app not found at ${appPath}.`);
    }

    runCommand('xcrun', ['simctl', 'install', simulator.udid, appPath], options.cwd);
    runCommand('xcrun', ['simctl', 'launch', simulator.udid, options.appId], options.cwd);
}

export function openMobileProject(platform: MobilePlatform, options: MobileCommandOptions): void {
    if (platform === 'android') {
        const projectPath = join(options.cwd, 'android');
        if (!existsSync(projectPath)) {
            throw new Error(`Android project not found at ${projectPath}. Run "elit mobile init" first.`);
        }

        if (process.platform === 'win32') {
            runCommand('explorer.exe', [projectPath], options.cwd);
            return;
        }

        if (process.platform === 'darwin') {
            runCommand('open', [projectPath], options.cwd);
            return;
        }

        runCommand('xdg-open', [projectPath], options.cwd);
        return;
    }

    const iosPath = getIosProjectPath(options.cwd);
    if (!existsSync(iosPath)) {
        throw new Error(`iOS project not found at ${iosPath}. Run "elit mobile init" first.`);
    }

    if (process.platform === 'darwin') {
        runCommand('open', [iosPath], options.cwd);
        return;
    }

    throw new Error('iOS project opening is available only on macOS.');
}

export function runMobileDevices(platform: MobilePlatform, options: MobileCommandOptions): void {
    if (platform === 'android') {
        const devices = listAndroidConnectedDevices(options.cwd);

        if (options.json) {
            console.log(JSON.stringify({ platform: 'android', devices }, null, 2));
            return;
        }

        console.log('[mobile devices] Android devices:');
        if (devices.length === 0) {
            console.log('  No connected Android devices found.');
            return;
        }

        for (const device of devices) {
            console.log(`  - ${device.id} (${device.state})`);
        }
        return;
    }

    if (process.platform !== 'darwin') {
        throw new Error('iOS simulator listing requires macOS.');
    }

    const devices = listIosSimulatorDevices(options.cwd);
    const preferred = pickPreferredIosSimulatorDevice(devices);
    const sorted = [...devices].sort((left, right) => scoreIosDevice(right) - scoreIosDevice(left));

    if (options.json) {
        console.log(JSON.stringify({
            platform: 'ios',
            preferredDeviceId: preferred?.udid,
            devices: sorted,
        }, null, 2));
        return;
    }

    console.log('[mobile devices] iOS simulators:');
    if (sorted.length === 0) {
        console.log('  No available iOS simulators found.');
        return;
    }

    for (const device of sorted) {
        const preferredLabel = preferred?.udid === device.udid ? ' preferred' : '';
        console.log(`  - ${device.name} [${device.state}] ${device.udid}${preferredLabel}`);
    }
}

export function runMobileDoctor(options: MobileCommandOptions): void {
    const checks: MobileDoctorCheck[] = [];
    const resolvedConfigPath = ELIT_CONFIG_FILES
        .map((file) => join(options.cwd, file))
        .find((filePath) => existsSync(filePath));
    const androidRoot = join(options.cwd, 'android');
    const androidSdkPath = detectAndroidSdkPath(options.cwd);
    const gradleCommand = resolveGradleCommand(options.cwd);

    checks.push({
        name: 'Project config (elit.config.*)',
        ok: Boolean(resolvedConfigPath),
        details: resolvedConfigPath
            ? resolvedConfigPath
            : 'Create elit.config.ts|mts|js|mjs|cjs|json and set { mobile: { ... } } defaults.',
    });
    checks.push({
        name: 'Mobile runtime mode',
        ok: options.mode !== 'native' || Boolean(options.native),
        details: options.mode === 'native'
            ? options.native
                ? 'native (generated UI is the primary runtime)'
                : 'mobile.mode="native" requires mobile.native.entry'
            : options.native
                ? 'hybrid (WebView runtime with generated native files kept in sync)'
                : 'hybrid (WebView runtime)',
    });

    checks.push({
        name: 'Gradle (gradle or gradlew)',
        ok: Boolean(gradleCommand),
        details: gradleCommand?.details ?? 'Install Gradle or generate gradle wrapper in android/.',
    });
    checks.push({ name: 'Java JDK (java)', ok: commandExists('java', options.cwd) });
    checks.push({
        name: 'Android SDK (ANDROID_HOME or ANDROID_SDK_ROOT)',
        ok: Boolean(androidSdkPath),
        details: androidSdkPath ?? 'Set ANDROID_HOME/ANDROID_SDK_ROOT or install Android SDK.',
    });
    checks.push({ name: 'ADB (adb)', ok: commandExists('adb', options.cwd) });
    if (options.androidTarget) {
        try {
            const devices = listAndroidConnectedDevices(options.cwd);
            const device = devices.find((item) => item.id === options.androidTarget);
            checks.push({
                name: 'Configured Android target',
                ok: Boolean(device),
                details: device
                    ? `${device.id} (${device.state})`
                    : `Configured target not connected: ${options.androidTarget}`,
            });
        } catch (error) {
            checks.push({
                name: 'Configured Android target',
                ok: false,
                details: error instanceof Error ? error.message : String(error),
            });
        }
    }
    if (options.native) {
        checks.push({
            name: 'Native UI entry',
            ok: existsSync(options.native.entryPath),
            details: options.native.entryPath,
        });
    }
    checks.push({
        name: 'Android scaffold (android/)',
        ok: existsSync(androidRoot),
        details: existsSync(androidRoot) ? androidRoot : 'Run "elit mobile init" first.',
    });

    if (process.platform === 'darwin') {
        checks.push({ name: 'Xcode tools (xcodebuild)', ok: commandExists('xcodebuild', options.cwd) });
        checks.push({ name: 'Xcode runtime tools (xcrun)', ok: commandExists('xcrun', options.cwd) });
        checks.push({ name: 'CocoaPods (pod)', ok: commandExists('pod', options.cwd) });
        try {
            const simulators = listIosSimulatorDevices(options.cwd);
            checks.push({
                name: 'iOS simulators',
                ok: simulators.length > 0,
                details: simulators.length > 0
                    ? `${simulators.length} available (${pickPreferredIosSimulatorDevice(simulators)?.name ?? 'no preferred match'})`
                    : 'Open Xcode and install an iOS simulator runtime.',
            });
        } catch (error) {
            checks.push({
                name: 'iOS simulators',
                ok: false,
                details: error instanceof Error ? error.message : String(error),
            });
        }
        if (options.iosTarget) {
            if (options.iosTarget.includes('platform=')) {
                checks.push({
                    name: 'Configured iOS target',
                    ok: true,
                    details: options.iosTarget,
                });
            } else {
                try {
                    const simulator = resolveIosSimulatorDevice(options.cwd, options.iosTarget);
                    checks.push({
                        name: 'Configured iOS target',
                        ok: true,
                        details: `${simulator.name} (${simulator.udid})`,
                    });
                } catch (error) {
                    checks.push({
                        name: 'Configured iOS target',
                        ok: false,
                        details: error instanceof Error ? error.message : String(error),
                    });
                }
            }
        }
        checks.push({
            name: `iOS project (${IOS_PROJECT_NAME}.xcodeproj)`,
            ok: existsSync(getIosProjectPath(options.cwd)),
            details: existsSync(getIosProjectPath(options.cwd)) ? getIosProjectPath(options.cwd) : 'Run "elit mobile init" first.',
        });
        checks.push({
            name: 'iOS app sources (ios/App)',
            ok: existsSync(getIosAppPath(options.cwd)),
            details: existsSync(getIosAppPath(options.cwd)) ? getIosAppPath(options.cwd) : 'Run "elit mobile init" first.',
        });
    }

    const failed = checks.filter((check) => !check.ok).length;
    const report: MobileDoctorReport = {
        ok: failed === 0,
        failed,
        checks,
    };

    if (options.json) {
        console.log(JSON.stringify(report, null, 2));
        if (!report.ok) {
            process.exitCode = 1;
        }
        return;
    }

    console.log('[mobile doctor] Environment checks:');
    for (const check of checks) {
        const status = check.ok ? 'OK' : 'MISSING';
        console.log(`  [${status}] ${check.name}`);
        if (!check.ok && check.details) {
            console.log(`    -> ${check.details}`);
        }
    }

    if (!report.ok) {
        throw new Error(`[mobile doctor] ${failed} check(s) failed.`);
    }

    console.log('[mobile doctor] All checks passed.');
}

async function syncNativeMobileTargets(options: MobileCommandOptions): Promise<void> {
    if (!options.native) {
        return;
    }

    const androidRoot = join(options.cwd, 'android');
    if (existsSync(androidRoot)) {
        ensureAndroidComposeBuildSupport(options.cwd);
        const androidRuntimeMode = resolvePlatformMobileMode(options.mode, options.native.android.enabled);

        const mainActivityManaged = ensureManagedAndroidMainActivity(
            options.cwd,
            options.appId,
            options.native.android.packageName,
        );

        if (options.native.android.enabled) {
            const composeSource = await generateNativeEntryOutput({
                entryPath: options.native.entryPath,
                exportName: options.native.exportName,
                includePreview: false,
                name: ANDROID_GENERATED_SCREEN_NAME,
                packageName: options.native.android.packageName,
                target: 'android',
            });

            const runtimeConfigPath = join(
                options.cwd,
                'android',
                'app',
                'src',
                'main',
                'java',
                toPackagePath(options.native.android.packageName),
                `${ANDROID_RUNTIME_CONFIG_NAME}.kt`,
            );
            writeAndroidRuntimeSupportFiles(
                runtimeConfigPath,
                options.native.android.outputPath,
                options.native.android.packageName,
                androidRuntimeMode === 'native',
                composeSource,
            );
            console.log(`[mobile] Synced native Android UI to ${options.native.android.outputPath}`);
            if (androidRuntimeMode === 'hybrid') {
                console.log('[mobile] Android runtime mode is hybrid; keeping WebView fallback active.');
            }

            if (!mainActivityManaged) {
                console.warn('[mobile] MainActivity.kt no longer matches the managed scaffold. Import ELIT_USE_NATIVE_UI and ElitGeneratedScreen manually to preserve mode switching in your custom activity.');
            }
        } else {
            const runtimeConfigPath = join(
                options.cwd,
                'android',
                'app',
                'src',
                'main',
                'java',
                toPackagePath(options.native.android.packageName),
                `${ANDROID_RUNTIME_CONFIG_NAME}.kt`,
            );
            writeAndroidRuntimeSupportFiles(
                runtimeConfigPath,
                options.native.android.outputPath,
                options.native.android.packageName,
                false,
            );
            console.log('[mobile] Android native UI disabled in config; keeping WebView fallback active.');
        }
    }

    if (options.native.ios.enabled) {
        const iosRoot = getIosAppPath(options.cwd);
        if (existsSync(iosRoot)) {
            createIosScaffold(options.cwd, {
                appId: options.appId,
                appName: options.appName,
            });
            const iosRuntimeMode = resolvePlatformMobileMode(options.mode, options.native.ios.enabled);

            const swiftSource = await generateNativeEntryOutput({
                entryPath: options.native.entryPath,
                exportName: options.native.exportName,
                includePreview: false,
                name: IOS_GENERATED_SCREEN_NAME,
                target: 'ios',
            });

            const defaultGeneratedScreenPath = join(getIosAppPath(options.cwd), `${IOS_GENERATED_SCREEN_NAME}.swift`);
            const runtimeConfigPath = join(getIosAppPath(options.cwd), `${IOS_RUNTIME_CONFIG_NAME}.swift`);
            writeIosRuntimeSupportFiles(runtimeConfigPath, defaultGeneratedScreenPath, iosRuntimeMode === 'native', swiftSource);
            if (options.native.ios.outputPath !== defaultGeneratedScreenPath) {
                mkdirSync(dirname(options.native.ios.outputPath), { recursive: true });
                writeFileSync(options.native.ios.outputPath, swiftSource, 'utf8');
            }
            console.log(`[mobile] Synced native iOS UI to ${options.native.ios.outputPath}`);
            if (iosRuntimeMode === 'hybrid') {
                console.log('[mobile] iOS runtime mode is hybrid; keeping WebView fallback active.');
            }
        }
    } else {
        const iosRoot = getIosAppPath(options.cwd);
        if (existsSync(iosRoot)) {
            createIosScaffold(options.cwd, {
                appId: options.appId,
                appName: options.appName,
            });
            const defaultGeneratedScreenPath = join(getIosAppPath(options.cwd), `${IOS_GENERATED_SCREEN_NAME}.swift`);
            const runtimeConfigPath = join(getIosAppPath(options.cwd), `${IOS_RUNTIME_CONFIG_NAME}.swift`);
            writeIosRuntimeSupportFiles(runtimeConfigPath, defaultGeneratedScreenPath, false);
        }
    }
}

function scoreIosDevice(device: { name: string; state: string }): number {
    let score = 0;
    const normalizedName = device.name.toLowerCase();

    if (device.state === 'Booted') score += 10_000;
    if (normalizedName.startsWith('iphone')) score += 1_000;
    if (normalizedName.includes('pro max')) score += 40;
    else if (normalizedName.includes('pro')) score += 30;
    else if (normalizedName.includes('plus')) score += 20;
    else if (normalizedName.includes('mini')) score += 10;
    else if (normalizedName.includes('se')) score += 5;
    else if (normalizedName.startsWith('ipad')) score += 100;

    const generationMatch = normalizedName.match(/iphone\s+(\d+)/);
    if (generationMatch) {
        score += Number(generationMatch[1]) * 2;
    }

    if (normalizedName.includes('(3rd generation)')) score += 2;
    if (normalizedName.includes('(2nd generation)')) score += 1;

    return score;
}