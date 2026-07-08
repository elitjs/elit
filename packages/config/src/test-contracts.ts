export type TestEnvironment = 'node' | 'jsdom' | 'happy-dom' | 'edge-runtime';

export type TestCoverageProvider = 'v8' | 'istanbul';

export type TestCoverageReporter = 'text' | 'json' | 'html' | 'lcov' | 'lcovonly' | 'coverage-final.json' | 'clover';

export interface TestCoverageOptions {
    provider?: TestCoverageProvider;
    reporter?: TestCoverageReporter[];
    dir?: string;
    include?: string[];
    exclude?: string[];
    thresholds?: {
        lines?: number;
        functions?: number;
        branches?: number;
        statements?: number;
    };
    all?: boolean;
}

export interface TestOptions {
    environment?: TestEnvironment;
    globals?: boolean;
    setupFiles?: string[];
    include?: string[];
    exclude?: string[];
    testTimeout?: number;
    isolate?: boolean;
    pool?: string;
    poolOptions?: {
        threads?: {
            singleThread?: boolean;
            minThreads?: number;
            maxThreads?: number;
            isolate?: boolean;
        };
        forks?: {
            singleFork?: boolean;
            minForks?: number;
            maxForks?: number;
            isolate?: boolean;
        };
    };
    coverage?: TestCoverageOptions;
    watch?: boolean;
    ui?: boolean;
    reporter?: 'verbose' | 'dot' | 'json' | 'tap';
    bail?: number | boolean;
    pattern?: string | RegExp;
    colors?: boolean;
    retry?: number;
    includeSrc?: string[];
    excludeSrc?: string[];
    env?: Record<string, string>;
}
