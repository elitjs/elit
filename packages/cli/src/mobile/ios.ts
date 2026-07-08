import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import {
    IOS_DERIVED_DATA_DIR,
    IOS_GENERATED_SCREEN_NAME,
    IOS_PROJECT_NAME,
    IOS_RUNTIME_CONFIG_NAME,
    type IosSimulatorDevice,
} from './shared';
import { runCommand, runCommandCapture } from './command';

export function getIosRootPath(projectRoot: string): string {
    return join(projectRoot, 'ios');
}

export function getIosAppPath(projectRoot: string): string {
    return join(getIosRootPath(projectRoot), 'App');
}

export function getIosProjectPath(projectRoot: string): string {
    return join(getIosRootPath(projectRoot), `${IOS_PROJECT_NAME}.xcodeproj`);
}

function getIosDerivedDataPath(projectRoot: string): string {
    return join(getIosRootPath(projectRoot), IOS_DERIVED_DATA_DIR);
}

export function getIosBuiltAppPath(
    projectRoot: string,
    configuration: 'Debug' | 'Release',
    sdk: 'iphoneos' | 'iphonesimulator',
): string {
    return join(
        getIosDerivedDataPath(projectRoot),
        'Build',
        'Products',
        `${configuration}-${sdk}`,
        `${IOS_PROJECT_NAME}.app`,
    );
}

export function buildIosXcodebuildArgs(options: {
    configuration: 'Debug' | 'Release';
    cwd: string;
    destination: string;
    projectPath: string;
    sdk: 'iphoneos' | 'iphonesimulator';
}): string[] {
    return [
        '-project',
        options.projectPath,
        '-target',
        IOS_PROJECT_NAME,
        '-configuration',
        options.configuration,
        '-sdk',
        options.sdk,
        '-derivedDataPath',
        getIosDerivedDataPath(options.cwd),
        '-destination',
        options.destination,
        'build',
    ];
}

export function resolveIosBuildDestinationArg(cwd: string, target?: string): string {
    if (!target) {
        const preferred = pickPreferredIosSimulatorDevice(listIosSimulatorDevices(cwd));
        return preferred ? `id=${preferred.udid}` : 'generic/platform=iOS Simulator';
    }

    if (target.includes('platform=')) {
        return target;
    }

    const simulator = resolveIosSimulatorDevice(cwd, target);
    return `id=${simulator.udid}`;
}

export function resolveIosSimulatorDevice(cwd: string, target?: string): IosSimulatorDevice {
    const simulators = listIosSimulatorDevices(cwd);
    const available = simulators.filter((device) => device.isAvailable !== false);

    if (available.length === 0) {
        throw new Error('No available iOS simulators found. Open Xcode and install a simulator runtime first.');
    }

    if (!target) {
        const preferred = pickPreferredIosSimulatorDevice(available);
        if (preferred) return preferred;
        throw new Error('No available iOS simulator found. Open Xcode and install a simulator runtime first.');
    }

    if (target === 'booted') {
        const booted = available.find((device) => device.state === 'Booted');
        if (booted) return booted;
        throw new Error('No booted iOS simulator found. Boot one in Simulator.app or pass --target <simulator-name|udid>.');
    }

    const normalizedTarget = target.toLowerCase();
    const exact = available.find((device) => device.udid.toLowerCase() === normalizedTarget || device.name.toLowerCase() === normalizedTarget);
    if (exact) return exact;

    const partial = available.find((device) => device.name.toLowerCase().includes(normalizedTarget));
    if (partial) return partial;

    throw new Error(`iOS simulator not found for target "${target}". Pass a simulator name, UDID, or --target booted.`);
}

export function listIosSimulatorDevices(cwd: string): IosSimulatorDevice[] {
    const output = runCommandCapture('xcrun', ['simctl', 'list', 'devices', 'available', '--json'], cwd);
    const parsed = JSON.parse(output) as { devices?: Record<string, Array<Record<string, unknown>>> };
    const devices = Object.values(parsed.devices ?? {}).flat();

    return devices
        .map((device) => ({
            isAvailable: typeof device.isAvailable === 'boolean' ? device.isAvailable : true,
            name: String(device.name ?? ''),
            state: String(device.state ?? ''),
            udid: String(device.udid ?? ''),
        }))
        .filter((device) => Boolean(device.name) && Boolean(device.udid));
}

