import { existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

import type {
    PmHealthCheckConfig,
    PmMemoryAction,
    PmProxyConfig,
    PmProxyStrategy,
    PmRestartPolicy,
    PmRuntimeName,
    WapkGoogleDriveConfig,
    WapkRunConfig,
} from '@elitjs/config';
import {
    DEFAULT_HEALTHCHECK_GRACE_PERIOD,
    DEFAULT_HEALTHCHECK_INTERVAL,
    DEFAULT_HEALTHCHECK_MAX_FAILURES,
    DEFAULT_HEALTHCHECK_TIMEOUT,
    DEFAULT_PM_PROXY_STRATEGY,
    SIMPLE_PREVIEW_SEGMENT,
    SUPPORTED_FILE_EXTENSIONS,
    type PmResolvedHealthCheck,
} from './shared';

export function normalizePmRuntime(value: unknown, optionName = '--runtime'): PmRuntimeName | undefined {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    if (typeof value !== 'string') {
        throw new Error(`${optionName} must be one of: node, bun, deno`);
    }

    const runtime = value.trim().toLowerCase();
    if (runtime === 'node' || runtime === 'bun' || runtime === 'deno') {
        return runtime;
    }

    throw new Error(`${optionName} must be one of: node, bun, deno`);
}

export function normalizePmRestartPolicy(value: unknown, optionName = '--restart-policy'): PmRestartPolicy | undefined {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    if (typeof value !== 'string') {
        throw new Error(`${optionName} must be one of: always, on-failure, never`);
    }

    const policy = value.trim().toLowerCase();
    if (policy === 'always' || policy === 'on-failure' || policy === 'never') {
        return policy;
    }

    throw new Error(`${optionName} must be one of: always, on-failure, never`);
}

export function normalizePmMemoryAction(value: unknown, optionName = '--memory-action'): PmMemoryAction | undefined {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    if (typeof value !== 'string') {
        throw new Error(`${optionName} must be one of: restart, stop`);
    }

    const action = value.trim().toLowerCase();
    if (action === 'restart' || action === 'stop') {
        return action;
    }

    throw new Error(`${optionName} must be one of: restart, stop`);
}

export function normalizePmProxyStrategy(value: unknown, optionName = '--proxy-strategy'): PmProxyStrategy | undefined {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    if (typeof value !== 'string') {
        throw new Error(`${optionName} must be one of: proxy, inherit`);
    }

    const strategy = value.trim().toLowerCase();
    if (strategy === 'proxy' || strategy === 'inherit') {
        return strategy;
    }

    throw new Error(`${optionName} must be one of: proxy, inherit`);
}

export function normalizeIntegerOption(value: string, optionName: string, min = 0): number {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < min) {
        throw new Error(`${optionName} must be a number >= ${min}`);
    }
    return parsed;
}

export function normalizePmMemoryLimit(value: unknown, optionName = '--max-memory'): number | undefined {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    if (typeof value === 'number') {
        const normalized = Math.trunc(value);
        if (!Number.isFinite(normalized) || normalized < 1) {
            throw new Error(`${optionName} must be a number >= 1 or a size like 256M.`);
        }

        return normalized;
    }

    if (typeof value !== 'string') {
        throw new Error(`${optionName} must be a number >= 1 or a size like 256M.`);
    }

    const normalized = value.trim();
    const match = /^(\d+)(b|kb|mb|gb|tb|k|m|g|t)?$/i.exec(normalized);
    if (!match) {
        throw new Error(`${optionName} must be a number >= 1 or a size like 256M.`);
    }

    const amount = normalizeIntegerOption(match[1] ?? '', optionName, 1);
    const unit = (match[2] ?? 'b').toLowerCase();
    const multiplier = unit === 'b'
        ? 1
        : unit === 'k' || unit === 'kb'
            ? 1024
            : unit === 'm' || unit === 'mb'
                ? 1024 ** 2
                : unit === 'g' || unit === 'gb'
                    ? 1024 ** 3
                    : 1024 ** 4;

    return amount * multiplier;
}

export function normalizeNonEmptyString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
}

export function hasPmGoogleDriveConfig(config: WapkGoogleDriveConfig | undefined): boolean {
    return Boolean(
        normalizeNonEmptyString(config?.fileId)
        || normalizeNonEmptyString(config?.accessToken)
        || normalizeNonEmptyString(config?.accessTokenEnv)
        || typeof config?.supportsAllDrives === 'boolean',
    );
}

export function isPmWapkOnlineRunConfig(config: WapkRunConfig | undefined): boolean {
    return Boolean(config?.online || normalizeNonEmptyString(config?.onlineUrl));
}

