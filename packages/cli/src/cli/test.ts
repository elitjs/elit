import { loadConfig } from '@elitjs/config';
import { runJestTests, runWatchMode, startUiMode } from '@elitjs/test';

interface TestOptions {
    files?: string[];
    include?: string[];
    exclude?: string[];
    reporter?: 'default' | 'dot' | 'json' | 'verbose' | 'junit' | 'html';
    timeout?: number;
    testTimeout?: number;
    bail?: boolean;
    run?: boolean;
    watch?: boolean;
    retries?: number;
    updateSnapshots?: boolean;
    workers?: number;
    list?: boolean;
    repeatEach?: number;
    testPatternInvert?: string;
    passWithNoTests?: boolean;
    shard?: { index: number; total: number };
    webServer?: { command: string; port?: number; url?: string; timeout?: number; reuseExistingServer?: boolean };
    globalSetup?: string;
    globalTeardown?: string;
    describe?: string;
    testName?: string;
    coverage?: {
        enabled: boolean;
        provider: 'v8' | 'istanbul';
        reporter?: ('text' | 'html' | 'lcov' | 'json' | 'coverage-final.json' | 'clover')[];
        include?: string[];
        exclude?: string[];
    };
    ui?: boolean;
    uiPort?: number;
}

export async function runTest(args: string[]): Promise<void> {
    const cliOptions = parseTestArgs(args);
    const config = await loadConfig();
    const options: TestOptions = config?.test
        ? { ...config.test, ...cliOptions } as TestOptions
        : cliOptions;

    if (cliOptions.uiPort !== undefined || cliOptions.ui) {
        const ui = await startUiMode({
            port: cliOptions.uiPort ?? 0,
            include: options.include,
            exclude: options.exclude,
            timeout: options.timeout,
        });
        console.log(`
 Elit Test UI running at ${ui.url}
 Press Ctrl+C to stop.
`);
        return;
    }

    if (options.watch) {
        await runWatchMode({
            files: options.files,
            include: options.include,
            exclude: options.exclude,
            reporter: options.reporter,
            timeout: options.timeout,
            bail: options.bail,
            retries: options.retries,
            updateSnapshots: options.updateSnapshots,
            coverage: options.coverage,
            describePattern: options.describe,
            testPattern: options.testName,
        });
        return;
    }

    const summary = await runJestTests({
        files: options.files,
        include: options.include,
        exclude: options.exclude,
        reporter: options.reporter,
        timeout: options.timeout,
        bail: options.bail,
        retries: options.retries,
        updateSnapshots: options.updateSnapshots,
        workers: options.workers,
        list: options.list,
        repeatEach: options.repeatEach,
        testPatternInvert: options.testPatternInvert,
        passWithNoTests: options.passWithNoTests,
        shard: options.shard,
        webServer: options.webServer,
        globalSetup: options.globalSetup,
        globalTeardown: options.globalTeardown,
        coverage: options.coverage,
        describePattern: options.describe,
        testPattern: options.testName,
    });

    // Exit code reflects failures so CI pipelines can gate on it.
    process.exit(summary.success ? 0 : 1);
}

function parseTestArgs(args: string[]): TestOptions {
    const options: TestOptions = {};

    for (let index = 0; index < args.length; index++) {
        const arg = args[index];

        switch (arg) {
            case '--reporter': {
                const reporterValue = args[++index];
                if (reporterValue && ['default', 'dot', 'json', 'verbose', 'junit', 'html'].includes(reporterValue)) {
                    options.reporter = reporterValue as any;
                }
                break;
            }
            case '--run':
            case '-r':
                options.run = true;
                break;
            case '--watch':
            case '-w':
                options.watch = true;
                break;
            case '--coverage':
            case '-c':
                options.coverage = {
                    enabled: true,
                    provider: 'v8',
                    reporter: ['text', 'html'],
                };
                break;
            case '--coverage-reporter':
            case '-cr': {
                const reporterValue = args[++index];
                if (!reporterValue) {
                    break;
                }

                const reporters = reporterValue.split(',').map((value) => value.trim()) as ('text' | 'html' | 'lcov' | 'json' | 'coverage-final.json' | 'clover')[];
                if (!options.coverage) {
                    options.coverage = {
                        enabled: true,
                        provider: 'v8',
                        reporter: reporters,
                    };
                } else {
                    options.coverage.enabled = true;
                    options.coverage.reporter = reporters;
                }
                break;
            }
            case '--file':
            case '-f': {
                const filesValue = args[++index];
                if (filesValue) {
                    options.files = filesValue.split(',').map((value) => value.trim());
                }
                break;
            }
            case '--describe':
            case '-d': {
                const describeValue = args[++index];
                if (describeValue) {
                    options.describe = describeValue;
                }
                break;
            }
            case '--it':
            case '-t': {
                const testValue = args[++index];
                if (testValue) {
                    options.testName = testValue;
                }
                break;
            }
            case '--retries': {
                const retriesValue = args[++index];
                const retries = Number.parseInt(retriesValue ?? '', 10);
                if (Number.isInteger(retries) && retries >= 0) {
                    options.retries = retries;
                }
                break;
            }
            case '--update-snapshots':
            case '-u':
                options.updateSnapshots = true;
                break;
            case '--workers': {
                const workersValue = args[++index];
                const workers = Number.parseInt(workersValue ?? '', 10);
                if (Number.isInteger(workers) && workers >= 1) {
                    options.workers = workers;
                }
                break;
            }
            case '--ui': {
                options.ui = true;
                const next = args[index + 1];
                const port = Number.parseInt(next ?? '', 10);
                if (Number.isInteger(port)) options.uiPort = port;
                break;
            }
            case '--trace':
                process.env.ELIT_E2E_TRACE = '1';
                break;
            case '--video': {
                const next = args[index + 1];
                // --video alone records to the default dir; --video <dir> overrides it.
                process.env.ELIT_E2E_VIDEO = next && !next.startsWith('--') ? next : '1';
                break;
            }
            case '--list':
            case '-l':
                options.list = true;
                break;
            case '--repeat-each': {
                const repeatValue = args[++index];
                const repeat = Number.parseInt(repeatValue ?? '', 10);
                if (Number.isInteger(repeat) && repeat >= 1) {
                    options.repeatEach = repeat;
                }
                break;
            }
            case '--grep-invert': {
                const invertValue = args[++index];
                if (invertValue) {
                    options.testPatternInvert = invertValue;
                }
                break;
            }
            case '--pass-with-no-tests':
                options.passWithNoTests = true;
                break;
            case '--shard': {
                const shardValue = args[++index];
                const match = shardValue?.match(/^(\d+)\/(\d+)$/);
                if (match) {
                    options.shard = { index: Number.parseInt(match[1], 10), total: Number.parseInt(match[2], 10) };
                }
                break;
            }
        }
    }

    return options;
}