import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import type { PmAppConfig, PmConfig } from '@elitjs/config';
import {
    DEFAULT_PM_DATA_DIR,
    DEFAULT_PM_DUMP_FILE,
    PM_RECORD_EXTENSION,
    type PmDumpFile,
    type PmPaths,
    type PmRecord,
    type PmRecordMatch,
    type PmSavedAppDefinition,
    type PmTargetType,
} from './shared';
import {
    isRemoteWapkArchiveSpecifier,
    normalizeWatchIgnorePatterns,
    normalizeWatchPatterns,
    sanitizePmProcessName,
} from './helpers';

export function resolvePmPaths(config: PmConfig | undefined, workspaceRoot: string): PmPaths {
    const dataDir = resolve(workspaceRoot, config?.dataDir ?? DEFAULT_PM_DATA_DIR);
    const dumpFile = config?.dumpFile
        ? resolve(workspaceRoot, config.dumpFile)
        : join(dataDir, DEFAULT_PM_DUMP_FILE);

    return {
        dataDir,
        appsDir: join(dataDir, 'apps'),
        logsDir: join(dataDir, 'logs'),
        dumpFile,
    };
}

export function ensurePmDirectories(paths: PmPaths): void {
    mkdirSync(paths.dataDir, { recursive: true });
    mkdirSync(paths.appsDir, { recursive: true });
    mkdirSync(paths.logsDir, { recursive: true });
    mkdirSync(dirname(paths.dumpFile), { recursive: true });
}

export function getPmRecordPath(paths: PmPaths, id: string): string {
    return join(paths.appsDir, `${id}${PM_RECORD_EXTENSION}`);
}

export function readPmRecord(filePath: string): PmRecord {
    return JSON.parse(readFileSync(filePath, 'utf8')) as PmRecord;
}

export function writePmRecord(filePath: string, record: PmRecord): void {
    writeFileSync(filePath, JSON.stringify(record, null, 2));
}

export function toSavedAppDefinition(record: PmRecord): PmSavedAppDefinition {
    return {
        name: record.name,
        baseName: record.baseName,
        instanceIndex: record.instanceIndex,
        instances: record.instances,
        type: record.type,
        cwd: record.cwd,
        runtime: record.runtime,
        env: record.env,
        proxy: record.proxy,
        script: record.script,
        file: record.file,
        wapk: record.wapk,
        password: record.password,
        wapkRun: record.wapkRun,
        restartPolicy: record.restartPolicy,
        maxMemoryBytes: record.maxMemoryBytes,
        memoryAction: record.memoryAction,
        cronRestart: record.cronRestart,
        expBackoffRestartDelay: record.expBackoffRestartDelay,
        expBackoffRestartMaxDelay: record.expBackoffRestartMaxDelay,
        restartWindow: record.restartWindow,
        waitReady: record.waitReady,
        listenTimeout: record.listenTimeout,
        autorestart: record.autorestart,
        restartDelay: record.restartDelay,
        killTimeout: record.killTimeout,
        maxRestarts: record.maxRestarts,
        minUptime: record.minUptime,
        watch: record.watch,
        watchPaths: record.watchPaths,
        watchIgnore: record.watchIgnore,
        watchDebounce: record.watchDebounce,
        healthCheck: record.healthCheck,
    };
}

export function writePmDumpFile(filePath: string, apps: PmSavedAppDefinition[]): void {
    const dump: PmDumpFile = {
        version: 1,
        savedAt: new Date().toISOString(),
        apps,
    };

    writeFileSync(filePath, JSON.stringify(dump, null, 2));
}

export function readPmDumpFile(filePath: string): PmDumpFile {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as Partial<PmDumpFile>;
    if (parsed.version !== 1 || !Array.isArray(parsed.apps)) {
        throw new Error(`Invalid PM dump file: ${filePath}`);
    }

    return {
        version: 1,
        savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date(0).toISOString(),
        apps: parsed.apps as PmSavedAppDefinition[],
    };
}

export function deriveDefaultWatchPaths(type: PmTargetType, cwd: string, file?: string, wapk?: string): string[] {
    if (type === 'file' && file) {
        return [file];
    }

    if (type === 'wapk' && wapk) {
        return [isRemoteWapkArchiveSpecifier(wapk) ? cwd : wapk];
    }

    return [cwd];
}

export function normalizeResolvedWatchPaths(paths: string[], cwd: string, type: PmTargetType, file?: string, wapk?: string): string[] {
    const sourcePaths = paths.length > 0 ? paths : deriveDefaultWatchPaths(type, cwd, file, wapk);
    return normalizeWatchPatterns(sourcePaths, cwd);
}

export function normalizeResolvedWatchIgnorePaths(paths: string[], cwd: string): string[] {
    return normalizeWatchIgnorePatterns(paths, cwd);
}

