import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';

import type { WapkGoogleDriveConfig, WapkLockConfig, WapkRunConfig } from '@elitjs/config';

export type WapkRuntimeName = 'node' | 'bun' | 'deno';

export interface WapkHeader {
    name: string;
    version: string;
    runtime: WapkRuntimeName;
    entry: string;
    scripts: Record<string, string>;
    appId?: string;
    publisherId?: string;
    port?: number;
    env?: Record<string, string>;
    desktop?: Record<string, unknown>;
    createdAt: string;
    author?: string;
    license?: string;
    homepage?: string;
    bugs?: string | { url: string };
    repository?: string | { type?: string; url?: string };
}

export interface WapkFileEntry {
    path: string;
    content: Buffer;
    mode: number;
}

export interface DecodedWapk {
    version: number;
    header: WapkHeader;
    files: WapkFileEntry[];
    lock?: {
        password: true;
    };
}

export interface WapkCredentialsOptions {
    password?: string;
}

export interface ResolvedWapkCredentials {
    password: string;
}

export interface ResolvedWapkGoogleDriveConfig {
    fileId: string;
    accessToken: string;
    accessTokenEnv?: string;
    supportsAllDrives?: boolean;
}

export interface WapkArchiveSnapshot {
    buffer: Buffer;
    signature?: string;
    label?: string;
}

export interface WapkArchiveHandle {
    identifier: string;
    label: string;
    readSnapshot: () => Promise<WapkArchiveSnapshot>;
    getSignature: () => Promise<string | undefined>;
    writeBuffer: (buffer: Buffer) => Promise<WapkArchiveSnapshot>;
}

export interface WapkLiveSyncController {
    flush: () => Promise<void>;
    stop: () => Promise<void>;
}

export interface PreparedWapkApp {
    archivePath: string;
    archiveLabel: string;
    archiveHandle: WapkArchiveHandle;
    archiveSignature?: string;
    workDir: string;
    entryPath: string;
    header: WapkHeader;
    runtime: WapkRuntimeName;
    syncInterval?: number;
    useWatcher?: boolean;
    watchArchive?: boolean;
    archiveSyncInterval?: number;
    lock?: ResolvedWapkCredentials;
    runtimeWasExplicitlyRequested?: boolean;
    syncIncludesNodeModules: boolean;
}

export interface WapkPatchResult {
    archiveLabel: string;
    patchedPaths: string[];
    addedPaths: string[];
    updatedPaths: string[];
    unchangedPaths: string[];
}

export interface WapkLaunchCommand {
    executable: string;
    args: string[];
    env: NodeJS.ProcessEnv;
    label: string;
    shell?: boolean;
}

export interface WapkProjectConfig {
    name: string;
    version: string;
    runtime: WapkRuntimeName;
    entry: string;
    scripts: Record<string, string>;
    appId?: string;
    publisherId?: string;
    port?: number;
    env?: Record<string, string>;
    desktop?: Record<string, unknown>;
    lock?: WapkLockConfig;
}

export const DEFAULT_WAPK_ENTRY_CANDIDATES = [
    'src/main.ts',
    'src/main.tsx',
    'src/main.js',
    'src/main.jsx',
    'src/index.ts',
    'src/index.tsx',
    'src/index.js',
    'src/index.jsx',
    'main.ts',
    'main.tsx',
    'main.js',
    'main.jsx',
    'index.ts',
    'index.tsx',
    'index.js',
    'index.jsx',
] as const;

export const WAPK_UNLOCKED_VERSION = 1;
export const WAPK_LOCKED_VERSION = 2;
export const WAPK_VERSION = WAPK_LOCKED_VERSION;
export const DEFAULT_WAPK_PORT = 3000;
export const DEFAULT_IGNORE = [
    '.elit-config-*',
    'wapk.config.json',
] as const;

