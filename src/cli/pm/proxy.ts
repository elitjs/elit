import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { createServer as createNetServer } from 'node:net';
import { lookup as dnsLookup } from 'node:dns/promises';
import type { Duplex } from 'node:stream';

import type { PmProxyConfig } from '../../shares/config';

/**
 * IPv4 ranges that are never safe to reach from a PM proxy:
 *   0.0.0.0/8       – "this network" (often used for SSRF)
 *   10.0.0.0/8      – RFC 1918 private
 *   100.64.0.0/10   – carrier-grade NAT
 *   127.0.0.0/8     – loopback
 *   169.254.0.0/16  – link-local
 *   172.16.0.0/12   – RFC 1918 private
 *   192.0.2.0/24    – documentation
 *   192.88.99.0/24  – 6to4 relay
 *   192.168.0.0/16  – RFC 1918 private
 *   198.18.0.0/15   – benchmarking
 *   198.51.100.0/24 – documentation
 *   203.0.113.0/24  – documentation
 *   224.0.0.0/4     – multicast
 *   240.0.0.0/4     – reserved
 */
const BLOCKED_IPV4_PREFIXES: readonly string[] = [
    '0.', '10.', '100.64.', '100.65.', '100.66.', '100.67.', '100.68.', '100.69.',
    '100.70.', '100.71.', '100.72.', '100.73.', '100.74.', '100.75.', '100.76.',
    '100.77.', '100.78.', '100.79.', '100.80.', '100.81.', '100.82.', '100.83.',
    '100.84.', '100.85.', '100.86.', '100.87.', '100.88.', '100.89.', '100.90.',
    '100.91.', '100.92.', '100.93.', '100.94.', '100.95.', '100.96.', '100.97.',
    '100.98.', '100.99.', '100.100.', '100.101.', '100.102.', '100.103.', '100.104.',
    '100.105.', '100.106.', '100.107.', '100.108.', '100.109.', '100.110.', '100.111.',
    '100.112.', '100.113.', '100.114.', '100.115.', '100.116.', '100.117.', '100.118.',
    '100.119.', '100.120.', '100.121.', '100.122.', '100.123.', '100.124.', '100.125.',
    '100.126.', '100.127.',
    '127.',
    '169.254.',
    '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.',
    '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.',
    '172.30.', '172.31.',
    '192.0.2.', '192.88.99.', '192.168.',
    '198.18.', '198.19.', '198.51.100.', '203.0.113.',
    '224.', '225.', '226.', '227.', '228.', '229.', '230.', '231.', '232.', '233.',
    '234.', '235.', '236.', '237.', '238.', '239.', '240.', '241.', '242.', '243.',
    '244.', '245.', '246.', '247.', '248.', '249.', '250.', '251.', '252.', '253.',
    '254.', '255.',
];

const ALLOWED_PROXY_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Returns true when `hostname` is a numeric IPv4 address that falls inside a
 * blocked range (private, loopback, multicast, reserved, link-local, etc.).
 */
function isBlockedIpv4(hostname: string): boolean {
    const octets = hostname.split('.');
    if (octets.length !== 4) return false;

    const joined = hostname;
    return BLOCKED_IPV4_PREFIXES.some((prefix) => joined.startsWith(prefix));
}

/**
 * Returns true when `hostname` is an IPv6 address that resolves to loopback or
 * is the IPv4-mapped form of a blocked address.
 */
function isBlockedIpv6(hostname: string): boolean {
    const lower = hostname.toLowerCase();
    if (lower === '::1' || lower === '::' || lower === '0:0:0:0:0:0:0:1' || lower === '0:0:0:0:0:0:0:0') {
        return true;
    }

    // IPv4-mapped IPv6: ::ffff:A.B.C.D
    const ffffMatch = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (ffffMatch) {
        return isBlockedIpv4(ffffMatch[1]);
    }

    // IPv4-compatible IPv6: ::A.B.C.D
    const compatMatch = lower.match(/^::(\d+\.\d+\.\d+\.\d+)$/);
    if (compatMatch) {
        return isBlockedIpv4(compatMatch[1]);
    }

    return false;
}