export function hasPmWapkRunConfig(config: WapkRunConfig | undefined): boolean {
    return Boolean(
        normalizeNonEmptyString(config?.file)
        || hasPmGoogleDriveConfig(config?.googleDrive)
        || isPmWapkOnlineRunConfig(config)
        || normalizeNonEmptyString(config?.runtime)
        || typeof config?.syncInterval === 'number'
        || typeof config?.useWatcher === 'boolean'
        || typeof config?.watchArchive === 'boolean'
        || typeof config?.archiveSyncInterval === 'number'
        || normalizeNonEmptyString(config?.password),
    );
}

export function mergePmWapkRunConfig(base: WapkRunConfig | undefined, override: WapkRunConfig | undefined): WapkRunConfig | undefined {
    if (!base && !override) {
        return undefined;
    }

    const googleDrive: WapkGoogleDriveConfig | undefined = hasPmGoogleDriveConfig(base?.googleDrive) || hasPmGoogleDriveConfig(override?.googleDrive)
        ? {
            fileId: override?.googleDrive?.fileId ?? base?.googleDrive?.fileId,
            accessToken: override?.googleDrive?.accessToken ?? base?.googleDrive?.accessToken,
            accessTokenEnv: override?.googleDrive?.accessTokenEnv ?? base?.googleDrive?.accessTokenEnv,
            supportsAllDrives: override?.googleDrive?.supportsAllDrives ?? base?.googleDrive?.supportsAllDrives,
        }
        : undefined;

    const merged: WapkRunConfig = {
        file: override?.file ?? base?.file,
        googleDrive,
        online: override?.online ?? base?.online,
        onlineUrl: override?.onlineUrl ?? base?.onlineUrl,
        runtime: override?.runtime ?? base?.runtime,
        syncInterval: override?.syncInterval ?? base?.syncInterval,
        useWatcher: override?.useWatcher ?? base?.useWatcher,
        watchArchive: override?.watchArchive ?? base?.watchArchive,
        archiveSyncInterval: override?.archiveSyncInterval ?? base?.archiveSyncInterval,
        password: override?.password ?? base?.password,
    };

    return hasPmWapkRunConfig(merged) ? merged : undefined;
}

export function stripPmWapkSourceFromRunConfig(config: WapkRunConfig | undefined): WapkRunConfig | undefined {
    if (!config) {
        return undefined;
    }

    const googleDrive = hasPmGoogleDriveConfig({
        ...config.googleDrive,
        fileId: undefined,
    })
        ? {
            ...config.googleDrive,
            fileId: undefined,
        }
        : undefined;

    const stripped: WapkRunConfig = {
        file: undefined,
        googleDrive,
        online: config.online,
        onlineUrl: config.onlineUrl,
        runtime: undefined,
        syncInterval: config.syncInterval,
        useWatcher: config.useWatcher,
        watchArchive: config.watchArchive,
        archiveSyncInterval: config.archiveSyncInterval,
        password: undefined,
    };

    return hasPmWapkRunConfig(stripped) ? stripped : undefined;
}

export function isRemoteWapkArchiveSpecifier(value: string): boolean {
    return /^(?:gdrive|google-drive):\/\/.+/i.test(value.trim());
}

export function isWapkArchiveSpecifier(value: string): boolean {
    const normalized = value.trim();
    return normalized.toLowerCase().endsWith('.wapk') || isRemoteWapkArchiveSpecifier(normalized);
}

export function buildGoogleDriveWapkSpecifier(fileId: string): string {
    return `gdrive://${fileId}`;
}

export function resolvePmWapkSource(value: string | undefined, cwd: string): string | undefined {
    const normalized = normalizeNonEmptyString(value);
    if (!normalized) {
        return undefined;
    }

    return isRemoteWapkArchiveSpecifier(normalized)
        ? normalized
        : resolve(cwd, normalized);
}

export function resolvePmWapkSourceToken(wapk: string | undefined, wapkRun: WapkRunConfig | undefined): string | undefined {
    const googleDriveFileId = normalizeNonEmptyString(wapkRun?.googleDrive?.fileId);
    return normalizeNonEmptyString(wapk)
        ?? normalizeNonEmptyString(wapkRun?.file)
        ?? (googleDriveFileId ? buildGoogleDriveWapkSpecifier(googleDriveFileId) : undefined);
}

export function countDefinedPmWapkSources(wapk: string | undefined, wapkRun: WapkRunConfig | undefined): number {
    const values = [
        normalizeNonEmptyString(wapk),
        normalizeNonEmptyString(wapkRun?.file),
        normalizeNonEmptyString(wapkRun?.googleDrive?.fileId),
    ].filter((entry): entry is string => Boolean(entry));

    return new Set(values).size;
}

