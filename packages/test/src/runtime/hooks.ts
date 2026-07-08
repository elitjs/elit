import { runtimeState } from './state';
import type { HookFunction } from './types';

export const beforeAll = (fn: HookFunction) => runtimeState.beforeAllHooks.push(fn);
export const afterAll = (fn: HookFunction) => runtimeState.afterAllHooks.push(fn);
export const beforeEach = (fn: HookFunction) => runtimeState.beforeEachHooks.push(fn);
export const afterEach = (fn: HookFunction) => runtimeState.afterEachHooks.push(fn);