/**
 * Validates that a URL hostname is not a blocked IP address.
 */
function isSafeHostname(hostname: string): boolean {
    if (!hostname) return false;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return !isBlockedIpv4(hostname);
    if (/^\[.*\]$/.test(hostname)) return !isBlockedIpv6(hostname.slice(1, -1));
    if (hostname.includes(':')) return !isBlockedIpv6(hostname);
    // Non-IP hostnames (e.g. "example.com") need DNS resolution check.
    return true;
}

/**
 * Resolves a hostname through DNS and rejects blocked IP results.
 * This prevents DNS rebinding attacks where a domain initially resolves to
 * a safe IP but later resolves to an internal one.
 */
async function safeResolveHostname(hostname: string): Promise<string> {
    try {
        const result = await dnsLookup(hostname);
        const ip = result.address;

        if (isBlockedIpv4(ip) || isBlockedIpv6(ip)) {
            throw new Error(`PM proxy target resolved to a blocked address: ${ip}`);
        }

        return ip;
    } catch (error) {
        if (error instanceof Error && error.message.includes('blocked address')) {
            throw error;
        }

        throw new Error(`PM proxy failed to resolve target hostname "${hostname}": ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Validates that a target URL is safe for the PM proxy to connect to.
 * Rejects blocked IP ranges, dangerous protocols, and resolves DNS to
 * prevent rebinding attacks.
 */
export async function validateProxyTargetUrl(target: URL): Promise<void> {
    if (!ALLOWED_PROXY_PROTOCOLS.has(target.protocol)) {
        throw new Error(`PM proxy target protocol "${target.protocol}" is not allowed. Only http: and https: are permitted.`);
    }

    const hostname = target.hostname;

    if (!isSafeHostname(hostname)) {
        throw new Error(`PM proxy target "${hostname}" resolves to a blocked address and is not allowed.`);
    }

    // For non-IP hostnames, resolve DNS and verify the result is not a blocked IP.
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) && !/^\[.*\]$/.test(hostname)) {
        await safeResolveHostname(hostname);
    }
}

/**
 * Sanitizes an incoming request URL path to prevent path-based SSRF.
 * Strips credentials, fragments, and prevents protocol smuggling via "@"
 * characters that could redirect to an arbitrary host.
 */
export function sanitizeProxyRequestPath(requestUrl: string): string {
    if (!requestUrl || requestUrl === '/') return '/';

    try {
        const normalizedInput = requestUrl.replace(/\\/g, '/');
        const parsed = new URL(normalizedInput, 'http://placeholder');

        if (parsed.username || parsed.password || parsed.hostname !== 'placeholder' || parsed.port) {
            return '/';
        }

        const pathname = parsed.pathname || '/';
        let decodedPathname = pathname;
        try {
            decodedPathname = decodeURIComponent(pathname);
        } catch {
            return '/';
        }

        const lowerPath = pathname.toLowerCase();
        if (lowerPath.includes('%2f') || lowerPath.includes('%5c') || lowerPath.includes('%40') || lowerPath.includes('%00')) {
            return '/';
        }

        const segments = decodedPathname.split('/');
        if (segments.some((segment) => segment === '.' || segment === '..')) {
            return '/';
        }

        const sanitized = pathname + parsed.search;
        return sanitized.startsWith('/') ? (sanitized || '/') : `/${sanitized}`;
    } catch {
        return '/';
    }
}

export interface PmProxyController {
    setTarget(targetUrl: string | undefined): void;
    setTargets(targetUrls: string[]): void;
    close(): Promise<void>;
}

export function resolvePmProxyHost(proxy: PmProxyConfig): string {
    return proxy.host?.trim() || '0.0.0.0';
}

export function resolvePmProxyTargetHost(proxy: PmProxyConfig): string {
    return proxy.targetHost?.trim() || '127.0.0.1';
}

export function resolvePmProxyEnvVar(proxy: PmProxyConfig): string {
    return proxy.envVar?.trim() || 'PORT';
}

export function buildPmProxyTargetUrl(proxy: PmProxyConfig, targetPort: number): string {
    return `http://${resolvePmProxyTargetHost(proxy)}:${targetPort}`;
}

export function rewritePmProxyHealthCheckUrl(url: string, targetHost: string, targetPort: number): string {
    const targetUrl = new URL(url);
    targetUrl.hostname = targetHost;
    targetUrl.port = String(targetPort);
    return targetUrl.toString();
}

export async function allocatePmProxyTargetPort(host = '127.0.0.1'): Promise<number> {
    const server = createNetServer();

    return await new Promise<number>((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, host, () => {
            const address = server.address();
            if (!address || typeof address === 'string') {
                server.close(() => reject(new Error('Failed to allocate an internal PM proxy port.')));
                return;
            }

            const port = address.port;
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(port);
            });
        });
    });
}

