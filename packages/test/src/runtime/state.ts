import type { SourceMapConsumer } from 'source-map';

import type { HookFunction, TestResult, TestSuite } from './types';

export function createRootSuite(): TestSuite {
    return {
        name: 'root',
        tests: [],
        suites: [],
        skip: false,
        only: false,
        beforeAllHooks: [],
        afterAllHooks: [],
        beforeEachHooks: [],
        afterEachHooks: [],
    };
}

export const runtimeState: {
    currentSuite: TestSuite;
    testResults: TestResult[];
    hasOnly: boolean;
    coveredFiles: Set<string>;
    describePattern: string | undefined;
    testPattern: string | undefined;
    /** Inverse name filter — matching tests are skipped. */
    testPatternInvert: string | undefined;
    /** Run every test N times. */
    repeatEach: number;
    /** List matching tests without executing them. */
    listOnly: boolean;
    currentTestFile: string | undefined;
    /** Name of the test currently executing — used to key snapshots. */
    currentTestName: string | undefined;
    /** When true, toMatchSnapshot writes baselines instead of comparing. */
    snapshotUpdateMode: boolean;
    currentSourceMapConsumer: SourceMapConsumer | undefined;
    wrapperLineOffset: number;
} = {
    currentSuite: createRootSuite(),
    testResults: [],
    hasOnly: false,
    coveredFiles: new Set<string>(),
    describePattern: undefined,
    testPattern: undefined,
    testPatternInvert: undefined,
    repeatEach: 1,
    listOnly: false,
    currentTestFile: undefined,
    currentTestName: undefined,
    snapshotUpdateMode: false,
    currentSourceMapConsumer: undefined,
    wrapperLineOffset: 0,
};

export function resetSuiteState(): void {
    runtimeState.currentSuite = createRootSuite();
    runtimeState.hasOnly = false;
}

export function resetSourceMapState(): void {
    runtimeState.currentSourceMapConsumer = undefined;
    runtimeState.wrapperLineOffset = 0;
}

export function getCoveredFiles(): Set<string> {
    return runtimeState.coveredFiles;
}

export function resetCoveredFiles(): void {
    runtimeState.coveredFiles.clear();
}