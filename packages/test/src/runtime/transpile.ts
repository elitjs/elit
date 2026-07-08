import { transformSync } from 'esbuild';
import { existsSync, readFile, readFileSync, statSync } from '@elitjs/fs';
import { dirname } from '@elitjs/path';
import type { RawSourceMap } from 'source-map';

import { runtimeState } from './state';
import type { TestModuleRecord } from './types';

const TEST_MODULE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.json'] as const;

function resolveTestLoader(filePath: string): 'ts' | 'js' {
    return /\.(?:ts|tsx|mts|cts)$/i.test(filePath) ? 'ts' : 'js';
}

export function createTestTransformOptions(filePath: string, format: 'cjs' | 'esm', sourcemap: false | 'inline') {
    return {
        loader: resolveTestLoader(filePath),
        format,
        sourcemap,
        sourcefile: filePath,
        target: 'es2020',
        tsconfigRaw: {
            compilerOptions: {
                jsx: 'react',
                jsxFactory: 'h',
                jsxFragmentFactory: 'Fragment',
            },
        },
    } as const;
}

export function extractInlineSourceMap(code: string): RawSourceMap | undefined {
    const sourceMapMatch = code.match(/\/\/# sourceMappingURL=data:application\/json;base64,(.+)/);
    if (!sourceMapMatch) {
        return undefined;
    }

    const json = Buffer.from(sourceMapMatch[1], 'base64').toString('utf-8');
    return JSON.parse(json) as RawSourceMap;
}

function resolveExistingTestModulePath(basePath: string): string {
    const nodePath = require('path') as typeof import('node:path');

    if (existsSync(basePath) && statSync(basePath).isFile()) {
        return basePath;
    }

    for (const extension of TEST_MODULE_EXTENSIONS) {
        const candidatePath = `${basePath}${extension}`;
        if (existsSync(candidatePath) && statSync(candidatePath).isFile()) {
            return candidatePath;
        }
    }

    if (existsSync(basePath) && statSync(basePath).isDirectory()) {
        const packageJsonPath = nodePath.join(basePath, 'package.json');
        if (existsSync(packageJsonPath) && statSync(packageJsonPath).isFile()) {
            try {
                const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8') as string) as Record<string, unknown>;
                for (const candidateEntry of [packageJson.main, packageJson.module]) {
                    if (typeof candidateEntry !== 'string' || candidateEntry.trim().length === 0) {
                        continue;
                    }

                    try {
                        return resolveExistingTestModulePath(nodePath.resolve(basePath, candidateEntry));
                    } catch {
                        continue;
                    }
                }
            } catch {
            }
        }

        for (const extension of TEST_MODULE_EXTENSIONS) {
            const candidatePath = nodePath.join(basePath, `index${extension}`);
            if (existsSync(candidatePath) && statSync(candidatePath).isFile()) {
                return candidatePath;
            }
        }
    }

    return basePath;
}

function resolveTestModulePath(fromFilePath: string, specifier: string): string {
    if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
        return specifier;
    }

    const nodePath = require('path') as typeof import('node:path');
    const basePath = specifier.startsWith('.')
        ? nodePath.resolve(dirname(fromFilePath), specifier)
        : specifier;

    return resolveExistingTestModulePath(basePath);
}

function shouldTranspileTestModule(filePath: string): boolean {
    return /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/i.test(filePath);
}

export function createTestModuleRequire(fromFilePath: string, moduleCache: Map<string, TestModuleRecord>) {
    return (specifier: string) => {
        if (specifier.startsWith('elit/') || specifier === 'elit') {
            return require(specifier);
        }

        const resolvedPath = resolveTestModulePath(fromFilePath, specifier);
        if (resolvedPath === specifier) {
            return require(specifier);
        }

        if (!existsSync(resolvedPath) || !statSync(resolvedPath).isFile()) {
            return require(resolvedPath);
        }

        if (!shouldTranspileTestModule(resolvedPath)) {
            return require(resolvedPath);
        }

        return loadTranspiledTestModule(resolvedPath, moduleCache);
    };
}

function loadTranspiledTestModule(modulePath: string, moduleCache: Map<string, TestModuleRecord>): any {
    const cached = moduleCache.get(modulePath);
    if (cached) {
        return cached.exports;
    }

    const source = readFileSync(modulePath, 'utf-8') as string;
    let transpiled: ReturnType<typeof transformSync>;
    try {
        transpiled = transformSync(source, createTestTransformOptions(modulePath, 'cjs', false));
    } catch (error) {
        throw new Error(`Failed to transpile test dependency ${modulePath}: ${error instanceof Error ? error.message : String(error)}`);
    }

    const moduleRecord: TestModuleRecord = { exports: {} };
    const moduleObject = { exports: moduleRecord.exports };

    moduleCache.set(modulePath, moduleRecord);

    try {
        const fn = new Function('module', 'exports', 'require', '__filename', '__dirname', transpiled.code);
        const requireFn = createTestModuleRequire(modulePath, moduleCache);
        fn(moduleObject, moduleObject.exports, requireFn, modulePath, dirname(modulePath));
    } catch (error) {
        throw new Error(`Failed to execute test dependency ${modulePath}: ${error instanceof Error ? error.message : String(error)}`);
    }

    moduleRecord.exports = moduleObject.exports;
    if (!modulePath.includes('.test.') && !modulePath.includes('.spec.')) {
        runtimeState.coveredFiles.add(modulePath);
    }

    return moduleRecord.exports;
}

export async function transpileFile(filePath: string): Promise<{ code: string; sourceMap?: RawSourceMap }> {
    const source = await readFile(filePath, 'utf-8');
    const result = transformSync(source as string, createTestTransformOptions(filePath, 'esm', 'inline'));

    return {
        code: result.code,
        sourceMap: extractInlineSourceMap(result.code),
    };
}