export const WAPK_RUNTIMES: WapkRuntimeName[] = ['node', 'bun', 'deno'];
export const RUNTIME_SYNC_IGNORE = new Set(['.git']);
export const DEFAULT_GOOGLE_DRIVE_TOKEN_ENV = 'GOOGLE_DRIVE_ACCESS_TOKEN';
export const DEFAULT_WAPK_ONLINE_URL_ENV = 'ELIT_WAPK_ONLINE_URL';
export const DEFAULT_WAPK_ONLINE_URLS = ['http://wapk.d-osc.com/'] as const;
export const WAPK_ONLINE_CREATE_PATH = '/api/shared-session/create';
export const WAPK_ONLINE_READ_PATH = '/api/shared-session/read';
export const WAPK_ONLINE_CLOSE_PATH = '/api/shared-session/close';
export const WAPK_ONLINE_CLOSE_REASON = 'The host stopped sharing this session.';
export const WAPK_ONLINE_KEEPALIVE_INTERVAL_MS = 1000;
export const WAPK_ONLINE_PM_SHUTDOWN_ENV = 'ELIT_PM_WAPK_ONLINE_STDIN_SHUTDOWN';
export const WAPK_ONLINE_PM_SHUTDOWN_COMMAND = '__ELIT_PM_WAPK_ONLINE_SHUTDOWN__';

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeRuntime(value: unknown): WapkRuntimeName | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const runtime = value.toLowerCase();
    if (runtime === 'nodejs') {
        return 'node';
    }

    return WAPK_RUNTIMES.includes(runtime as WapkRuntimeName)
        ? runtime as WapkRuntimeName
        : undefined;
}

export function normalizePort(value: unknown): number | undefined {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    const port = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(port) || port <= 0) {
        return undefined;
    }

    return Math.trunc(port);
}

export function normalizeNonEmptyString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
}

export function normalizeGeneratedIdentifier(value: string): string | undefined {
    const normalized = value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return normalized.length > 0 ? normalized : undefined;
}

export function joinGeneratedIdentifier(...segments: Array<string | undefined>): string | undefined {
    const normalizedSegments = segments
        .map((segment) => segment ? normalizeGeneratedIdentifier(segment) : undefined)
        .filter((segment): segment is string => Boolean(segment));

    return normalizedSegments.length > 0 ? normalizedSegments.join('.') : undefined;
}

export function parseScopedPackageName(value: string | undefined): { scope?: string; packageName?: string } {
    const normalizedValue = normalizeNonEmptyString(value);
    if (!normalizedValue) {
        return {};
    }

    if (!normalizedValue.startsWith('@')) {
        return {
            packageName: normalizedValue,
        };
    }

    const scopeSeparatorIndex = normalizedValue.indexOf('/');
    if (scopeSeparatorIndex === -1) {
        return {
            packageName: normalizedValue,
        };
    }

    return {
        scope: normalizedValue.slice(1, scopeSeparatorIndex),
        packageName: normalizedValue.slice(scopeSeparatorIndex + 1),
    };
}

export function readPackageAuthorMetadata(value: unknown): {
    name?: string;
    email?: string;
    url?: string;
} {
    if (typeof value === 'string') {
        const normalizedValue = value.trim();
        if (!normalizedValue) {
            return {};
        }

        const email = normalizedValue.match(/<([^>]+)>/)?.[1];
        const url = normalizedValue.match(/\(([^)]+)\)/)?.[1];
        const name = normalizedValue
            .replace(/<[^>]+>/g, ' ')
            .replace(/\([^)]+\)/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        return {
            name: normalizeNonEmptyString(name),
            email: normalizeNonEmptyString(email),
            url: normalizeNonEmptyString(url),
        };
    }

    if (!isRecord(value)) {
        return {};
    }

    return {
        name: normalizeNonEmptyString(value.name),
        email: normalizeNonEmptyString(value.email),
        url: normalizeNonEmptyString(value.url),
    };
}