export function listPmRecordMatches(paths: PmPaths): PmRecordMatch[] {
    if (!existsSync(paths.appsDir)) {
        return [];
    }

    return readdirSync(paths.appsDir)
        .filter((entry) => entry.endsWith(PM_RECORD_EXTENSION))
        .map((entry) => {
            const filePath = join(paths.appsDir, entry);
            return {
                filePath,
                record: readPmRecord(filePath),
            };
        })
        .sort((left, right) => left.record.name.localeCompare(right.record.name));
}

export function findPmRecordMatch(paths: PmPaths, nameOrId: string): PmRecordMatch | undefined {
    const directPath = getPmRecordPath(paths, sanitizePmProcessName(nameOrId));
    if (existsSync(directPath)) {
        return {
            filePath: directPath,
            record: readPmRecord(directPath),
        };
    }

    return listPmRecordMatches(paths).find((match) => match.record.name === nameOrId);
}

export function findPmGroupMatches(paths: PmPaths, baseName: string): PmRecordMatch[] {
    return listPmRecordMatches(paths)
        .filter((match) => match.record.baseName === baseName)
        .sort((left, right) => left.record.instanceIndex - right.record.instanceIndex);
}

export function isProcessAlive(pid: number | undefined): boolean {
    if (!pid || pid <= 0) {
        return false;
    }

    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        return code === 'EPERM';
    }
}

export function syncPmRecordLiveness(match: PmRecordMatch): PmRecordMatch {
    const { record } = match;
    if (record.desiredState === 'running' && record.runnerPid && !isProcessAlive(record.runnerPid)) {
        const updated: PmRecord = {
            ...record,
            status: record.status === 'stopping' ? 'stopped' : record.status === 'errored' ? 'errored' : 'exited',
            runnerPid: undefined,
            childPid: undefined,
            updatedAt: new Date().toISOString(),
        };

        writePmRecord(match.filePath, updated);
        return { ...match, record: updated };
    }

    if (record.childPid && !isProcessAlive(record.childPid)) {
        const updated: PmRecord = {
            ...record,
            childPid: undefined,
            updatedAt: new Date().toISOString(),
        };

        writePmRecord(match.filePath, updated);
        return { ...match, record: updated };
    }

    return match;
}

export function readLatestPmRecord(filePath: string, fallback: PmRecord): PmRecord {
    return existsSync(filePath) ? readPmRecord(filePath) : fallback;
}

export function toPmAppConfig(record: PmRecord): PmAppConfig {
    return {
        name: record.name,
        script: record.script,
        file: record.file,
        wapk: record.wapk,
        wapkRun: record.wapkRun,
        runtime: record.runtime,
        cwd: record.cwd,
        env: record.env,
        proxy: record.proxy,
        instances: record.instances,
        autorestart: record.autorestart,
        restartDelay: record.restartDelay,
        killTimeout: record.killTimeout,
        maxRestarts: record.maxRestarts,
        password: record.password,
        restartPolicy: record.restartPolicy,
        maxMemory: record.maxMemoryBytes,
        memoryAction: record.memoryAction,
        cronRestart: record.cronRestart,
        expBackoffRestartDelay: record.expBackoffRestartDelay,
        expBackoffRestartMaxDelay: record.expBackoffRestartMaxDelay,
        restartWindow: record.restartWindow,
        waitReady: record.waitReady,
        listenTimeout: record.listenTimeout,
        minUptime: record.minUptime,
        watch: record.watch,
        watchPaths: record.watchPaths,
        watchIgnore: record.watchIgnore,
        watchDebounce: record.watchDebounce,
        healthCheck: record.healthCheck,
    };
}

export function toSavedPmAppConfig(app: PmSavedAppDefinition): PmAppConfig {
    return {
        name: app.name,
        script: app.script,
        file: app.file,
        wapk: app.wapk,
        wapkRun: app.wapkRun,
        runtime: app.runtime,
        cwd: app.cwd,
        env: app.env,
        proxy: app.proxy,
        instances: app.instances,
        autorestart: app.autorestart,
        restartDelay: app.restartDelay,
        killTimeout: app.killTimeout,
        maxRestarts: app.maxRestarts,
        password: app.password,
        restartPolicy: app.restartPolicy,
        maxMemory: app.maxMemoryBytes,
        memoryAction: app.memoryAction,
        cronRestart: app.cronRestart,
        expBackoffRestartDelay: app.expBackoffRestartDelay,
        expBackoffRestartMaxDelay: app.expBackoffRestartMaxDelay,
        restartWindow: app.restartWindow,
        waitReady: app.waitReady,
        listenTimeout: app.listenTimeout,
        minUptime: app.minUptime,
        watch: app.watch,
        watchPaths: app.watchPaths,
        watchIgnore: app.watchIgnore,
        watchDebounce: app.watchDebounce,
        healthCheck: app.healthCheck,
    };
}