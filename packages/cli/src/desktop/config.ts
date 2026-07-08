import type { DesktopConfig, DesktopMode } from '@elitjs/config';
import { WAPK_RUNTIMES, type WapkRuntimeName } from '@elitjs/wapk';
import {
    DESKTOP_COMPILERS,
    DESKTOP_RUNTIMES,
    PLATFORMS,
    type DesktopBuildOptions,
    type DesktopCompilerName,
    type DesktopPlatform,
    type DesktopRunOptions,
    type DesktopRuntimeName,
    type DesktopWapkRunOptions,
} from './shared';

export function parseDesktopRunArgs(args: string[], config?: DesktopConfig): DesktopRunOptions {
    const options: DesktopRunOptions = {
        mode: getDefaultDesktopMode(config),
        entry: undefined,
        exportName: config?.native?.exportName,
        binaryPath: config?.binaryPath,
        nativeBinaryPath: config?.nativeBinaryPath,
        cargoTargetDir: config?.cargoTargetDir,
        runtime: config?.runtime ?? 'quickjs',
        compiler: config?.compiler ?? 'auto',
        release: config?.release ?? false,
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
            case '--mode':
            case '-m': {
                const mode = args[++i];
                if (!mode) {
                    throw new Error('Missing value for --mode');
                }
                options.mode = parseDesktopMode(mode, '--mode');
                break;
            }
            case '--runtime':
            case '-r': {
                const runtime = args[++i] as DesktopRuntimeName | undefined;
                if (!runtime || !DESKTOP_RUNTIMES.includes(runtime)) {
                    throw new Error(`Unknown desktop runtime: ${runtime}`);
                }
                options.runtime = runtime;
                break;
            }
            case '--compiler':
            case '-c': {
                const compiler = args[++i] as DesktopCompilerName | undefined;
                if (!compiler || !DESKTOP_COMPILERS.includes(compiler)) {
                    throw new Error(`Unknown desktop compiler: ${compiler}`);
                }
                options.compiler = compiler;
                break;
            }
            case '--export': {
                const exportName = args[++i];
                if (!exportName) {
                    throw new Error('Missing value for --export');
                }
                options.exportName = exportName;
                break;
            }
            case '--release':
                options.release = true;
                break;
            default:
                if (!arg.startsWith('-')) {
                    options.entry = arg;
                }
                break;
        }
    }

    options.entry = options.entry ?? resolveConfiguredDesktopEntry(options.mode, config);

    if (!options.entry) {
        throw new Error(
            `Desktop ${options.mode} mode requires an entry file, either from the command line or ${desktopEntrySourceLabel(options.mode)} in elit.config.ts.`,
        );
    }

    return options;
}

