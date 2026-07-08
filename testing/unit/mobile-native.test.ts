/// <reference path="../../packages/test/src/globals.d.ts" />

import {
    buildIosXcodebuildArgs,
    getIosBuiltAppPath,
    isManagedAndroidMainActivitySource,
    pickPreferredIosSimulatorDevice,
    resolveRequestedTarget,
    renderAndroidGeneratedPlaceholderSource,
    renderAndroidMainActivitySource,
    renderAndroidRuntimeConfigSource,
    renderIosAppRootSource,
    renderIosAppSource,
    renderIosGeneratedPlaceholderSource,
    renderIosProjectFileSource,
    renderIosRuntimeConfigSource,
    renderIosWebViewSource,
} from '../../packages/cli/src/mobile';

describe('mobile native templates', () => {
    it('renders a managed Android activity with imports for external native packages', () => {
        const source = renderAndroidMainActivitySource('com.example.app', 'com.example.generated');

        expect(source).toContain('package com.example.app');
        expect(source).toContain('import com.example.generated.ELIT_USE_NATIVE_UI');
        expect(source).toContain('import com.example.generated.ElitGeneratedScreen');
        expect(source).toContain('import androidx.webkit.WebViewAssetLoader');
        expect(source).toContain('AndroidView(');
        expect(source).toContain('appassets.androidplatform.net/assets/public/index.html');
        expect(source).toContain('assetLoader.shouldInterceptRequest(request.url)');
    });

    it('recognizes managed Android activity sources by exact scaffold URLs only', () => {
        const managedHttps = [
            'class MainActivity {',
            '  fun open() {',
            '    loadUrl("https://appassets.androidplatform.net/assets/public/index.html")',
            '  }',
            '}',
        ].join('\n');
        const managedFile = [
            'class MainActivity {',
            '  fun open() {',
            '    loadUrl("file:///android_asset/public/index.html")',
            '  }',
            '}',
        ].join('\n');
        const maliciousLookalikes = [
            'loadUrl("https://appassets.androidplatform.net.evil.example/assets/public/index.html")',
            'loadUrl("https://evil.example/redirect?next=https://appassets.androidplatform.net/assets/public/index.html")',
            'loadUrl("https://appassets.androidplatform.net/assets/public/index.html?next=https://evil.example")',
            'loadUrl("https://user@appassets.androidplatform.net/assets/public/index.html")',
        ];

        expect(isManagedAndroidMainActivitySource(managedHttps)).toBe(true);
        expect(isManagedAndroidMainActivitySource(managedFile)).toBe(true);

        for (const source of maliciousLookalikes) {
            expect(isManagedAndroidMainActivitySource(source)).toBe(false);
        }
    });

    it('renders Android runtime config and placeholder screen sources', () => {
        const runtimeConfig = renderAndroidRuntimeConfigSource('com.example.generated', true);
        const hybridRuntimeConfig = renderAndroidRuntimeConfigSource('com.example.generated', false);
        const placeholder = renderAndroidGeneratedPlaceholderSource('com.example.generated');

        expect(runtimeConfig).toContain('const val ELIT_MOBILE_MODE = "native"');
        expect(runtimeConfig).toContain('const val ELIT_USE_NATIVE_UI = true');
        expect(hybridRuntimeConfig).toContain('const val ELIT_MOBILE_MODE = "hybrid"');
        expect(hybridRuntimeConfig).toContain('const val ELIT_USE_NATIVE_UI = false');
        expect(placeholder).toContain('fun ElitGeneratedScreen()');
        expect(placeholder).toContain('Elit native screen is not generated yet.');
    });

    it('renders an iOS SwiftUI scaffold with native and web fallback hooks', () => {
        const appSource = renderIosAppSource();
        const rootSource = renderIosAppRootSource();
        const webViewSource = renderIosWebViewSource();
        const runtimeConfig = renderIosRuntimeConfigSource(true);
        const hybridRuntimeConfig = renderIosRuntimeConfigSource(false);
        const placeholder = renderIosGeneratedPlaceholderSource();

        expect(appSource).toContain('@main');
        expect(appSource).toContain('struct ElitMobileApp: App');
        expect(rootSource).toContain('if ELIT_USE_NATIVE_UI');
        expect(rootSource).toContain('ElitGeneratedScreen()');
        expect(rootSource).toContain('Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "www")');
        expect(webViewSource).toContain('struct ElitWebView: UIViewRepresentable');
        expect(webViewSource).toContain('WKWebView');
        expect(runtimeConfig).toContain('let ELIT_MOBILE_MODE = "native"');
        expect(runtimeConfig).toContain('let ELIT_USE_NATIVE_UI = true');
        expect(hybridRuntimeConfig).toContain('let ELIT_MOBILE_MODE = "hybrid"');
        expect(hybridRuntimeConfig).toContain('let ELIT_USE_NATIVE_UI = false');
        expect(placeholder).toContain('struct ElitGeneratedScreen: View');
    });

    it('renders an iOS Xcode project file with the configured bundle id', () => {
        const project = renderIosProjectFileSource({
            appId: 'com.example.app',
            appName: 'Example App',
        });

        expect(project).toContain('productType = "com.apple.product-type.application";');
        expect(project).toContain('path = App;');
        expect(project).toContain('PRODUCT_BUNDLE_IDENTIFIER = com.example.app;');
        expect(project).toContain('INFOPLIST_KEY_CFBundleDisplayName = "Example App";');
    });

    it('builds deterministic iOS xcodebuild args and output app paths', () => {
        const args = buildIosXcodebuildArgs({
            configuration: 'Debug',
            cwd: '/repo/example',
            destination: 'id=SIM-123',
            projectPath: '/repo/example/ios/ElitMobileApp.xcodeproj',
            sdk: 'iphonesimulator',
        });
        const appPath = getIosBuiltAppPath('/repo/example', 'Debug', 'iphonesimulator');
        const normalizedArgs = args.map((value) => value.replace(/\\/g, '/'));
        const normalizedAppPath = appPath.replace(/\\/g, '/');

        expect(normalizedArgs).toEqual([
            '-project',
            '/repo/example/ios/ElitMobileApp.xcodeproj',
            '-target',
            'ElitMobileApp',
            '-configuration',
            'Debug',
            '-sdk',
            'iphonesimulator',
            '-derivedDataPath',
            '/repo/example/ios/.elit-xcode-build',
            '-destination',
            'id=SIM-123',
            'build',
        ]);
        expect(normalizedAppPath).toBe('/repo/example/ios/.elit-xcode-build/Build/Products/Debug-iphonesimulator/ElitMobileApp.app');
    });

    it('prefers a booted or newer iPhone simulator when auto-selecting iOS targets', () => {
        const preferred = pickPreferredIosSimulatorDevice([
            { name: 'iPad Air (6th generation)', state: 'Shutdown', udid: 'ipad-1', isAvailable: true },
            { name: 'iPhone 15', state: 'Shutdown', udid: 'iphone-15', isAvailable: true },
            { name: 'iPhone 16 Pro', state: 'Shutdown', udid: 'iphone-16-pro', isAvailable: true },
            { name: 'iPhone 14 Pro', state: 'Booted', udid: 'iphone-14-pro', isAvailable: true },
        ]);

        expect(preferred).toEqual({
            name: 'iPhone 14 Pro',
            state: 'Booted',
            udid: 'iphone-14-pro',
            isAvailable: true,
        });
    });

    it('falls back to the newest available iPhone when nothing is booted', () => {
        const preferred = pickPreferredIosSimulatorDevice([
            { name: 'iPad Pro (13-inch) (M4)', state: 'Shutdown', udid: 'ipad-pro', isAvailable: true },
            { name: 'iPhone SE (3rd generation)', state: 'Shutdown', udid: 'iphone-se', isAvailable: true },
            { name: 'iPhone 16 Pro', state: 'Shutdown', udid: 'iphone-16-pro', isAvailable: true },
        ]);

        expect(preferred?.udid).toBe('iphone-16-pro');
    });

    it('prefers an explicit CLI target over configured defaults', () => {
        expect(resolveRequestedTarget('cli-target', 'configured-target')).toBe('cli-target');
        expect(resolveRequestedTarget(undefined, 'configured-target')).toBe('configured-target');
        expect(resolveRequestedTarget(undefined, undefined)).toBeUndefined();
    });
});