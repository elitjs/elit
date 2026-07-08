import type { TestResult } from '../runtime';

import type { JsonReport } from './types';

export class JsonReporter {
    private startTime: number = 0;
    private results: TestResult[] = [];

    onRunStart(_files: string[]) {
        this.startTime = Date.now();
        this.results = [];
    }

    onTestResult(result: TestResult) {
        this.results.push(result);
    }

    onRunEnd(_results: TestResult[]) {
        const report: JsonReport = {
            summary: {
                total: this.results.length,
                passed: this.results.filter((result) => result.status === 'pass').length,
                failed: this.results.filter((result) => result.status === 'fail').length,
                skipped: this.results.filter((result) => result.status === 'skip').length,
                todo: this.results.filter((result) => result.status === 'todo').length,
                duration: Date.now() - this.startTime,
            },
            tests: this.results.map((result) => ({
                status: result.status === 'pass' ? 'passed' : result.status === 'fail' ? 'failed' : result.status === 'skip' ? 'skipped' : 'todo',
                name: result.name,
                suite: result.suite,
                duration: result.duration,
                error: result.error ? {
                    message: result.error.message,
                    stack: result.error.stack,
                } : undefined,
            })),
        };

        console.log(JSON.stringify(report, null, 2));
    }
}