import { existsSync, readFileSync, rmSync } from 'node:fs';
import { EOL } from 'node:os';

import { loadConfig } from '@elitjs/config';
import {
    expandPmInstanceDefinitions,
    printPmHelp,
    parsePmStartArgs,
    resolvePmAppDefinition,
    resolvePmStartDefinitions,
} from './config';
import {
    DEFAULT_LOG_LINES,
    type PmPaths,
    type PmRecord,
    type PmRecordMatch,
} from './shared';
import { normalizeIntegerOption, readRequiredValue } from './helpers';
import {
    ensurePmDirectories,
    findPmRecordMatch,
    findPmGroupMatches,
    getPmRecordPath,
    listPmRecordMatches,
    readPmDumpFile,
    readPmRecord,
    resolvePmPaths,
    syncPmRecordLiveness,
    writePmRecord,
    toPmAppConfig,
    toSavedAppDefinition,
    toSavedPmAppConfig,
    writePmDumpFile,
} from './records';
import { samplePmProcessMetrics, sendPmSignal, startManagedProcess } from './process';
import { runPmRunner, stopPmMatches } from './runner';

const PM_SIGNAL_NAMES = new Set<NodeJS.Signals>([
    'SIGABRT',
    'SIGALRM',
    'SIGBREAK',
    'SIGBUS',
    'SIGCHLD',
    'SIGCONT',
    'SIGFPE',
    'SIGHUP',
    'SIGILL',
    'SIGINT',
    'SIGIO',
    'SIGIOT',
    'SIGKILL',
    'SIGPIPE',
    'SIGPOLL',
    'SIGPROF',
    'SIGPWR',
    'SIGQUIT',
    'SIGSEGV',
    'SIGSTKFLT',
    'SIGSTOP',
    'SIGSYS',
    'SIGTERM',
    'SIGTRAP',
    'SIGTSTP',
    'SIGTTIN',
    'SIGTTOU',
    'SIGUNUSED',
    'SIGURG',
    'SIGUSR1',
    'SIGUSR2',
    'SIGVTALRM',
    'SIGWINCH',
    'SIGXCPU',
    'SIGXFSZ',
]);

async function runPmStart(args: string[]): Promise<void> {
    const parsed = parsePmStartArgs(args);
    const workspaceRoot = process.cwd();
    const config = await loadConfig(workspaceRoot);
    const paths = resolvePmPaths(config?.pm, workspaceRoot);
    const definitions = resolvePmStartDefinitions(parsed, config, workspaceRoot);
    const errors: string[] = [];

    for (const definition of definitions) {
        try {
            const record = await startManagedProcess(definition, paths);
            console.log(`[pm] started ${record.name} (${record.type})`);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            errors.push(`[pm] ${definition.name}: ${message}`);
        }
    }

    if (errors.length > 0) {
        throw new Error(errors.join(EOL));
    }
}

async function loadPmContext() {
    const workspaceRoot = process.cwd();
    const config = await loadConfig(workspaceRoot);
    return {
        config,
        paths: resolvePmPaths(config?.pm, workspaceRoot),
    };
}

function resolveNamedMatches(paths: PmPaths, value: string): PmRecordMatch[] {
    if (value === 'all') {
        return listPmRecordMatches(paths).map(syncPmRecordLiveness);
    }

    const groupMatches = findPmGroupMatches(paths, value);
    if (groupMatches.length > 0) {
        return groupMatches.map(syncPmRecordLiveness);
    }

    const match = findPmRecordMatch(paths, value);
    return match ? [syncPmRecordLiveness(match)] : [];
}

function sortPmMatchesByInstance(matches: PmRecordMatch[]): PmRecordMatch[] {
    return [...matches].sort((left, right) => left.record.instanceIndex - right.record.instanceIndex);
}

function resolveInspectableMatch(paths: PmPaths, value: string): PmRecordMatch | undefined {
    const exactMatch = findPmRecordMatch(paths, value);
    const groupMatches = findPmGroupMatches(paths, value).map(syncPmRecordLiveness);

    if (groupMatches.length > 1 && exactMatch?.record.baseName === value && exactMatch.record.name === value) {
        throw new Error(`Multiple managed processes found for: ${value}. Use a specific instance name such as ${groupMatches[0]?.record.name} or ${groupMatches[1]?.record.name}.`);
    }

    if (exactMatch) {
        return syncPmRecordLiveness(exactMatch);
    }

    return groupMatches[0];
}

