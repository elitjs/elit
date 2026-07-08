import type { WapkGoogleDriveConfig } from '@elitjs/config';

import { sanitizeOnlineArchiveFileName, resolveArchiveHandle } from './remote';
import {
    DEFAULT_WAPK_ONLINE_URL_ENV,
    DEFAULT_WAPK_ONLINE_URLS,
    WAPK_ONLINE_CLOSE_PATH,
    WAPK_ONLINE_CLOSE_REASON,
    WAPK_ONLINE_CREATE_PATH,
    WAPK_ONLINE_KEEPALIVE_INTERVAL_MS,
    WAPK_ONLINE_PM_SHUTDOWN_COMMAND,
    WAPK_ONLINE_PM_SHUTDOWN_ENV,
    WAPK_ONLINE_READ_PATH,
    type ResolvedWapkCredentials,
    type WapkArchiveHandle,
    type WapkCredentialsOptions,
    type WapkFileEntry,
    type WapkHeader,
    normalizeNonEmptyString,
    resolveArchiveCredentials,
} from './shared';
import { decodeWapk, writeWapkArchiveFromMemory } from './archive';

interface WapkOnlineSharedSessionSnapshot {
    originalName: string;
    version: number;
    locked: boolean;
    header: WapkHeader;
    files: Array<{
        path: string;
        mode: number;
        content: string;
    }>;
    currentPath: string;
    hostLabel: string;
}

interface WapkOnlineCreateRequest {
    snapshot: WapkOnlineSharedSessionSnapshot;
}

interface WapkOnlineCreateResponse {
    ok: boolean;
    joinKey?: string;
    adminToken?: string;
    error?: string;
}

interface WapkOnlineReadRequest {
    joinKey: string;
    hostToken: string;
    knownRevision?: number;
}

interface WapkOnlineReadResponse {
    ok: boolean;
    revision?: number;
    changed?: boolean;
    snapshot?: WapkOnlineSharedSessionSnapshot;
    error?: string;
}

interface WapkOnlineCloseRequest {
    joinKey: string;
    adminToken: string;
    reason?: string;
}

interface WapkOnlineCloseResponse {
    ok: boolean;
    error?: string;
}

type WapkOnlineShutdownTrigger =
    | { kind: 'signal'; signal: 'SIGINT' | 'SIGTERM' }
    | { kind: 'pm' };

const WAPK_ONLINE_JOIN_SOURCE_QUERY_PARAM = 'launchSource';
const WAPK_ONLINE_JOIN_SOURCE_QUERY_VALUE = 'elit-wapk-online';

function buildOnlineJoinUrl(baseUrl: URL, joinKey: string): string {
    const joinUrl = new URL(baseUrl.toString());
    joinUrl.search = '';
    joinUrl.hash = '';
    joinUrl.searchParams.set('join', joinKey);
    joinUrl.searchParams.set(WAPK_ONLINE_JOIN_SOURCE_QUERY_PARAM, WAPK_ONLINE_JOIN_SOURCE_QUERY_VALUE);
    return joinUrl.toString();
}

async function probeOnlineLauncherUrl(url: string): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
        const response = await fetch(url, {
            method: 'GET',
            redirect: 'manual',
            signal: controller.signal,
        });
        return response.ok;
    } catch {
        return false;
    } finally {
        clearTimeout(timeout);
    }
}

function normalizeOnlineLauncherUrl(candidate: string, optionName: string): URL {
    let url: URL;

    try {
        url = new URL(candidate);
    } catch {
        throw new Error(`${optionName} must be a valid http:// or https:// URL.`);
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error(`${optionName} must use http:// or https://.`);
    }

    return url;
}

async function resolveWapkOnlineLauncherUrl(explicitUrl?: string): Promise<URL> {
    const configuredUrl = normalizeNonEmptyString(explicitUrl)
        ?? normalizeNonEmptyString(process.env[DEFAULT_WAPK_ONLINE_URL_ENV]);

    if (configuredUrl) {
        const normalized = normalizeOnlineLauncherUrl(configuredUrl, explicitUrl ? '--online-url' : DEFAULT_WAPK_ONLINE_URL_ENV);
        if (!(await probeOnlineLauncherUrl(normalized.toString()))) {
            throw new Error(
                `Could not reach Elit Run at ${normalized.toString()}. Start an Elit Run server with npm run dev or npm run preview, or provide a reachable --online-url.`,
            );
        }
        return normalized;
    }

    for (const candidate of DEFAULT_WAPK_ONLINE_URLS) {
        if (await probeOnlineLauncherUrl(candidate)) {
            return new URL(candidate);
        }
    }

    throw new Error(
        'Could not reach Elit Run on http://localhost:4177 or http://localhost:4179. Start an Elit Run server with npm run dev or npm run preview, or pass --online-url <url>.',
    );
}