export function parseDesktopBuildArgs(args: string[], config?: DesktopConfig): DesktopBuildOptions {
    const options: DesktopBuildOptions = {
        mode: getDefaultDesktopMode(config),
        entry: undefined,
        exportName: config?.native?.exportName,
        binaryPath: config?.binaryPath,
        nativeBinaryPath: config?.nativeBinaryPath,
        cargoTargetDir: config?.cargoTargetDir,
        runtime: config?.runtime ?? 'quickjs',
        compiler: config?.compiler ?? 'auto',
        release: config?.release ?? false,
        outDir: config?.outDir ?? 'dist',
        platform: config?.platform as DesktopPlatform | undefined,
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
            case '--mode':
            case '-m': {
                const mode = args[++i];
                if (!mode) {
                    throw new Error('Missing value for --mode');
                }
                options.mode = parseDesktopMode(mode, '--mode');
                break;
            }
            case '--runtime':
            case '-r': {
                const runtime = args[++i] as DesktopRuntimeName | undefined;
                if (!runtime || !DESKTOP_RUNTIMES.includes(runtime)) {
                    throw new Error(`Unknown desktop runtime: ${runtime}`);
                }
                options.runtime = runtime;
                break;
            }
            case '--compiler':
            case '-c': {
                const compiler = args[++i] as DesktopCompilerName | undefined;
                if (!compiler || !DESKTOP_COMPILERS.includes(compiler)) {
                    throw new Error(`Unknown desktop compiler: ${compiler}`);
                }
                options.compiler = compiler;
                break;
            }
            case '--export': {
                const exportName = args[++i];
                if (!exportName) {
                    throw new Error('Missing value for --export');
                }
                options.exportName = exportName;
                break;
            }
            case '--platform':
            case '-p': {
                const platform = args[++i] as DesktopPlatform | undefined;
                if (!platform || !(platform in PLATFORMS)) {
                    throw new Error(`Unknown desktop platform: ${platform}`);
                }
                options.platform = platform;
                break;
            }
            case '--out-dir':
            case '-o': {
                const outDir = args[++i];
                if (!outDir) {
                    throw new Error('Desktop build requires an output directory value.');
                }
                options.outDir = outDir;
                break;
            }
            case '--release':
                options.release = true;
                break;
            default:
                if (!arg.startsWith('-')) {
                    options.entry = arg;
                }
                break;
        }
    }

    options.entry = options.entry ?? resolveConfiguredDesktopEntry(options.mode, config);

    return options;
}

export function parseDesktopWapkRunArgs(args: string[], config?: DesktopConfig['wapk']): DesktopWapkRunOptions {
    const normalizedArgs = args[0] === 'run' ? args.slice(1) : args;
    const options: DesktopWapkRunOptions = {
        runtime: config?.runtime,
        release: config?.release ?? false,
        file: '',
        syncInterval: config?.syncInterval,
        useWatcher: config?.useWatcher,
    };

    for (let i = 0; i < normalizedArgs.length; i++) {
        const arg = normalizedArgs[i];

        switch (arg) {
            case '--runtime':
            case '-r': {
                const runtime = normalizedArgs[++i] as WapkRuntimeName | undefined;
                if (!runtime || !WAPK_RUNTIMES.includes(runtime)) {
                    throw new Error(`Unknown desktop WAPK runtime: ${runtime}`);
                }
                options.runtime = runtime;
                break;
            }
            case '--release':
                options.release = true;
                break;
            case '--sync-interval': {
                const value = parseInt(normalizedArgs[++i] ?? '', 10);
                if (Number.isNaN(value) || value < 50) {
                    throw new Error('--sync-interval must be a number >= 50 (milliseconds)');
                }
                options.syncInterval = value;
                break;
            }
            case '--use-watcher':
            case '--watcher': {
                options.useWatcher = true;
                break;
            }
            case '--password':
                options.password = normalizedArgs[++i];
                if (!options.password) {
                    throw new Error('--password requires a value.');
                }
                break;
            default:
                if (arg.startsWith('-')) {
                    throw new Error(`Unknown desktop WAPK option: ${arg}`);
                }
                if (options.file) {
                    throw new Error('Desktop WAPK mode accepts exactly one package file.');
                }
                options.file = arg;
                break;
        }
    }

    if (!options.file) {
        throw new Error('Usage: elit desktop wapk <file.wapk>');
    }

    return options;
}

export function parseDesktopMode(value: string, source: string): DesktopMode {
    if (value === 'native' || value === 'hybrid') {
        return value;
    }

    throw new Error(`Invalid ${source}: ${value}. Expected "native" or "hybrid".`);
}

export function getDefaultDesktopMode(config?: DesktopConfig): DesktopMode {
    if (config?.mode) {
        return parseDesktopMode(config.mode, 'desktop.mode');
    }

    return config?.native?.entry ? 'native' : 'hybrid';
}

export function resolveConfiguredDesktopEntry(mode: DesktopMode, config?: DesktopConfig): string | undefined {
    if (mode === 'native') {
        return config?.native?.entry ?? config?.entry;
    }

    return config?.entry;
}

