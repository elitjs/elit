import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

import type { WapkGoogleDriveConfig } from '@elitjs/config';

import {
    DEFAULT_GOOGLE_DRIVE_TOKEN_ENV,
    type ResolvedWapkGoogleDriveConfig,
    type WapkArchiveHandle,
    type WapkArchiveSnapshot,
    normalizeNonEmptyString,
} from './shared';

function getLocalArchiveSignature(archivePath: string): string | undefined {
    try {
        const stats = statSync(archivePath);
        return `${stats.size}:${stats.mtimeMs}`;
    } catch {
        return undefined;
    }
}

function createGoogleDriveArchiveSignature(metadata: {
    modifiedTime?: string;
    size?: string;
    md5Checksum?: string;
}): string | undefined {
    const signature = [metadata.modifiedTime, metadata.size, metadata.md5Checksum]
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
        .join(':');

    return signature.length > 0 ? signature : undefined;
}

async function readResponseMessage(response: Response): Promise<string> {
    try {
        const text = (await response.text()).trim();
        return text.length > 0 ? text.slice(0, 400) : response.statusText;
    } catch {
        return response.statusText;
    }
}

function buildGoogleDriveFileUrl(
    fileId: string,
    params: Record<string, string | boolean | undefined>,
): string {
    const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`);
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined) {
            continue;
        }

        url.searchParams.set(key, typeof value === 'boolean' ? String(value) : value);
    }

    return url.toString();
}

function buildGoogleDriveUploadUrl(
    fileId: string,
    params: Record<string, string | boolean | undefined>,
): string {
    const url = new URL(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}`);
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined) {
            continue;
        }

        url.searchParams.set(key, typeof value === 'boolean' ? String(value) : value);
    }

    return url.toString();
}

