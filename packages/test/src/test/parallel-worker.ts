import { parentPort } from 'node:worker_threads';

import { runTests } from '../runtime/runner';
import { flushSnapshots } from '../runtime/snapshot';

// One worker per chunk of test files — each gets a fresh module registry and
// runtime state, so files stay fully isolated from each other.
if (parentPort) {
    parentPort.on('message', async (options: {
        files: string[];
        timeout?: number;
        bail?: boolean;
        retries?: number;
        describePattern?: string;
        testPattern?: string;
    }) => {
        try {
            const result = await runTests(options);
            flushSnapshots();

            // Errors do not structured-clone cleanly — ship plain objects.
            const results = result.results.map((item) => ({
                ...item,
                error: item.error ? { message: item.error.message, stack: item.error.stack } : undefined,
            }));

            parentPort!.postMessage({ ...result, results });
        } catch (error) {
            parentPort!.postMessage({ fatal: error instanceof Error ? error.message : String(error) });
        }
    });
}