function rebuildPmRecordDefinition(record: PmRecord, targetInstances = record.instances) {
    const definition = resolvePmAppDefinition(
        toPmAppConfig(record),
        { name: record.baseName, env: {}, watchPaths: [], watchIgnore: [], instances: targetInstances },
        process.cwd(),
        record.source,
    );

    return {
        ...definition,
        name: record.name,
        baseName: record.baseName,
        instanceIndex: record.instanceIndex,
        instances: targetInstances,
    };
}

function rebuildPmSavedDefinition(app: ReturnType<typeof toSavedAppDefinition>) {
    const definition = resolvePmAppDefinition(
        toSavedPmAppConfig(app),
        { name: app.baseName, env: {}, watchPaths: [], watchIgnore: [], instances: app.instances },
        process.cwd(),
        'cli',
    );

    return {
        ...definition,
        name: app.name,
        baseName: app.baseName,
        instanceIndex: app.instanceIndex,
        instances: app.instances,
    };
}

function deletePmMatches(matches: PmRecordMatch[]): void {
    for (const match of matches) {
        if (existsSync(match.record.logFiles.out)) {
            rmSync(match.record.logFiles.out, { force: true });
        }
        if (existsSync(match.record.logFiles.err)) {
            rmSync(match.record.logFiles.err, { force: true });
        }
        rmSync(match.filePath, { force: true });
    }
}

function updatePmInstanceCount(matches: PmRecordMatch[], instances: number): void {
    const now = new Date().toISOString();
    for (const match of matches) {
        writePmRecord(match.filePath, {
            ...match.record,
            instances,
            updatedAt: now,
        });
    }
}

function normalizePmSignalName(value: string): NodeJS.Signals {
    const trimmed = value.trim().toUpperCase();
    const signalName = (trimmed.startsWith('SIG') ? trimmed : `SIG${trimmed}`) as NodeJS.Signals;

    if (!PM_SIGNAL_NAMES.has(signalName)) {
        throw new Error(`Unsupported pm signal: ${value}`);
    }

    return signalName;
}

function resolveSignalablePid(record: PmRecord): number | undefined {
    if (record.childPid && record.childPid > 0) {
        return record.childPid;
    }

    if (record.runnerPid && record.runnerPid > 0) {
        return record.runnerPid;
    }

    return undefined;
}

function groupPmMatchesByBaseName(matches: PmRecordMatch[]): PmRecordMatch[][] {
    const grouped = new Map<string, PmRecordMatch[]>();

    for (const match of matches) {
        const group = grouped.get(match.record.baseName);
        if (group) {
            group.push(match);
            continue;
        }

        grouped.set(match.record.baseName, [match]);
    }

    return [...grouped.entries()]
        .sort((left, right) => left[0].localeCompare(right[0]))
        .map(([, group]) => sortPmMatchesByInstance(group));
}

async function waitForPmRecordOnline(filePath: string, timeoutMs: number): Promise<PmRecord> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        if (!existsSync(filePath)) {
            break;
        }

        const record = readPmRecord(filePath);
        if (record.status === 'online') {
            return record;
        }

        if (record.status === 'errored' || record.status === 'exited' || record.status === 'stopped') {
            throw new Error(record.error ?? `Process ${record.name} failed while reloading.`);
        }

        await new Promise((resolvePromise) => setTimeout(resolvePromise, 50));
    }

    throw new Error(`Timed out waiting for the reloaded process to become online after ${timeoutMs}ms.`);
}

function resolvePmReloadReadyTimeout(record: Pick<PmRecord, 'waitReady' | 'listenTimeout' | 'restartDelay' | 'proxy'>): number {
    return record.waitReady || record.proxy?.strategy === 'inherit'
        ? Math.max(record.listenTimeout + 1000, 2000)
        : Math.max(record.restartDelay + 1000, 2000);
}

function supportsPmProxyReload(record: Pick<PmRecord, 'proxy' | 'instances' | 'runnerPid'>): boolean {
    return Boolean(record.proxy) && record.instances === 1 && Boolean(record.runnerPid);
}

function padCell(value: string, width: number): string {
    return value.length >= width ? value : `${value}${' '.repeat(width - value.length)}`;
}

function tailLogFile(filePath: string, lineCount: number): string {
    if (!existsSync(filePath)) {
        return '';
    }

    const lines = readFileSync(filePath, 'utf8').split(/\r?\n/).filter((line) => line.length > 0);
    return lines.slice(-lineCount).join(EOL);
}