export function appendPmWapkRunArgs(args: string[], previewParts: string[], wapkRun: WapkRunConfig | undefined): void {
    if (!wapkRun) {
        return;
    }

    if (isPmWapkOnlineRunConfig(wapkRun)) {
        args.push('--online');
        previewParts.push('--online');
    }

    const onlineUrl = normalizeNonEmptyString(wapkRun.onlineUrl);
    if (onlineUrl) {
        args.push('--online-url', onlineUrl);
        previewParts.push('--online-url', onlineUrl);
    }

    if (typeof wapkRun.syncInterval === 'number' && Number.isFinite(wapkRun.syncInterval) && wapkRun.syncInterval >= 50) {
        const value = String(Math.trunc(wapkRun.syncInterval));
        args.push('--sync-interval', value);
        previewParts.push('--sync-interval', value);
    }

    if (wapkRun.useWatcher) {
        args.push('--watcher');
        previewParts.push('--watcher');
    }

    if (typeof wapkRun.watchArchive === 'boolean') {
        const flag = wapkRun.watchArchive ? '--archive-watch' : '--no-archive-watch';
        args.push(flag);
        previewParts.push(flag);
    }

    if (typeof wapkRun.archiveSyncInterval === 'number' && Number.isFinite(wapkRun.archiveSyncInterval) && wapkRun.archiveSyncInterval >= 50) {
        const value = String(Math.trunc(wapkRun.archiveSyncInterval));
        args.push('--archive-sync-interval', value);
        previewParts.push('--archive-sync-interval', value);
    }

    const tokenEnv = normalizeNonEmptyString(wapkRun.googleDrive?.accessTokenEnv);
    if (tokenEnv) {
        args.push('--google-drive-token-env', tokenEnv);
        previewParts.push('--google-drive-token-env', tokenEnv);
    }

    const accessToken = normalizeNonEmptyString(wapkRun.googleDrive?.accessToken);
    if (accessToken) {
        args.push('--google-drive-access-token', accessToken);
        previewParts.push('--google-drive-access-token', '******');
    }

    if (wapkRun.googleDrive?.supportsAllDrives) {
        args.push('--google-drive-shared-drive');
        previewParts.push('--google-drive-shared-drive');
    }
}

export function quoteCommandSegment(value: string): string {
    return SIMPLE_PREVIEW_SEGMENT.test(value) ? value : JSON.stringify(value);
}

export function buildPmWapkPreview(wapk: string, runtime?: PmRuntimeName, password?: string, wapkRun?: WapkRunConfig): string {
    const previewParts = ['elit', 'wapk', 'run', quoteCommandSegment(wapk)];
    const online = isPmWapkOnlineRunConfig(wapkRun);

    if (runtime && !online) {
        previewParts.push('--runtime', runtime);
    }
    if (password) {
        previewParts.push('--password', '******');
    }

    appendPmWapkRunArgs([], previewParts, wapkRun);
    return previewParts.join(' ');
}

export function sanitizePmProcessName(name: string): string {
    const sanitized = name
        .trim()
        .toLowerCase()
        .replace(/[<>:"/\\|?*\x00-\x1f]+/g, '-')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

    return sanitized.length > 0 ? sanitized : 'process';
}

export function isTypescriptFile(filePath: string): boolean {
    const extension = extname(filePath).toLowerCase();
    return extension === '.ts' || extension === '.mts' || extension === '.cts';
}

export function normalizeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
}

export function toWatchGlob(candidatePath: string): string {
    if (!existsSync(candidatePath)) {
        return candidatePath;
    }

    try {
        return statSync(candidatePath).isDirectory()
            ? join(candidatePath, '**', '*').replace(/\\/g, '/')
            : candidatePath;
    } catch {
        return candidatePath;
    }
}

export function normalizeWatchPatterns(paths: string[], cwd: string): string[] {
    return paths
        .map((entry) => resolve(cwd, entry))
        .map(toWatchGlob)
        .map((entry) => entry.replace(/\\/g, '/'));
}

export function normalizeWatchIgnorePatterns(paths: string[], cwd: string): string[] {
    return paths
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
        .map((entry) => {
            if (entry.includes('*') || entry.includes('?')) {
                return entry.replace(/\\/g, '/');
            }

            const resolvedPath = resolve(cwd, entry);
            return toWatchGlob(resolvedPath).replace(/\\/g, '/');
        });
}

export function matchesGlobPattern(filePath: string, pattern: string): boolean {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const normalizedPattern = pattern.replace(/\\/g, '/');
    const regexPattern = normalizedPattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '.');

    return new RegExp(`^${regexPattern}$`).test(normalizedPath);
}

