import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import {
    ANDROID_GENERATED_SCREEN_NAME,
    ANDROID_RUNTIME_CONFIG_NAME,
    MANAGED_ANDROID_MAIN_ACTIVITY_MARKER,
    MANAGED_ANDROID_MAIN_ACTIVITY_URLS,
    type AndroidConnectedDevice,
} from './shared';
import { commandExists, prependCommandPath, resolveCommandPath, runCommand, runCommandCapture, runWindowsBatchCommand } from './command';
import { escapeSingleQuote, toPackagePath } from './support';

function parseAndroidSdkFromLocalProperties(androidRoot: string): string | undefined {
    const localPropertiesPath = join(androidRoot, 'local.properties');
    if (!existsSync(localPropertiesPath)) return undefined;

    try {
        const content = readFileSync(localPropertiesPath, 'utf8');
        const sdkLine = content
            .split(/\r?\n/)
            .map((line) => line.trim())
            .find((line) => line.startsWith('sdk.dir='));

        if (!sdkLine) return undefined;

        const value = sdkLine.slice('sdk.dir='.length).trim();
        if (!value) return undefined;

        const sdkPath = value.replace(/\\:/g, ':').replace(/\\\\/g, '\\');
        return existsSync(sdkPath) ? sdkPath : undefined;
    } catch {
        return undefined;
    }
}

export function detectAndroidSdkPath(cwd: string): string | undefined {
    const envPath = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME;
    if (envPath && existsSync(envPath)) return envPath;

    const androidRoot = join(cwd, 'android');
    const localPropertiesPath = parseAndroidSdkFromLocalProperties(androidRoot);
    if (localPropertiesPath) return localPropertiesPath;

    const adbPath = resolveCommandPath('adb', cwd);
    if (adbPath) {
        const platformToolsDir = dirname(adbPath);
        const sdkPath = dirname(platformToolsDir);
        if (existsSync(join(sdkPath, 'platform-tools'))) {
            return sdkPath;
        }
    }

    const home = process.env.HOME || process.env.USERPROFILE;
    const candidates = [
        process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Android', 'Sdk') : undefined,
        process.env.USERPROFILE ? join(process.env.USERPROFILE, 'AppData', 'Local', 'Android', 'Sdk') : undefined,
        home ? join(home, 'Library', 'Android', 'sdk') : undefined,
        home ? join(home, 'Android', 'Sdk') : undefined,
    ].filter((value): value is string => Boolean(value));

    return candidates.find((candidate) => existsSync(candidate));
}

export function runGradle(cwd: string, args: string[]): void {
    const androidRoot = join(cwd, 'android');
    if (!existsSync(androidRoot)) {
        throw new Error(`Android project not found at ${androidRoot}. Run "elit mobile init" first.`);
    }

    ensureAndroidLocalProperties(cwd);
    ensureAndroidGradleProperties(cwd);

    const gradleCommand = resolveGradleCommand(cwd);
    if (!gradleCommand) {
        throw new Error(
            '[mobile] Gradle not found. Install Gradle and add it to PATH, or generate wrapper files in android/ with "gradle wrapper".',
        );
    }

    const env = gradleCommand.prependPath ? prependCommandPath(gradleCommand.prependPath) : undefined;

    if (process.platform === 'win32' && gradleCommand.useWindowsBatchShell) {
        const shellCommand = gradleCommand.batchCommandPath
            ?? resolveCommandPath(gradleCommand.command, androidRoot, env)
            ?? gradleCommand.command;
        runWindowsBatchCommand(shellCommand, args, androidRoot);
        return;
    }

    runCommand(gradleCommand.command, args, androidRoot, env);
}

