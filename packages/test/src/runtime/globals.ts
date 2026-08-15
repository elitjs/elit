import { expect } from './expect';
import { afterAll, afterEach, beforeAll, beforeEach } from './hooks';
import { vi } from './mocks';
import { createDescribeFunction, createTestFunction } from './test-api';

export const globals = {
    describe: createDescribeFunction(),
    it: createTestFunction(5000),
    test: createTestFunction(5000),
    expect,
    beforeAll,
    afterAll,
    beforeEach,
    afterEach,
    vi,
};

export function setupGlobals() {
    (global as any).describe = globals.describe;
    (global as any).it = globals.it;
    (global as any).test = globals.test;
    (global as any).expect = globals.expect;
    (global as any).beforeAll = globals.beforeAll;
    (global as any).afterAll = globals.afterAll;
    (global as any).beforeEach = globals.beforeEach;
    (global as any).afterEach = globals.afterEach;
    (global as any).vi = globals.vi;
}

export function clearGlobals() {
    delete (global as any).describe;
    delete (global as any).it;
    delete (global as any).test;
    delete (global as any).expect;
    delete (global as any).beforeAll;
    delete (global as any).afterAll;
    delete (global as any).beforeEach;
    delete (global as any).afterEach;
    delete (global as any).vi;
}

const PROCESS_GLOBAL_KEYS = [
    'localStorage',
    'fetch',
    'EventSource',
    'WebSocket',
    'window',
    'document',
    'location',
    'setTimeout',
    'clearTimeout',
    'setInterval',
    'clearInterval',
    'requestAnimationFrame',
    'cancelAnimationFrame',
] as const;

let processGlobalsSnapshot: Map<string, { exists: boolean; value: unknown }> | undefined;

/**
 * Test files can mock browser globals (`document`, `fetch`, timers, ...) at module
 * scope, and those assignments outlive the file that made them. Snapshot the
 * pristine values once, then restore them before every subsequent test file so
 * mocks cannot leak across files (a leaked partial `document` breaks tsup's
 * import.meta.url CJS shim with "Invalid URL", and a never-firing mocked
 * `setTimeout` hangs every later suite that waits on a timer).
 */
export function isolateProcessGlobals(): void {
    if (!processGlobalsSnapshot) {
        processGlobalsSnapshot = new Map(
            PROCESS_GLOBAL_KEYS.map((key) => [key, { exists: key in global, value: (global as any)[key] }]),
        );
        return;
    }

    for (const [key, entry] of processGlobalsSnapshot) {
        if (entry.exists) {
            (global as any)[key] = entry.value;
        } else {
            delete (global as any)[key];
        }
    }
}