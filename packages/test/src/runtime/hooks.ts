import { runtimeState } from './state';
import type { HookFunction } from './types';

// Hooks attach to the suite that is being registered when they are called, so a
// hook declared inside `describe(...)` only applies to that suite's tests, while a
// hook declared at the top level of a file attaches to the root suite.
export const beforeAll = (fn: HookFunction) => runtimeState.currentSuite.beforeAllHooks.push(fn);
export const afterAll = (fn: HookFunction) => runtimeState.currentSuite.afterAllHooks.push(fn);
export const beforeEach = (fn: HookFunction) => runtimeState.currentSuite.beforeEachHooks.push(fn);
export const afterEach = (fn: HookFunction) => runtimeState.currentSuite.afterEachHooks.push(fn);
