import { loadConfig } from '@elitjs/config';
import { runJestTests, runWatchMode } from '@elitjs/test';

interface TestOptions {
    files?: string[];
    include?: string[];
    exclude?: string[];
    reporter?: 'default' | 'dot' | 'json' | 'verbose';
    timeout?: number;
    testTimeout?: number;
    bail?: boolean;
    run?: boolean;
    watch?: boolean;
    describe?: string;
    testName?: string;
    coverage?: {
        enabled: boolean;
        provider: 'v8' | 'istanbul';
        reporter?: ('text' | 'html' | 'lcov' | 'json' | 'coverage-final.json' | 'clover')[];
        include?: string[];
        exclude?: string[];
    };
}

export async function runTest(args: string[]): Promise<void> {
    const cliOptions = parseTestArgs(args);
    const config = await loadConfig();
    const options: TestOptions = config?.test
        ? { ...config.test, ...cliOptions } as TestOptions
        : cliOptions;

    if (options.watch) {
        await runWatchMode({
            files: options.files,
            include: options.include,
            exclude: options.exclude,
            reporter: options.reporter,
            timeout: options.timeout,
            bail: options.bail,
            coverage: options.coverage,
            describePattern: options.describe,
            testPattern: options.testName,
        });
        return;
    }

    await runJestTests({
        files: options.files,
        include: options.include,
        exclude: options.exclude,
        reporter: options.reporter,
        timeout: options.timeout,
        bail: options.bail,
        coverage: options.coverage,
        describePattern: options.describe,
        testPattern: options.testName,
    });

    process.exit(0);
}

function parseTestArgs(args: string[]): TestOptions {
    const options: TestOptions = {};

    for (let index = 0; index < args.length; index++) {
        const arg = args[index];

        switch (arg) {
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
        }
    }

    return options;
}