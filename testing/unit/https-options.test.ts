/// <reference path="../../packages/test/src/globals.d.ts" />

import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { generateDevCert, resolveHttpsOptions } from '../../packages/server/src/https-options';

const PEM_CERT = '-----BEGIN CERTIFICATE-----\nAAAA\n-----END CERTIFICATE-----';
const PEM_KEY = '-----BEGIN PRIVATE KEY-----\nBBBB\n-----END PRIVATE KEY-----';

describe('resolveHttpsOptions', () => {
    it('generates a self-signed dev certificate for `true`', () => {
        const opts = resolveHttpsOptions(true);
        expect(String(opts.cert)).toContain('-----BEGIN CERTIFICATE-----');
        expect(String(opts.key)).toContain('-----BEGIN');
    });

    it('caches the generated dev certificate across calls', () => {
        const first = generateDevCert();
        const second = generateDevCert();
        expect(first).toBe(second);
    });

    it('passes inline PEM cert/key content through unchanged', () => {
        const opts = resolveHttpsOptions({ cert: PEM_CERT, key: PEM_KEY });
        expect(opts.cert).toBe(PEM_CERT);
        expect(opts.key).toBe(PEM_KEY);
    });

    it('reads cert/key from file paths when given non-PEM strings', () => {
        const certPath = join(tmpdir(), `elit-cert-${Math.random().toString(36).slice(2)}.pem`);
        const keyPath = join(tmpdir(), `elit-key-${Math.random().toString(36).slice(2)}.pem`);
        writeFileSync(certPath, PEM_CERT);
        writeFileSync(keyPath, PEM_KEY);

        const opts = resolveHttpsOptions({ cert: certPath, key: keyPath });
        expect(opts.cert).toBe(PEM_CERT);
        expect(opts.key).toBe(PEM_KEY);
    });

    it('throws when cert/key config is missing the key', () => {
        expect(() => resolveHttpsOptions({ cert: PEM_CERT, key: '' })).toThrow(/requires both/);
    });
});
