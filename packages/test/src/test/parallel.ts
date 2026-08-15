import { Worker } from 'node:worker_threads';

import type { TestResult } from '../runtime/types';

interface ParallelRunOptions {
    files: string[];
    timeout?: number;
    bail?: boolean;
    retries?: number;
    describePattern?: string;
    testPattern?: string;
}

interface WorkerSummary {
    passed?: number;
    failed?: number;
    skipped?: number;
    todo?: number;
    results?: Array<TestResult & { error?: { message: string; stack?: string } }>;
    fatal?: string;
}

function chunkFiles(files: string[], chunks: number): string[][] {
    const buckets: string[][] = Array.from({ length: chunks }, () => []);
    files.forEach((file, index) => {
        buckets[index % chunks].push(file);
    });
    return buckets.filter((bucket) => bucket.length > 0);
}

function toError(serialized: { message: string; stack?: string } | undefined): Error | undefined {
    if (!serialized) return undefined;
    const error = new Error(serialized.message);
    error.stack = serialized.stack;
    return error;
}

/**
 * Runs test files across worker threads — each worker executes its files with a
 * completely isolated module registry and runtime state.
 *
 * Returns null when workers cannot start (e.g. a non-ESM host), so callers can
 * fall back to the serial runner.
 */
export async function runTestsParallel(
    options: ParallelRunOptions,
    workerCount: number,
): Promise<{
    passed: number;
    failed: number;
    skipped: number;
    todo: number;
    results: TestResult[];
} | null> {
    let workerUrl: URL;
    try {
        // tsup preserves the src/test directory -> dist/test/parallel-worker.mjs.
        workerUrl = new URL('./test/parallel-worker.mjs', import.meta.url);
    } catch {
        return null;
    }

    const chunks = chunkFiles(options.files, Math.min(workerCount, options.files.length));

    const summaries = await Promise.all(
        chunks.map(
            (files) =>
                new Promise<WorkerSummary>((resolvePromise, rejectPromise) => {
                    const worker = new Worker(workerUrl);
                    worker.on('message', (summary: WorkerSummary) => {
                        void worker.terminate();
                        resolvePromise(summary);
                    });
                    worker.on('error', (error) => {
                        void worker.terminate();
                        rejectPromise(error);
                    });
                    worker.on('exit', (code) => {
                        if (code !== 0) {
                            rejectPromise(new Error(`Worker exited with code ${code}`));
                        }
                    });
                    worker.postMessage({ ...options, files });
                }),
        ),
    );

    const results: TestResult[] = [];
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let todo = 0;

    for (const summary of summaries) {
        if (summary.fatal) {
            throw new Error(summary.fatal);
        }
        passed += summary.passed ?? 0;
        failed += summary.failed ?? 0;
        skipped += summary.skipped ?? 0;
        todo += summary.todo ?? 0;
        for (const item of summary.results ?? []) {
            results.push({ ...item, error: toError(item.error) });
        }
    }

    return { passed, failed, skipped, todo, results };
}
