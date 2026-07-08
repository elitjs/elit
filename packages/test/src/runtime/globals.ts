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