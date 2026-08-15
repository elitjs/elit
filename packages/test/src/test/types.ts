export interface TestOptions {
    files?: string[];
    include?: string[];
    exclude?: string[];
    reporter?: 'default' | 'dot' | 'json' | 'verbose' | 'junit' | 'html' | import('./reporter-factory').TestReporterLifecycle;
    timeout?: number;
    bail?: boolean;
    run?: boolean;
    watch?: boolean;
    endToEnd?: boolean;
    /** Failed tests are retried up to N times before reporting as failed. */
    retries?: number;
    /** toMatchSnapshot() records baselines instead of comparing. */
    updateSnapshots?: boolean;
    /** Run test files across N worker threads (1 = serial, the default). */
    workers?: number;
    /** List matching tests without running them. */
    list?: boolean;
    /** Run every test N times. */
    repeatEach?: number;
    /** Skip tests whose names match this pattern (inverse of testPattern). */
    testPatternInvert?: string;
    /** Exit successfully when no test files are found. */
    passWithNoTests?: boolean;
    /** Split the run across CI shards: { index: 1, total: 3 } runs the first third of the files. */
    shard?: { index: number; total: number };
    /** Starts (and later stops) a server around the run, e.g. elit dev. */
    webServer?: {
        command: string;
        /** Port to wait for before running tests. */
        port?: number;
        /** URL to wait for (alternative to port). */
        url?: string;
        timeout?: number;
        /** Reuse an already-running server instead of failing (default true). */
        reuseExistingServer?: boolean;
    };
    /** Module with a default export that runs once before all tests. */
    globalSetup?: string;
    /** Module with a default export that runs once after all tests. */
    globalTeardown?: string;
    colors?: boolean;
    globals?: boolean;
    describePattern?: string;
    testPattern?: string;
    coverage?: {
        enabled: boolean;
        provider: 'v8' | 'istanbul';
        reporter?: ('text' | 'html' | 'lcov' | 'json' | 'coverage-final.json' | 'clover')[];
        include?: string[];
        exclude?: string[];
    };
}