export function pickPreferredIosSimulatorDevice(devices: IosSimulatorDevice[]): IosSimulatorDevice | undefined {
    return [...devices]
        .filter((device) => device.isAvailable !== false)
        .sort((left, right) => scoreIosSimulatorDevice(right) - scoreIosSimulatorDevice(left))[0];
}

function scoreIosSimulatorDevice(device: IosSimulatorDevice): number {
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

export function bootIosSimulatorIfNeeded(cwd: string, simulator: IosSimulatorDevice): void {
    if (simulator.state === 'Booted') {
        return;
    }

    runCommand('xcrun', ['simctl', 'boot', simulator.udid], cwd);
    runCommand('xcrun', ['simctl', 'bootstatus', simulator.udid, '-b'], cwd);
}

function quotePbxString(value: string): string {
    return JSON.stringify(value);
}

export function renderIosAppSource(): string {
    return [
        'import SwiftUI',
        '',
        '@main',
        `struct ${IOS_PROJECT_NAME}: App {`,
        '    var body: some Scene {',
        '        WindowGroup {',
        '            ElitAppRoot()',
        '        }',
        '    }',
        '}',
        '',
    ].join('\n');
}

export function renderIosAppRootSource(): string {
    return [
        'import SwiftUI',
        '',
        'struct ElitAppRoot: View {',
        '    var body: some View {',
        '        Group {',
        '            if ELIT_USE_NATIVE_UI {',
        `                ${IOS_GENERATED_SCREEN_NAME}()`,
        '            } else if let webURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "www") {',
        '                ElitWebView(url: webURL)',
        '                    .ignoresSafeArea()',
        '            } else {',
        '                VStack(alignment: .leading, spacing: 12) {',
        '                    Text("Elit web bundle not found.")',
        '                    Text("Run elit mobile sync after building your web app.")',
        '                        .foregroundStyle(.secondary)',
        '                }',
        '                .padding(24)',
        '            }',
        '        }',
        '    }',
        '}',
        '',
    ].join('\n');
}

export function renderIosWebViewSource(): string {
    return [
        'import SwiftUI',
        'import WebKit',
        '',
        'struct ElitWebView: UIViewRepresentable {',
        '    let url: URL',
        '',
        '    func makeUIView(context: Context) -> WKWebView {',
        '        let webView = WKWebView(frame: .zero)',
        '        webView.scrollView.bounces = false',
        '        webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())',
        '        return webView',
        '    }',
        '',
        '    func updateUIView(_ webView: WKWebView, context: Context) {',
        '        guard webView.url == nil else { return }',
        '        webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())',
        '    }',
        '}',
        '',
    ].join('\n');
}

export function renderIosRuntimeConfigSource(nativeEnabled: boolean): string {
    const runtimeMode = nativeEnabled ? 'native' : 'hybrid';
    return [
        '// ELIT-MOBILE-RUNTIME-CONFIG',
        `let ELIT_MOBILE_MODE = "${runtimeMode}"`,
        `let ELIT_USE_NATIVE_UI = ${nativeEnabled ? 'true' : 'false'}`,
        '',
    ].join('\n');
}

export function renderIosGeneratedPlaceholderSource(): string {
    return [
        'import SwiftUI',
        '',
        '// ELIT-MOBILE-GENERATED-SCREEN',
        `struct ${IOS_GENERATED_SCREEN_NAME}: View {`,
        '    var body: some View {',
        '        Text("Elit native screen is not generated yet.")',
        '            .padding(24)',
        '    }',
        '}',
        '',
    ].join('\n');
}

function renderIosReadmeSource(): string {
    return [
        'Elit iOS scaffold.',
        '',
        `Open ../${IOS_PROJECT_NAME}.xcodeproj in Xcode to build or run the app.`,
        `The app switches between ./${IOS_GENERATED_SCREEN_NAME}.swift and ./www/index.html using ./${IOS_RUNTIME_CONFIG_NAME}.swift.`,
        '',
    ].join('\n');
}

function renderIosAssetCatalogContentsSource(): string {
    return JSON.stringify({
        info: {
            author: 'xcode',
            version: 1,
        },
    }, null, 2) + '\n';
}

function renderIosAccentColorContentsSource(): string {
    return JSON.stringify({
        colors: [
            {
                color: {
                    'color-space': 'srgb',
                    components: {
                        alpha: '1.000',
                        blue: '0.204',
                        green: '0.467',
                        red: '0.024',
                    },
                },
                idiom: 'universal',
            },
        ],
        info: {
            author: 'xcode',
            version: 1,
        },
    }, null, 2) + '\n';
}

function renderIosWorkspaceDataSource(): string {
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<Workspace version = "1.0">',
        '   <FileRef location = "self:">',
        '   </FileRef>',
        '</Workspace>',
        '',
    ].join('\n');
}

