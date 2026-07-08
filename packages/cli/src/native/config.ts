import { resolve } from 'node:path';

import type { NativePlatform } from '@elitjs/native';
import { loadConfig } from '@elitjs/config';
import type { NativeGenerateOptions, NativeTarget } from './shared';

export async function parseNativeGenerateArgs(args: string[]): Promise<NativeGenerateOptions> {
    const target = parseNativeTargetArg(args[0]);
    let cwd = process.cwd();

    for (let i = 1; i < args.length; i++) {
        if (args[i] === '--cwd') {
            const value = args[++i];
            if (!value) throw new Error('Missing value for --cwd');
            cwd = resolve(value);
        }
    }

    const config = await loadConfig(cwd);
    const mobileConfig = config?.mobile;

    const options: NativeGenerateOptions = {
        cwd,
        entryPath: '',
        exportName: undefined,
        includePreview: true,
        name: 'GeneratedScreen',
        outputPath: undefined,
        packageName: target === 'android' ? mobileConfig?.appId : undefined,
        platform: target === 'android' ? 'android' : target === 'ios' ? 'ios' : 'generic',
        target,
    };

    let entryValue: string | undefined;

    for (let i = 1; i < args.length; i++) {
        const arg = args[i];

        if (!arg.startsWith('-')) {
            if (entryValue) {
                throw new Error(`Unexpected extra argument: ${arg}`);
            }
            entryValue = arg;
            continue;
        }

        switch (arg) {
            case '--entry': {
                const value = args[++i];
                if (!value) throw new Error('Missing value for --entry');
                entryValue = value;
                break;
            }
            case '--out': {
                const value = args[++i];
                if (!value) throw new Error('Missing value for --out');
                options.outputPath = resolve(cwd, value);
                break;
            }
            case '--name': {
                const value = args[++i];
                if (!value) throw new Error('Missing value for --name');
                options.name = value;
                break;
            }
            case '--package': {
                const value = args[++i];
                if (!value) throw new Error('Missing value for --package');
                options.packageName = value;
                break;
            }
            case '--export': {
                const value = args[++i];
                if (!value) throw new Error('Missing value for --export');
                options.exportName = value;
                break;
            }
            case '--platform': {
                const value = args[++i];
                if (!value) throw new Error('Missing value for --platform');
                options.platform = parseNativePlatformArg(value);
                break;
            }
            case '--cwd': {
                i++;
                break;
            }
            case '--preview': {
                options.includePreview = true;
                break;
            }
            case '--no-preview': {
                options.includePreview = false;
                break;
            }
            default:
                throw new Error(`Unknown native option: ${arg}`);
        }
    }

    if (!entryValue) {
        throw new Error('Native generation requires an entry file. Use: elit native generate android <entry>');
    }

    options.entryPath = resolve(cwd, entryValue);
    return options;
}

function parseNativeTargetArg(value: string | undefined): NativeTarget {
    if (value === 'android' || value === 'ios' || value === 'ir') {
        return value;
    }

    throw new Error(`Invalid native target: ${value ?? '(missing)'}. Expected android, ios, or ir.`);
}

function parseNativePlatformArg(value: string): NativePlatform {
    if (value === 'generic' || value === 'android' || value === 'ios') {
        return value;
    }

    throw new Error(`Invalid native platform: ${value}. Expected generic, android, or ios.`);
}

export function printNativeHelp(): void {
    console.log([
        'Elit Native Commands',
        '',
        'Usage:',
        '  elit native generate android <entry> [options]',
        '  elit native generate ios <entry> [options]',
        '  elit native generate ir <entry> [options]',
        '',
        'Options:',
        '  --entry <file>      Entry file to evaluate if not passed positionally',
        '  --out <file>        Write generated output to a file instead of stdout',
        '  --name <name>       Generated Compose function or SwiftUI struct name',
        '  --package <name>    Kotlin package name for android output',
        '  --export <name>     Specific export to read from the entry module',
        '  --platform <name>   IR platform tag: generic, android, ios',
        '  --cwd <dir>         Resolve config and relative paths from this directory',
        '  --preview           Include preview helpers (default)',
        '  --no-preview        Skip preview helpers in generated output',
        '',
        'Entry expectations:',
        '  The entry module should export a VNode/native tree value or a zero-argument',
        '  function that returns one. Auto-detected export names: default, screen, app, view, root.',
        '',
        'Examples:',
        '  elit native generate android ./src/native-screen.ts --name HomeScreen --package com.example.app',
        '  elit native generate ios ./src/native-screen.ts --out ./ios/HomeScreen.swift',
        '  elit native generate ir ./src/native-screen.ts --platform android --export screen',
    ].join('\n'));
}