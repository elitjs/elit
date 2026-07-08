import type { SourceMapConsumer } from 'source-map';

import type { HookFunction, TestResult, TestSuite } from './types';

export function createRootSuite(): TestSuite {
    return {
        name: 'root',
        tests: [],
        suites: [],
        skip: false,
        only: false,
    };
}

export const runtimeState: {
    currentSuite: TestSuite;
    testResults: TestResult[];
    hasOnly: boolean;
    coveredFiles: Set<string>;
    describePattern: string | undefined;
    testPattern: string | undefined;
    currentTestFile: string | undefined;
    currentSourceMapConsumer: SourceMapConsumer | undefined;
    wrapperLineOffset: number;
    beforeAllHooks: HookFunction[];
    afterAllHooks: HookFunction[];
    beforeEachHooks: HookFunction[];
    afterEachHooks: HookFunction[];
} = {
    currentSuite: createRootSuite(),
    testResults: [],
    hasOnly: false,
    coveredFiles: new Set<string>(),
    describePattern: undefined,
    testPattern: undefined,
    currentTestFile: undefined,
    currentSourceMapConsumer: undefined,
    wrapperLineOffset: 0,
    beforeAllHooks: [],
    afterAllHooks: [],
    beforeEachHooks: [],
    afterEachHooks: [],
};

export function resetSuiteState(): void {
    runtimeState.currentSuite = createRootSuite();
    runtimeState.hasOnly = false;
}

export function resetHookState(): void {
    runtimeState.beforeAllHooks = [];
    runtimeState.afterAllHooks = [];
    runtimeState.beforeEachHooks = [];
    runtimeState.afterEachHooks = [];
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