function encodeOnlineSharedSessionFileContent(content: Buffer): string {
    return content.toString('base64');
}

function createWapkOnlineSharedSessionSnapshot(
    archiveBuffer: Buffer,
    archiveLabel: string | undefined,
    archiveIdentifier: string,
    options: WapkCredentialsOptions,
): WapkOnlineSharedSessionSnapshot {
    const decoded = decodeWapk(archiveBuffer, options);
    const originalName = sanitizeOnlineArchiveFileName(archiveLabel, archiveIdentifier);

    return {
        originalName,
        version: decoded.version,
        locked: Boolean(decoded.lock),
        header: decoded.header,
        files: decoded.files.map((file) => ({
            path: file.path,
            mode: file.mode,
            content: encodeOnlineSharedSessionFileContent(file.content),
        })),
        currentPath: '/',
        hostLabel: decoded.header.name,
    };
}

function decodeOnlineSharedSessionFileContent(content: string): Buffer {
    return Buffer.from(content, 'base64');
}

function createWapkFilesFromOnlineSharedSessionSnapshot(snapshot: WapkOnlineSharedSessionSnapshot): WapkFileEntry[] {
    return snapshot.files.map((file) => ({
        path: file.path,
        mode: file.mode,
        content: decodeOnlineSharedSessionFileContent(file.content),
    }));
}

async function createWapkOnlineSharedSession(
    launcherUrl: URL,
    snapshot: WapkOnlineSharedSessionSnapshot,
): Promise<{ ok: true; joinKey: string; adminToken: string }> {
    const response = await fetch(new URL(WAPK_ONLINE_CREATE_PATH, launcherUrl), {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({ snapshot } satisfies WapkOnlineCreateRequest),
    });

    let payload: Partial<WapkOnlineCreateResponse> | null = null;
    try {
        payload = await response.json() as Partial<WapkOnlineCreateResponse>;
    } catch {
        payload = null;
    }

    const joinKey = normalizeNonEmptyString(payload?.joinKey);
    const adminToken = normalizeNonEmptyString(payload?.adminToken);

    if (!response.ok || !payload?.ok || !joinKey || !adminToken) {
        throw new Error(payload?.error ?? `Could not create the online shared session (${response.status}).`);
    }

    return { ok: true, joinKey, adminToken };
}

async function readWapkOnlineSharedSessionSnapshot(
    launcherUrl: URL,
    session: { joinKey: string; adminToken: string },
    knownRevision: number,
): Promise<{ revision: number; changed: boolean; snapshot: WapkOnlineSharedSessionSnapshot | null }> {
    const response = await fetch(new URL(WAPK_ONLINE_READ_PATH, launcherUrl), {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            joinKey: session.joinKey,
            hostToken: session.adminToken,
            knownRevision,
        } satisfies WapkOnlineReadRequest),
    });

    let payload: Partial<WapkOnlineReadResponse> | null = null;
    try {
        payload = await response.json() as Partial<WapkOnlineReadResponse>;
    } catch {
        payload = null;
    }

    const revision = typeof payload?.revision === 'number' && Number.isInteger(payload.revision) && payload.revision >= 0
        ? payload.revision
        : 0;
    const changed = payload?.changed === true;

    if (!response.ok || !payload?.ok || typeof payload.changed !== 'boolean' || typeof payload.revision !== 'number') {
        throw new Error(payload?.error ?? `Could not read the online shared session snapshot (${response.status}).`);
    }

    if (!changed) {
        return {
            revision,
            changed: false,
            snapshot: null,
        };
    }

    if (!payload.snapshot) {
        throw new Error('The online shared session response did not include an updated snapshot.');
    }

    return {
        revision,
        changed: true,
        snapshot: payload.snapshot,
    };
}