function desktopEntrySourceLabel(mode: DesktopMode): string {
    return mode === 'native' ? 'desktop.native.entry' : 'desktop.entry';
}

export function printDesktopHelp(): void {
    console.log([
        '',
        'Desktop mode for Elit',
        '',
        'Usage:',
        '  elit desktop [options] [entry]',
        '  elit desktop run [options] [entry]',
        '  elit desktop wapk [options] <file.wapk>',
        '  elit desktop wapk run [options] <file.wapk>',
        '  elit desktop build [options] [entry]',
        '  elit desktop build [options]',
        '',
        'Run options:',
        '  -m, --mode <name>        Desktop mode: hybrid, native',
        '  -r, --runtime <name>     Desktop runtime: quickjs, bun, node, deno',
        '  -c, --compiler <name>    Entry transpiler: auto, none, esbuild, tsx, tsup (default: auto)',
        '  --release                Use the release desktop runtime binary',
        '',
        'Build options:',
        '  -m, --mode <name>        Desktop mode: hybrid, native',
        '  -r, --runtime <name>     Runtime to embed in the app binary',
        '  -c, --compiler <name>    Entry transpiler: auto, none, esbuild, tsx, tsup (default: auto)',
        `  -p, --platform <name>    Target platform (${Object.keys(PLATFORMS).join(', ')})`,
        '  -o, --out-dir <dir>      Output directory (default: dist)',
        '  --release                Build the desktop runtime in release mode',
        '',
        'Desktop WAPK options:',
        '  -r, --runtime <name>     Packaged app runtime: node, bun, deno',
        '  --sync-interval <ms>     Polling interval for live sync (ms, default 300)',
        '  --watcher, --use-watcher Use event-driven file watcher instead of polling',
        '  --password <value>       Password used to unlock a protected archive',
        '  --release                Use the release desktop runtime binary',
        '',
        'Examples:',
        '  elit desktop src/main.ts',
        '  elit desktop run --mode native',
        '  elit desktop --runtime node app.ts',
        '  elit desktop wapk app.wapk',
        '  elit desktop wapk run app.wapk --runtime bun',
        '  elit desktop wapk app.wapk --watcher',
        '  elit desktop build src/main.ts',
        '  elit desktop build --mode native --release',
        '  elit desktop build --runtime bun --release src/main.ts',
        '',
        'Notes:',
        '  - Cargo is required to build the native WebView runtime.',
        '  - TypeScript and module-style QuickJS entries are transpiled automatically.',
        '  - The tsx compiler is Node-only and keeps loading the original source tree.',
        '  - The tsx and tsup compilers require those packages to be installed.',
        '  - Use desktop.binaryPath / ELIT_DESKTOP_BINARY_PATH or desktop.nativeBinaryPath / ELIT_DESKTOP_NATIVE_BINARY_PATH to reuse prebuilt runtimes when Cargo builds are blocked.',
        '  - Use desktop.cargoTargetDir or ELIT_DESKTOP_CARGO_TARGET_DIR to move the desktop Cargo cache to a policy-approved location.',
        '  - desktop.mode defaults to "native" when desktop.native.entry exists, otherwise "hybrid".',
        '  - desktop.entry is used for hybrid mode. desktop.native.entry is used for native mode.',
        '  - Native mode falls back to desktop.entry when only the legacy desktop.entry is configured.',
        '  - Hybrid mode uses the WebView desktop runtime. Native mode renders the native IR in the dedicated native desktop runtime.',
        '  - When [entry] is omitted, Elit falls back to the configured entry for the resolved desktop mode.',
        '  - The build subcommand can be used without an entry to prebuild the native runtime.',
        '  - Desktop WAPK mode expects the packaged entry to start an HTTP app.',
        '  - Use --watcher for faster file change detection (less CPU usage).',
    ].join('\n'));
}