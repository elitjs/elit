import { loadConfig } from '@elitjs/config';
import { runJestTests, startUiMode } from '@elitjs/test';

interface E2EOptions {
    files?: string[];
    list?: boolean;
    repeatEach?: number;
    testPatternInvert?: string;
    passWithNoTests?: boolean;
    shard?: { index: number; total: number };
    webServer?: { command: string; port?: number; url?: string; timeout?: number; reuseExistingServer?: boolean };
    globalSetup?: string;
    globalTeardown?: string;
    include?: string[];
    exclude?: string[];
    reporter?: 'default' | 'dot' | 'json' | 'verbose' | 'junit' | 'html';
    timeout?: number;
    testTimeout?: number;
    bail?: boolean;
    retries?: number;
    updateSnapshots?: boolean;
    workers?: number;
    describe?: string;
    testName?: string;
}

// E2E files by convention: *.e2e.test.* / *.e2e.spec.*, or anything under an e2e/ directory.
// Patterns stay brace-free — the discovery globber expands at most one {} pair per pattern.
const E2E_DIRECTORIES = ['e2e', 'tests/e2e', 'testing/e2e'];
const DEFAULT_E2E_INCLUDE = [
    '*.e2e.test.*',
    '**/*.e2e.test.*',
    '*.e2e.spec.*',
    '**/*.e2e.spec.*',
    ...E2E_DIRECTORIES.flatMap((directory) => [
        `${directory}/*.test.*`,
        `${directory}/**/*.test.*`,
        `${directory}/*.spec.*`,
        `${directory}/**/*.spec.*`,
    ]),
];

const DEFAULT_E2E_EXCLUDE = ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/.elit-tests-temp/**'];

// Browser-driven e2e is slower than unit tests by nature.
const DEFAULT_E2E_TIMEOUT = 30000;

export async function runE2E(args: string[]): Promise<void> {
    // One-shot utilities mirroring `playwright screenshot|pdf|open|show-report`.
    // UI mode — interactive run from the browser.
    const uiIndex = args.indexOf('--ui');
    if (uiIndex !== -1) {
        const portValue = Number.parseInt(args[uiIndex + 1] ?? '', 10);
        const ui = await startUiMode({
            port: Number.isInteger(portValue) ? portValue : 0,
            include: DEFAULT_E2E_INCLUDE,
            timeout: DEFAULT_E2E_TIMEOUT,
        });
        console.log(`
 Elit E2E UI running at ${ui.url}
 Press Ctrl+C to stop.
`);
        return;
    }

    const subcommand = args[0];
    if (subcommand === 'screenshot') return runScreenshot(args.slice(1));
    if (subcommand === 'pdf') return runPdf(args.slice(1));
    if (subcommand === 'open') return runOpen(args.slice(1));
    if (subcommand === 'show-report') return runShowReport(args.slice(1));
    if (subcommand === 'codegen') return runCodegen(args.slice(1));
    if (subcommand === 'show-trace') return runShowTrace(args.slice(1));

    const cliOptions = parseE2EArgs(args);
    const config = await loadConfig();

    const configTest: E2EOptions = config?.test ? (config.test as E2EOptions) : {};
    const options: E2EOptions = { ...configTest, ...cliOptions };

    // E2E defaults only where the user (config or CLI) did not choose.
    const timeout = options.timeout ?? configTest.timeout ?? DEFAULT_E2E_TIMEOUT;

    const summary = await runJestTests({
        files: options.files,
        include: options.include ?? (options.files ? undefined : DEFAULT_E2E_INCLUDE),
        exclude: options.exclude ?? DEFAULT_E2E_EXCLUDE,
        reporter: options.reporter,
        timeout,
        bail: options.bail,
        retries: options.retries,
        updateSnapshots: options.updateSnapshots,
        workers: options.workers,
        list: options.list,
        repeatEach: options.repeatEach,
        testPatternInvert: options.testPatternInvert,
        passWithNoTests: options.passWithNoTests,
        shard: options.shard,
        describePattern: options.describe,
        testPattern: options.testName,
        webServer: (configTest as E2EOptions).webServer,
        globalSetup: (configTest as E2EOptions).globalSetup,
        globalTeardown: (configTest as E2EOptions).globalTeardown,
    });

    // Exit code reflects failures so CI pipelines can gate on it.
    process.exit(summary.success ? 0 : 1);
}

function parseE2EArgs(args: string[]): E2EOptions {
    const options: E2EOptions = {};

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
                break;
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
            case '--timeout': {
                const timeoutValue = Number.parseInt(args[++index] ?? '', 10);
                if (Number.isInteger(timeoutValue) && timeoutValue > 0) {
                    options.timeout = timeoutValue;
                }
                break;
            }
            case '--bail':
            case '-b':
                options.bail = true;
                break;
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

async function runScreenshot(args: string[]): Promise<void> {
    const [url, file] = args.filter((arg) => !arg.startsWith('--'));
    if (!url || !file) {
        console.error('Usage: elit e2e screenshot <url> <file.png> [--full-page]');
        process.exit(1);
    }
    const { openE2EPage } = await import('@elitjs/e2e');
    const page = await openE2EPage(url);
    try {
        await page.goto(url);
        await page.screenshot({ path: file, fullPage: args.includes('--full-page') });
        console.log(`Screenshot saved to ${file}`);
    } finally {
        await page.close();
    }
    process.exit(0);
}

async function runPdf(args: string[]): Promise<void> {
    const [url, file] = args.filter((arg) => !arg.startsWith('--'));
    if (!url || !file) {
        console.error('Usage: elit e2e pdf <url> <file.pdf>');
        process.exit(1);
    }
    const { openE2EPage } = await import('@elitjs/e2e');
    const page = await openE2EPage(url);
    try {
        await page.goto(url);
        await page.pdf({ path: file });
        console.log(`PDF saved to ${file}`);
    } finally {
        await page.close();
    }
    process.exit(0);
}

async function runOpen(args: string[]): Promise<void> {
    const [url] = args.filter((arg) => !arg.startsWith('--'));
    if (!url) {
        console.error('Usage: elit e2e open <url>');
        process.exit(1);
    }
    const { openE2EPage } = await import('@elitjs/e2e');
    const page = await openE2EPage(url, { headless: false });
    console.log(`Browser opened at ${url} — press Ctrl+C to exit.`);
    // Keep the process alive; closing happens on interrupt.
    await new Promise(() => undefined);
}

async function runCodegen(args: string[]): Promise<void> {
    const positional = args.filter((arg) => !arg.startsWith('--'));
    const url = positional[0];
    const outputIndex = args.indexOf('--output');
    const output = outputIndex !== -1 ? args[outputIndex + 1] : undefined;
    if (!url) {
        console.error('Usage: elit e2e codegen <url> [--output test.ts]');
        process.exit(1);
    }
    const { recordCodegen } = await import('@elitjs/e2e');
    await recordCodegen({ url, output });
    process.exit(0);
}

async function runShowTrace(args: string[]): Promise<void> {
    const [target] = args.filter((arg) => !arg.startsWith('--'));
    if (!target) {
        console.error('Usage: elit e2e show-trace <trace.html | trace.json>');
        process.exit(1);
    }
    const { default: openBrowser } = await import('open');
    console.log(`Opening trace ${target}`);
    await openBrowser(target);
    process.exit(0);
}

async function runShowReport(args: string[]): Promise<void> {
    const { default: openBrowser } = await import('open');
    const target = args.find((arg) => !arg.startsWith('--')) ?? 'e2e-report/index.html';
    console.log(`Opening report ${target}`);
    await openBrowser(target);
    process.exit(0);
}
