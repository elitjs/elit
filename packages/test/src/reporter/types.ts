export interface TestReporterOptions {
    verbose?: boolean;
    colors?: boolean;
}

export interface JsonTestResult {
    status: 'passed' | 'failed' | 'skipped' | 'todo';
    name: string;
    suite: string;
    duration: number;
    error?: {
        message: string;
        stack?: string;
    };
}

export interface JsonReport {
    summary: {
        total: number;
        passed: number;
        failed: number;
        skipped: number;
        todo: number;
        duration: number;
    };
    tests: JsonTestResult[];
}