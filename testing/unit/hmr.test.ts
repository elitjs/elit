/// <reference path="../../packages/test/src/globals.d.ts" />

import { createHmrWebSocketUrl } from '../../packages/hmr/src/utils';

describe('createHmrWebSocketUrl', () => {
    const makeWindow = (host: string, protocol: string) =>
        ({ location: { host, protocol } }) as unknown as Window;

    it('uses the page origin and the internal ws path over http', () => {
        const url = createHmrWebSocketUrl(makeWindow('localhost:3000', 'http:'));
        expect(url).toBe('ws://localhost:3000/__elit_ws');
    });

    it('upgrades to wss and omits the default https port (Cloudflare case)', () => {
        const url = createHmrWebSocketUrl(makeWindow('web-deploy.ndkit.com', 'https:'));
        expect(url).toBe('wss://web-deploy.ndkit.com/__elit_ws');
    });

    it('preserves a non-default public port behind a proxy', () => {
        const url = createHmrWebSocketUrl(makeWindow('web-deploy.ndkit.com:8443', 'https:'));
        expect(url).toBe('wss://web-deploy.ndkit.com:8443/__elit_ws');
    });
});