export function extractPublisherIdFromRepository(value: unknown): string | undefined {
    const repositoryUrl = typeof value === 'string'
        ? value
        : isRecord(value)
            ? normalizeNonEmptyString(value.url)
            : undefined;

    const normalizedRepositoryUrl = normalizeNonEmptyString(repositoryUrl);
    if (!normalizedRepositoryUrl) {
        return undefined;
    }

    const shorthandMatch = normalizedRepositoryUrl.match(/^(?:github|gitlab|bitbucket):([^/]+)\/.+$/i);
    if (shorthandMatch?.[1]) {
        return normalizeGeneratedIdentifier(shorthandMatch[1]);
    }

    const sshMatch = normalizedRepositoryUrl.match(/^[^@]+@[^:]+:([^/]+)\/.+$/i);
    if (sshMatch?.[1]) {
        return normalizeGeneratedIdentifier(sshMatch[1]);
    }

    try {
        const parsed = new URL(normalizedRepositoryUrl.replace(/^git\+/, ''));
        const firstPathSegment = parsed.pathname
            .replace(/\.git$/i, '')
            .split('/')
            .filter(Boolean)[0];
        return normalizeGeneratedIdentifier(firstPathSegment ?? parsed.hostname.replace(/^www\./i, ''));
    } catch {
        return undefined;
    }
}

export function extractPublisherIdFromUrl(value: unknown): string | undefined {
    const normalizedValue = normalizeNonEmptyString(value);
    if (!normalizedValue) {
        return undefined;
    }

    try {
        const parsed = new URL(normalizedValue);
        return normalizeGeneratedIdentifier(parsed.hostname.replace(/^www\./i, ''));
    } catch {
        return undefined;
    }
}

export function extractPublisherIdFromEmail(value: string | undefined): string | undefined {
    const normalizedValue = normalizeNonEmptyString(value);
    if (!normalizedValue) {
        return undefined;
    }

    const domain = normalizedValue.split('@')[1];
    return domain ? normalizeGeneratedIdentifier(domain.replace(/^www\./i, '')) : undefined;
}

export function resolveAutoGeneratedWapkAppId(packageName: string | undefined, fallbackName: string): string | undefined {
    const scopedPackage = parseScopedPackageName(packageName);
    return joinGeneratedIdentifier(scopedPackage.scope, scopedPackage.packageName ?? fallbackName);
}

export function resolveAutoGeneratedWapkPublisherId(packageJson: Record<string, unknown> | undefined, fallbackName: string): string | undefined {
    const scopedPackage = parseScopedPackageName(typeof packageJson?.name === 'string' ? packageJson.name : undefined);
    if (scopedPackage.scope) {
        return normalizeGeneratedIdentifier(scopedPackage.scope);
    }

    const author = readPackageAuthorMetadata(packageJson?.author);
    return extractPublisherIdFromRepository(packageJson?.repository)
        ?? extractPublisherIdFromUrl(packageJson?.homepage)
        ?? extractPublisherIdFromUrl(author.url)
        ?? extractPublisherIdFromEmail(author.email)
        ?? normalizeGeneratedIdentifier(author.name ?? fallbackName);
}

export function normalizeStringMap(value: unknown): Record<string, string> | undefined {
    if (!isRecord(value)) {
        return undefined;
    }

    const normalized: Record<string, string> = {};
    for (const [key, entryValue] of Object.entries(value)) {
        if (typeof entryValue === 'string') {
            normalized[key] = entryValue;
        } else if (typeof entryValue === 'number' || typeof entryValue === 'boolean') {
            normalized[key] = String(entryValue);
        }
    }

    return Object.keys(normalized).length > 0 ? normalized : {};
}

export function normalizeDesktopConfig(value: unknown): Record<string, unknown> | undefined {
    return isRecord(value) ? { ...value } : undefined;
}

export function normalizeWapkLockConfig(value: unknown): WapkLockConfig | undefined {
    if (!isRecord(value)) {
        return undefined;
    }

    const password = normalizeNonEmptyString(value.password);
    if (!password) {
        return undefined;
    }

    return { password };
}

export function normalizeWapkConfig(value: unknown): Partial<WapkProjectConfig> {
    if (!isRecord(value)) {
        return {};
    }

    return {
        name: typeof value.name === 'string' ? value.name : undefined,
        version: typeof value.version === 'string' ? value.version : undefined,
        runtime: normalizeRuntime(value.runtime ?? value.engine),
        entry: typeof value.entry === 'string' ? value.entry : undefined,
        scripts: normalizeStringMap(value.scripts ?? value.script),
        appId: normalizeNonEmptyString(value.appId),
        publisherId: normalizeNonEmptyString(value.publisherId),
        port: normalizePort(value.port),
        env: normalizeStringMap(value.env),
        desktop: normalizeDesktopConfig(value.desktop),
        lock: normalizeWapkLockConfig(value.lock),
    };
}

