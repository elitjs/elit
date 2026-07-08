import { clearGlobals, resetCoveredFiles, runTests, setupGlobals } from '../runtime';

import { generateCoverage } from './coverage';
import { findTestFiles } from './discovery';
import { createTestReporter } from './reporter-factory';
import type { TestOptions } from './types';

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
    const files = options.files || findTestFiles(root, include, exclude);

    if (files.length === 0) {
        console.log('\n No test files found\n');
        return {
            success: true,
            passed: 0,
            failed: 0,
            total: 0,
        };
    }

    if (globals) {
        setupGlobals();
    }

    const testReporter = createTestReporter(reporter);
    testReporter.onRunStart?.(files);

    resetCoveredFiles();

    const results = await runTests({
        files,
        timeout,
        bail,
        describePattern: options.describePattern,
        testPattern: options.testPattern,
    });

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
}