async function applyWapkOnlineSharedSessionSnapshotToArchive(
    archiveHandle: WapkArchiveHandle,
    snapshot: WapkOnlineSharedSessionSnapshot,
    lock?: ResolvedWapkCredentials,
): Promise<{ header: WapkHeader; signature?: string; label: string }> {
    return await writeWapkArchiveFromMemory(
        archiveHandle,
        snapshot.header,
        createWapkFilesFromOnlineSharedSessionSnapshot(snapshot),
        lock,
    );
}

async function closeWapkOnlineSharedSession(
    launcherUrl: URL,
    session: { joinKey: string; adminToken: string },
): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
        const response = await fetch(new URL(WAPK_ONLINE_CLOSE_PATH, launcherUrl), {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                joinKey: session.joinKey,
                adminToken: session.adminToken,
                reason: WAPK_ONLINE_CLOSE_REASON,
            } satisfies WapkOnlineCloseRequest),
            signal: controller.signal,
        });

        let payload: Partial<WapkOnlineCloseResponse> | null = null;
        try {
            payload = await response.json() as Partial<WapkOnlineCloseResponse>;
        } catch {
            payload = null;
        }

        if (!response.ok || !payload?.ok) {
            throw new Error(payload?.error ?? `Could not close the online shared session (${response.status}).`);
        }
    } finally {
        clearTimeout(timeout);
    }
}

function isPmWapkOnlineShutdownEnabled(): boolean {
    return process.env[WAPK_ONLINE_PM_SHUTDOWN_ENV] === '1' && Boolean(process.stdin) && !process.stdin.isTTY;
}

function getWapkOnlineProcessDetails(): string {
    return `pid ${process.pid}, ppid ${process.ppid}`;
}