export function isIgnoredWatchPath(filePath: string, patterns: string[]): boolean {
    return patterns.some((pattern) => matchesGlobPattern(filePath, pattern));
}

export function normalizeHealthCheckConfig(value: unknown): PmResolvedHealthCheck | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return undefined;
    }

    const config = value as PmHealthCheckConfig;
    if (typeof config.url !== 'string' || config.url.trim().length === 0) {
        return undefined;
    }

    return {
        url: config.url.trim(),
        gracePeriod: typeof config.gracePeriod === 'number' && Number.isFinite(config.gracePeriod)
            ? Math.max(0, Math.trunc(config.gracePeriod))
            : DEFAULT_HEALTHCHECK_GRACE_PERIOD,
        interval: typeof config.interval === 'number' && Number.isFinite(config.interval)
            ? Math.max(250, Math.trunc(config.interval))
            : DEFAULT_HEALTHCHECK_INTERVAL,
        timeout: typeof config.timeout === 'number' && Number.isFinite(config.timeout)
            ? Math.max(250, Math.trunc(config.timeout))
            : DEFAULT_HEALTHCHECK_TIMEOUT,
        maxFailures: typeof config.maxFailures === 'number' && Number.isFinite(config.maxFailures)
            ? Math.max(1, Math.trunc(config.maxFailures))
            : DEFAULT_HEALTHCHECK_MAX_FAILURES,
    };
}

export function looksLikeManagedFile(value: string, cwd: string): boolean {
    const normalized = value.trim();
    if (!normalized) {
        return false;
    }

    if (isRemoteWapkArchiveSpecifier(normalized)) {
        return false;
    }

    if (normalized.toLowerCase().endsWith('.wapk')) {
        return true;
    }

    const extension = extname(normalized).toLowerCase();
    if (SUPPORTED_FILE_EXTENSIONS.has(extension)) {
        return true;
    }

    if (normalized.includes('/') || normalized.includes('\\') || normalized.startsWith('.')) {
        return existsSync(resolve(cwd, normalized));
    }

    return false;
}

export function normalizeEnvMap(value: unknown): Record<string, string> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {};
    }

    const normalized: Record<string, string> = {};
    for (const [key, entryValue] of Object.entries(value)) {
        if (typeof entryValue === 'string') {
            normalized[key] = entryValue;
            continue;
        }

        if (typeof entryValue === 'number' || typeof entryValue === 'boolean') {
            normalized[key] = String(entryValue);
        }
    }

    return normalized;
}

export function parsePmEnvEntry(input: string): [string, string] {
    const separatorIndex = input.indexOf('=');
    if (separatorIndex <= 0) {
        throw new Error('--env expects KEY=VALUE');
    }

    const key = input.slice(0, separatorIndex).trim();
    const value = input.slice(separatorIndex + 1);
    if (!key) {
        throw new Error('--env expects KEY=VALUE');
    }

    return [key, value];
}

export function readRequiredValue(args: string[], index: number, optionName: string): string {
    const value = args[index];
    if (value === undefined) {
        throw new Error(`${optionName} requires a value.`);
    }
    return value;
}

export function normalizePmProxyConfig(value: unknown, optionName = 'pm proxy'): PmProxyConfig | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }

    if (typeof value !== 'object') {
        throw new Error(`${optionName} must be an object with at least a port.`);
    }

    const candidate = value as Record<string, unknown>;
    const hasAnyValue = candidate.port !== undefined
        || candidate.host !== undefined
        || candidate.targetHost !== undefined
        || candidate.envVar !== undefined;

    if (!hasAnyValue) {
        return undefined;
    }

    if (candidate.port === undefined || candidate.port === null || candidate.port === '') {
        throw new Error(`${optionName}.port is required.`);
    }

    const port = typeof candidate.port === 'number'
        ? normalizeIntegerOption(String(Math.trunc(candidate.port)), `${optionName}.port`, 1)
        : normalizeIntegerOption(String(candidate.port), `${optionName}.port`, 1);

    return {
        port,
        strategy: normalizePmProxyStrategy(candidate.strategy, `${optionName}.strategy`) ?? DEFAULT_PM_PROXY_STRATEGY,
        host: normalizeNonEmptyString(candidate.host),
        targetHost: normalizeNonEmptyString(candidate.targetHost),
        envVar: normalizeNonEmptyString(candidate.envVar),
    };
}