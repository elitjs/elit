import { runJestTests } from './run-jest';
import type { TestOptions } from './types';

export async function runWatchMode(options: TestOptions = {}) {
    const chokidar = await import('chokidar');

    console.log('\n � watch mode - files will be re-run on change\n');

    let isRunning = false;
    let needsRerun = false;

    const runTests = async () => {
        if (isRunning) {
            needsRerun = true;
            return;
        }

        isRunning = true;
        needsRerun = false;

        console.clear();
        await runJestTests(options);

        isRunning = false;

        if (needsRerun) {
            await runTests();
        }
    };

    await runTests();

    const watchPatterns = options.include || ['**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js'];
    const ignoredPatterns = options.exclude || ['**/node_modules/**', '**/dist/**', '**/coverage/**'];

    const watcher = chokidar.default.watch(watchPatterns, {
        ignored: ignoredPatterns,
        persistent: true,
    });

    watcher.on('change', async (path) => {
        console.log(`\n 📄 ${path} changed\n`);
        await runTests();
    });

    watcher.on('add', async (path) => {
        console.log(`\n 📄 ${path} added\n`);
        await runTests();
    });
}