export function renderIosProjectFileSource(app: { appId: string; appName: string }): string {
    return [
        '// !$*UTF8*$!',
        '{',
        '    archiveVersion = 1;',
        '    classes = {};',
        '    objectVersion = 56;',
        '    objects = {',
        '',
        '/* Begin PBXBuildFile section */',
        '        A0000000000000000000000C /* ElitMobileApp.swift in Sources */ = {isa = PBXBuildFile; fileRef = A00000000000000000000004 /* ElitMobileApp.swift */; };',
        '        A0000000000000000000000D /* ElitAppRoot.swift in Sources */ = {isa = PBXBuildFile; fileRef = A00000000000000000000005 /* ElitAppRoot.swift */; };',
        '        A0000000000000000000000E /* ElitWebView.swift in Sources */ = {isa = PBXBuildFile; fileRef = A00000000000000000000006 /* ElitWebView.swift */; };',
        '        A0000000000000000000000F /* ElitRuntimeConfig.swift in Sources */ = {isa = PBXBuildFile; fileRef = A00000000000000000000007 /* ElitRuntimeConfig.swift */; };',
        '        A00000000000000000000010 /* ElitGeneratedScreen.swift in Sources */ = {isa = PBXBuildFile; fileRef = A00000000000000000000008 /* ElitGeneratedScreen.swift */; };',
        '        A00000000000000000000011 /* Assets.xcassets in Resources */ = {isa = PBXBuildFile; fileRef = A00000000000000000000009 /* Assets.xcassets */; };',
        '        A00000000000000000000012 /* www in Resources */ = {isa = PBXBuildFile; fileRef = A0000000000000000000000A /* www */; };',
        '/* End PBXBuildFile section */',
        '',
        '/* Begin PBXFileReference section */',
        '        A00000000000000000000004 /* ElitMobileApp.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ElitMobileApp.swift; sourceTree = "<group>"; };',
        '        A00000000000000000000005 /* ElitAppRoot.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ElitAppRoot.swift; sourceTree = "<group>"; };',
        '        A00000000000000000000006 /* ElitWebView.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ElitWebView.swift; sourceTree = "<group>"; };',
        '        A00000000000000000000007 /* ElitRuntimeConfig.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ElitRuntimeConfig.swift; sourceTree = "<group>"; };',
        '        A00000000000000000000008 /* ElitGeneratedScreen.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ElitGeneratedScreen.swift; sourceTree = "<group>"; };',
        '        A00000000000000000000009 /* Assets.xcassets */ = {isa = PBXFileReference; lastKnownFileType = folder.assetcatalog; path = Assets.xcassets; sourceTree = "<group>"; };',
        '        A0000000000000000000000A /* www */ = {isa = PBXFileReference; lastKnownFileType = folder; path = www; sourceTree = "<group>"; };',
        '        A0000000000000000000000B /* ElitMobileApp.app */ = {isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = ElitMobileApp.app; sourceTree = BUILT_PRODUCTS_DIR; };',
        '/* End PBXFileReference section */',
        '',
        '/* Begin PBXFrameworksBuildPhase section */',
        '        A00000000000000000000013 /* Frameworks */ = {',
        '            isa = PBXFrameworksBuildPhase;',
        '            buildActionMask = 2147483647;',
        '            files = ();',
        '            runOnlyForDeploymentPostprocessing = 0;',
        '        };',
        '/* End PBXFrameworksBuildPhase section */',
        '',
        '/* Begin PBXGroup section */',
        '        A00000000000000000000001 = {',
        '            isa = PBXGroup;',
        '            children = (',
        '                A00000000000000000000002 /* App */,',
        '                A00000000000000000000003 /* Products */,',
        '            );',
        '            sourceTree = "<group>";',
        '        };',
        '        A00000000000000000000002 /* App */ = {',
        '            isa = PBXGroup;',
        '            children = (',
        '                A00000000000000000000004 /* ElitMobileApp.swift */,',
        '                A00000000000000000000005 /* ElitAppRoot.swift */,',
        '                A00000000000000000000006 /* ElitWebView.swift */,',
        '                A00000000000000000000007 /* ElitRuntimeConfig.swift */,',
        '                A00000000000000000000008 /* ElitGeneratedScreen.swift */,',
        '                A00000000000000000000009 /* Assets.xcassets */,',
        '                A0000000000000000000000A /* www */,',
        '            );',
        '            path = App;',
        '            sourceTree = "<group>";',
        '        };',
        '        A00000000000000000000003 /* Products */ = {',
        '            isa = PBXGroup;',
        '            children = (',
        '                A0000000000000000000000B /* ElitMobileApp.app */,',
        '            );',
        '            name = Products;',
        '            sourceTree = "<group>";',
        '        };',
        '/* End PBXGroup section */',
        '',
        '/* Begin PBXNativeTarget section */',
        '        A00000000000000000000016 /* ElitMobileApp */ = {',
        '            isa = PBXNativeTarget;',
        '            buildConfigurationList = A00000000000000000000019 /* Build configuration list for PBXNativeTarget "ElitMobileApp" */;',
        '            buildPhases = (',
        '                A00000000000000000000015 /* Sources */,',
        '                A00000000000000000000013 /* Frameworks */,',
        '                A00000000000000000000014 /* Resources */,',
        '            );',
        '            buildRules = ();',
        '            dependencies = ();',
        '            name = ElitMobileApp;',
        '            productName = ElitMobileApp;',
        '            productReference = A0000000000000000000000B /* ElitMobileApp.app */;',
        '            productType = "com.apple.product-type.application";',
        '        };',
        '/* End PBXNativeTarget section */',
        '',
        '/* Begin PBXProject section */',
        '        A00000000000000000000017 /* Project object */ = {',
        '            isa = PBXProject;',
        '            attributes = {',
        '                BuildIndependentTargetsInParallel = 1;',
        '                LastSwiftUpdateCheck = 1600;',
        '                LastUpgradeCheck = 1600;',
        '                TargetAttributes = {',
        '                    A00000000000000000000016 = {',
        '                        CreatedOnToolsVersion = 16.0;',
        '                    };',
        '                };',
        '            };',
        '            buildConfigurationList = A00000000000000000000018 /* Build configuration list for PBXProject "ElitMobileApp" */;',
        '            compatibilityVersion = "Xcode 15.0";',
        '            developmentRegion = en;',
        '            hasScannedForEncodings = 0;',
        '            knownRegions = (',
        '                en,',
        '                Base,',
        '            );',
        '            mainGroup = A00000000000000000000001;',
        '            productRefGroup = A00000000000000000000003 /* Products */;',
        '            projectDirPath = "";',
        '            projectRoot = "";',
        '            targets = (',
        '                A00000000000000000000016 /* ElitMobileApp */,',
        '            );',
        '        };',
        '/* End PBXProject section */',
        '',
        '/* Begin PBXResourcesBuildPhase section */',
        '        A00000000000000000000014 /* Resources */ = {',
        '            isa = PBXResourcesBuildPhase;',
        '            buildActionMask = 2147483647;',
        '            files = (',
        '                A00000000000000000000011 /* Assets.xcassets in Resources */,',
        '                A00000000000000000000012 /* www in Resources */,',
        '            );',
        '            runOnlyForDeploymentPostprocessing = 0;',
        '        };',
        '/* End PBXResourcesBuildPhase section */',
        '',
        '/* Begin PBXSourcesBuildPhase section */',
        '        A00000000000000000000015 /* Sources */ = {',
        '            isa = PBXSourcesBuildPhase;',
        '            buildActionMask = 2147483647;',
        '            files = (',
        '                A0000000000000000000000C /* ElitMobileApp.swift in Sources */,',
        '                A0000000000000000000000D /* ElitAppRoot.swift in Sources */,',
        '                A0000000000000000000000E /* ElitWebView.swift in Sources */,',
        '                A0000000000000000000000F /* ElitRuntimeConfig.swift in Sources */,',
        '                A00000000000000000000010 /* ElitGeneratedScreen.swift in Sources */,',
        '            );',
        '            runOnlyForDeploymentPostprocessing = 0;',
        '        };',
        '/* End PBXSourcesBuildPhase section */',
        '',
        '/* Begin XCBuildConfiguration section */',
        '        A0000000000000000000001A /* Debug */ = {',
        '            isa = XCBuildConfiguration;',
        '            buildSettings = {',
        '                CLANG_ENABLE_MODULES = YES;',
        '                ENABLE_USER_SCRIPT_SANDBOXING = YES;',
        '            };',
        '            name = Debug;',
        '        };',
        '        A0000000000000000000001B /* Release */ = {',
        '            isa = XCBuildConfiguration;',
        '            buildSettings = {',
        '                CLANG_ENABLE_MODULES = YES;',
        '                ENABLE_USER_SCRIPT_SANDBOXING = YES;',
        '            };',
        '            name = Release;',
        '        };',
        '        A0000000000000000000001C /* Debug */ = {',
        '            isa = XCBuildConfiguration;',
        '            buildSettings = {',
        '                ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = AccentColor;',
        '                CODE_SIGN_STYLE = Automatic;',
        '                CURRENT_PROJECT_VERSION = 1;',
        '                DEVELOPMENT_TEAM = "";',
        '                GENERATE_INFOPLIST_FILE = YES;',
        `                INFOPLIST_KEY_CFBundleDisplayName = ${quotePbxString(app.appName)};`,
        '                INFOPLIST_KEY_UIApplicationSceneManifest_Generation = YES;',
        '                INFOPLIST_KEY_UIApplicationSupportsIndirectInputEvents = YES;',
        '                INFOPLIST_KEY_UILaunchScreen_Generation = YES;',
        '                INFOPLIST_KEY_UISupportedInterfaceOrientations_iPad = "UIInterfaceOrientationPortrait UIInterfaceOrientationPortraitUpsideDown UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight";',
        '                INFOPLIST_KEY_UISupportedInterfaceOrientations_iPhone = "UIInterfaceOrientationPortrait UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight";',
        '                IPHONEOS_DEPLOYMENT_TARGET = 15.0;',
        '                LD_RUNPATH_SEARCH_PATHS = (',
        '                    "$(inherited)",',
        '                    "@executable_path/Frameworks",',
        '                );',
        '                MARKETING_VERSION = 1.0;',
        `                PRODUCT_BUNDLE_IDENTIFIER = ${app.appId};`,
        '                PRODUCT_NAME = "$(TARGET_NAME)";',
        '                SDKROOT = iphoneos;',
        '                SUPPORTED_PLATFORMS = "iphoneos iphonesimulator";',
        '                SWIFT_EMIT_LOC_STRINGS = YES;',
        '                SWIFT_OPTIMIZATION_LEVEL = "-Onone";',
        '                SWIFT_VERSION = 5.0;',
        '                TARGETED_DEVICE_FAMILY = "1,2";',
        '            };',
        '            name = Debug;',
        '        };',
        '        A0000000000000000000001D /* Release */ = {',
        '            isa = XCBuildConfiguration;',
        '            buildSettings = {',
        '                ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = AccentColor;',
        '                CODE_SIGN_STYLE = Automatic;',
        '                CURRENT_PROJECT_VERSION = 1;',
        '                DEVELOPMENT_TEAM = "";',
        '                GENERATE_INFOPLIST_FILE = YES;',
        `                INFOPLIST_KEY_CFBundleDisplayName = ${quotePbxString(app.appName)};`,
        '                INFOPLIST_KEY_UIApplicationSceneManifest_Generation = YES;',
        '                INFOPLIST_KEY_UIApplicationSupportsIndirectInputEvents = YES;',
        '                INFOPLIST_KEY_UILaunchScreen_Generation = YES;',
        '                INFOPLIST_KEY_UISupportedInterfaceOrientations_iPad = "UIInterfaceOrientationPortrait UIInterfaceOrientationPortraitUpsideDown UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight";',
        '                INFOPLIST_KEY_UISupportedInterfaceOrientations_iPhone = "UIInterfaceOrientationPortrait UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight";',
        '                IPHONEOS_DEPLOYMENT_TARGET = 15.0;',
        '                LD_RUNPATH_SEARCH_PATHS = (',
        '                    "$(inherited)",',
        '                    "@executable_path/Frameworks",',
        '                );',
        '                MARKETING_VERSION = 1.0;',
        `                PRODUCT_BUNDLE_IDENTIFIER = ${app.appId};`,
        '                PRODUCT_NAME = "$(TARGET_NAME)";',
        '                SDKROOT = iphoneos;',
        '                SUPPORTED_PLATFORMS = "iphoneos iphonesimulator";',
        '                SWIFT_EMIT_LOC_STRINGS = YES;',
        '                SWIFT_VERSION = 5.0;',
        '                TARGETED_DEVICE_FAMILY = "1,2";',
        '            };',
        '            name = Release;',
        '        };',
        '/* End XCBuildConfiguration section */',
        '',
        '/* Begin XCConfigurationList section */',
        '        A00000000000000000000018 /* Build configuration list for PBXProject "ElitMobileApp" */ = {',
        '            isa = XCConfigurationList;',
        '            buildConfigurations = (',
        '                A0000000000000000000001A /* Debug */,',
        '                A0000000000000000000001B /* Release */,',
        '            );',
        '            defaultConfigurationIsVisible = 0;',
        '            defaultConfigurationName = Release;',
        '        };',
        '        A00000000000000000000019 /* Build configuration list for PBXNativeTarget "ElitMobileApp" */ = {',
        '            isa = XCConfigurationList;',
        '            buildConfigurations = (',
        '                A0000000000000000000001C /* Debug */,',
        '                A0000000000000000000001D /* Release */,',
        '            );',
        '            defaultConfigurationIsVisible = 0;',
        '            defaultConfigurationName = Release;',
        '        };',
        '/* End XCConfigurationList section */',
        '    };',
        '    rootObject = A00000000000000000000017 /* Project object */;',
        '}',
        '',
    ].join('\n');
}

