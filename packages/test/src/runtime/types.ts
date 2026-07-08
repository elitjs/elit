export interface TestFunction {
    (name: string, fn: () => void, timeout?: number): void;
    skip: (name: string, fn: () => void, timeout?: number) => void;
    only: (name: string, fn: () => void, timeout?: number) => void;
    todo: (name: string, fn: () => void, timeout?: number) => void;
}

export interface DescribeFunction {
    (name: string, fn: () => void): void;
    skip: (name: string, fn: () => void) => void;
    only: (name: string, fn: () => void) => void;
}

export interface MockFunction<T extends (...args: any[]) => any> {
    (...args: Parameters<T>): ReturnType<T>;
    _isMock: boolean;
    _calls: Parameters<T>[];
    _results: Array<{ type: 'return' | 'throw'; value: any }>;
    _implementation: T | null;
    mockImplementation(fn: T): MockFunction<T>;
    mockReturnValue(value: ReturnType<T>): MockFunction<T>;
    mockResolvedValue(value: ReturnType<T>): MockFunction<T>;
    mockRejectedValue(value: any): MockFunction<T>;
    restore(): void;
    clear(): void;
}

export interface TestMatchers<T> {
    toBe(value: T): void;
    toEqual(value: T): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toBeNull(): void;
    toBeUndefined(): void;
    toBeDefined(): void;
    toBeGreaterThan(value: number): void;
    toBeLessThan(value: number): void;
    toContain(value: any): void;
    toHaveLength(length: number): void;
    toThrow(error?: any): void;
    toMatch(pattern: RegExp | string): void;
    toBeInstanceOf(classType: any): void;
    toHaveProperty(path: string | string[], value?: any): void;
    toBeCalled(): void;
    toBeCalledTimes(times: number): void;
    toBeCalledWith(...args: any[]): void;
    lastReturnedWith(value: any): void;
    not: TestMatchers<any>;
    resolves: TestMatchers<any>;
    rejects: TestMatchers<any>;
}

export interface TestSuite {
    name: string;
    tests: Test[];
    suites: TestSuite[];
    parent?: TestSuite;
    skip: boolean;
    only: boolean;
}

export interface Test {
    name: string;
    fn: () => void | Promise<void>;
    skip: boolean;
    only: boolean;
    todo: boolean;
    timeout: number;
    suite: TestSuite;
}

export interface TestResult {
    name: string;
    status: 'pass' | 'fail' | 'skip' | 'todo';
    duration: number;
    error?: Error;
    suite: string;
    file?: string;
    lineNumber?: number;
    codeSnippet?: string;
}

export type HookFunction = () => void | Promise<void>;

export interface TestModuleRecord {
    exports: any;
}