function listPmMatches(paths: PmPaths): PmRecordMatch[] {
    return listPmRecordMatches(paths).map(syncPmRecordLiveness);
}

interface PmLiveMetrics {
    cpuPercent?: number;
    memoryRssBytes?: number;
    uptimeMs?: number;
    updatedAt?: string;
}

interface PmDisplayRecord {
    record: PmRecord;
    liveMetrics: PmLiveMetrics;
}

function isPmRecordActive(record: PmRecord): boolean {
    return record.desiredState === 'running' && (
        record.status === 'starting'
        || record.status === 'online'
        || record.status === 'restarting'
    );
}

function resolvePmUptimeMs(record: PmRecord): number | undefined {
    if (!isPmRecordActive(record) || !record.startedAt) {
        return undefined;
    }

    const startedTime = Date.parse(record.startedAt);
    if (Number.isNaN(startedTime)) {
        return undefined;
    }

    return Math.max(0, Date.now() - startedTime);
}

function resolvePmLiveMetrics(record: PmRecord): PmLiveMetrics {
    const uptimeMs = resolvePmUptimeMs(record);
    if (!isPmRecordActive(record) || !record.childPid) {
        return { uptimeMs };
    }

    const sampledMetrics = samplePmProcessMetrics(record.childPid);

    return {
        ...sampledMetrics,
        uptimeMs,
        updatedAt:
            sampledMetrics.cpuPercent !== undefined || sampledMetrics.memoryRssBytes !== undefined
                ? new Date().toISOString()
                : undefined,
    };
}

function toPmDisplayRecord(record: PmRecord): PmDisplayRecord {
    return {
        record,
        liveMetrics: resolvePmLiveMetrics(record),
    };
}

function serializePmRecord(record: PmRecord) {
    return {
        ...record,
        liveMetrics: resolvePmLiveMetrics(record),
    };
}

function parsePmFormatOption(args: string[], index: number, option: string): { format: 'table' | 'json'; nextIndex: number } {
    let value: string;

    if (option.startsWith('--format=')) {
        value = option.slice('--format='.length);
    } else {
        value = readRequiredValue(args, index + 1, '--format');
        index += 1;
    }

    if (value !== 'table' && value !== 'json') {
        throw new Error(`Unsupported pm output format: ${value}`);
    }

    return {
        format: value,
        nextIndex: index,
    };
}

function parsePmListArgs(args: string[]): { format: 'table' | 'json' } {
    let format: 'table' | 'json' = 'table';

    for (let index = 0; index < args.length; index++) {
        const arg = args[index];

        switch (arg) {
            case '--json':
                format = 'json';
                break;
            case '--format':
            default:
                if (arg === '--format' || arg.startsWith('--format=')) {
                    const parsed = parsePmFormatOption(args, index, arg);
                    format = parsed.format;
                    index = parsed.nextIndex;
                    break;
                }

                throw new Error(`Unknown pm list option: ${arg}`);
        }
    }

    return { format };
}

function parsePmShowArgs(args: string[]): { name: string; format: 'text' | 'json' } {
    let format: 'text' | 'json' = 'text';
    let name: string | undefined;

    for (let index = 0; index < args.length; index++) {
        const arg = args[index];

        switch (arg) {
            case '--json':
                format = 'json';
                break;
            case '--format':
            default:
                if (arg === '--format' || arg.startsWith('--format=')) {
                    const parsed = parsePmFormatOption(args, index, arg);
                    format = parsed.format === 'json' ? 'json' : 'text';
                    index = parsed.nextIndex;
                    break;
                }

                if (arg.startsWith('-')) {
                    throw new Error(`Unknown pm show option: ${arg}`);
                }

                if (name) {
                    throw new Error('pm show accepts exactly one process name.');
                }

                name = arg;
                break;
        }
    }

    if (!name) {
        throw new Error('Usage: pm show <name> [--json]');
    }

    return { name, format };
}

