import type { TestResult } from '../runtime';
import { DotReporter, JsonReporter, TestReporter, VerboseReporter } from '../reporter';

import type { TestOptions } from './types';

export interface TestReporterLifecycle {
    onRunStart?(files: string[]): void;
    onTestResult?(result: TestResult): void;
    onRunEnd?(results: TestResult[]): void;
}

export function createTestReporter(reporter: TestOptions['reporter'] = 'default'): TestReporterLifecycle {
    switch (reporter) {
        case 'dot':
            return new DotReporter();
        case 'json':
            return new JsonReporter();
        case 'verbose':
            return new VerboseReporter();
        default:
            return new TestReporter({ colors: true });
    }
}