async function waitForWapkOnlineSessionShutdown(
    launcherUrl: URL,
    session: { joinKey: string; adminToken: string },
    archiveHandle: WapkArchiveHandle,
    lock?: ResolvedWapkCredentials,
    options: { allowSigtermClose?: boolean } = {},
): Promise<number> {
    let snapshotRevision = 0;
    let snapshotSyncPending = false;
    let snapshotSyncPromise: Promise<void> = Promise.resolve();
    let lastSnapshotSyncError: string | null = null;
    const allowSigtermClose = options.allowSigtermClose === true;
    const processDetails = getWapkOnlineProcessDetails();

    const syncGuestSnapshotUpdates = (): Promise<void> => {
        if (snapshotSyncPending) {
            return snapshotSyncPromise;
        }

        snapshotSyncPending = true;
        snapshotSyncPromise = (async () => {
            try {
                const result = await readWapkOnlineSharedSessionSnapshot(launcherUrl, session, snapshotRevision);
                if (!result.changed || !result.snapshot) {
                    snapshotRevision = result.revision;
                    return;
                }

                const writeResult = await applyWapkOnlineSharedSessionSnapshotToArchive(archiveHandle, result.snapshot, lock);
                snapshotRevision = result.revision;
                lastSnapshotSyncError = null;
                console.log(`[wapk] Applied guest changes back to ${writeResult.label}.`);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                if (lastSnapshotSyncError !== message) {
                    lastSnapshotSyncError = message;
                    console.error(`[wapk] Could not sync guest changes back to ${archiveHandle.label}: ${message}`);
                }
            } finally {
                snapshotSyncPending = false;
            }
        })();

        return snapshotSyncPromise;
    };

    const shutdownTrigger = await new Promise<WapkOnlineShutdownTrigger>((resolve) => {
        const keepAlive = setInterval(() => {
            void syncGuestSnapshotUpdates();
        }, WAPK_ONLINE_KEEPALIVE_INTERVAL_MS);
        const pmManaged = isPmWapkOnlineShutdownEnabled();
        let ignoredSigTermLogged = false;
        let stdinBuffer = '';

        const cleanup = (): void => {
            clearInterval(keepAlive);
            process.off('SIGINT', onSigInt);
            process.off('SIGTERM', onSigTerm);
            if (pmManaged) {
                process.stdin.off('data', onStdinData);
                process.stdin.pause();
            }
        };

        const finish = (trigger: WapkOnlineShutdownTrigger): void => {
            cleanup();
            resolve(trigger);
        };

        const onSigInt = (): void => {
            finish({ kind: 'signal', signal: 'SIGINT' });
        };

        const onSigTerm = (): void => {
            if (allowSigtermClose) {
                finish({ kind: 'signal', signal: 'SIGTERM' });
                return;
            }

            if (ignoredSigTermLogged) {
                return;
            }

            ignoredSigTermLogged = true;
            console.warn(
                pmManaged
                    ? `[wapk] Ignoring SIGTERM while shared session ${session.joinKey} is active (${processDetails}). Use elit pm stop, restart, or delete to close the session.`
                    : `[wapk] Ignoring SIGTERM while shared session ${session.joinKey} is active (${processDetails}). Press Ctrl+C to stop sharing, or pass --allow-sigterm-close to close on SIGTERM.`,
            );
        };

        const onStdinData = (chunk: Buffer | string): void => {
            stdinBuffer += typeof chunk === 'string' ? chunk : chunk.toString('utf8');

            const lines = stdinBuffer.split(/\r?\n/);
            stdinBuffer = lines.pop() ?? '';

            for (const line of lines) {
                if (line.trim() === WAPK_ONLINE_PM_SHUTDOWN_COMMAND) {
                    finish({ kind: 'pm' });
                    return;
                }
            }
        };

        process.on('SIGINT', onSigInt);
        process.on('SIGTERM', onSigTerm);

        if (pmManaged) {
            process.stdin.setEncoding('utf8');
            process.stdin.on('data', onStdinData);
            process.stdin.resume();
        }
    });

    await syncGuestSnapshotUpdates();

    if (shutdownTrigger.kind === 'pm') {
        console.log(`\n[wapk] PM requested shutdown for shared session ${session.joinKey}...`);
    } else if (shutdownTrigger.signal === 'SIGTERM') {
        console.log(`\n[wapk] Received SIGTERM for shared session ${session.joinKey} (${processDetails}); closing because --allow-sigterm-close is enabled...`);
    } else {
        console.log(`\n[wapk] Received ${shutdownTrigger.signal}; closing shared session ${session.joinKey}...`);
    }

    try {
        await closeWapkOnlineSharedSession(launcherUrl, session);
        console.log('[wapk] Shared session closed.');
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[wapk] Could not close the shared session cleanly: ${message}`);
    }

    if (shutdownTrigger.kind === 'pm') {
        return 0;
    }

    return shutdownTrigger.signal === 'SIGINT' ? 130 : 143;
}

export async function runWapkOnline(
    archiveSpecifier: string,
    options: {
        googleDrive?: WapkGoogleDriveConfig;
        onlineUrl?: string;
        password?: string;
        allowSigtermClose?: boolean;
    },
): Promise<void> {
    const archiveHandle = resolveArchiveHandle(archiveSpecifier, options.googleDrive);
    const snapshot = await archiveHandle.readSnapshot();
    const fileName = sanitizeOnlineArchiveFileName(snapshot.label ?? archiveHandle.label, archiveHandle.identifier);
    const launcherUrl = await resolveWapkOnlineLauncherUrl(options.onlineUrl);
    const sharedSessionSnapshot = createWapkOnlineSharedSessionSnapshot(
        snapshot.buffer,
        snapshot.label ?? archiveHandle.label,
        archiveHandle.identifier,
        options.password ? { password: options.password } : {},
    );

    console.log(`[wapk] Online handoff: ${fileName}`);
    console.log(`[wapk] Elit Run:      ${launcherUrl.toString()}`);
    console.log('[wapk] Creating shared session...');

    const response = await createWapkOnlineSharedSession(launcherUrl, sharedSessionSnapshot);
    const joinUrl = buildOnlineJoinUrl(launcherUrl, response.joinKey);
    const pmManaged = isPmWapkOnlineShutdownEnabled();
    const onlineArchiveLock = sharedSessionSnapshot.locked && options.password
        ? resolveArchiveCredentials({ password: options.password })
        : undefined;

    console.log(`[wapk] Share key: ${response.joinKey}`);
    console.log(`[wapk] Join URL:  ${joinUrl}`);
    console.log(
        pmManaged
            ? '[wapk] Session active. Use elit pm stop, restart, or delete to close the shared session.'
            : '[wapk] Session active. Press Ctrl+C to stop sharing and close the session.',
    );

    process.exitCode = await waitForWapkOnlineSessionShutdown(launcherUrl, {
        joinKey: response.joinKey,
        adminToken: response.adminToken,
    }, archiveHandle, onlineArchiveLock, {
        allowSigtermClose: options.allowSigtermClose,
    });
}