export function resolveGradleCommand(cwd: string): {
    command: string;
    details: string;
    batchCommandPath?: string;
    prependPath?: string;
    useWindowsBatchShell?: boolean;
} | undefined {
    const androidRoot = join(cwd, 'android');
    const wrapper = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
    const wrapperPath = join(androidRoot, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');

    if (existsSync(wrapperPath)) {
        return {
            command: wrapper,
            batchCommandPath: wrapperPath,
            details: 'Using project gradle wrapper.',
            useWindowsBatchShell: process.platform === 'win32',
        };
    }

    if (commandExists('gradle', androidRoot)) {
        return {
            command: 'gradle',
            batchCommandPath: process.platform === 'win32'
                ? resolveCommandPath('gradle', androidRoot) ?? 'gradle'
                : undefined,
            details: 'Using Gradle from PATH.',
            useWindowsBatchShell: process.platform === 'win32',
        };
    }

    const fallbackGradle = resolveFallbackGradleExecutable();
    if (!fallbackGradle) {
        return undefined;
    }

    const prependPath = process.platform === 'win32' ? dirname(fallbackGradle) : undefined;
    const fallbackEnv = prependPath ? prependCommandPath(prependPath) : undefined;

    return {
        command: process.platform === 'win32' ? 'gradle' : fallbackGradle,
        batchCommandPath: process.platform === 'win32'
            ? resolveCommandPath('gradle', androidRoot, fallbackEnv) ?? undefined
            : undefined,
        details: `Using fallback Gradle at ${fallbackGradle}.`,
        prependPath,
        useWindowsBatchShell: process.platform === 'win32',
    };
}

function resolveFallbackGradleExecutable(): string | undefined {
    const executable = process.platform === 'win32' ? 'gradle.bat' : 'gradle';

    const gradleHome = process.env.GRADLE_HOME;
    if (gradleHome) {
        const gradleFromHome = join(gradleHome, 'bin', executable);
        if (existsSync(gradleFromHome)) return gradleFromHome;
    }

    const candidates: string[] = [
        process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Programs', 'Android Studio', 'gradle') : '',
        process.env.ProgramFiles ? join(process.env.ProgramFiles, 'Android', 'Android Studio', 'gradle') : '',
        process.env['ProgramFiles(x86)'] ? join(process.env['ProgramFiles(x86)'], 'Android', 'Android Studio', 'gradle') : '',
        process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'elit-tools') : '',
        process.env.USERPROFILE ? join(process.env.USERPROFILE, 'scoop', 'apps', 'gradle', 'current', 'bin') : '',
        process.platform === 'win32' ? 'C:\\Gradle\\bin' : '',
    ].filter(Boolean);

    for (const candidate of candidates) {
        const direct = join(candidate, executable);
        if (existsSync(direct)) return direct;

        if (!existsSync(candidate)) continue;

        try {
            const versionDirs = readdirSync(candidate)
                .map((name) => join(candidate, name, 'bin', executable))
                .filter((path) => existsSync(path))
                .sort()
                .reverse();

            if (versionDirs.length > 0) {
                return versionDirs[0];
            }
        } catch {
            // Ignore unreadable directories while probing for Gradle.
        }
    }

    return undefined;
}

function ensureAndroidLocalProperties(cwd: string): void {
    const androidRoot = join(cwd, 'android');
    const sdkPath = detectAndroidSdkPath(cwd);
    if (!sdkPath) return;

    const localPropertiesPath = join(androidRoot, 'local.properties');
    const escapedSdkPath = sdkPath.replace(/\\/g, '\\\\').replace(/:/g, '\\:');

    if (!existsSync(localPropertiesPath)) {
        writeFileSync(localPropertiesPath, `sdk.dir=${escapedSdkPath}\n`, 'utf8');
        return;
    }

    const content = readFileSync(localPropertiesPath, 'utf8');
    const hasSdkLine = /^sdk\.dir=/m.test(content);
    if (hasSdkLine) {
        const updated = content.replace(/^sdk\.dir=.*$/m, `sdk.dir=${escapedSdkPath}`);
        if (updated !== content) {
            writeFileSync(localPropertiesPath, updated, 'utf8');
        }
        return;
    }

    const separator = content.endsWith('\n') || content.length === 0 ? '' : '\n';
    writeFileSync(localPropertiesPath, `${content}${separator}sdk.dir=${escapedSdkPath}\n`, 'utf8');
}

function ensureAndroidGradleProperties(cwd: string): void {
    const gradlePropertiesPath = join(cwd, 'android', 'gradle.properties');
    const requiredEntries = [
        ['android.useAndroidX', 'true'],
        ['android.enableJetifier', 'true'],
    ] as const;

    if (!existsSync(gradlePropertiesPath)) {
        const defaults = [
            'org.gradle.jvmargs=-Xmx2g -Dkotlin.daemon.jvm.options=-Xmx1g',
            ...requiredEntries.map(([key, value]) => `${key}=${value}`),
        ].join('\n');
        writeFileSync(gradlePropertiesPath, `${defaults}\n`, 'utf8');
        return;
    }

    let content = readFileSync(gradlePropertiesPath, 'utf8');
    let changed = false;

    for (const [key, value] of requiredEntries) {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(content)) {
            const updated = content.replace(regex, `${key}=${value}`);
            if (updated !== content) {
                content = updated;
                changed = true;
            }
            continue;
        }

        const separator = content.endsWith('\n') || content.length === 0 ? '' : '\n';
        content = `${content}${separator}${key}=${value}\n`;
        changed = true;
    }

    if (changed) {
        writeFileSync(gradlePropertiesPath, content, 'utf8');
    }
}

