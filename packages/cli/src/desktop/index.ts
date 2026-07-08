import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { loadConfig } from '@elitjs/config';
import { ensureDesktopBinary, ensureDesktopNativeBinary, isWindowsTarget, spawnDesktopProcess } from './binary';
import { getDefaultDesktopMode, parseDesktopBuildArgs, parseDesktopRunArgs, printDesktopHelp, resolveConfiguredDesktopEntry } from './config';
import { cleanupPreparedEntry, prepareEntry } from './entry';
import { cleanupPreparedDesktopNativePayload, prepareDesktopNativePayload } from './native';
import {
    EMBED_MAGIC_V2,
    EMBED_NATIVE_MAGIC_V1,
    EMBED_RUNTIME_CODE,
    PLATFORMS,
    type DesktopBuildOptions,
    type DesktopRunOptions,
} from './shared';
import { runDesktopWapkCommand } from './wapk';

export { parseDesktopMode, getDefaultDesktopMode, resolveConfiguredDesktopEntry } from './config';
export {
    resolveDesktopBinaryOverridePath,
    resolveDesktopBootstrapSupportModulePath,
    resolveDesktopCargoTargetBaseDir,
} from './support';

export async function runDesktopCommand(args: string[]): Promise<void> {
    if (args.includes('--help') || args.includes('-h')) {
        printDesktopHelp();
        return;
    }

    const config = await loadConfig();
    const desktopConfig = config?.desktop;

    if (args.length === 0 && !resolveConfiguredDesktopEntry(getDefaultDesktopMode(desktopConfig), desktopConfig)) {
        printDesktopHelp();
        return;
    }

    if (args[0] === 'wapk') {
        await runDesktopWapkCommand(args.slice(1), desktopConfig);
        return;
    }

    if (args[0] === 'run') {
        await runDesktopRuntime(parseDesktopRunArgs(args.slice(1), desktopConfig));
        return;
    }

    if (args[0] === 'build') {
        await buildDesktopBundle(parseDesktopBuildArgs(args.slice(1), desktopConfig));
        return;
    }

    await runDesktopRuntime(parseDesktopRunArgs(args, desktopConfig));
}

async function runDesktopRuntime(options: DesktopRunOptions): Promise<void> {
    if (options.mode === 'native') {
        await runDesktopNativeRuntime(options);
        return;
    }

    const preparedEntry = await prepareEntry(options.entry!, options.runtime, options.compiler, 'run');

    try {
        const binary = ensureDesktopBinary({
            runtime: options.runtime,
            binaryPath: options.binaryPath,
            cargoTargetDir: options.cargoTargetDir,
            release: options.release,
            entryPath: options.entry,
        });

        const exitCode = await spawnDesktopProcess(binary, ['--runtime', options.runtime, preparedEntry.entryPath]);
        if (exitCode !== 0) {
            process.exit(exitCode);
        }
    } finally {
        cleanupPreparedEntry(preparedEntry);
    }
}

async function runDesktopNativeRuntime(options: DesktopRunOptions): Promise<void> {
    const preparedPayload = await prepareDesktopNativePayload(options);

    try {
        const binary = ensureDesktopNativeBinary({
            binaryPath: options.nativeBinaryPath,
            cargoTargetDir: options.cargoTargetDir,
            release: options.release,
            entryPath: options.entry,
        });

        const exitCode = await spawnDesktopProcess(binary, [preparedPayload.payloadPath]);
        if (exitCode !== 0) {
            process.exit(exitCode);
        }
    } finally {
        cleanupPreparedDesktopNativePayload(preparedPayload);
    }
}

async function buildDesktopBundle(options: DesktopBuildOptions): Promise<void> {
    if (options.mode === 'native') {
        await buildDesktopNativeBundle(options);
        return;
    }

    const triple = options.platform ? PLATFORMS[options.platform] : undefined;
    const binary = ensureDesktopBinary({
        runtime: options.runtime,
        binaryPath: options.binaryPath,
        cargoTargetDir: options.cargoTargetDir,
        release: options.release,
        triple,
        entryPath: options.entry,
    });

    if (!options.entry) {
        console.log(`Desktop runtime ready: ${binary}`);
        return;
    }

    const preparedEntry = await prepareEntry(options.entry, options.runtime, options.compiler, 'build');

    try {
        const outDir = resolve(options.outDir);
        const binIsWindows = isWindowsTarget(triple);
        const outFile = join(outDir, `${preparedEntry.appName}${binIsWindows ? '.exe' : ''}`);
        const runtimeBytes = readFileSync(binary);
        const scriptBytes = readFileSync(preparedEntry.entryPath);
        const sizeBuffer = Buffer.allocUnsafe(8);
        sizeBuffer.writeBigUInt64LE(BigInt(scriptBytes.length));
        const runtimeCode = Buffer.from([EMBED_RUNTIME_CODE[options.runtime]]);

        mkdirSync(outDir, { recursive: true });
        writeFileSync(outFile, Buffer.concat([runtimeBytes, scriptBytes, sizeBuffer, runtimeCode, EMBED_MAGIC_V2]));

        if (!binIsWindows) {
            chmodSync(outFile, 0o755);
        }

        console.log(`Desktop app built: ${outFile}`);
    } finally {
        cleanupPreparedEntry(preparedEntry);
    }
}

async function buildDesktopNativeBundle(options: DesktopBuildOptions): Promise<void> {
    const triple = options.platform ? PLATFORMS[options.platform] : undefined;
    const binary = ensureDesktopNativeBinary({
        binaryPath: options.nativeBinaryPath,
        cargoTargetDir: options.cargoTargetDir,
        release: options.release,
        triple,
        entryPath: options.entry,
    });

    if (!options.entry) {
        console.log(`Desktop native runtime ready: ${binary}`);
        return;
    }

    const preparedPayload = await prepareDesktopNativePayload(options);

    try {
        const outDir = resolve(options.outDir);
        const binIsWindows = isWindowsTarget(triple);
        const outFile = join(outDir, `${preparedPayload.appName}${binIsWindows ? '.exe' : ''}`);
        const runtimeBytes = readFileSync(binary);
        const payloadBytes = readFileSync(preparedPayload.payloadPath);
        const sizeBuffer = Buffer.allocUnsafe(8);
        sizeBuffer.writeBigUInt64LE(BigInt(payloadBytes.length));

        mkdirSync(outDir, { recursive: true });
        writeFileSync(outFile, Buffer.concat([runtimeBytes, payloadBytes, sizeBuffer, EMBED_NATIVE_MAGIC_V1]));

        if (!binIsWindows) {
            chmodSync(outFile, 0o755);
        }

        console.log(`Desktop native app built: ${outFile}`);
    } finally {
        cleanupPreparedDesktopNativePayload(preparedPayload);
    }
}