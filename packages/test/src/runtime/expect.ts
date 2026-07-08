import { runtimeState } from './state';
import { resolveAssertionContext } from './assertion-context';
import type { TestMatchers } from './types';

export class AssertionError extends Error {
    constructor(
        message: string,
        public filePath?: string,
        public lineNumber?: number,
        public columnNumber?: number,
        public codeSnippet?: string
    ) {
        super(message);
        this.name = 'AssertionError';
    }
}

class Expect implements TestMatchers<any> {
    private expected: any;
    private _not: TestMatchers<any> | null = null;
    private _resolves: TestMatchers<any> | null = null;
    private _rejects: TestMatchers<any> | null = null;

    constructor(private actual: any, private isNot = false, private isAsync = false) {
    }

    get not(): TestMatchers<any> {
        if (!this._not) {
            this._not = new Expect(this.actual, !this.isNot, false);
        }
        return this._not;
    }

    get resolves(): TestMatchers<any> {
        if (!this._resolves) {
            this._resolves = new Expect(this.actual, this.isNot, true);
        }
        return this._resolves;
    }

    get rejects(): TestMatchers<any> {
        if (!this._rejects) {
            this._rejects = new Expect(this.actual, this.isNot, true);
        }
        return this._rejects;
    }

    private assertCondition(condition: boolean, message: string, showExpectedReceived: boolean = true, expectedDisplay?: string, callerStack?: string) {
        if (this.isNot) {
            condition = !condition;
        }

        if (!condition) {
            let errorMessage = message;
            if (showExpectedReceived) {
                const expectedValue = expectedDisplay ?? this.stringify(this.expected ?? 'truthy');
                errorMessage += `\n  Expected: ${expectedValue}\n  Received: ${this.stringify(this.actual)}`;
            }

            const stack = callerStack || new Error().stack;
            const { lineNumber, codeSnippet } = resolveAssertionContext(stack);
            throw new AssertionError(errorMessage, runtimeState.currentTestFile, lineNumber, undefined, codeSnippet);
        }
    }