function formatPmDuration(durationMs: number): string {
    if (durationMs < 1000) {
        return `${durationMs}ms`;
    }

    const totalSeconds = Math.floor(durationMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts: string[] = [];

    if (days > 0) {
        parts.push(`${days}d`);
    }
    if (hours > 0) {
        parts.push(`${hours}h`);
    }
    if (minutes > 0) {
        parts.push(`${minutes}m`);
    }
    if (seconds > 0 || parts.length === 0) {
        parts.push(`${seconds}s`);
    }

    return parts.slice(0, 2).join(' ');
}

function formatPmCpuPercent(cpuPercent: number | undefined): string {
    if (cpuPercent === undefined || !Number.isFinite(cpuPercent)) {
        return '-';
    }

    return `${cpuPercent >= 100 ? cpuPercent.toFixed(0) : cpuPercent.toFixed(1)}%`;
}

function formatPmMemory(memoryRssBytes: number | undefined): string {
    if (memoryRssBytes === undefined || !Number.isFinite(memoryRssBytes) || memoryRssBytes < 0) {
        return '-';
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = memoryRssBytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }

    const formatted = value >= 10 || unitIndex === 0
        ? value.toFixed(0)
        : value.toFixed(1);

    return `${formatted}${units[unitIndex]}`;
}

function formatPmUptime(uptimeMs: number | undefined): string {
    if (uptimeMs === undefined || !Number.isFinite(uptimeMs)) {
        return '-';
    }

    return formatPmDuration(Math.max(0, uptimeMs));
}

function formatPmTarget(record: PmRecordMatch['record']): string {
    if (record.script) {
        return record.script;
    }

    if (record.file) {
        return record.file;
    }

    if (record.wapk) {
        return record.wapk;
    }

    return '-';
}

function pushPmDetail(lines: string[], label: string, value: string): void {
    lines.push(`${padCell(`${label}:`, 18)} ${value}`);
}

function pushPmDetailList(lines: string[], label: string, values: string[]): void {
    if (values.length === 0) {
        pushPmDetail(lines, label, '-');
        return;
    }

    pushPmDetail(lines, label, values[0] ?? '-');
    for (const value of values.slice(1)) {
        lines.push(`${' '.repeat(20)} ${value}`);
    }
}

function formatPmRecordDetails(record: PmRecord, liveMetrics: PmLiveMetrics): string {
    const lines: string[] = [`Process: ${record.name}`];

    pushPmDetail(lines, 'id', record.id);
    pushPmDetail(lines, 'status', record.status);
    pushPmDetail(lines, 'desired state', record.desiredState);
    pushPmDetail(lines, 'instance', `${record.instanceIndex}/${record.instances}`);
    pushPmDetail(lines, 'cpu', formatPmCpuPercent(liveMetrics.cpuPercent));
    pushPmDetail(lines, 'memory', formatPmMemory(liveMetrics.memoryRssBytes));
    pushPmDetail(lines, 'uptime', formatPmUptime(liveMetrics.uptimeMs));
    pushPmDetail(lines, 'type', record.type);
    pushPmDetail(lines, 'source', record.source);
    pushPmDetail(lines, 'runtime', record.runtime ?? '-');
    pushPmDetail(lines, 'cwd', record.cwd);
    pushPmDetail(lines, 'target', formatPmTarget(record));
    pushPmDetail(lines, 'command', record.commandPreview || '-');
    pushPmDetail(lines, 'runner pid', record.runnerPid ? String(record.runnerPid) : '-');
    pushPmDetail(lines, 'child pid', record.childPid ? String(record.childPid) : '-');
    pushPmDetail(lines, 'restart count', `${record.restartCount}/${record.maxRestarts}`);
    pushPmDetail(lines, 'restart policy', record.restartPolicy);
    pushPmDetail(lines, 'proxy', record.proxy
        ? `http://${record.proxy.host ?? '0.0.0.0'}:${record.proxy.port}`
        : '-');
    pushPmDetail(lines, 'proxy strategy', record.proxy?.strategy ?? '-');
    pushPmDetail(lines, 'proxy target', record.proxy && record.proxyTargetPort
        ? `${record.proxy.targetHost ?? '127.0.0.1'}:${record.proxyTargetPort}`
        : '-');
    pushPmDetail(lines, 'max memory', record.maxMemoryBytes ? formatPmMemory(record.maxMemoryBytes) : '-');
    pushPmDetail(lines, 'memory action', record.memoryAction ?? '-');
    pushPmDetail(lines, 'cron restart', record.cronRestart ?? '-');
    pushPmDetail(lines, 'exp backoff', record.expBackoffRestartDelay ? formatPmDuration(record.expBackoffRestartDelay) : '-');
    pushPmDetail(lines, 'exp backoff max', record.expBackoffRestartMaxDelay ? formatPmDuration(record.expBackoffRestartMaxDelay) : '-');
    pushPmDetail(lines, 'restart window', record.restartWindow ? formatPmDuration(record.restartWindow) : '-');
    pushPmDetail(lines, 'wait ready', record.waitReady ? 'enabled' : 'disabled');
    pushPmDetail(lines, 'listen timeout', record.waitReady ? formatPmDuration(record.listenTimeout) : '-');
    pushPmDetail(lines, 'restart delay', formatPmDuration(record.restartDelay));
    pushPmDetail(lines, 'kill timeout', formatPmDuration(record.killTimeout));
    pushPmDetail(lines, 'min uptime', formatPmDuration(record.minUptime));
    pushPmDetail(lines, 'autorestart', record.autorestart ? 'enabled' : 'disabled');
    pushPmDetail(lines, 'watch', record.watch ? 'enabled' : 'disabled');
    pushPmDetail(lines, 'watch debounce', record.watch ? formatPmDuration(record.watchDebounce) : '-');
    pushPmDetailList(lines, 'watch paths', record.watchPaths);
    pushPmDetailList(lines, 'watch ignore', record.watchIgnore);

    if (record.healthCheck) {
        pushPmDetail(lines, 'health check', record.healthCheck.url);
        pushPmDetail(lines, 'health grace', formatPmDuration(record.healthCheck.gracePeriod));
        pushPmDetail(lines, 'health interval', formatPmDuration(record.healthCheck.interval));
        pushPmDetail(lines, 'health timeout', formatPmDuration(record.healthCheck.timeout));
        pushPmDetail(lines, 'health failures', String(record.healthCheck.maxFailures));
    } else {
        pushPmDetail(lines, 'health check', '-');
    }

    pushPmDetailList(lines, 'env', Object.entries(record.env).map(([key, value]) => `${key}=${value}`));
    pushPmDetail(lines, 'stdout log', record.logFiles.out);
    pushPmDetail(lines, 'stderr log', record.logFiles.err);
    pushPmDetail(lines, 'created at', record.createdAt);
    pushPmDetail(lines, 'updated at', record.updatedAt);
    pushPmDetail(lines, 'metrics at', liveMetrics.updatedAt ?? '-');
    pushPmDetail(lines, 'started at', record.startedAt ?? '-');
    pushPmDetail(lines, 'stopped at', record.stoppedAt ?? '-');
    pushPmDetail(lines, 'last exit', record.lastExitCode === undefined ? '-' : String(record.lastExitCode));
    pushPmDetail(lines, 'error', record.error ?? '-');

    return lines.join(EOL);
}

function printPmList(paths: PmPaths, format: 'table' | 'json' = 'table'): void {
    const matches = listPmMatches(paths).map((match) => toPmDisplayRecord(match.record));
    if (format === 'json') {
        console.log(JSON.stringify(matches.map((match) => ({ ...match.record, liveMetrics: match.liveMetrics })), null, 2));
        return;
    }

    if (matches.length === 0) {
        console.log('No managed processes found.');
        return;
    }

    const headers = [
        padCell('name', 20),
        padCell('status', 12),
        padCell('pid', 8),
        padCell('cpu', 8),
        padCell('memory', 10),
        padCell('uptime', 10),
        padCell('restarts', 10),
        padCell('type', 8),
        'runtime',
    ];

    console.log(headers.join('  '));
    for (const { record, liveMetrics } of matches) {
        console.log([
            padCell(record.name, 20),
            padCell(record.status, 12),
            padCell(record.childPid ? String(record.childPid) : '-', 8),
            padCell(formatPmCpuPercent(liveMetrics.cpuPercent), 8),
            padCell(formatPmMemory(liveMetrics.memoryRssBytes), 10),
            padCell(formatPmUptime(liveMetrics.uptimeMs), 10),
            padCell(String(record.restartCount ?? 0), 10),
            padCell(record.type, 8),
            record.runtime ?? '-',
        ].join('  '));
    }
}

async function runPmList(args: string[]): Promise<void> {
    const options = parsePmListArgs(args);
    const { paths } = await loadPmContext();
    printPmList(paths, options.format);
}

async function runPmShow(args: string[]): Promise<void> {
    const options = parsePmShowArgs(args);
    const { paths } = await loadPmContext();
    const match = resolveInspectableMatch(paths, options.name);

    if (!match) {
        throw new Error(`No managed process found for: ${options.name}`);
    }

    const synced = syncPmRecordLiveness(match);
    if (options.format === 'json') {
        console.log(JSON.stringify(serializePmRecord(synced.record), null, 2));
        return;
    }

    console.log(formatPmRecordDetails(synced.record, resolvePmLiveMetrics(synced.record)));
}

async function runPmStop(args: string[]): Promise<void> {
    const target = args[0];
    if (!target) {
        throw new Error('Usage: pm stop <name|all>');
    }

    const { paths } = await loadPmContext();
    const matches = resolveNamedMatches(paths, target);
    if (matches.length === 0) {
        throw new Error(`No managed process found for: ${target}`);
    }

    const count = await stopPmMatches(matches);
    console.log(`[pm] stopped ${count} process${count === 1 ? '' : 'es'}`);
}

async function runPmRestart(args: string[]): Promise<void> {
    const target = args[0];
    if (!target) {
        throw new Error('Usage: pm restart <name|all>');
    }

    const { paths } = await loadPmContext();
    const matches = resolveNamedMatches(paths, target);
    if (matches.length === 0) {
        throw new Error(`No managed process found for: ${target}`);
    }

    await stopPmMatches(matches);

    const restarted: string[] = [];
    for (const match of matches) {
        const definition = rebuildPmRecordDefinition(match.record);

        await startManagedProcess(definition, paths);
        restarted.push(match.record.name);
    }

    console.log(`[pm] restarted ${restarted.join(', ')}`);
}

async function runPmReload(args: string[]): Promise<void> {
    const target = args[0];
    if (!target) {
        throw new Error('Usage: pm reload <name|all>');
    }

    const { paths } = await loadPmContext();
    const matches = resolveNamedMatches(paths, target);
    if (matches.length === 0) {
        throw new Error(`No managed process found for: ${target}`);
    }

    const reloaded: string[] = [];
    const errors: string[] = [];

    for (const group of groupPmMatchesByBaseName(matches)) {
        for (const match of group) {
            try {
                if (supportsPmProxyReload(match.record)) {
                    const reloadRequestedAt = new Date().toISOString();
                    writePmRecord(match.filePath, {
                        ...match.record,
                        status: 'restarting',
                        reloadRequestedAt,
                        updatedAt: reloadRequestedAt,
                        error: undefined,
                    });
                    await waitForPmRecordOnline(
                        getPmRecordPath(paths, match.record.id),
                        resolvePmReloadReadyTimeout(match.record),
                    );
                    reloaded.push(match.record.name);
                    continue;
                }

                await stopPmMatches([match]);
                const definition = rebuildPmRecordDefinition(match.record);
                const startedRecord = await startManagedProcess(definition, paths);
                await waitForPmRecordOnline(
                    getPmRecordPath(paths, startedRecord.id),
                    resolvePmReloadReadyTimeout(startedRecord),
                );
                reloaded.push(match.record.name);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                errors.push(`[pm] ${match.record.name}: ${message}`);
            }
        }
    }

    if (errors.length > 0) {
        throw new Error([`[pm] reloaded ${reloaded.length} process${reloaded.length === 1 ? '' : 'es'}`, ...errors].join(EOL));
    }

    console.log(`[pm] reloaded ${reloaded.join(', ')}`);
}

async function runPmSave(): Promise<void> {
    const { paths } = await loadPmContext();
    ensurePmDirectories(paths);

    const runningApps = listPmRecordMatches(paths)
        .map(syncPmRecordLiveness)
        .filter((match) => match.record.desiredState === 'running' && (
            match.record.status === 'starting'
            || match.record.status === 'online'
            || match.record.status === 'restarting'
        ))
        .map((match) => toSavedAppDefinition(match.record));

    writePmDumpFile(paths.dumpFile, runningApps);
    console.log(`[pm] saved ${runningApps.length} process${runningApps.length === 1 ? '' : 'es'} to ${paths.dumpFile}`);
}

async function runPmResurrect(): Promise<void> {
    const { paths } = await loadPmContext();
    if (!existsSync(paths.dumpFile)) {
        throw new Error(`PM dump file not found: ${paths.dumpFile}`);
    }

    const dump = readPmDumpFile(paths.dumpFile);
    if (dump.apps.length === 0) {
        console.log('[pm] dump file is empty, nothing to resurrect');
        return;
    }

    const errors: string[] = [];
    let restored = 0;
    for (const app of dump.apps) {
        try {
            const definition = rebuildPmSavedDefinition(app);
            await startManagedProcess(definition, paths);
            restored += 1;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            errors.push(`[pm] ${app.name}: ${message}`);
        }
    }

    if (errors.length > 0) {
        throw new Error([`[pm] resurrected ${restored} process${restored === 1 ? '' : 'es'}`, ...errors].join(EOL));
    }

    console.log(`[pm] resurrected ${restored} process${restored === 1 ? '' : 'es'} from ${paths.dumpFile}`);
}

async function runPmDelete(args: string[]): Promise<void> {
    const target = args[0];
    if (!target) {
        throw new Error('Usage: pm delete <name|all>');
    }

    const { paths } = await loadPmContext();
    const matches = resolveNamedMatches(paths, target);
    if (matches.length === 0) {
        throw new Error(`No managed process found for: ${target}`);
    }

    await stopPmMatches(matches);
    deletePmMatches(matches);

    console.log(`[pm] deleted ${matches.length} process${matches.length === 1 ? '' : 'es'}`);
}

async function runPmScale(args: string[]): Promise<void> {
    const target = args[0];
    const countArg = args[1];
    if (!target || countArg === undefined || args.length > 2) {
        throw new Error('Usage: pm scale <name> <count>');
    }

    const desiredCount = normalizeIntegerOption(countArg, 'pm scale <count>', 0);
    const { config, paths } = await loadPmContext();
    const exactMatch = findPmRecordMatch(paths, target);
    const currentMatches = sortPmMatchesByInstance(resolveNamedMatches(paths, exactMatch?.record.baseName ?? target));

    if (currentMatches.length === 0) {
        if (desiredCount === 0) {
            console.log(`[pm] ${target} already scaled to 0 instances`);
            return;
        }

        const definitions = resolvePmStartDefinitions(
            { name: target, env: {}, watchPaths: [], watchIgnore: [], instances: desiredCount },
            config,
            process.cwd(),
        );

        for (const definition of definitions) {
            await startManagedProcess(definition, paths);
        }

        console.log(`[pm] scaled ${target} to ${desiredCount} instance${desiredCount === 1 ? '' : 's'}`);
        return;
    }

    const baseName = currentMatches[0]?.record.baseName ?? target;
    if (desiredCount === currentMatches.length) {
        console.log(`[pm] ${baseName} already scaled to ${desiredCount} instance${desiredCount === 1 ? '' : 's'}`);
        return;
    }

    if (desiredCount === 0) {
        await stopPmMatches(currentMatches);
        deletePmMatches(currentMatches);
        console.log(`[pm] scaled ${baseName} to 0 instances`);
        return;
    }

    if (desiredCount < currentMatches.length) {
        const toRemove = [...currentMatches]
            .sort((left, right) => right.record.instanceIndex - left.record.instanceIndex)
            .slice(0, currentMatches.length - desiredCount);
        const remaining = currentMatches.filter((match) => !toRemove.some((removal) => removal.record.id === match.record.id));

        await stopPmMatches(toRemove);
        deletePmMatches(toRemove);
        updatePmInstanceCount(remaining, desiredCount);
        console.log(`[pm] scaled ${baseName} to ${desiredCount} instance${desiredCount === 1 ? '' : 's'}`);
        return;
    }

    updatePmInstanceCount(currentMatches, desiredCount);
    const baseRecord = currentMatches[0]?.record;
    if (!baseRecord) {
        throw new Error(`No managed process found for: ${target}`);
    }

    const baseDefinition = rebuildPmRecordDefinition(baseRecord, desiredCount);
    const expandedDefinitions = expandPmInstanceDefinitions(baseDefinition, desiredCount);
    const existingNames = new Set(currentMatches.map((match) => match.record.name));

    for (const definition of expandedDefinitions) {
        if (existingNames.has(definition.name)) {
            continue;
        }

        await startManagedProcess(definition, paths);
    }

    console.log(`[pm] scaled ${baseName} to ${desiredCount} instance${desiredCount === 1 ? '' : 's'}`);
}

async function runPmSendSignal(args: string[]): Promise<void> {
    const signalArg = args[0];
    const target = args[1];
    if (!signalArg || !target || args.length > 2) {
        throw new Error('Usage: pm send-signal <signal> <name|all>');
    }

    const signalName = normalizePmSignalName(signalArg);
    const { paths } = await loadPmContext();
    const matches = resolveNamedMatches(paths, target);
    if (matches.length === 0) {
        throw new Error(`No managed process found for: ${target}`);
    }

    let signaled = 0;
    const errors: string[] = [];
    for (const match of matches) {
        const pid = resolveSignalablePid(match.record);
        if (!pid) {
            continue;
        }

        try {
            sendPmSignal(pid, signalName);
            signaled += 1;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            errors.push(`[pm] ${match.record.name}: ${message}`);
        }
    }

    if (errors.length > 0) {
        throw new Error([`[pm] sent ${signalName} to ${signaled} process${signaled === 1 ? '' : 'es'}`, ...errors].join(EOL));
    }

    if (signaled === 0) {
        throw new Error(`No running managed process found for: ${target}`);
    }

    console.log(`[pm] sent ${signalName} to ${signaled} process${signaled === 1 ? '' : 'es'}`);
}

async function runPmReset(args: string[]): Promise<void> {
    const target = args[0];
    if (!target) {
        throw new Error('Usage: pm reset <name|all>');
    }

    const { paths } = await loadPmContext();
    const matches = resolveNamedMatches(paths, target);
    if (matches.length === 0) {
        throw new Error(`No managed process found for: ${target}`);
    }

    const now = new Date().toISOString();
    for (const match of matches) {
        writePmRecord(match.filePath, {
            ...match.record,
            restartCount: 0,
            lastExitCode: undefined,
            error: undefined,
            updatedAt: now,
        });
    }

    console.log(`[pm] reset ${matches.length} process${matches.length === 1 ? '' : 'es'}`);
}

async function runPmLogs(args: string[]): Promise<void> {
    if (args.length === 0) {
        throw new Error('Usage: pm logs <name> [--lines <n>] [--stderr]');
    }

    let name: string | undefined;
    let lineCount = DEFAULT_LOG_LINES;
    let stderrOnly = false;

    for (let index = 0; index < args.length; index++) {
        const arg = args[index];
        switch (arg) {
            case '--lines':
                lineCount = normalizeIntegerOption(readRequiredValue(args, ++index, '--lines'), '--lines', 1);
                break;
            case '--stderr':
                stderrOnly = true;
                break;
            default:
                if (arg.startsWith('-')) {
                    throw new Error(`Unknown pm logs option: ${arg}`);
                }
                if (name) {
                    throw new Error('pm logs accepts exactly one process name.');
                }
                name = arg;
                break;
        }
    }

    if (!name) {
        throw new Error('Usage: pm logs <name> [--lines <n>] [--stderr]');
    }

    const { paths } = await loadPmContext();
    const match = resolveInspectableMatch(paths, name);
    if (!match) {
        throw new Error(`No managed process found for: ${name}`);
    }

    const stdoutContent = stderrOnly ? '' : tailLogFile(match.record.logFiles.out, lineCount);
    const stderrContent = tailLogFile(match.record.logFiles.err, lineCount);

    if (!stderrOnly) {
        console.log(`== stdout: ${match.record.logFiles.out} ==`);
        console.log(stdoutContent || '(empty)');
    }

    console.log(`== stderr: ${match.record.logFiles.err} ==`);
    console.log(stderrContent || '(empty)');
}

export async function runPmCommand(args: string[]): Promise<void> {
    if (args.length === 0 || args[0] === 'help' || args.includes('--help') || args.includes('-h')) {
        printPmHelp();
        return;
    }

    const command = args[0];

    switch (command) {
        case 'start':
            await runPmStart(args.slice(1));
            return;
        case 'list':
        case 'ls':
            await runPmList(args.slice(1));
            return;
        case 'jlist':
            await runPmList(['--json', ...args.slice(1)]);
            return;
        case 'show':
        case 'describe':
            await runPmShow(args.slice(1));
            return;
        case 'stop':
            await runPmStop(args.slice(1));
            return;
        case 'restart':
            await runPmRestart(args.slice(1));
            return;
        case 'reload':
            await runPmReload(args.slice(1));
            return;
        case 'scale':
            await runPmScale(args.slice(1));
            return;
        case 'send-signal':
        case 'signal':
        case 'sendSignal':
            await runPmSendSignal(args.slice(1));
            return;
        case 'reset':
            await runPmReset(args.slice(1));
            return;
        case 'delete':
        case 'remove':
        case 'rm':
            await runPmDelete(args.slice(1));
            return;
        case 'save':
            await runPmSave();
            return;
        case 'resurrect':
            await runPmResurrect();
            return;
        case 'logs':
            await runPmLogs(args.slice(1));
            return;
        case '__run':
            await runPmRunner(args.slice(1));
            return;
        default:
            throw new Error(`Unknown pm command: ${command}`);
    }
}