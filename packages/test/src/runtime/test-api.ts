import { runtimeState } from './state';
import type { DescribeFunction, Test, TestFunction, TestSuite } from './types';

export function createTestFunction(defaultTimeout: number = 5000): TestFunction {
    const testFn = function (name: string, fn: () => void, timeout?: number) {
        const test: Test = {
            name,
            fn,
            skip: runtimeState.currentSuite.skip,
            only: false,
            todo: false,
            timeout: timeout ?? defaultTimeout,
            suite: runtimeState.currentSuite,
        };
        runtimeState.currentSuite.tests.push(test);
    } as TestFunction;

    testFn.skip = (name: string, fn: () => void, timeout?: number) => {
        const test: Test = {
            name,
            fn,
            skip: true,
            only: false,
            todo: false,
            timeout: timeout ?? defaultTimeout,
            suite: runtimeState.currentSuite,
        };
        runtimeState.currentSuite.tests.push(test);
    };

    testFn.only = (name: string, fn: () => void, timeout?: number) => {
        runtimeState.hasOnly = true;
        const test: Test = {
            name,
            fn,
            skip: false,
            only: true,
            todo: false,
            timeout: timeout ?? defaultTimeout,
            suite: runtimeState.currentSuite,
        };
        runtimeState.currentSuite.tests.push(test);
    };

    testFn.todo = (name: string, fn: () => void, timeout?: number) => {
        const test: Test = {
            name,
            fn,
            skip: false,
            only: false,
            todo: true,
            timeout: timeout ?? defaultTimeout,
            suite: runtimeState.currentSuite,
        };
        runtimeState.currentSuite.tests.push(test);
    };

    return testFn;
}

export function createDescribeFunction(): DescribeFunction {
    const describeFn = function (name: string, fn: () => void) {
        const parent = runtimeState.currentSuite;
        const suite: TestSuite = {
            name,
            tests: [],
            suites: [],
            parent,
            skip: parent.skip,
            only: parent.only,
        };
        parent.suites.push(suite);
        runtimeState.currentSuite = suite;
        fn();
        runtimeState.currentSuite = parent;
    } as DescribeFunction;

    describeFn.skip = (name: string, fn: () => void) => {
        const parent = runtimeState.currentSuite;
        const suite: TestSuite = {
            name,
            tests: [],
            suites: [],
            parent,
            skip: true,
            only: false,
        };
        parent.suites.push(suite);
        runtimeState.currentSuite = suite;
        fn();
        runtimeState.currentSuite = parent;
    };

    describeFn.only = (name: string, fn: () => void) => {
        runtimeState.hasOnly = true;
        const parent = runtimeState.currentSuite;
        const suite: TestSuite = {
            name,
            tests: [],
            suites: [],
            parent,
            skip: false,
            only: true,
        };
        parent.suites.push(suite);
        runtimeState.currentSuite = suite;
        fn();
        runtimeState.currentSuite = parent;
    };

    return describeFn;
}