export function normalizeWapkGoogleDriveConfig(value: unknown): WapkGoogleDriveConfig | undefined {
    if (!isRecord(value)) {
        return undefined;
    }

    const normalized: WapkGoogleDriveConfig = {
        fileId: normalizeNonEmptyString(value.fileId),
        accessToken: normalizeNonEmptyString(value.accessToken),
        accessTokenEnv: normalizeNonEmptyString(value.accessTokenEnv),
        supportsAllDrives: normalizeBoolean(value.supportsAllDrives),
    };

    return Object.values(normalized).some((entry) => entry !== undefined)
        ? normalized
        : undefined;
}

export function normalizeBoolean(value: unknown): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined;
}

export function normalizeSyncInterval(value: unknown): number | undefined {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    const interval = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(interval) || interval < 50) {
        return undefined;
    }

    return Math.trunc(interval);
}

export function normalizeWapkRunConfig(value: unknown): WapkRunConfig | undefined {
    if (!isRecord(value)) {
        return undefined;
    }

    const normalized: WapkRunConfig = {
        file: normalizeNonEmptyString(value.file),
        googleDrive: normalizeWapkGoogleDriveConfig(value.googleDrive),
        online: normalizeBoolean(value.online),
        onlineUrl: normalizeNonEmptyString(value.onlineUrl),
        runtime: normalizeRuntime(value.runtime),
        syncInterval: normalizeSyncInterval(value.syncInterval),
        useWatcher: normalizeBoolean(value.useWatcher),
        watchArchive: normalizeBoolean(value.watchArchive),
        archiveSyncInterval: normalizeSyncInterval(value.archiveSyncInterval),
        password: normalizeNonEmptyString(value.password),
    };

    return Object.values(normalized).some((entry) => entry !== undefined)
        ? normalized
        : undefined;
}

