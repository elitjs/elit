import { existsSync, mkdirSync, readFileSync, writeFileSync } from '@elitjs/fs';
import { basename, dirname, join } from '@elitjs/path';

import { runtimeState } from './state';

/**
 * Snapshot store for toMatchSnapshot(): baselines live next to the test file in
 * `__snapshots__/<file>.snap.json`. Keys are `${test name} > ${snapshot name}`
 * (or a running number for unnamed snapshots).
 */

const stores = new Map<string, Record<string, string>>();
const dirty = new Set<string>();
const counters = new Map<string, number>();

function snapshotPath(testFile: string): string {
    return join(dirname(testFile), '__snapshots__', `${basename(testFile)}.snap.json`);
}

function loadStore(testFile: string): Record<string, string> {
    const path = snapshotPath(testFile);
    if (stores.has(path)) {
        return stores.get(path)!;
    }
    let store: Record<string, string> = {};
    if (existsSync(path)) {
        try {
            store = JSON.parse(readFileSync(path, 'utf-8') as string) as Record<string, string>;
        } catch {
            store = {};
        }
    }
    stores.set(path, store);
    return store;
}

/** Deterministic serialization — object keys are sorted so key order never breaks a snapshot. */
export function stableSerialize(value: unknown): string {
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    return JSON.stringify(value, (_key, item) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
            return Object.keys(item).sort().reduce<Record<string, unknown>>((sorted, key) => {
                sorted[key] = (item as Record<string, unknown>)[key];
                return sorted;
            }, {});
        }
        return item;
    }, 2);
}

export interface SnapshotCheck {
    pass: boolean;
    message?: string;
}

export function checkSnapshot(name: string | undefined, actual: unknown): SnapshotCheck {
    const testFile = runtimeState.currentTestFile;
    const testName = runtimeState.currentTestName ?? '(unknown test)';
    if (!testFile) {
        return { pass: false, message: 'toMatchSnapshot() called outside a test file run' };
    }

    const counterKey = `${testFile}::${testName}`;
    const snapshotName = name ?? `#${(counters.get(counterKey) ?? 0) + 1}`;
    counters.set(counterKey, (counters.get(counterKey) ?? 0) + 1);

    const key = `${testName} > ${snapshotName}`;
    const store = loadStore(testFile);
    const serialized = stableSerialize(actual);

    if (runtimeState.snapshotUpdateMode) {
        if (store[key] !== serialized) {
            store[key] = serialized;
            dirty.add(snapshotPath(testFile));
        }
        return { pass: true };
    }

    if (!(key in store)) {
        return {
            pass: false,
            message: `Snapshot "${key}" does not exist. Run \`elit test --update-snapshots\` to record it.`,
        };
    }

    if (store[key] !== serialized) {
        return {
            pass: false,
            message: `Snapshot "${key}" mismatch.\n  Stored:   ${store[key]}\n  Received: ${serialized}`,
        };
    }

    return { pass: true };
}

/** Resets the unnamed-snapshot counter — called before every test attempt. */
export function resetSnapshotCounters(): void {
    counters.clear();
}

/** Writes every modified snapshot store to disk. */
export function flushSnapshots(): void {
    for (const path of dirty) {
        const store = stores.get(path);
        if (!store) continue;
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, JSON.stringify(store, null, 2) + '\n');
    }
    dirty.clear();
}