export function writeIosRuntimeSupportFiles(
    runtimeConfigPath: string,
    generatedScreenPath: string,
    nativeEnabled: boolean,
    generatedScreenContent?: string,
): void {
    mkdirSync(dirname(runtimeConfigPath), { recursive: true });
    mkdirSync(dirname(generatedScreenPath), { recursive: true });
    writeFileSync(runtimeConfigPath, renderIosRuntimeConfigSource(nativeEnabled), 'utf8');
    writeFileSync(generatedScreenPath, generatedScreenContent ?? renderIosGeneratedPlaceholderSource(), 'utf8');
}

export function createIosScaffold(directory: string, app: { appId: string; appName: string }): void {
    const iosRoot = getIosRootPath(directory);
    const iosAppRoot = getIosAppPath(directory);
    const iosProjectRoot = getIosProjectPath(directory);

    const files: Array<{ path: string; content: string; replacePlaceholder?: boolean }> = [
        {
            path: join(iosAppRoot, 'README.md'),
            content: renderIosReadmeSource(),
            replacePlaceholder: true,
        },
        {
            path: join(iosAppRoot, 'ElitMobileApp.swift'),
            content: renderIosAppSource(),
        },
        {
            path: join(iosAppRoot, 'ElitAppRoot.swift'),
            content: renderIosAppRootSource(),
        },
        {
            path: join(iosAppRoot, 'ElitWebView.swift'),
            content: renderIosWebViewSource(),
        },
        {
            path: join(iosAppRoot, `${IOS_RUNTIME_CONFIG_NAME}.swift`),
            content: renderIosRuntimeConfigSource(false),
        },
        {
            path: join(iosAppRoot, `${IOS_GENERATED_SCREEN_NAME}.swift`),
            content: renderIosGeneratedPlaceholderSource(),
        },
        {
            path: join(iosAppRoot, 'Assets.xcassets', 'Contents.json'),
            content: renderIosAssetCatalogContentsSource(),
        },
        {
            path: join(iosAppRoot, 'Assets.xcassets', 'AccentColor.colorset', 'Contents.json'),
            content: renderIosAccentColorContentsSource(),
        },
        {
            path: join(iosProjectRoot, 'project.pbxproj'),
            content: renderIosProjectFileSource(app),
        },
        {
            path: join(iosProjectRoot, 'project.xcworkspace', 'contents.xcworkspacedata'),
            content: renderIosWorkspaceDataSource(),
        },
    ];

    for (const file of files) {
        if (!existsSync(dirname(file.path))) {
            mkdirSync(dirname(file.path), { recursive: true });
        }

        const shouldReplace = file.replacePlaceholder && existsSync(file.path)
            && readFileSync(file.path, 'utf8').includes('placeholder');

        if (!existsSync(file.path) || shouldReplace) {
            writeFileSync(file.path, file.content, 'utf8');
            console.log(`[mobile] Created ${file.path}`);
        }
    }

    const iosPublic = join(iosAppRoot, 'www');
    if (!existsSync(iosPublic)) {
        mkdirSync(iosPublic, { recursive: true });
        writeFileSync(join(iosPublic, '.gitkeep'), '');
    }

    if (!existsSync(iosRoot)) {
        mkdirSync(iosRoot, { recursive: true });
    }
}