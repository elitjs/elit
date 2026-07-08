/// <reference path="../../packages/test/src/globals.d.ts" />

import { WebSocketServer } from '../../packages/ws/src';

describe('websocket server path handling', () => {
    it('matches the pathname when the request includes query parameters', () => {
        const server = new WebSocketServer({ noServer: true, path: '/chat' });

        expect(server.shouldHandle({ url: '/chat?room=general' } as any)).toBe(true);
        expect(server.shouldHandle({ url: '/chat' } as any)).toBe(true);
        expect(server.shouldHandle({ url: '/other?room=general' } as any)).toBe(false);

        server.close();
    });

    it('treats root path as an exact match instead of a wildcard', () => {
        const server = new WebSocketServer({ noServer: true, path: '/' });

        expect(server.shouldHandle({ url: '/' } as any)).toBe(true);
        expect(server.shouldHandle({ url: '/chat' } as any)).toBe(false);

        server.close();
    });
});