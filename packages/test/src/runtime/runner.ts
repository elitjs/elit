import { transformSync } from 'esbuild';
import { readFile } from '@elitjs/fs';
import { dirname } from '@elitjs/path';
import { SourceMapConsumer } from 'source-map';

import { AssertionError } from './expect';
import { setupGlobals } from './globals';
import { resetHookState, resetSourceMapState, resetSuiteState, runtimeState } from './state';
import { createTestModuleRequire, createTestTransformOptions, extractInlineSourceMap } from './transpile';
import type { TestModuleRecord, TestResult, TestSuite } from './types';

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function destroyCurrentSourceMapConsumer(): void {
    if (runtimeState.currentSourceMapConsumer) {
        runtimeState.currentSourceMapConsumer.destroy();
        runtimeState.currentSourceMapConsumer = undefined;
    }
}

function suiteOrDescendantMatches(suite: TestSuite): boolean {
    if (!runtimeState.describePattern) {
        return true;
    }

    const regex = new RegExp(escapeRegex(runtimeState.describePattern), 'i');
    if (regex.test(suite.name)) {
        return true;
    }

    for (const child of suite.suites) {
        if (suiteOrDescendantMatches(child)) {
            return true;
        }
    }

    return false;
}

export async function runTests(options: {
    files: string[];
    timeout?: number;
    bail?: boolean;
    describePattern?: string;
    testPattern?: string;
}): Promise<{
    passed: number;
    failed: number;
    skipped: number;
    todo: number;
    results: TestResult[];
}> {
    const { files, timeout = 5000, bail = false, describePattern, testPattern } = options;

    runtimeState.describePattern = describePattern;
    runtimeState.testPattern = testPattern;
    runtimeState.testResults.length = 0;

    for (const file of files) {
        resetSuiteState();
        resetHookState();
        resetSourceMapState();
        runtimeState.currentTestFile = file;

        try {
            const source = await readFile(file, 'utf-8');
            const testFileDir = dirname(file);
            const result = transformSync(source as string, createTestTransformOptions(file, 'cjs', 'inline'));
            const sourceMap = extractInlineSourceMap(result.code);

            runtimeState.currentSourceMapConsumer = sourceMap ? await new SourceMapConsumer(sourceMap) : undefined;
            runtimeState.wrapperLineOffset = 0;

            setupGlobals();
            const moduleCache = new Map<string, TestModuleRecord>();
            const moduleRecord: TestModuleRecord = { exports: {} };
            const moduleObject = { exports: moduleRecord.exports };
            moduleCache.set(file, moduleRecord);

            const fn = new Function('module', 'exports', 'require', '__filename', '__dirname', result.code);
            const requireFn = createTestModuleRequire(file, moduleCache);
            await fn(moduleObject, moduleObject.exports, requireFn, file, testFileDir);

            await executeSuite(runtimeState.currentSuite, timeout, bail);
        } catch (error) {
            console.error(`Error loading test file ${file}:`, error);
        } finally {
            destroyCurrentSourceMapConsumer();
        }
    }

    const passed = runtimeState.testResults.filter((result) => result.status === 'pass').length;
    const failed = runtimeState.testResults.filter((result) => result.status === 'fail').length;
    const skipped = runtimeState.testResults.filter((result) => result.status === 'skip').length;
    const todo = runtimeState.testResults.filter((result) => result.status === 'todo').length;

    return { passed, failed, skipped, todo, results: runtimeState.testResults };
}

async function executeSuite(suite: TestSuite, timeout: number, bail: boolean, parentMatched: boolean = false): Promise<void> {
    let directMatch = false;
    if (runtimeState.describePattern) {
        const regex = new RegExp(escapeRegex(runtimeState.describePattern), 'i');
        directMatch = regex.test(suite.name);
    }

    const shouldRunSuite = !runtimeState.describePattern || directMatch || parentMatched || suiteOrDescendantMatches(suite);
    if (!shouldRunSuite) {
        return;
    }

    if (suite.suites.length > 0) {
        for (const childSuite of suite.suites) {
            await executeSuite(childSuite, timeout, bail, parentMatched || directMatch);
        }
    }

    const shouldRunTests = !runtimeState.describePattern || directMatch || parentMatched || suite.name === '';
    if (!shouldRunTests) {
        return;
    }

    for (const hook of runtimeState.beforeAllHooks) {
        await hook();
    }

    for (const test of suite.tests) {
        if (runtimeState.hasOnly && !test.only && !suite.only) {
            continue;
        }

        let testMatches = true;
        if (runtimeState.testPattern) {
            const regex = new RegExp(escapeRegex(runtimeState.testPattern), 'i');
            testMatches = regex.test(test.name);
        }

        if (!testMatches) {
            continue;
        }

        if (test.skip || suite.skip) {
            runtimeState.testResults.push({
                name: test.name,
                status: 'skip',
                duration: 0,
                suite: suite.name,
                file: runtimeState.currentTestFile,
            });
            continue;
        }

        if (test.todo) {
            runtimeState.testResults.push({
                name: test.name,
                status: 'todo',
                duration: 0,
                suite: suite.name,
                file: runtimeState.currentTestFile,
            });
            continue;
        }

        for (const hook of runtimeState.beforeEachHooks) {
            await hook();
        }

        const startTime = Date.now();
        try {
            await Promise.race([
                test.fn(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(`Test timed out after ${test.timeout}ms`)), test.timeout)
                ),
            ]);

            runtimeState.testResults.push({
                name: test.name,
                status: 'pass',
                duration: Date.now() - startTime,
                suite: suite.name,
                file: runtimeState.currentTestFile,
            });
        } catch (error) {
            let lineNumber: number | undefined;
            let codeSnippet: string | undefined;

            if (error instanceof AssertionError) {
                lineNumber = error.lineNumber;
                codeSnippet = error.codeSnippet;
            }

            runtimeState.testResults.push({
                name: test.name,
                status: 'fail',
                duration: Date.now() - startTime,
                error: error as Error,
                suite: suite.name,
                file: runtimeState.currentTestFile,
                lineNumber,
                codeSnippet,
            });

            if (bail) {
                throw error;
            }
        }

        for (const hook of runtimeState.afterEachHooks) {
            await hook();
        }
    }

    for (const hook of runtimeState.afterAllHooks) {
        await hook();
    }
}