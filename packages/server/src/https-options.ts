import { readFileSync } from 'node:fs';

import selfsigned from 'selfsigned';

import type { HttpsCertConfig } from './public-types';

export type { HttpsCertConfig } from './public-types';

export interface ResolvedHttpsOptions {
    key: string | Buffer;
    cert: string | Buffer;
    ca?: string | Buffer;
    passphrase?: string;
}

let cachedDevCert: { key: string; cert: string } | null = null;

/**
 * Generate (once per process) an in-memory self-signed certificate for local
 * HTTPS development. The CN is `localhost`; browsers will show an untrusted-
 * certificate warning, which is expected for dev. For production or preview
 * behind no TLS-terminating proxy, supply real certs via `https: { cert, key }`.
 */
export function generateDevCert(): { key: string; cert: string } {
    if (cachedDevCert) {
        return cachedDevCert;
    }

    const pems = selfsigned.generate(
        [{ name: 'commonName', value: 'localhost' }],
        { keySize: 2048, days: 30, algorithm: 'sha256' },
    );

    cachedDevCert = { key: pems.private, cert: pems.cert };
    return cachedDevCert;
}

/** PEM content always carries a BEGIN marker; otherwise treat the value as a path. */
function looksLikeFilePath(value: string): boolean {
    return !value.includes('-----BEGIN');
}

function readCertValue(value: string): string {
    return looksLikeFilePath(value) ? readFileSync(value, 'utf8') : value;
}

/**
 * Resolve the `https` option into concrete cert/key material.
 *
 * - `true`                  → auto-generated self-signed dev certificate.
 * - `{ cert, key }`         → user-supplied PEM content or file paths.
 * - `{ cert, key }` partial → throws. The caller intended custom certs, so
 *   silently falling back to a dev cert would mask the misconfiguration.
 */
export function resolveHttpsOptions(https: true | HttpsCertConfig): ResolvedHttpsOptions {
    if (https === true) {
        return generateDevCert();
    }

    if (!https.cert || !https.key) {
        throw new Error(
            'Elit HTTPS config requires both "cert" and "key" (PEM content or file path). Use `https: true` for an auto-generated dev certificate.',
        );
    }

    const resolved: ResolvedHttpsOptions = {
        cert: readCertValue(https.cert),
        key: readCertValue(https.key),
    };

    if (https.ca) {
        resolved.ca = readCertValue(https.ca);
    }

    if (https.passphrase) {
        resolved.passphrase = https.passphrase;
    }

    return resolved;
}
