import type { DevServerOptions, BuildOptions, PreviewOptions, TestOptions } from '../types';
import type { ResolveConfig } from '../../build/contracts';

export interface ElitConfig {
    /** Development server configuration */
    dev?: DevServerOptions;
    /** Build configuration - supports single build or multiple builds */
    build?: BuildOptions | BuildOptions[];
    /** Preview server configuration */
    preview?: PreviewOptions;
    /** Test configuration */
    test?: TestOptions;
    /** Desktop command configuration */
    desktop?: DesktopConfig;
    /** Mobile command configuration */
    mobile?: MobileConfig;
    /** Process manager configuration */
    pm?: PmConfig;
    /** WAPK packaging configuration */
    wapk?: WapkConfig;
    /**
     * Shared import-specifier alias map used as a default by `build`, `dev`,
     * and `preview` when they do not declare their own `resolve.alias`.
     * Example: `{ alias: { '@': './src' } }`.
     */
    resolve?: ResolveConfig;
}

export type MobileMode = 'native' | 'hybrid';
export type DesktopMode = 'native' | 'hybrid';
export type PmRuntimeName = 'node' | 'bun' | 'deno';
export type PmRestartPolicy = 'always' | 'on-failure' | 'never';
export type PmMemoryAction = 'restart' | 'stop';
export type PmProxyStrategy = 'proxy' | 'inherit';

export interface PmProxyConfig {
    /** Public port owned by the PM proxy process */
    port: number;
    /** Public socket handoff mode: proxy forwards traffic, inherit shares the listener directly on Node */
    strategy?: PmProxyStrategy;
    /** Public host bound by the PM proxy process */
    host?: string;
    /** Internal host used for upstream child traffic */
    targetHost?: string;
    /** Environment variable populated with the child private port */
    envVar?: string;
}

export interface PmHealthCheckConfig {
    /** HTTP endpoint polled while the process is online */
    url?: string;
    /** Delay before the first health check in milliseconds */
    gracePeriod?: number;
    /** Interval between health checks in milliseconds */
    interval?: number;
    /** Per-request timeout in milliseconds */
    timeout?: number;
    /** Consecutive failed checks before the process is restarted */
    maxFailures?: number;
}

export interface PmAppConfig {
    /** Unique process name used by elit pm list/stop/restart */
    name: string;
    /** Shell command to execute, for example: npm start */
    script?: string;
    /** JavaScript or TypeScript entry file executed by the selected runtime */
    file?: string;
    /** Packaged .wapk file or remote archive source executed through elit wapk run */
    wapk?: string;
    /** Runtime used for file or wapk targets */
    runtime?: PmRuntimeName;
    /** Working directory for the managed process */
    cwd?: string;
    /** Extra environment variables injected into the process */
    env?: Record<string, string | number | boolean>;
    /** Number of managed instances to start for this app */
    instances?: number;
    /** Disable automatic restart when the process exits */
    autorestart?: boolean;
    /** Delay between restart attempts in milliseconds */
    restartDelay?: number;
    /** Enable a PM-managed public HTTP proxy for single-instance zero-downtime reloads */
    proxy?: PmProxyConfig;
    /** Grace period before a stop or restart escalates to forceful termination */
    killTimeout?: number;
    /** Maximum restart attempts before marking the process as errored */
    maxRestarts?: number;
    /** Password forwarded to elit wapk run for locked archives */
    password?: string;
    /** Extra WAPK run settings, including direct Google Drive access and live-sync options */
    wapkRun?: WapkRunConfig;
    /** Restart strategy used after the child process exits */
    restartPolicy?: PmRestartPolicy;
    /** Restart the process when it uses more than this many bytes, or a size string like 256M */
    maxMemory?: number | string;
    /** Action taken when maxMemory is exceeded */
    memoryAction?: PmMemoryAction;
    /** Restart schedule using a cron expression or @every <duration> */
    cronRestart?: string;
    /** Exponential restart backoff base delay in milliseconds for unstable restarts */
    expBackoffRestartDelay?: number;
    /** Maximum exponential restart backoff delay in milliseconds */
    expBackoffRestartMaxDelay?: number;
    /** Rolling window used when counting restart attempts against maxRestarts */
    restartWindow?: number;
    /** Wait for the health check to succeed before marking the process online */
    waitReady?: boolean;
    /** Maximum startup wait time in milliseconds when waitReady is enabled */
    listenTimeout?: number;
    /** Minimum healthy uptime before restart attempt counters reset */
    minUptime?: number;
    /** Restart the process when watched files change */
    watch?: boolean;
    /** Files or directories watched when watch mode is enabled */
    watchPaths?: string[];
    /** Glob-like patterns ignored by watch mode */
    watchIgnore?: string[];
    /** Debounce delay before restarting after a file change */
    watchDebounce?: number;
    /** Optional HTTP health checks for long-running services */
    healthCheck?: PmHealthCheckConfig;
}

export interface PmConfig {
    /** Directory used to store pm metadata and log files (default: ./.elit/pm) */
    dataDir?: string;
    /** File used by pm save/resurrect (default: <dataDir>/dump.json) */
    dumpFile?: string;
    /** Managed applications available to elit pm start */
    apps?: PmAppConfig[];
}

export interface MobileConfig {
    /** Project directory for native mobile artifacts */
    cwd?: string;
    /** Native app bundle identifier */
    appId?: string;
    /** Native app display name */
    appName?: string;
    /** Built web assets directory synced into native projects */
    webDir?: string;
    /** Mobile runtime mode: native uses generated UI, hybrid keeps the WebView shell active */
    mode?: MobileMode;
    /** Mobile app icon image path (recommended: .png or .webp) */
    icon?: string;
    /** Android permissions written to AndroidManifest uses-permission tags */
    permissions?: string[];
    /** Platform-specific Android CLI defaults */
    android?: MobileAndroidConfig;
    /** Platform-specific iOS CLI defaults */
    ios?: MobileIosConfig;
    /** Optional native UI generation targets using the same Elit syntax */
    native?: MobileNativeConfig;
}