export function applyAndroidIcon(projectRoot: string, iconOption: string): void {
    const iconPath = resolve(projectRoot, iconOption);
    if (!existsSync(iconPath)) {
        throw new Error(`[mobile] Icon file not found: ${iconPath}`);
    }

    const extension = iconPath.split('.').pop()?.toLowerCase();
    if (extension !== 'png' && extension !== 'webp') {
        throw new Error('[mobile] Icon format must be .png or .webp for Android resources.');
    }

    const resRoot = join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'mipmap');
    if (!existsSync(resRoot)) {
        mkdirSync(resRoot, { recursive: true });
    }

    const launcherIcon = join(resRoot, `ic_launcher.${extension}`);
    const roundIcon = join(resRoot, `ic_launcher_round.${extension}`);
    copyFileSync(iconPath, launcherIcon);
    copyFileSync(iconPath, roundIcon);

    const manifestPath = join(projectRoot, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
    if (!existsSync(manifestPath)) {
        return;
    }

    const content = readFileSync(manifestPath, 'utf8');
    const updated = content.replace(/<application\b[^>]*>/, (tag) => {
        let next = upsertXmlAttribute(tag, 'android:icon', '@mipmap/ic_launcher');
        next = upsertXmlAttribute(next, 'android:roundIcon', '@mipmap/ic_launcher_round');
        return next;
    });

    if (updated !== content) {
        writeFileSync(manifestPath, updated, 'utf8');
    }
}

function normalizeAndroidPermissions(input?: string[]): string[] {
    const defaults = ['android.permission.INTERNET'];
    if (!input || input.length === 0) return defaults;

    const merged = [...input, ...defaults]
        .map((permission) => permission.trim())
        .filter(Boolean);

    return Array.from(new Set(merged));
}

