/**
 * Test Global Type Definitions
 *
 * Provides global type declarations for test globals.
 *
 * To use these types in your test files, add this to your tsconfig.json:
 * {
 *   "compilerOptions": {
 *     "types": ["elit/test-globals"]
 *   }
 * }
 *
 * Or add a triple-slash directive to your test file:
 * /// <reference types="elit/test-globals" />
 */

// ============================================================================
// Global Functions with Modifiers
// ============================================================================

declare function describe(name: string, fn: () => void): void;
declare namespace describe {
    function skip(name: string, fn: () => void): void;
    function only(name: string, fn: () => void): void;
}

declare function it(name: string, fn: () => void | Promise<void>): void;
declare namespace it {
    function skip(name: string, fn: () => void | Promise<void>): void;
    function only(name: string, fn: () => void | Promise<void>): void;
    function todo(name: string, fn?: () => void | Promise<void>): void;
}

declare function test(name: string, fn: () => void | Promise<void>): void;
declare namespace test {
    function skip(name: string, fn: () => void | Promise<void>): void;
    function only(name: string, fn: () => void | Promise<void>): void;
    function todo(name: string, fn?: () => void | Promise<void>): void;
}

// ============================================================================
// Expect Interface
// ============================================================================

interface TestMatchers<T> {
    // Equality
    toBe(value: T): void;
    toEqual(value: T): void;
    toStrictEqual(value: T): void;

    // Truthiness
    toBeTruthy(): void;
    toBeFalsy(): void;

    // Nullability
    toBeNull(): void;
    toBeUndefined(): void;
    toBeDefined(): void;
    toBeNaN(): void;

    // Numbers
    toBeGreaterThan(value: number): void;
    toBeGreaterThanOrEqual(value: number): void;
    toBeLessThan(value: number): void;
    toBeLessThanOrEqual(value: number): void;
    toBeCloseTo(value: number, precision?: number): void;
    toBeFinite(): void;

    // Strings
    toMatch(pattern: RegExp | string): void;
    toContain(value: any): void;

    // Arrays
    toHaveLength(length: number): void;
    toContainEqual(item: any): void;

    // Objects
    toHaveProperty(path: string | (string | number)[], value?: any): void;
    toMatchObject(properties: Record<string, any>): void;
    toBeInstanceOf(classType: any): void;

    // Functions
    toThrow(error?: RegExp | string | Error | any): void;
    toHaveReturnedWith(value: any): void;
    toHaveReturnedTimes(times: number): void;
    toHaveLastReturnedWith(value: any): void;

    // Modifiers
    not: TestMatchers<T>;
    resolves: TestMatchers<T>;
    rejects: TestMatchers<T>;
}

interface ExpectStatic {
    <T = any>(actual: T): TestMatchers<T>;
    extends(matchers: Record<string, any>): void;
    any(constructor: any): any;
    anything(): any;
    arrayContaining(arr: any[]): any;
    objectContaining(obj: Record<string, any>): any;
    stringContaining(str: string): any;
    stringMatching(str: RegExp | string): any;
    not: {
        toBe(value: any): void;
        toEqual(value: any): void;
        toMatchObject(properties: Record<string, any>): void;
        toContain(value: any): void;
        toThrow(error?: RegExp | string | Error): void;
    };
    addSnapshotSerializer(serializer: any): void;
    assertions(expected: number): void;
    hasAssertions(): void;
}

declare const expect: ExpectStatic;

// ============================================================================
// Mock Functions (vi)
// ============================================================================

interface MockFunction<T extends (...args: any[]) => any> {
    (...args: Parameters<T>): ReturnType<T>;
    mockImplementation(fn: T): this;
    mockImplementationOnce(fn: T): this;
    mockReturnThis(): this;
    mockReturnValue(value: ReturnType<T>): this;
    mockReturnValueOnce(value: ReturnType<T>): this;
    mockResolvedValue(value: ReturnType<T> extends Promise<any> ? never : Awaited<ReturnType<T>>): this;
    mockResolvedValueOnce(value: ReturnType<T> extends Promise<any> ? never : Awaited<ReturnType<T>>): this;
    mockRejectedValue(value: any): this;
    mockRejectedValueOnce(value: any): this;
    get mock(): {
        calls: Parameters<T>[];
        instances: any[];
        contexts: any[];
        returnValues: ReturnType<T>[];
        lastCall?: Parameters<T>;
    };
    get calls(): Parameters<T>[];
    get instances(): any[];
    get invocationCallOrder(): number[];
    get results(): Array<{ type: 'return' | 'throw' | 'incomplete'; value: any }>;
}

interface SpyInstance {
    mockRestore(): void;
    mockReturnValue(value: any): this;
    mockResolvedValue(value: any): this;
    mockRejectedValue(value: any): this;
    mockImplementation(fn: (...args: any[]) => any): this;
    get calls(): any[][];
    get callCount(): number;
}

interface Elitest {
    fn<T extends (...args: any[]) => any>(implementation?: T): MockFunction<T>;
    spyOn(object: any, method: string): SpyInstance;
    clearAllMocks(): void;
    resetAllMocks(): void;
    restoreAllMocks(): void;
    doMock(modulePath: string, mockFactory?: () => any): void;
    dontMock(modulePath: string): void;
    unmock(modulePath: string): void;
    useFakeTimers(): void;
    useRealTimers(): void;
    runAllTimers(): void;
    runOnlyPendingTimers(): void;
    advanceTimersByTime(msToRun: number): void;
    advanceTimersToNextTimer(): number;
    clearAllTimers(): void;
    setSystemTime(time?: number | Date): void;
    getTimerCount(): number;
}

declare const vi: Elitest;

// ============================================================================
// Hooks
// ============================================================================

declare function beforeAll(fn: () => void | Promise<void>, timeout?: number): void;
declare function afterAll(fn: () => void | Promise<void>, timeout?: number): void;
declare function beforeEach(fn: () => void | Promise<void>, timeout?: number): void;
declare function afterEach(fn: () => void | Promise<void>, timeout?: number): void;