async function fetchGoogleDriveMetadata(config: ResolvedWapkGoogleDriveConfig): Promise<{
    name?: string;
    modifiedTime?: string;
    size?: string;
    md5Checksum?: string;
}> {
    const response = await fetch(buildGoogleDriveFileUrl(config.fileId, {
        fields: 'id,name,modifiedTime,size,md5Checksum',
        supportsAllDrives: config.supportsAllDrives,
    }), {
        headers: {
            Authorization: `Bearer ${config.accessToken}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Google Drive metadata request failed (${response.status}): ${await readResponseMessage(response)}`);
    }

    const payload = await response.json() as Record<string, unknown>;
    return {
        name: normalizeNonEmptyString(payload?.name),
        modifiedTime: normalizeNonEmptyString(payload?.modifiedTime),
        size: normalizeNonEmptyString(payload?.size),
        md5Checksum: normalizeNonEmptyString(payload?.md5Checksum),
    };
}

async function downloadGoogleDriveArchive(config: ResolvedWapkGoogleDriveConfig): Promise<WapkArchiveSnapshot> {
    const metadata = await fetchGoogleDriveMetadata(config);
    const response = await fetch(buildGoogleDriveFileUrl(config.fileId, {
        alt: 'media',
        supportsAllDrives: config.supportsAllDrives,
    }), {
        headers: {
            Authorization: `Bearer ${config.accessToken}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Google Drive download failed (${response.status}): ${await readResponseMessage(response)}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return {
        buffer: Buffer.from(arrayBuffer),
        signature: createGoogleDriveArchiveSignature(metadata),
        label: metadata.name ?? `Google Drive:${config.fileId}`,
    };
}

async function uploadGoogleDriveArchive(
    config: ResolvedWapkGoogleDriveConfig,
    buffer: Buffer,
): Promise<WapkArchiveSnapshot> {
    const response = await fetch(buildGoogleDriveUploadUrl(config.fileId, {
        uploadType: 'media',
        fields: 'id,name,modifiedTime,size,md5Checksum',
        supportsAllDrives: config.supportsAllDrives,
    }), {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${config.accessToken}`,
            'Content-Type': 'application/octet-stream',
        },
        body: new Uint8Array(buffer),
    });

    if (!response.ok) {
        throw new Error(`Google Drive upload failed (${response.status}): ${await readResponseMessage(response)}`);
    }

    const payload = await response.json() as Record<string, unknown>;
    const metadata = {
        name: normalizeNonEmptyString(payload?.name),
        modifiedTime: normalizeNonEmptyString(payload?.modifiedTime),
        size: normalizeNonEmptyString(payload?.size),
        md5Checksum: normalizeNonEmptyString(payload?.md5Checksum),
    };

    return {
        buffer,
        signature: createGoogleDriveArchiveSignature(metadata),
        label: metadata.name ?? `Google Drive:${config.fileId}`,
    };
}

function resolveGoogleDriveAccessToken(config: WapkGoogleDriveConfig | undefined): string {
    const explicitToken = normalizeNonEmptyString(config?.accessToken);
    const configuredEnvName = normalizeNonEmptyString(config?.accessTokenEnv);
    const configuredEnvToken = configuredEnvName
        ? normalizeNonEmptyString(process.env[configuredEnvName])
        : undefined;
    const defaultEnvToken = normalizeNonEmptyString(process.env[DEFAULT_GOOGLE_DRIVE_TOKEN_ENV]);

    const token = explicitToken ?? configuredEnvToken ?? defaultEnvToken;
    if (token) {
        return token;
    }

    if (configuredEnvName) {
        throw new Error(`Google Drive access token not found in environment variable ${configuredEnvName}.`);
    }

    throw new Error(`Google Drive access token is required. Provide googleDrive.accessToken, googleDrive.accessTokenEnv, or set ${DEFAULT_GOOGLE_DRIVE_TOKEN_ENV}.`);
}

export function parseGoogleDriveArchiveSpecifier(value: string): string | undefined {
    const match = value.match(/^(?:gdrive|google-drive):\/\/(.+)$/i);
    if (!match) {
        return undefined;
    }

    const fileId = match[1]?.trim();
    return fileId && fileId.length > 0 ? fileId : undefined;
}

function resolveGoogleDriveConfig(
    archiveSpecifier: string,
    googleDrive?: WapkGoogleDriveConfig,
): ResolvedWapkGoogleDriveConfig | undefined {
    const fileId = normalizeNonEmptyString(googleDrive?.fileId) ?? parseGoogleDriveArchiveSpecifier(archiveSpecifier);
    if (!fileId) {
        return undefined;
    }

    return {
        fileId,
        accessToken: resolveGoogleDriveAccessToken(googleDrive),
        accessTokenEnv: normalizeNonEmptyString(googleDrive?.accessTokenEnv),
        supportsAllDrives: googleDrive?.supportsAllDrives ?? false,
    };
}

function createLocalArchiveHandle(archivePath: string): WapkArchiveHandle {
    const resolvedArchivePath = resolve(archivePath);

    const readLocalBuffer = (): Buffer => {
        if (!existsSync(resolvedArchivePath)) {
            throw new Error(`WAPK file not found: ${resolvedArchivePath}`);
        }

        return readFileSync(resolvedArchivePath);
    };

    return {
        identifier: resolvedArchivePath,
        label: basename(resolvedArchivePath),
        readSnapshot: async () => ({
            buffer: readLocalBuffer(),
            signature: getLocalArchiveSignature(resolvedArchivePath),
            label: basename(resolvedArchivePath),
        }),
        getSignature: async () => getLocalArchiveSignature(resolvedArchivePath),
        writeBuffer: async (buffer) => {
            writeFileSync(resolvedArchivePath, buffer);
            return {
                buffer,
                signature: getLocalArchiveSignature(resolvedArchivePath),
                label: basename(resolvedArchivePath),
            };
        },
    };
}

function createGoogleDriveArchiveHandle(config: ResolvedWapkGoogleDriveConfig): WapkArchiveHandle {
    const identifier = `gdrive://${config.fileId}`;
    const label = `Google Drive:${config.fileId}`;

    return {
        identifier,
        label,
        readSnapshot: async () => downloadGoogleDriveArchive(config),
        getSignature: async () => createGoogleDriveArchiveSignature(await fetchGoogleDriveMetadata(config)),
        writeBuffer: async (buffer) => uploadGoogleDriveArchive(config, buffer),
    };
}

export function resolveArchiveHandle(archiveSpecifier: string, googleDrive?: WapkGoogleDriveConfig): WapkArchiveHandle {
    const googleDriveConfig = resolveGoogleDriveConfig(archiveSpecifier, googleDrive);
    if (googleDriveConfig) {
        return createGoogleDriveArchiveHandle(googleDriveConfig);
    }

    return createLocalArchiveHandle(archiveSpecifier);
}

export function sanitizeOnlineArchiveFileName(label: string | undefined, fallback: string): string {
    const preferredName = normalizeNonEmptyString(label)
        ?? normalizeNonEmptyString(basename(fallback))
        ?? 'app.wapk';
    const sanitized = preferredName
        .replace(/[\\/:*?"<>|]+/g, '-')
        .trim();
    const fileName = sanitized.length > 0 ? sanitized : 'app.wapk';

    return fileName.toLowerCase().endsWith('.wapk') ? fileName : `${fileName}.wapk`;
}