export function applyAndroidPermissions(projectRoot: string, permissionsOption?: string[]): void {
    const manifestPath = join(projectRoot, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
    if (!existsSync(manifestPath)) {
        return;
    }

    const permissions = normalizeAndroidPermissions(permissionsOption);
    const permissionLines = permissions.map((permission) => {
        return `  <uses-permission android:name='${escapeSingleQuote(permission)}' />`;
    });

    const content = readFileSync(manifestPath, 'utf8');
    const withoutPermissionLines = content.replace(/\s*<uses-permission\s+android:name=(?:"[^"]*"|'[^']*')\s*\/\>\s*\r?\n?/g, '\n');
    const updated = withoutPermissionLines.replace(/<manifest\b[^>]*>\s*/, (tag) => `${tag}${permissionLines.join('\n')}\n`);

    if (updated !== content) {
        writeFileSync(manifestPath, updated, 'utf8');
    }
}

function upsertXmlAttribute(tag: string, name: string, value: string): string {
    const regex = new RegExp(`${name}=("[^"]*"|'[^']*')`);
    if (regex.test(tag)) {
        return tag.replace(regex, `${name}='${value}'`);
    }

    if (tag.endsWith('/>')) {
        return `${tag.slice(0, -2)} ${name}='${value}'/>`;
    }

    return `${tag.slice(0, -1)} ${name}='${value}'>`;
}

export function listAndroidConnectedDevices(cwd: string): AndroidConnectedDevice[] {
    const output = runCommandCapture('adb', ['devices'], cwd);
    return output
        .split(/\r?\n/)
        .slice(1)
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !line.startsWith('*'))
        .map((line) => line.split(/\s+/))
        .filter((parts) => parts.length >= 2)
        .map(([id, state]) => ({ id, state }));
}

export function renderAndroidMainActivitySource(appId: string, nativePackageName: string): string {
    const importLines = nativePackageName === appId
        ? ''
        : `import ${nativePackageName}.ELIT_USE_NATIVE_UI\nimport ${nativePackageName}.${ANDROID_GENERATED_SCREEN_NAME}\n`;

    return [
        `package ${appId}`,
        '',
        MANAGED_ANDROID_MAIN_ACTIVITY_MARKER,
        'import android.annotation.SuppressLint',
        'import android.os.Bundle',
        'import android.webkit.WebResourceRequest',
        'import android.webkit.WebResourceResponse',
        'import android.webkit.WebSettings',
        'import android.webkit.WebView',
        'import androidx.activity.ComponentActivity',
        'import androidx.activity.compose.setContent',
        'import androidx.compose.foundation.layout.fillMaxSize',
        'import androidx.compose.runtime.Composable',
        'import androidx.compose.ui.Modifier',
        'import androidx.compose.ui.viewinterop.AndroidView',
        'import androidx.webkit.WebViewAssetLoader',
        'import androidx.webkit.WebViewClientCompat',
        importLines.trimEnd(),
        'class MainActivity : ComponentActivity() {',
        '  override fun onCreate(savedInstanceState: Bundle?) {',
        '    super.onCreate(savedInstanceState)',
        '    setContent {',
        '      ElitAppRoot()',
        '    }',
        '  }',
        '}',
        '',
        '@Composable',
        'private fun ElitAppRoot() {',
        '  if (ELIT_USE_NATIVE_UI) {',
        `    ${ANDROID_GENERATED_SCREEN_NAME}()`,
        '    return',
        '  }',
        '',
        '  ElitWebView(modifier = Modifier.fillMaxSize())',
        '}',
        '',
        '@SuppressLint("SetJavaScriptEnabled")',
        '@Composable',
        'private fun ElitWebView(modifier: Modifier = Modifier) {',
        '  AndroidView(',
        '    modifier = modifier,',
        '    factory = { context ->',
        '      val assetLoader = WebViewAssetLoader.Builder()',
        '        .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(context))',
        '        .build()',
        '',
        '      WebView(context).apply {',
        '        val webSettings: WebSettings = settings',
        '        webSettings.javaScriptEnabled = true',
        '        webSettings.domStorageEnabled = true',
        '        webViewClient = object : WebViewClientCompat() {',
        '          override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {',
        '            return assetLoader.shouldInterceptRequest(request.url)',
        '          }',
        '        }',
        '        loadUrl("https://appassets.androidplatform.net/assets/public/index.html")',
        '      }',
        '    },',
        '  )',
        '}',
        '',
    ].filter(Boolean).join('\n');
}

function parseManagedAndroidActivityUrl(input: string): string | undefined {
    if (input === 'file:///android_asset/public/index.html') {
        return input;
    }

    try {
        const parsed = new URL(input);
        if (
            parsed.protocol === 'https:'
            && parsed.hostname === 'appassets.androidplatform.net'
            && parsed.pathname === '/assets/public/index.html'
            && !parsed.username
            && !parsed.password
            && !parsed.port
            && !parsed.search
            && !parsed.hash
        ) {
            return parsed.toString();
        }
    } catch {
        return undefined;
    }

    return undefined;
}

function extractAndroidLoadUrlStrings(source: string): string[] {
    const urls: string[] = [];
    const matches = source.matchAll(/\bloadUrl\(\s*(["'])(.*?)\1\s*\)/g);

    for (const match of matches) {
        const value = match[2];
        if (value) {
            urls.push(value);
        }
    }

    return urls;
}

export function isManagedAndroidMainActivitySource(source: string): boolean {
    if (source.includes(MANAGED_ANDROID_MAIN_ACTIVITY_MARKER)) {
        return true;
    }

    for (const value of extractAndroidLoadUrlStrings(source)) {
        const managedUrl = parseManagedAndroidActivityUrl(value);
        if (managedUrl && MANAGED_ANDROID_MAIN_ACTIVITY_URLS.has(managedUrl)) {
            return true;
        }
    }

    return false;
}

export function renderAndroidRuntimeConfigSource(packageName: string, nativeEnabled: boolean): string {
    const runtimeMode = nativeEnabled ? 'native' : 'hybrid';
    return [
        `package ${packageName}`,
        '',
        '// ELIT-MOBILE-RUNTIME-CONFIG',
        `const val ELIT_MOBILE_MODE = "${runtimeMode}"`,
        `const val ELIT_USE_NATIVE_UI = ${nativeEnabled ? 'true' : 'false'}`,
        '',
    ].join('\n');
}

export function renderAndroidGeneratedPlaceholderSource(packageName: string): string {
    return [
        `package ${packageName}`,
        '',
        '// ELIT-MOBILE-GENERATED-SCREEN',
        'import androidx.compose.material3.Text',
        'import androidx.compose.runtime.Composable',
        '',
        '@Composable',
        `fun ${ANDROID_GENERATED_SCREEN_NAME}() {`,
        '  Text("Elit native screen is not generated yet.")',
        '}',
        '',
    ].join('\n');
}

export function ensureAndroidComposeBuildSupport(projectRoot: string): void {
    const buildGradlePath = join(projectRoot, 'android', 'app', 'build.gradle');
    if (!existsSync(buildGradlePath)) {
        return;
    }

    let content = readFileSync(buildGradlePath, 'utf8');
    let changed = false;

    if (!/compose\s+true/.test(content)) {
        const next = content.replace(
            /\n}\n\ndependencies\s*\{/,
            "\n\n  buildFeatures {\n    compose true\n  }\n\n  composeOptions {\n    kotlinCompilerExtensionVersion '1.5.14'\n  }\n}\n\ndependencies {",
        );
        if (next !== content) {
            content = next;
            changed = true;
        }
    }

    const dependencyLines = [
        "implementation 'androidx.activity:activity-compose:1.9.2'",
        "implementation 'androidx.compose.foundation:foundation-layout:1.7.2'",
        "implementation 'androidx.compose.ui:ui:1.7.2'",
        "implementation 'androidx.compose.ui:ui-tooling-preview:1.7.2'",
        "implementation 'androidx.compose.material3:material3:1.3.0'",
        "implementation 'androidx.webkit:webkit:1.11.0'",
        "debugImplementation 'androidx.compose.ui:ui-tooling:1.7.2'",
    ];

    for (const dependencyLine of dependencyLines) {
        if (content.includes(dependencyLine)) {
            continue;
        }

        const next = content.replace(/dependencies\s*\{\n/, (match) => `${match}  ${dependencyLine}\n`);
        if (next !== content) {
            content = next;
            changed = true;
        }
    }

    if (changed) {
        writeFileSync(buildGradlePath, content, 'utf8');
    }
}

export function ensureManagedAndroidMainActivity(projectRoot: string, appId: string, nativePackageName: string): boolean {
    const mainActivityPath = join(projectRoot, 'android', 'app', 'src', 'main', 'java', toPackagePath(appId), 'MainActivity.kt');
    const nextContent = renderAndroidMainActivitySource(appId, nativePackageName);

    if (!existsSync(mainActivityPath)) {
        mkdirSync(dirname(mainActivityPath), { recursive: true });
        writeFileSync(mainActivityPath, nextContent, 'utf8');
        return true;
    }

    const current = readFileSync(mainActivityPath, 'utf8');
    if (current === nextContent) {
        return true;
    }

    if (isManagedAndroidMainActivitySource(current)) {
        writeFileSync(mainActivityPath, nextContent, 'utf8');
        return true;
    }

    return false;
}

export function writeAndroidRuntimeSupportFiles(
    runtimeConfigPath: string,
    generatedScreenPath: string,
    packageName: string,
    nativeEnabled: boolean,
    generatedScreenContent?: string,
): void {
    mkdirSync(dirname(runtimeConfigPath), { recursive: true });
    mkdirSync(dirname(generatedScreenPath), { recursive: true });
    writeFileSync(runtimeConfigPath, renderAndroidRuntimeConfigSource(packageName, nativeEnabled), 'utf8');
    writeFileSync(generatedScreenPath, generatedScreenContent ?? renderAndroidGeneratedPlaceholderSource(packageName), 'utf8');
}

export function createAndroidScaffold(directory: string, app: { appId: string; appName: string }): void {
    const packagePath = app.appId.replace(/\./g, '/');
    const kotlinDir = join(directory, 'android', 'app', 'src', 'main', 'java', packagePath);
    mkdirSync(kotlinDir, { recursive: true });

    const files: Array<{ path: string; content: string }> = [
        {
            path: join(directory, 'android', 'settings.gradle'),
            content: "rootProject.name = 'elit-mobile'\ninclude ':app'\n",
        },
        {
            path: join(directory, 'android', 'build.gradle'),
            content:
                "buildscript {\n" +
                "  repositories { google(); mavenCentral() }\n" +
                "  dependencies {\n" +
                "    classpath 'com.android.tools.build:gradle:8.4.2'\n" +
                "    classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.24'\n" +
                "  }\n" +
                "}\n" +
                "allprojects { repositories { google(); mavenCentral() } }\n",
        },
        {
            path: join(directory, 'android', 'gradle.properties'),
            content: 'org.gradle.jvmargs=-Xmx2g -Dkotlin.daemon.jvm.options=-Xmx1g\n',
        },
        {
            path: join(directory, 'android', 'app', 'build.gradle'),
            content:
                "plugins {\n" +
                "  id 'com.android.application'\n" +
                "  id 'org.jetbrains.kotlin.android'\n" +
                "}\n\n" +
                "android {\n" +
                `  namespace '${escapeSingleQuote(app.appId)}'\n` +
                "  compileSdk 34\n\n" +
                "  defaultConfig {\n" +
                `    applicationId '${escapeSingleQuote(app.appId)}'\n` +
                "    minSdk 24\n" +
                "    targetSdk 34\n" +
                "    versionCode 1\n" +
                "    versionName '1.0.0'\n" +
                "  }\n\n" +
                "  buildTypes {\n" +
                "    release {\n" +
                "      minifyEnabled false\n" +
                "      proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'\n" +
                "    }\n" +
                "  }\n\n" +
                "  compileOptions {\n" +
                "    sourceCompatibility JavaVersion.VERSION_17\n" +
                "    targetCompatibility JavaVersion.VERSION_17\n" +
                "  }\n" +
                "  kotlinOptions { jvmTarget = '17' }\n\n" +
                "  buildFeatures {\n" +
                "    compose true\n" +
                "  }\n\n" +
                "  composeOptions {\n" +
                "    kotlinCompilerExtensionVersion '1.5.14'\n" +
                "  }\n" +
                "}\n\n" +
                "dependencies {\n" +
                "  implementation 'androidx.activity:activity-compose:1.9.2'\n" +
                "  implementation 'androidx.compose.foundation:foundation-layout:1.7.2'\n" +
                "  implementation 'androidx.compose.ui:ui:1.7.2'\n" +
                "  implementation 'androidx.compose.ui:ui-tooling-preview:1.7.2'\n" +
                "  implementation 'androidx.compose.material3:material3:1.3.0'\n" +
                "  implementation 'androidx.webkit:webkit:1.11.0'\n" +
                "  implementation 'androidx.core:core-ktx:1.13.1'\n" +
                "  implementation 'androidx.appcompat:appcompat:1.7.0'\n" +
                "  debugImplementation 'androidx.compose.ui:ui-tooling:1.7.2'\n" +
                "}\n",
        },
        {
            path: join(directory, 'android', 'app', 'proguard-rules.pro'),
            content: '\n',
        },
        {
            path: join(directory, 'android', 'app', 'src', 'main', 'AndroidManifest.xml'),
            content:
                "<manifest xmlns:android='http://schemas.android.com/apk/res/android'>\n" +
                "  <uses-permission android:name='android.permission.INTERNET' />\n" +
                `  <application android:label='${escapeSingleQuote(app.appName)}' android:theme='@style/Theme.AppCompat.Light.NoActionBar'>\n` +
                "    <activity android:name='.MainActivity' android:exported='true'>\n" +
                "      <intent-filter>\n" +
                "        <action android:name='android.intent.action.MAIN' />\n" +
                "        <category android:name='android.intent.category.LAUNCHER' />\n" +
                "      </intent-filter>\n" +
                "    </activity>\n" +
                "  </application>\n" +
                "</manifest>\n",
        },
        {
            path: join(directory, 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml'),
            content:
                "<?xml version='1.0' encoding='utf-8'?>\n" +
                "<resources>\n" +
                `  <string name='app_name'>${escapeSingleQuote(app.appName)}</string>\n` +
                "</resources>\n",
        },
        {
            path: join(kotlinDir, 'MainActivity.kt'),
            content: renderAndroidMainActivitySource(app.appId, app.appId),
        },
        {
            path: join(kotlinDir, `${ANDROID_RUNTIME_CONFIG_NAME}.kt`),
            content: renderAndroidRuntimeConfigSource(app.appId, false),
        },
        {
            path: join(kotlinDir, `${ANDROID_GENERATED_SCREEN_NAME}.kt`),
            content: renderAndroidGeneratedPlaceholderSource(app.appId),
        },
    ];

    for (const file of files) {
        if (!existsSync(dirname(file.path))) {
            mkdirSync(dirname(file.path), { recursive: true });
        }
        if (!existsSync(file.path)) {
            writeFileSync(file.path, file.content);
            console.log(`[mobile] Created ${file.path}`);
        }
    }

    const androidAssets = join(directory, 'android', 'app', 'src', 'main', 'assets', 'public');
    if (!existsSync(androidAssets)) {
        mkdirSync(androidAssets, { recursive: true });
        writeFileSync(join(androidAssets, '.gitkeep'), '');
    }
}