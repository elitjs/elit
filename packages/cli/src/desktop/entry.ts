import { randomUUID } from 'node:crypto';
import { existsSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { build as esbuild } from 'esbuild';

import {
    PACKAGE_ROOT,
    TS_LIKE_EXTENSIONS,
    type DesktopCompilerName,
    type DesktopFormat,
    type DesktopRuntimeName,
    type PreparedEntry,
    type TsupModule,
} from './shared';
import { createDesktopBootstrapEntry, createWorkspacePackagePlugin } from './support';

interface CompileDesktopEntryOptions {
    compiledPath: string;
    compiler: DesktopCompilerName;
    entryPath: string;
    mode: 'run' | 'build';
    output: { extension: string; format: DesktopFormat; platform: 'neutral' | 'node' };
    runtime: DesktopRuntimeName;
}

interface EsbuildCompileOptions {
    compiledPath: string;
    entryPath: string;
    output: { extension: string; format: DesktopFormat; platform: 'neutral' | 'node' };
    runtime: DesktopRuntimeName;
}

interface TsxCompileOptions {
    compiledPath: string;
    entryPath: string;
    mode: 'run' | 'build';
    runtime: DesktopRuntimeName;
}

export async function prepareEntry(
    entry: string,
    runtime: DesktopRuntimeName,
    compiler: DesktopCompilerName,
    mode: 'run' | 'build',
): Promise<PreparedEntry> {
    const entryPath = resolve(entry);

    if (!existsSync(entryPath)) {
        throw new Error(`Desktop entry not found: ${entryPath}`);
    }

    const appName = basename(entryPath, extname(entryPath));
    const shouldCompile = shouldCompileEntry(entryPath, runtime, compiler, mode);
    if (!shouldCompile) {
        return { appName, entryPath };
    }

    const output = compileTarget(runtime);
    const bootstrapEntry = createDesktopBootstrapEntry(entryPath, appName, {
        preferredBuiltFormat: compiler === 'tsx' ? 'esm' : 'cjs',
    });
    const compiledPath = join(dirname(entryPath), `.elit-desktop-${appName}-${randomUUID()}${output.extension}`);

    try {
        await compileDesktopEntry({
            compiledPath,
            compiler,
            entryPath: bootstrapEntry.bootstrapPath,
            mode,
            output,
            runtime,
        });
    } catch (error) {
        cleanupPreparedEntry({ appName, entryPath: compiledPath, cleanupPath: compiledPath });
        throw error;
    } finally {
        for (const cleanupPath of bootstrapEntry.cleanupPaths) {
            if (existsSync(cleanupPath)) {
                rmSync(cleanupPath, { force: true });
            }
        }
    }

    return {
        appName,
        entryPath: compiledPath,
        cleanupPath: compiledPath,
    };
}

function shouldCompileEntry(
    entryPath: string,
    runtime: DesktopRuntimeName,
    compiler: DesktopCompilerName,
    mode: 'run' | 'build',
): boolean {
    if (compiler === 'none') {
        return false;
    }

    if (compiler === 'esbuild' || compiler === 'tsx' || compiler === 'tsup') {
        return true;
    }

    return mode === 'build' || runtime === 'quickjs' || TS_LIKE_EXTENSIONS.has(extname(entryPath).toLowerCase());
}

async function compileDesktopEntry(options: CompileDesktopEntryOptions): Promise<void> {
    switch (options.compiler) {
        case 'tsup':
            await compileDesktopEntryWithTsup(options);
            return;
        case 'tsx':
            await compileDesktopEntryWithTsx(options);
            return;
        case 'auto':
        case 'esbuild':
        default:
            await compileDesktopEntryWithEsbuild(options);
            return;
    }
}

async function compileDesktopEntryWithEsbuild(options: EsbuildCompileOptions): Promise<void> {
    const workspacePackagePlugin = createWorkspacePackagePlugin(dirname(options.entryPath), {
        preferredBuiltFormat: 'cjs',
    });

    await esbuild({
        absWorkingDir: dirname(options.entryPath),
        bundle: true,
        entryPoints: [options.entryPath],
        format: options.output.format,
        logLevel: 'silent',
        mainFields: options.output.platform === 'node' ? ['module', 'main'] : ['browser', 'module', 'main'],
        outfile: options.compiledPath,
        platform: options.output.platform,
        plugins: [workspacePackagePlugin],
        sourcemap: false,
        target: options.runtime === 'quickjs' ? ['es2020'] : ['es2022'],
    });
}

async function compileDesktopEntryWithTsup(options: EsbuildCompileOptions): Promise<void> {
    const tsup = await loadOptionalDesktopCompiler<TsupModule>('tsup', options.entryPath, 'tsup');
    const outputBaseName = basename(options.compiledPath, extname(options.compiledPath));
    const workspacePackagePlugin = createWorkspacePackagePlugin(dirname(options.entryPath), {
        preferredBuiltFormat: 'cjs',
    });

    await tsup.build({
        bundle: true,
        clean: false,
        config: false,
        dts: false,
        entry: { [outputBaseName]: options.entryPath },
        format: [options.output.format],
        noExternal: [/^elit(?:\/|$)/],
        outDir: dirname(options.compiledPath),
        outExtension: () => ({ js: options.output.extension }),
        platform: options.output.platform,
        silent: true,
        skipNodeModulesBundle: false,
        sourcemap: false,
        splitting: false,
        target: options.runtime === 'quickjs' ? 'es2020' : 'es2022',
        esbuildOptions(esbuildOptions) {
            esbuildOptions.logLevel = 'silent';
            esbuildOptions.mainFields = options.output.platform === 'node'
                ? ['module', 'main']
                : ['browser', 'module', 'main'];
            esbuildOptions.plugins = [...(esbuildOptions.plugins ?? []), workspacePackagePlugin];
        },
    });

    const actualOutputPath = findTsupOutputPath(options.compiledPath, options.output.extension);
    if (!actualOutputPath) {
        throw new Error(`Desktop compiler "tsup" did not produce the expected output: ${options.compiledPath}`);
    }

    if (actualOutputPath !== options.compiledPath) {
        renameSync(actualOutputPath, options.compiledPath);
    }
}

async function compileDesktopEntryWithTsx(options: TsxCompileOptions): Promise<void> {
    if (options.runtime !== 'node') {
        throw new Error('Desktop compiler "tsx" is only supported with --runtime node.');
    }

    if (options.mode === 'build') {
        console.warn('[desktop] compiler "tsx" generates a Node loader stub that keeps reading the original source tree at runtime.');
    }

    const tsxApiPath = resolveOptionalDesktopCompilerPath('tsx/esm/api', options.entryPath, 'tsx');
    const entryUrl = pathToFileURL(options.entryPath).href;
    const bootstrap = [
        `'use strict';`,
        `const { register } = require(${JSON.stringify(tsxApiPath)});`,
        `register();`,
        `import(${JSON.stringify(entryUrl)}).catch((error) => {`,
        `    console.error(error);`,
        `    process.exit(1);`,
        `});`,
        '',
    ].join('\n');

    writeFileSync(options.compiledPath, bootstrap);
}

async function loadOptionalDesktopCompiler<T>(
    specifier: string,
    entryPath: string,
    compiler: Extract<DesktopCompilerName, 'tsx' | 'tsup'>,
): Promise<T> {
    const resolvedPath = resolveOptionalDesktopCompilerPath(specifier, entryPath, compiler);
    return import(pathToFileURL(resolvedPath).href) as Promise<T>;
}

function resolveOptionalDesktopCompilerPath(
    specifier: string,
    entryPath: string,
    compiler: Extract<DesktopCompilerName, 'tsx' | 'tsup'>,
): string {
    const searchRoots = Array.from(new Set([
        dirname(resolve(entryPath)),
        resolve(process.cwd()),
        PACKAGE_ROOT,
    ]));

    for (const searchRoot of searchRoots) {
        try {
            return createRequire(join(searchRoot, '__elit-desktop__.cjs')).resolve(specifier);
        } catch {
            continue;
        }
    }

    throw new Error(
        `Desktop compiler "${compiler}" requires the ${compiler} package to be installed. Try: npm install -D ${compiler}`,
    );
}

function findTsupOutputPath(expectedPath: string, expectedExtension: string): string | undefined {
    const basePath = expectedPath.slice(0, -expectedExtension.length);
    const candidates = [
        expectedPath,
        `${basePath}.js`,
        `${basePath}.cjs`,
        `${basePath}.mjs`,
    ];

    return candidates.find((candidate, index) => candidates.indexOf(candidate) === index && existsSync(candidate));
}

function compileTarget(runtime: DesktopRuntimeName): { extension: string; format: DesktopFormat; platform: 'neutral' | 'node' } {
    switch (runtime) {
        case 'quickjs':
            return { extension: '.js', format: 'iife', platform: 'neutral' };
        case 'deno':
            return { extension: '.mjs', format: 'esm', platform: 'neutral' };
        default:
            return { extension: '.cjs', format: 'cjs', platform: 'node' };
    }
}

export function cleanupPreparedEntry(entry: PreparedEntry): void {
    if (entry.cleanupPath && existsSync(entry.cleanupPath)) {
        rmSync(entry.cleanupPath, { force: true });
    }
}