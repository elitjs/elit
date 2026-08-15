import { clearGlobals, flushSnapshots, resetCoveredFiles, runTests, setupGlobals, runtimeState } from '../runtime';

import { generateCoverage } from './coverage';
import { findTestFiles } from './discovery';
import { runTestsParallel } from './parallel';
import { createTestReporter } from './reporter-factory';
import type { TestOptions } from './types';
import { startWebServer, type RunningWebServer } from './web-server';

export async function runJestTests(options: TestOptions = {}) {
    const {
        include = ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        exclude = ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/.elit-tests-temp/**'],
        reporter = 'default',
        timeout = 5000,
        bail = false,
        globals = true,
    } = options;

    const root = process.cwd();
    let files = options.files || findTestFiles(root, include, exclude);

    // --shard i/n: run only this shard's slice of the file list.
    if (options.shard) {
        const { index, total } = options.shard;
        if (!Number.isInteger(index) || !Number.isInteger(total) || index < 1 || total < 1 || index > total) {
            throw new Error(`Invalid shard { index: ${index}, total: ${total} } — need 1 <= index <= total`);
        }
        files = files.filter((_, position) => position % total === index - 1);
    }

    if (files.length === 0) {
        console.log('\n No test files found\n');
        return {
            success: options.passWithNoTests ?? true,
            passed: 0,
            failed: 0,
            total: 0,
        };
    }

    // webServer starts first, then globalSetup — teardown happens in reverse.
    let webServer: RunningWebServer | undefined;
    if (options.webServer) {
        webServer = await startWebServer(options.webServer);
    }

    if (options.globalSetup) {
        await runGlobalHook(options.globalSetup, 'globalSetup');
    }

    try {
        if (globals) {
            setupGlobals();
        }

        runtimeState.snapshotUpdateMode = options.updateSnapshots ?? false;

        // A reporter object (e.g. the UI mode collector) is used as-is.
        const testReporter = typeof reporter === 'object' && reporter !== null
            ? (reporter as import('./reporter-factory').TestReporterLifecycle)
            : createTestReporter(reporter as 'default');
        testReporter.onRunStart?.(files);

        resetCoveredFiles();

        const runOptions = {
            files,
            timeout,
            bail,
            retries: options.retries,
            describePattern: options.describePattern,
            testPattern: options.testPattern,
            testPatternInvert: options.testPatternInvert,
            repeatEach: options.repeatEach,
            listOnly: options.list,
        };

        const serialRun = () => runTests(runOptions);

        const workerCount = Math.max(1, options.workers ?? 1);
        let results;

        if (workerCount > 1 && files.length > 1 && !options.coverage?.enabled && !options.list) {
            // Workers return null when they cannot start — fall back to serial.
            results = (await runTestsParallel(runOptions, workerCount).catch(() => null)) ?? (await serialRun());
        } else {
            results = await serialRun();
        }

        flushSnapshots();

        for (const result of results.results) {
            testReporter.onTestResult?.(result);
        }

        testReporter.onRunEnd?.(results.results);

        if (globals) {
            clearGlobals();
        }

        if (options.coverage?.enabled) {
            await generateCoverage(options.coverage, results.results);
        }

        return {
            success: results.failed === 0,
            passed: results.passed,
            failed: results.failed,
            total: results.passed + results.failed + results.skipped + results.todo,
        };
    } finally {
        if (options.globalTeardown) {
            await runGlobalHook(options.globalTeardown, 'globalTeardown');
        }
        await webServer?.stop();
    }
}

async function runGlobalHook(modulePath: string, kind: 'globalSetup' | 'globalTeardown'): Promise<void> {
    // Strip the extension so ts files resolve through the caller's loader.
    const specifier = modulePath.replace(/\.(ts|mts|cts|tsx|js|mjs|cjs|jsx)$/, '');
    const loaded = (await import(specifier).catch(() => null)) as { default?: () => void | Promise<void> } | null;
    const hook = loaded?.default;
    if (typeof hook !== 'function') {
        throw new Error(`${kind} "${modulePath}" has no default export function`);
    }
    await hook();
}
