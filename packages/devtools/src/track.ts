import type { State } from '@elitjs/core';
import { ensureBridge } from './registry';
import type { RouterEntry, RouterLike, StateEntry } from './types';

export function trackState<T>(name: string, state: State<T>): State<T> {
    const bridge = ensureBridge();

    if (bridge.states.has(name)) {
        const existing = bridge.states.get(name) as StateEntry | undefined;
        if (existing) {
            existing.state.destroy?.();
            bridge.states.delete(name);
        }
    }

    let subscriberCount = 0;
    let updateCount = 0;
    let lastUpdatedAt = Date.now();
    const createdAt = lastUpdatedAt;
    const initialValue = state.value as T;

    const entry: StateEntry<T> = {
        name,
        state,
        get subscriberCount() {
            return subscriberCount;
        },
        get updateCount() {
            return updateCount;
        },
        get lastUpdatedAt() {
            return lastUpdatedAt;
        },
        createdAt,
        initialValue,
        peek: () => state.value,
    };

    bridge.states.set(name, entry as StateEntry);

    try {
        state.subscribe(() => {
            lastUpdatedAt = Date.now();
            updateCount += 1;
            bridge.pushPerfEvent({
                type: 'state-update',
                name,
                timestamp: lastUpdatedAt,
            });
        });
    } catch {
        // Subscribe may throw on read-only states; safe to ignore.
    }

    const originalSubscribe = state.subscribe.bind(state);
    const wrappedSubscribe = (fn: (value: T) => void) => {
        subscriberCount += 1;
        const unsubscribe = originalSubscribe(fn);
        return () => {
            subscriberCount = Math.max(0, subscriberCount - 1);
            unsubscribe();
        };
    };

    const wrappedState: State<T> = {
        get value() {
            return state.value;
        },
        set value(next: T) {
            state.value = next;
        },
        subscribe: wrappedSubscribe,
        destroy: () => {
            state.destroy?.();
            bridge.states.delete(name);
        },
    };

    return wrappedState;
}

export function untrackState(name: string): void {
    const bridge = ensureBridge();
    bridge.states.delete(name);
}

export function trackRouter(name: string, router: RouterLike): RouterLike {
    const bridge = ensureBridge();

    const existing = bridge.routers.get(name);
    if (existing) {
        existing.destroy();
        bridge.routers.delete(name);
    }

    const history: RouterEntry['history'] = [];
    let navigationCount = 0;
    let lastNavigatedAt = Date.now();
    let unsub: (() => void) | null = null;
    let destroyed = false;

    const snapshot = (): RouterEntry['current'] => {
        const route = router.currentRoute.value;
        return {
            name: route?.name,
            path: route?.path ?? '',
            params: route?.params,
            query: route?.query,
            hash: route?.hash,
        };
    };

    try {
        unsub = router.currentRoute.subscribe(() => {
            navigationCount += 1;
            lastNavigatedAt = Date.now();
            const current = snapshot();
            history.push(current);
            if (history.length > 50) {
                history.shift();
            }
            bridge.pushPerfEvent({
                type: 'router-nav',
                name,
                timestamp: lastNavigatedAt,
            });
        });
    } catch {
        unsub = null;
    }

    const entry: RouterEntry = {
        name,
        get current() {
            return snapshot();
        },
        get history() {
            return history;
        },
        get navigationCount() {
            return navigationCount;
        },
        get lastNavigatedAt() {
            return lastNavigatedAt;
        },
        destroy() {
            if (destroyed) return;
            destroyed = true;
            unsub?.();
            bridge.routers.delete(name);
        },
    };

    bridge.routers.set(name, entry);
    return router;
}

export function untrackRouter(name: string): void {
    const bridge = ensureBridge();
    const entry = bridge.routers.get(name);
    entry?.destroy();
}