export function sanitizePackageName(name: string): string {
    const sanitized = name
        .trim()
        .replace(/[<>:"/\\|?*\x00-\x1F]+/g, '-')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

    return sanitized.length > 0 ? sanitized : 'app';
}

export function ensureBufferRange(buffer: Buffer, start: number, length: number, field: string): void {
    if (start < 0 || start + length > buffer.length) {
        throw new Error(`Invalid WAPK file: truncated ${field}.`);
    }
}

export function normalizeArchivePath(baseDir: string, value: string): string {
    const resolvedPath = resolve(baseDir, value);
    const relativePath = relative(baseDir, resolvedPath);

    if (!relativePath || relativePath.startsWith('..') || isAbsolute(relativePath)) {
        throw new Error(`WAPK entry must stay inside the package directory: ${value}`);
    }

    return relativePath.split('\\').join('/');
}

export function stripQuotes(value: string): string {
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
        return value.slice(1, -1);
    }
    return value;
}

export function tokenizeCommand(command: string): string[] {
    return (command.match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map(stripQuotes);
}

export function findScriptEntry(tokens: string[], startIndex: number): string | undefined {
    const candidates = tokens.slice(startIndex).filter((token) => !token.startsWith('-'));
    return candidates.length > 0 ? candidates[candidates.length - 1] : undefined;
}

export function inferRuntimeAndEntryFromScript(script: string | undefined): { runtime?: WapkRuntimeName; entry?: string } {
    if (!script) {
        return {};
    }

    const tokens = tokenizeCommand(script);
    if (tokens.length === 0) {
        return {};
    }

    const command = tokens[0];
    if (command === 'bun') {
        if (tokens[1] === 'run') {
            return { runtime: 'bun', entry: findScriptEntry(tokens, 2) };
        }
        return { runtime: 'bun', entry: findScriptEntry(tokens, 1) };
    }

    if (command === 'deno' && tokens[1] === 'run') {
        return { runtime: 'deno', entry: findScriptEntry(tokens, 2) };
    }

    if (command === 'node' || command === 'nodejs') {
        return { runtime: 'node', entry: findScriptEntry(tokens, 1) };
    }

    if (command === 'tsx' || command === 'ts-node') {
        return { runtime: 'node', entry: findScriptEntry(tokens, 1) };
    }

    return {};
}

export function resolveBuildEntryCandidate(config: unknown): string | undefined {
    if (!isRecord(config)) {
        return undefined;
    }

    const builds = Array.isArray(config.build)
        ? config.build
        : [config.build];

    for (const build of builds) {
        if (!isRecord(build)) {
            continue;
        }

        const entry = normalizeNonEmptyString(build.entry);
        if (entry) {
            return entry;
        }
    }

    return undefined;
}

export function resolveExistingWapkEntry(directory: string, candidates: readonly (string | undefined)[]): string | undefined {
    for (const candidate of candidates) {
        const normalizedCandidate = normalizeNonEmptyString(candidate);
        if (!normalizedCandidate) {
            continue;
        }

        try {
            const entry = normalizeArchivePath(directory, normalizedCandidate);
            const entryPath = resolve(directory, entry);
            if (existsSync(entryPath) && statSync(entryPath).isFile()) {
                return entry;
            }
        } catch {
            continue;
        }
    }

    return undefined;
}

export function readJsonFile(filePath: string): Record<string, unknown> | undefined {
    if (!existsSync(filePath)) {
        return undefined;
    }

    const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
    if (!isRecord(parsed)) {
        throw new Error(`Expected a JSON object in ${filePath}`);
    }

    return parsed;
}

export function normalizePackageEntry(value: string): string | undefined {
    const normalized = normalizeNonEmptyString(value)?.replace(/^[.][\\/]/, '').split('\\').join('/');
    return normalized && normalized.length > 0 ? normalized : undefined;
}

export function hasCredentialInput(value: WapkCredentialsOptions | undefined): boolean {
    return Boolean(typeof value?.password === 'string' && value.password.length > 0);
}

export function resolvePasswordFromInput(value: WapkCredentialsOptions | undefined): string | undefined {
    if (!value) {
        return undefined;
    }

    if (typeof value.password === 'string' && value.password.length > 0) {
        return value.password;
    }

    return undefined;
}

export function resolvePackLockCredentials(
    configLock: WapkLockConfig | undefined,
    overrideLock: WapkCredentialsOptions | undefined,
): ResolvedWapkCredentials | undefined {
    const configPassword = normalizeNonEmptyString(configLock?.password);
    const password = resolvePasswordFromInput(overrideLock)
        ?? configPassword;
    const shouldLock = Boolean(configPassword) || hasCredentialInput(overrideLock);

    if (!shouldLock) {
        return undefined;
    }

    if (!password) {
        throw new Error('WAPK lock requires a password. Provide --password or config.wapk.lock.password.');
    }

    return { password };
}

export function resolveArchiveCredentials(
    value: WapkCredentialsOptions | undefined,
): ResolvedWapkCredentials | undefined {
    if (!hasCredentialInput(value)) {
        return undefined;
    }

    const password = resolvePasswordFromInput(value);
    if (!password) {
        throw new Error('WAPK archive is password-protected. Provide --password to unlock it.');
    }

    return { password };
}

export function formatSize(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function hasPackageJson(directory: string): boolean {
    const packageJsonPath = join(directory, 'package.json');
    return existsSync(packageJsonPath) && statSync(packageJsonPath).isFile();
}

export function findNearestPackageDirectory(startDirectory: string, rootDirectory: string): string | undefined {
    let currentDirectory = resolve(startDirectory);
    const resolvedRootDirectory = resolve(rootDirectory);

    while (true) {
        if (hasPackageJson(currentDirectory)) {
            return currentDirectory;
        }

        if (currentDirectory === resolvedRootDirectory) {
            return undefined;
        }

        const parentDirectory = dirname(currentDirectory);
        if (parentDirectory === currentDirectory) {
            return undefined;
        }

        currentDirectory = parentDirectory;
    }
}