    private stringify(value: any): string {
        if (value === undefined) return 'undefined';
        if (value === null) return 'null';
        if (typeof value === 'string') return `"${value}"`;
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);
        if (typeof value === 'function') return 'Function';
        if (Array.isArray(value)) return `[${value.map((item) => this.stringify(item)).join(', ')}]`;
        if (typeof value === 'object') {
            const keys = Object.keys(value);
            if (keys.length === 0) return '{}';
            return `{ ${keys.slice(0, 3).map((key) => `${key}: ${this.stringify(value[key])}`).join(', ')}${keys.length > 3 ? '...' : ''} }`;
        }
        return String(value);
    }

    private async handleAsyncAssertion(value: any, assertion: (actual: any) => void): Promise<any> {
        try {
            const resolvedValue = await this.actual;
            if (this.isNot) {
                throw new Error('Promise resolved when it should have rejected');
            }
            assertion(resolvedValue);
            return Promise.resolve(resolvedValue);
        } catch (error: any) {
            if (this.isNot) {
                return Promise.resolve(undefined);
            }

            if (typeof value === 'string') {
                this.assertCondition(
                    error.message?.includes(value),
                    `Expected error message to include "${value}"`
                );
            } else if (value instanceof RegExp) {
                this.assertCondition(
                    value.test(error.message),
                    `Expected error message to match ${value}`
                );
            }

            return Promise.resolve(undefined);
        }
    }

    toBe(value: any): any {
        const stack = new Error().stack;
        if (this.isAsync) {
            return this.handleAsyncAssertion(value, (actual) => {
                this.expected = value;
                this.assertCondition(actual === value, 'Expected values to be strictly equal (using ===)', false, undefined, stack);
                if (typeof actual !== typeof value) {
                    throw new Error(`Types don't match: expected ${typeof value} but got ${typeof actual}`);
                }
            });
        }

        this.expected = value;
        this.assertCondition(this.actual === value, 'Expected values to be strictly equal (using ===)', true, undefined, stack);
        if (typeof this.actual !== typeof value) {
            throw new Error(`Types don't match: expected ${typeof value} but got ${typeof this.actual}`);
        }
    }

    toEqual(value: any) {
        const stack = new Error().stack;
        this.expected = value;
        const isEqual = (left: any, right: any): boolean => {
            if (left === right) return true;
            if (left == null || right == null) return left === right;
            if (typeof left !== typeof right) return false;
            if (typeof left !== 'object') return left === right;
            if (Array.isArray(left) !== Array.isArray(right)) return false;
            if (Array.isArray(left)) {
                if (left.length !== right.length) return false;
                return left.every((item, index) => isEqual(item, right[index]));
            }
            const keysLeft = Object.keys(left);
            const keysRight = Object.keys(right);
            if (keysLeft.length !== keysRight.length) return false;
            return keysLeft.every((key) => isEqual(left[key], right[key]));
        };
        this.assertCondition(isEqual(this.actual, value), 'Expected values to be deeply equal', false, undefined, stack);
    }

    toBeTruthy() {
        this.assertCondition(!!this.actual, 'Expected value to be truthy', false, undefined, new Error().stack);
    }

    toBeFalsy() {
        this.assertCondition(!this.actual, 'Expected value to be falsy', false, undefined, new Error().stack);
    }

    toBeNull() {
        this.assertCondition(this.actual === null, 'Expected value to be null', false, undefined, new Error().stack);
    }

    toBeUndefined() {
        this.assertCondition(this.actual === undefined, 'Expected value to be undefined', false, undefined, new Error().stack);
    }

    toBeDefined() {
        this.assertCondition(this.actual !== undefined, 'Expected value to be defined', false, undefined, new Error().stack);
    }

    toBeGreaterThan(value: number) {
        const stack = new Error().stack;
        this.expected = value;
        this.assertCondition(typeof this.actual === 'number' && this.actual > value, `Expected ${this.stringify(this.actual)} to be greater than ${value}`, true, String(value), stack);
    }

    toBeGreaterThanOrEqual(value: number) {
        const stack = new Error().stack;
        this.expected = value;
        this.assertCondition(typeof this.actual === 'number' && this.actual >= value, `Expected ${this.stringify(this.actual)} to be greater than or equal to ${value}`, true, `${value}`, stack);
    }

    toBeLessThan(value: number) {
        const stack = new Error().stack;
        this.expected = value;
        this.assertCondition(typeof this.actual === 'number' && this.actual < value, `Expected ${this.stringify(this.actual)} to be less than ${value}`, true, String(value), stack);
    }

    toBeLessThanOrEqual(value: number) {
        const stack = new Error().stack;
        this.expected = value;
        this.assertCondition(typeof this.actual === 'number' && this.actual <= value, `Expected ${this.stringify(this.actual)} to be less than or equal to ${value}`, true, `${value}`, stack);
    }

    toContain(value: any) {
        const stack = new Error().stack;
        this.expected = value;
        if (typeof this.actual === 'string') {
            this.assertCondition(this.actual.includes(value), `Expected "${this.actual}" to contain "${value}"`, false, undefined, stack);
        } else if (Array.isArray(this.actual)) {
            this.assertCondition(this.actual.some((item) => this.deepEqual(item, value)), `Expected array to contain ${this.stringify(value)}`, false, undefined, stack);
        } else {
            throw new Error(`toContain expects string or array, got ${typeof this.actual}`);
        }
    }

    toHaveLength(length: number) {
        const stack = new Error().stack;
        this.expected = length;
        const actualLength = this.actual?.length;
        this.assertCondition(actualLength === length, `Expected length to be ${length}, but got ${actualLength}`, false, undefined, stack);
    }

    toThrow(error?: any): any {
        if (this.isAsync) {
            return this.handleAsyncAssertion(error, () => {
            });
        }

        let threw = false;
        let thrownError: any = null;
        try {
            if (typeof this.actual === 'function') {
                this.actual();
            }
        } catch (caughtError) {
            threw = true;
            thrownError = caughtError;
        }

        this.assertCondition(threw, 'Expected function to throw an error');
        if (error) {
            if (typeof error === 'string') {
                this.assertCondition(thrownError.message.includes(error), `Expected error message to include "${error}"`);
            } else if (error instanceof RegExp) {
                this.assertCondition(error.test(thrownError.message), `Expected error message to match ${error}`);
            }
        }
    }

    toMatch(pattern: RegExp | string) {
        this.expected = pattern;
        const text = String(this.actual);
        if (pattern instanceof RegExp) {
            this.assertCondition(pattern.test(text), `Expected "${text}" to match ${pattern}`);
        } else {
            this.assertCondition(text.includes(pattern), `Expected "${text}" to contain "${pattern}"`);
        }
    }

    toBeInstanceOf(classType: any) {
        this.expected = classType;
        this.assertCondition(this.actual instanceof classType, `Expected value to be instance of ${classType.name}`);
    }

    toHaveProperty(path: string | string[], value?: any) {
        const keys = Array.isArray(path) ? path : path.split('.');
        let object = this.actual;
        for (const key of keys) {
            if (object == null || !Object.hasOwnProperty.call(object, key)) {
                throw new Error(`Expected object to have property "${path}"`);
            }
            object = object[key];
        }

        if (value !== undefined) {
            this.assertCondition(this.deepEqual(object, value), `Expected property "${path}" to equal ${this.stringify(value)}`);
        }
    }

    toMatchObject(properties: Record<string, any>) {
        const stack = new Error().stack;
        this.expected = properties;
        const checkSubset = (actual: any, expected: Record<string, any>, path: string): boolean => {
            if (actual == null || typeof actual !== 'object') return false;
            for (const key of Object.keys(expected)) {
                const expectedValue = expected[key];
                const actualValue = actual[key];
                const fieldPath = `${path}${key}`;
                if (expectedValue !== null && typeof expectedValue === 'object' && !Array.isArray(expectedValue)) {
                    if (!checkSubset(actualValue, expectedValue, `${fieldPath}.`)) return false;
                } else if (!this.deepEqual(actualValue, expectedValue)) {
                    this.assertCondition(false, `Expected property "${fieldPath}" to equal ${this.stringify(expectedValue)}`, false, undefined, stack);
                    return false;
                }
            }
            return true;
        };
        this.assertCondition(checkSubset(this.actual, properties, ''), 'Expected object to match subset', false, undefined, stack);
    }

    toBeCalled() {
        this.assertCondition(this.actual._isMock && this.actual._calls.length > 0, 'Expected mock function to have been called');
    }

    toBeCalledTimes(times: number) {
        this.assertCondition(this.actual._isMock && this.actual._calls.length === times, `Expected mock to be called ${times} times, but was called ${this.actual._calls?.length || 0} times`);
    }

    toBeCalledWith(...args: any[]) {
        this.assertCondition(this.actual._isMock && this.actual._calls.some((call: any[]) => this.deepEqual(call, args)), `Expected mock to be called with ${this.stringify(args)}`);
    }

    lastReturnedWith(value: any) {
        const lastResult = this.actual._results?.[this.actual._results.length - 1];
        this.assertCondition(lastResult && this.deepEqual(lastResult.value, value), `Expected last call to return ${this.stringify(value)}`);
    }

    private deepEqual(left: any, right: any): boolean {
        return JSON.stringify(left) === JSON.stringify(right);
    }
}

export function expect(actual: any): TestMatchers<any> {
    return new Expect(actual);
}