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