export interface MobileAndroidConfig {
    /** Default Android device/emulator id used when --target is omitted */
    target?: string;
}

export interface MobileIosConfig {
    /** Default iOS simulator name, UDID, booted alias, or full xcodebuild destination */
    target?: string;
}

export interface MobileNativeConfig {
    /** Elit entry file that exports a VNode tree or zero-argument factory */
    entry?: string;
    /** Explicit export name to read from the native entry module */
    exportName?: string;
    /** Android-specific native generation options */
    android?: MobileNativeAndroidConfig;
    /** iOS-specific native generation options */
    ios?: MobileNativeIosConfig;
}

export interface MobileNativeAndroidConfig {
    /** Disable Android native code generation while keeping iOS enabled */
    enabled?: boolean;
    /** Kotlin package name for generated native screen files */
    packageName?: string;
    /** Output file path for generated Compose screen, relative to mobile.cwd */
    output?: string;
}

export interface MobileNativeIosConfig {
    /** Disable iOS native code generation while keeping Android enabled */
    enabled?: boolean;
    /** Output file path for generated SwiftUI file, relative to mobile.cwd */
    output?: string;
}

export interface DesktopConfig {
    /** Desktop runtime mode: native prefers desktop.native.entry and hybrid prefers desktop.entry */
    mode?: DesktopMode;
    /** Desktop entry file used when the CLI command omits <entry> in hybrid mode */
    entry?: string;
    /** Optional prebuilt hybrid desktop runtime binary path, relative to the current project when not absolute */
    binaryPath?: string;
    /** Optional Cargo target directory override for desktop runtime builds */
    cargoTargetDir?: string;
    /** Optional native desktop entry defaults */
    native?: DesktopNativeConfig;
    /** Optional prebuilt native desktop runtime binary path, relative to the current project when not absolute */
    nativeBinaryPath?: string;
    /** Native desktop runtime: quickjs, bun, node, deno */
    runtime?: 'quickjs' | 'bun' | 'node' | 'deno';
    /** Desktop entry compiler: auto, none, esbuild, tsx, tsup */
    compiler?: 'auto' | 'none' | 'esbuild' | 'tsx' | 'tsup';
    /** Build or run with release desktop runtime */
    release?: boolean;
    /** Desktop build output directory */
    outDir?: string;
    /** Desktop build target platform */
    platform?:
        | 'windows'
        | 'win'
        | 'windows-arm'
        | 'win-arm'
        | 'linux'
        | 'linux-musl'
        | 'linux-arm'
        | 'macos'
        | 'mac'
        | 'darwin'
        | 'macos-arm'
        | 'mac-arm';
    /** Desktop WAPK mode defaults */
    wapk?: {
        /** Packaged runtime to execute inside desktop mode */
        runtime?: 'node' | 'bun' | 'deno';
        /** Polling interval for WAPK live sync */
        syncInterval?: number;
        /** Use event-driven file watcher for WAPK live sync */
        useWatcher?: boolean;
        /** Use release desktop runtime binary */
        release?: boolean;
    };
}

export interface DesktopNativeConfig {
    /** Elit entry file used when desktop.mode is native or --mode native is passed */
    entry?: string;
    /** Explicit export name to read from the desktop native entry module */
    exportName?: string;
}

export interface WapkLockConfig {
    /** Plain-text password used to encrypt the archive */
    password?: string;
}

export interface WapkLiveSyncConfig {
    /** Polling interval for live sync writes back into the archive */
    syncInterval?: number;
    /** Use event-driven file watching for local workdir changes */
    useWatcher?: boolean;
    /** Pull archive changes back into the temp workdir */
    watchArchive?: boolean;
    /** Polling interval for reading external archive changes */
    archiveSyncInterval?: number;
}

export interface WapkGoogleDriveConfig {
    /** Google Drive file id for the remote .wapk archive */
    fileId?: string;
    /** OAuth access token used for Google Drive API calls */
    accessToken?: string;
    /** Environment variable name that contains the OAuth access token */
    accessTokenEnv?: string;
    /** Include supportsAllDrives=true when accessing shared drive files */
    supportsAllDrives?: boolean;
}

export interface WapkRunConfig extends WapkLiveSyncConfig {
    /** Default archive file used by elit wapk run when no file argument is provided */
    file?: string;
    /** Remote Google Drive archive used by elit wapk run */
    googleDrive?: WapkGoogleDriveConfig;
    /** Create an online Elit Run shared session instead of starting the local runtime */
    online?: boolean;
    /** Elit Run base URL used when online hosting targets a non-default origin */
    onlineUrl?: string;
    /** Default runtime override used by elit wapk run */
    runtime?: 'node' | 'bun' | 'deno';
    /** Default password used to unlock a locked archive at runtime */
    password?: string;
}

export interface WapkConfig {
    name?: string;
    version?: string;
    runtime?: string;
    engine?: string;
    entry?: string;
    scripts?: Record<string, string>;
    /** Stable logical app identifier embedded into the WAPK header */
    appId?: string;
    /** Stable publisher or owner identifier embedded into the WAPK header */
    publisherId?: string;
    port?: number;
    env?: Record<string, string | number | boolean>;
    desktop?: Record<string, unknown>;
    lock?: WapkLockConfig;
    run?: WapkRunConfig;
}

/**
 * Helper function for type-safe config definition
 */
export function defineConfig(config: ElitConfig): ElitConfig {
    return config;
}