function buildPmProxyHeaders(headersInput: Record<string, string | string[] | undefined>, host: string): Record<string, string | string[]> {
    const headers: Record<string, string | string[]> = {};
    for (const [key, value] of Object.entries(headersInput)) {
        if (value !== undefined) {
            headers[key] = value;
        }
    }
    headers.host = host;
    return headers;
}

function writeRawHttpResponse(socket: Duplex, statusCode: number, statusMessage: string, headers: Record<string, string | string[] | number | undefined>): void {
    const lines = [`HTTP/1.1 ${statusCode} ${statusMessage}`];
    for (const [key, value] of Object.entries(headers)) {
        if (value === undefined) {
            continue;
        }

        if (Array.isArray(value)) {
            for (const item of value) {
                lines.push(`${key}: ${item}`);
            }
            continue;
        }

        lines.push(`${key}: ${value}`);
    }
    socket.write(`${lines.join('\r\n')}\r\n\r\n`);
}

export async function createPmProxyController(proxy: PmProxyConfig): Promise<PmProxyController> {
    let targets: URL[] = [];
    let nextTargetIndex = 0;

    const setResolvedTargets = (nextTargets: URL[]): void => {
        const unchanged = nextTargets.length === targets.length
            && nextTargets.every((target, index) => targets[index]?.href === target.href);

        targets = nextTargets;
        if (targets.length === 0) {
            nextTargetIndex = 0;
            return;
        }

        if (!unchanged) {
            nextTargetIndex = nextTargetIndex % targets.length;
        }
    };

    const pickTarget = (): URL | null => {
        if (targets.length === 0) {
            return null;
        }

        const target = targets[nextTargetIndex % targets.length];
        nextTargetIndex = (nextTargetIndex + 1) % targets.length;
        return target;
    };

    /**
     * Validates a target before proxying. Rejects targets with blocked IPs,
     * disallowed protocols, or DNS results that resolve to blocked IPs.
     */
    const validateTarget = async (target: URL): Promise<void> => {
        await validateProxyTargetUrl(target);
    };

    const server = createServer((req, res) => {
        const target = pickTarget();
        if (!target) {
            res.statusCode = 503;
            res.end('PM proxy target is not ready.');
            return;
        }

        const sanitizedPath = sanitizeProxyRequestPath(req.url || '/');
        const requestLib = target.protocol === 'https:' ? httpsRequest : httpRequest;
        const headers = buildPmProxyHeaders(req.headers, target.host);

        if (!ALLOWED_PROXY_PROTOCOLS.has(target.protocol)) {
            res.statusCode = 400;
            res.end('PM proxy rejected unsafe target protocol.');
            return;
        }

        validateTarget(target).then(() => {
            const proxyReq = requestLib({
                protocol: target.protocol,
                hostname: target.hostname,
                port: target.port || undefined,
                path: sanitizedPath,
                method: req.method,
                headers,
            }, (proxyRes) => {
                const outgoingHeaders: Record<string, string | number | string[]> = {};
                for (const [key, value] of Object.entries(proxyRes.headers)) {
                    if (value !== undefined) {
                        outgoingHeaders[key] = value;
                    }
                }

                res.writeHead(proxyRes.statusCode || 200, outgoingHeaders);
                proxyRes.pipe(res);
            });

            proxyReq.on('error', (error) => {
                if (!res.headersSent) {
                    res.statusCode = 502;
                }
                res.end(`PM proxy error: ${error.message}`);
            });

            req.pipe(proxyReq);
        }).catch((error) => {
            if (!res.headersSent) {
                res.statusCode = 403;
            }
            res.end(`PM proxy blocked target: ${error instanceof Error ? error.message : String(error)}`);
        });
    });

    server.on('upgrade', (req, socket, head) => {
        const target = pickTarget();
        if (!target) {
            writeRawHttpResponse(socket, 503, 'Service Unavailable', {
                connection: 'close',
                'content-length': 0,
            });
            socket.destroy();
            return;
        }

        const sanitizedPath = sanitizeProxyRequestPath(req.url || '/');
        const requestLib = target.protocol === 'https:' ? httpsRequest : httpRequest;
        const targetUrl = new URL(sanitizedPath, target);

        // Reject if the constructed URL escaped to a different host or protocol.
        if (targetUrl.hostname !== target.hostname || targetUrl.port !== target.port || !ALLOWED_PROXY_PROTOCOLS.has(targetUrl.protocol)) {
            writeRawHttpResponse(socket, 400, 'Bad Request', {
                connection: 'close',
                'content-length': 0,
            });
            socket.destroy();
            return;
        }

        validateTarget(target).then(() => {
            const proxyReq = requestLib(targetUrl, {
                method: req.method,
                headers: buildPmProxyHeaders(req.headers, target.host),
            });

            proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
                writeRawHttpResponse(socket, proxyRes.statusCode || 101, proxyRes.statusMessage || 'Switching Protocols', proxyRes.headers);
                if (head.length > 0) {
                    proxySocket.write(head);
                }
                if (proxyHead.length > 0) {
                    socket.write(proxyHead);
                }

                socket.on('error', () => proxySocket.destroy());
                proxySocket.on('error', () => socket.destroy());
                proxySocket.pipe(socket);
                socket.pipe(proxySocket);
            });

            proxyReq.on('response', (proxyRes) => {
                writeRawHttpResponse(socket, proxyRes.statusCode || 502, proxyRes.statusMessage || 'Bad Gateway', proxyRes.headers);
                proxyRes.pipe(socket);
            });

            proxyReq.on('error', (error) => {
                writeRawHttpResponse(socket, 502, 'Bad Gateway', {
                    connection: 'close',
                    'content-type': 'text/plain; charset=utf-8',
                    'content-length': Buffer.byteLength(`PM proxy error: ${error.message}`),
                });
                socket.end(`PM proxy error: ${error.message}`);
            });

            proxyReq.end();
        }).catch((error) => {
            writeRawHttpResponse(socket, 403, 'Forbidden', {
                connection: 'close',
                'content-type': 'text/plain; charset=utf-8',
                'content-length': Buffer.byteLength(`PM proxy blocked target: ${error instanceof Error ? error.message : String(error)}`),
            });
            socket.end(`PM proxy blocked target: ${error instanceof Error ? error.message : String(error)}`);
        });
    });

    await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(proxy.port, resolvePmProxyHost(proxy), () => resolve());
    });

    return {
        setTarget(targetUrl: string | undefined) {
            if (targetUrl) {
                const parsed = new URL(targetUrl);
                validateProxyTargetUrl(parsed).then(() => {
                    setResolvedTargets([parsed]);
                }).catch((error) => {
                    console.error(`[PM proxy] Blocked setTarget: ${error instanceof Error ? error.message : String(error)}`);
                    setResolvedTargets([]);
                });
            } else {
                setResolvedTargets([]);
            }
        },
        setTargets(targetUrls: string[]) {
            Promise.all(targetUrls.map((url) => validateProxyTargetUrl(new URL(url))))
                .then(() => {
                    setResolvedTargets(targetUrls.map((targetUrl) => new URL(targetUrl)));
                })
                .catch((error) => {
                    console.error(`[PM proxy] Blocked setTargets: ${error instanceof Error ? error.message : String(error)}`);
                    setResolvedTargets([]);
                });
        },
        close() {
            return new Promise<void>((resolve, reject) => {
                server.close((error) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve();
                });
            });
        },
    };
}