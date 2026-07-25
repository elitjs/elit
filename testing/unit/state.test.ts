/// <reference path="../../packages/test/src/globals.d.ts" />

import { createSharedState } from '../../packages/state/src';

const originalWindow = (globalThis as any).window;
const originalLocation = (globalThis as any).location;
const originalWebSocket = (globalThis as any).WebSocket;

describe('shared state websocket url resolution', () => {
    const urls: string[] = [];

    class MockWebSocket {
        readyState = 0;

        constructor(url: string) {
            urls.push(url);
        }

        addEventListener(_type: string, _listener: (...args: any[]) => void) {
            return;
        }

        removeEventListener(_type: string, _listener: (...args: any[]) => void) {
            return;
        }

        send(_data: string) {
            return;
        }

        close() {
            this.readyState = 3;
        }
    }

    beforeEach(() => {
        urls.length = 0;
        (globalThis as any).window = {};
        (globalThis as any).location = {
            host: 'localhost:3000',
            protocol: 'http:'
        };
        (globalThis as any).WebSocket = MockWebSocket;
    });

    afterEach(() => {
        (globalThis as any).window = originalWindow;
        (globalThis as any).location = originalLocation;
        (globalThis as any).WebSocket = originalWebSocket;
    });

    it('uses the internal websocket endpoint by default', () => {
        const state = createSharedState('counter', 0);

        expect(urls[0]).toBe('ws://localhost:3000/__elit_ws');

        state.destroy();
    });

    it('rewrites bare websocket origins to the internal websocket endpoint', () => {
        const state = createSharedState('counter', 0, 'ws://localhost:3000');

        expect(urls[0]).toBe('ws://localhost:3000/__elit_ws');

        state.destroy();
    });

    it('preserves explicit websocket paths', () => {
        const state = createSharedState('counter', 0, 'ws://localhost:3000/chat');

        expect(urls[0]).toBe('ws://localhost:3000/chat');

        state.destroy();
    });
});

describe('shared state reconnection', () => {
    let instances = 0;
    let closeListeners: Array<() => void> = [];
    const warnings: string[] = [];
    const originalWarn = console.warn;

    class ClosingMockWebSocket {
        readyState = 0;

        constructor(_url: string) {
            instances += 1;
        }

        addEventListener(type: string, listener: (...args: any[]) => void) {
            if (type === 'close') {
                closeListeners.push(listener as () => void);
            }
        }

        removeEventListener() {
            return;
        }

        send() {
            return;
        }

        close() {
            this.readyState = 3;
        }
    }

    beforeEach(() => {
        instances = 0;
        closeListeners = [];
        warnings.length = 0;
        (globalThis as any).window = {};
        (globalThis as any).location = { host: 'localhost:3000', protocol: 'http:' };
        (globalThis as any).WebSocket = ClosingMockWebSocket;
        console.warn = (msg: string) => warnings.push(msg);
    });

    afterEach(() => {
        (globalThis as any).window = originalWindow;
        (globalThis as any).location = originalLocation;
        (globalThis as any).WebSocket = originalWebSocket;
        console.warn = originalWarn;
    });

    it('does not reconnect after destroy even if a close event fires late', () => {
        const state = createSharedState('counter', 0);
        expect(instances).toBe(1);

        state.destroy();
        // Simulate a close event arriving after teardown — must not resurrect.
        closeListeners.forEach((fn) => fn());

        expect(instances).toBe(1);
    });

    it('stops retrying and warns once when the reconnect limit is reached', () => {
        const state = createSharedState('counter', 0);
        expect(instances).toBe(1);

        (state as any).maxReconnectAttempts = 0;
        closeListeners.forEach((fn) => fn());

        expect(instances).toBe(1);
        expect(warnings).toHaveLength(1);
    });
});