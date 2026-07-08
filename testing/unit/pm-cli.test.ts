/// <reference path="../../packages/test/src/globals.d.ts" />

import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
    buildPmCommand,
    runManagedProcessLoop,
    runPmCommand,
    parsePmStartArgs,
    resolvePmStartDefinitions,
    sanitizePmProcessName,
    terminateProcessTree,
} from '../../packages/pm/src';

function createWapkPmRecord(overrides = {}) {
    return {
        id: 'drive-app',
        name: 'drive-app',
        baseName: 'drive-app',
        instanceIndex: 1,
        instances: 1,
        type: 'wapk',
        source: 'cli',
        cwd: process.cwd(),
        runtime: 'bun',
        env: {},
        script: undefined,
        file: undefined,
        wapk: 'gdrive://drive-file-id',
        wapkRun: {
            online: true,
            onlineUrl: 'http://localhost:4179',
            syncInterval: 150,
            useWatcher: true,
            watchArchive: true,
            archiveSyncInterval: 200,
            googleDrive: {
                accessTokenEnv: 'GOOGLE_DRIVE_ACCESS_TOKEN',
                accessToken: 'secret-token',
                supportsAllDrives: true,
            },
        },
        autorestart: true,
        restartDelay: 1000,
        maxRestarts: 10,
        password: 'secret-123',
        restartPolicy: 'always',
        waitReady: false,
        listenTimeout: 3000,
        minUptime: 0,
        watch: false,
        watchPaths: [],
        watchIgnore: [],
        watchDebounce: 250,
        healthCheck: undefined,
        desiredState: 'running',
        status: 'online',
        commandPreview: '',
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
        restartCount: 0,
        logFiles: {
            out: join(process.cwd(), '.elit', 'pm', 'logs', 'drive-app.out.log'),
            err: join(process.cwd(), '.elit', 'pm', 'logs', 'drive-app.err.log'),
        },
        ...overrides,
    };
}

function createManagedPmRecord(workspaceRoot, overrides = {}) {
    return {
        id: 'api',
        name: 'api',
        baseName: 'api',
        instanceIndex: 1,
        instances: 1,
        type: 'script',
        source: 'config',
        cwd: workspaceRoot,
        runtime: 'node',
        env: {
            NODE_ENV: 'production',
            PORT: '3000',
        },
        script: 'npm run api',
        file: undefined,
        wapk: undefined,
        wapkRun: undefined,
        autorestart: true,
        restartDelay: 1000,
        killTimeout: 12000,
        maxRestarts: 5,
        password: undefined,
        restartPolicy: 'on-failure',
        waitReady: false,
        listenTimeout: 3000,
        minUptime: 5000,
        watch: true,
        watchPaths: [join(workspaceRoot, 'src')],
        watchIgnore: ['**/node_modules/**'],
        watchDebounce: 250,
        healthCheck: {
            url: 'http://127.0.0.1:3000/health',
            gracePeriod: 1000,
            interval: 5000,
            timeout: 1000,
            maxFailures: 2,
        },
        desiredState: 'running',
        status: 'online',
        commandPreview: 'node ./src/api.ts',
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
        startedAt: new Date(Date.now() - 65000).toISOString(),
        stoppedAt: undefined,
        runnerPid: undefined,
        childPid: process.pid,
        restartCount: 2,
        lastExitCode: 1,
        error: 'last crash',
        logFiles: {
            out: join(workspaceRoot, '.elit', 'pm', 'logs', 'api.out.log'),
            err: join(workspaceRoot, '.elit', 'pm', 'logs', 'api.err.log'),
        },
        ...overrides,
    };
}

function createPmWorkspace(recordOverrides = {}) {
    const workspaceRoot = mkdtempSync(join(tmpdir(), 'elit-pm-cli-'));
    const appsDir = join(workspaceRoot, '.elit', 'pm', 'apps');
    mkdirSync(appsDir, { recursive: true });
    const record = createManagedPmRecord(workspaceRoot, recordOverrides);
    writeFileSync(join(appsDir, `${record.id}.json`), JSON.stringify(record, null, 2));
    return { workspaceRoot, record };
}

function readWorkspacePmRecord(workspaceRoot, id = 'api') {
    return JSON.parse(readFileSync(join(workspaceRoot, '.elit', 'pm', 'apps', `${id}.json`), 'utf8'));
}

async function removeWorkspace(workspaceRoot, timeoutMs = 5000) {
    const deadline = Date.now() + timeoutMs;
    let lastError;

    while (Date.now() < deadline) {
        try {
            rmSync(workspaceRoot, { recursive: true, force: true });
            if (!existsSync(workspaceRoot)) {
                return;
            }
        } catch (error) {
            lastError = error;
        }

        await new Promise((resolvePromise) => setTimeout(resolvePromise, 50));
    }

    if (existsSync(workspaceRoot)) {
        throw lastError ?? new Error(`Failed to remove workspace: ${workspaceRoot}`);
    }
}

async function waitForRecord(workspaceRoot, predicate, id = 'api', timeoutMs = 2000) {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        const record = readWorkspacePmRecord(workspaceRoot, id);
        if (predicate(record)) {
            return record;
        }

        await new Promise((resolvePromise) => setTimeout(resolvePromise, 25));
    }

    throw new Error(`Timed out waiting for PM record ${id}`);
}

async function requestUpgradePayload(port) {
    return await new Promise((resolve, reject) => {
        const request = httpRequest({
            host: '127.0.0.1',
            port,
            path: '/ws',
            headers: {
                Connection: 'Upgrade',
                Upgrade: 'websocket',
            },
        });

        request.on('upgrade', (_response, socket, head) => {
            const chunks = [];
            if (head.length > 0) {
                chunks.push(Buffer.from(head));
            }

            socket.on('data', (chunk) => {
                chunks.push(Buffer.from(chunk));
            });
            socket.on('error', reject);
            socket.on('close', () => {
                resolve(Buffer.concat(chunks).toString('utf8'));
            });
        });

        request.on('response', (response) => {
            const chunks = [];
            response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
            response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        });
        request.on('error', reject);
        request.end();
    });
}

async function fetchPmText(url) {
    const response = await fetch(url, {
        headers: {
            Connection: 'close',
        },
    });

    return await response.text();
}

function createPmInstanceRecord(workspaceRoot, baseName, instanceIndex, instances, overrides = {}) {
    const name = instanceIndex === 1 ? baseName : `${baseName}:${instanceIndex}`;
    const id = sanitizePmProcessName(name);
    return createManagedPmRecord(workspaceRoot, {
        id,
        name,
        baseName,
        instanceIndex,
        instances,
        logFiles: {
            out: join(workspaceRoot, '.elit', 'pm', 'logs', `${id}.out.log`),
            err: join(workspaceRoot, '.elit', 'pm', 'logs', `${id}.err.log`),
        },
        childPid: undefined,
        runnerPid: undefined,
        restartCount: 0,
        lastExitCode: undefined,
        error: undefined,
        status: 'online',
        desiredState: 'running',
        ...overrides,
    });
}

describe('pm cli wapk support', () => {
    it('parses direct Google Drive WAPK flags plus online hosting options', () => {
        const parsed = parsePmStartArgs([
            '--google-drive-file-id', 'drive-file-id',
            '--google-drive-token-env', 'GOOGLE_DRIVE_ACCESS_TOKEN',
            '--google-drive-shared-drive',
            '--online-url', 'http://localhost:4179',
            '--sync-interval', '150',
            '--archive-sync-interval', '200',
            '--watcher',
            '--archive-watch',
        ]);

        expect(parsed.wapkRun?.googleDrive?.fileId).toBe('drive-file-id');
        expect(parsed.wapkRun?.googleDrive?.accessTokenEnv).toBe('GOOGLE_DRIVE_ACCESS_TOKEN');
        expect(parsed.wapkRun?.googleDrive?.supportsAllDrives).toBe(true);
        expect(parsed.wapkRun?.online).toBe(true);
        expect(parsed.wapkRun?.onlineUrl).toBe('http://localhost:4179');
        expect(parsed.wapkRun?.syncInterval).toBe(150);
        expect(parsed.wapkRun?.archiveSyncInterval).toBe(200);
        expect(parsed.wapkRun?.useWatcher).toBe(true);
        expect(parsed.wapkRun?.watchArchive).toBe(true);
    });

    it('treats Google Drive source flags as an explicit WAPK target even when a process name is provided', () => {
        const workspaceRoot = join(process.cwd(), 'pm-drive-workspace');
        const definitions = resolvePmStartDefinitions(
            parsePmStartArgs([
                '--google-drive-file-id', 'drive-file-id',
                '--name', 'remote-app',
            ]),
            {
                pm: {
                    apps: [
                        { name: 'remote-app', script: 'npm start' },
                    ],
                },
            },
            workspaceRoot,
        );

        expect(definitions).toHaveLength(1);
        expect(definitions[0]?.name).toBe('remote-app');
        expect(definitions[0]?.type).toBe('wapk');
        expect(definitions[0]?.wapk).toBe('gdrive://drive-file-id');
    });

    it('resolves configured PM apps from wapkRun.googleDrive without a local archive path', () => {
        const workspaceRoot = join(process.cwd(), 'pm-drive-config');
        const definitions = resolvePmStartDefinitions(
            {
                name: 'drive-app',
                env: {},
                watchPaths: [],
                watchIgnore: [],
            },
            {
                pm: {
                    apps: [
                        {
                            name: 'drive-app',
                            wapkRun: {
                                googleDrive: {
                                    fileId: 'drive-file-id',
                                    accessTokenEnv: 'GOOGLE_DRIVE_ACCESS_TOKEN',
                                    supportsAllDrives: true,
                                },
                                syncInterval: 150,
                                useWatcher: true,
                                watchArchive: true,
                            },
                        },
                    ],
                },
            },
            workspaceRoot,
        );

        expect(definitions).toHaveLength(1);
        expect(definitions[0]?.name).toBe('drive-app');
        expect(definitions[0]?.type).toBe('wapk');
        expect(definitions[0]?.wapk).toBe('gdrive://drive-file-id');
        expect(definitions[0]?.wapkRun?.googleDrive?.accessTokenEnv).toBe('GOOGLE_DRIVE_ACCESS_TOKEN');
        expect(definitions[0]?.wapkRun?.googleDrive?.supportsAllDrives).toBe(true);
        expect(definitions[0]?.wapkRun?.syncInterval).toBe(150);
        expect(definitions[0]?.wapkRun?.useWatcher).toBe(true);
        expect(definitions[0]?.wapkRun?.watchArchive).toBe(true);
    });

    it('builds PM commands that forward WAPK online, Google Drive, and live-sync flags', () => {
        const originalCliEntry = process.argv[1];
        process.argv[1] = join(process.cwd(), 'dist', 'cli.cjs');

        try {
            const command = buildPmCommand(createWapkPmRecord());
            const requiredArgs = [
                'wapk',
                'run',
                'gdrive://drive-file-id',
                '--password',
                'secret-123',
                '--online',
                '--online-url',
                'http://localhost:4179',
                '--sync-interval',
                '150',
                '--watcher',
                '--archive-watch',
                '--archive-sync-interval',
                '200',
                '--google-drive-token-env',
                'GOOGLE_DRIVE_ACCESS_TOKEN',
                '--google-drive-access-token',
                'secret-token',
                '--google-drive-shared-drive',
            ];

            for (const requiredArg of requiredArgs) {
                expect(command.args.includes(requiredArg)).toBe(true);
            }
            expect(command.args).not.toContain('--runtime');
            expect(command.env).toEqual({ ELIT_PM_WAPK_ONLINE_STDIN_SHUTDOWN: '1' });
            expect(command.runtime).toBeUndefined();
            expect(command.preview).toContain('elit wapk run gdrive://drive-file-id');
            expect(command.preview).toContain('--online');
            expect(command.preview).toContain('--online-url http://localhost:4179');
            expect(command.preview).toContain('--sync-interval 150');
            expect(command.preview).toContain('--watcher');
            expect(command.preview).toContain('--archive-watch');
            expect(command.preview).toContain('--archive-sync-interval 200');
            expect(command.preview).toContain('--google-drive-token-env GOOGLE_DRIVE_ACCESS_TOKEN');
            expect(command.preview).toContain('--google-drive-access-token ******');
            expect(command.preview).toContain('--password ******');
        } finally {
            process.argv[1] = originalCliEntry;
        }
    });

    it('keeps online WAPK config when resolving a configured PM app', () => {
        const workspaceRoot = join(process.cwd(), 'pm-online-config');
        const definitions = resolvePmStartDefinitions(
            {
                name: 'online-app',
                env: {},
                watchPaths: [],
                watchIgnore: [],
            },
            {
                pm: {
                    apps: [
                        {
                            name: 'online-app',
                            wapk: './dist/app.wapk',
                            wapkRun: {
                                online: true,
                                onlineUrl: 'http://localhost:4179',
                            },
                        },
                    ],
                },
            },
            workspaceRoot,
        );

        expect(definitions).toHaveLength(1);
        expect(definitions[0]?.name).toBe('online-app');
        expect(definitions[0]?.type).toBe('wapk');
        expect(definitions[0]?.wapk).toBe(join(workspaceRoot, 'dist', 'app.wapk'));
        expect(definitions[0]?.wapkRun?.online).toBe(true);
        expect(definitions[0]?.wapkRun?.onlineUrl).toBe('http://localhost:4179');
    });
});

describe('pm cli process inspection', () => {
    it('expands pm start definitions for multiple instances', () => {
        const definitions = resolvePmStartDefinitions(
            parsePmStartArgs([
                '--script', 'npm run api',
                '--name', 'api',
                '--instances', '3',
            ]),
            null,
            process.cwd(),
        );

        expect(definitions).toHaveLength(3);
        expect(definitions[0]?.name).toBe('api');
        expect(definitions[0]?.baseName).toBe('api');
        expect(definitions[0]?.instanceIndex).toBe(1);
        expect(definitions[1]?.name).toBe('api:2');
        expect(definitions[1]?.instanceIndex).toBe(2);
        expect(definitions[2]?.name).toBe('api:3');
        expect(definitions[2]?.instances).toBe(3);
    });

    it('resolves waitReady and listenTimeout from pm start arguments and config definitions', () => {
        const workspaceRoot = join(process.cwd(), 'pm-wait-ready-config');
        const cliDefinitions = resolvePmStartDefinitions(
            parsePmStartArgs([
                '--script', 'npm run api',
                '--name', 'api',
                '--wait-ready',
                '--health-url', 'http://127.0.0.1:3000/health',
                '--listen-timeout', '4500',
            ]),
            null,
            workspaceRoot,
        );
        const configDefinitions = resolvePmStartDefinitions(
            {
                name: 'worker',
                env: {},
                watchPaths: [],
                watchIgnore: [],
            },
            {
                pm: {
                    apps: [
                        {
                            name: 'worker',
                            file: './src/worker.ts',
                            runtime: 'bun',
                            waitReady: true,
                            listenTimeout: 7000,
                            healthCheck: {
                                url: 'http://127.0.0.1:4000/health',
                            },
                        },
                    ],
                },
            },
            workspaceRoot,
        );

        expect(cliDefinitions).toHaveLength(1);
        expect(cliDefinitions[0]?.waitReady).toBe(true);
        expect(cliDefinitions[0]?.listenTimeout).toBe(4500);
        expect(configDefinitions).toHaveLength(1);
        expect(configDefinitions[0]?.waitReady).toBe(true);
        expect(configDefinitions[0]?.listenTimeout).toBe(7000);
    });

    it('resolves memory and restart window controls from pm start arguments and config definitions', () => {
        const workspaceRoot = join(process.cwd(), 'pm-restart-policy-config');
        const cliDefinitions = resolvePmStartDefinitions(
            parsePmStartArgs([
                '--script', 'npm run api',
                '--name', 'api',
                '--proxy-port', '3010',
                '--proxy-strategy', 'inherit',
                '--proxy-host', '127.0.0.1',
                '--proxy-target-host', '127.0.0.1',
                '--proxy-env', 'APP_PORT',
                '--max-memory', '128M',
                '--memory-action', 'stop',
                '--cron-restart', '@every 1s',
                '--exp-backoff-restart-delay', '250',
                '--exp-backoff-restart-max-delay', '900',
                '--restart-window', '1500',
            ]),
            null,
            workspaceRoot,
        );
        const configDefinitions = resolvePmStartDefinitions(
            {
                name: 'worker',
                env: {},
                watchPaths: [],
                watchIgnore: [],
            },
            {
                pm: {
                    apps: [
                        {
                            name: 'worker',
                            file: './src/worker.ts',
                            runtime: 'bun',
                            proxy: {
                                port: 4010,
                                host: '127.0.0.1',
                                targetHost: '127.0.0.1',
                                envVar: 'APP_PORT',
                            },
                            maxMemory: '256M',
                            memoryAction: 'stop',
                            cronRestart: '*/5 * * * *',
                            expBackoffRestartDelay: 400,
                            expBackoffRestartMaxDelay: 1200,
                            restartWindow: 6000,
                        },
                    ],
                },
            },
            workspaceRoot,
        );

        expect(cliDefinitions).toHaveLength(1);
        expect(cliDefinitions[0]?.maxMemoryBytes).toBe(128 * 1024 * 1024);
        expect(cliDefinitions[0]?.proxy?.port).toBe(3010);
        expect(cliDefinitions[0]?.proxy?.strategy).toBe('inherit');
        expect(cliDefinitions[0]?.proxy?.host).toBe('127.0.0.1');
        expect(cliDefinitions[0]?.proxy?.targetHost).toBe('127.0.0.1');
        expect(cliDefinitions[0]?.proxy?.envVar).toBe('APP_PORT');
        expect(cliDefinitions[0]?.memoryAction).toBe('stop');
        expect(cliDefinitions[0]?.cronRestart).toBe('@every 1s');
        expect(cliDefinitions[0]?.expBackoffRestartDelay).toBe(250);
        expect(cliDefinitions[0]?.expBackoffRestartMaxDelay).toBe(900);
        expect(cliDefinitions[0]?.restartWindow).toBe(1500);
        expect(configDefinitions).toHaveLength(1);
        expect(configDefinitions[0]?.maxMemoryBytes).toBe(256 * 1024 * 1024);
        expect(configDefinitions[0]?.proxy?.port).toBe(4010);
        expect(configDefinitions[0]?.proxy?.strategy).toBe('proxy');
        expect(configDefinitions[0]?.proxy?.envVar).toBe('APP_PORT');
        expect(configDefinitions[0]?.memoryAction).toBe('stop');
        expect(configDefinitions[0]?.cronRestart).toBe('*/5 * * * *');
        expect(configDefinitions[0]?.expBackoffRestartDelay).toBe(400);
        expect(configDefinitions[0]?.expBackoffRestartMaxDelay).toBe(1200);
        expect(configDefinitions[0]?.restartWindow).toBe(6000);
    });

    it('resolves killTimeout from pm start arguments and config definitions', () => {
        const workspaceRoot = join(process.cwd(), 'pm-kill-timeout-config');
        const cliDefinitions = resolvePmStartDefinitions(
            parsePmStartArgs([
                '--script', 'npm run api',
                '--name', 'api',
                '--kill-timeout', '12000',
            ]),
            null,
            workspaceRoot,
        );
        const configDefinitions = resolvePmStartDefinitions(
            {
                name: 'worker',
                env: {},
                watchPaths: [],
                watchIgnore: [],
            },
            {
                pm: {
                    apps: [
                        {
                            name: 'worker',
                            file: './src/worker.ts',
                            runtime: 'bun',
                            killTimeout: 9000,
                        },
                    ],
                },
            },
            workspaceRoot,
        );

        expect(cliDefinitions).toHaveLength(1);
        expect(cliDefinitions[0]?.killTimeout).toBe(12000);
        expect(configDefinitions).toHaveLength(1);
        expect(configDefinitions[0]?.killTimeout).toBe(9000);
    });

    it('prints machine-readable JSON for pm list --json', async () => {
        const { workspaceRoot, record } = createPmWorkspace();
        const originalCwd = process.cwd();
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

        process.chdir(workspaceRoot);

        try {
            await runPmCommand(['list']);
            await runPmCommand(['list', '--json']);

            expect(logSpy._calls.length).toBe(3);
            const headerOutput = String(logSpy._calls[0]?.[0] ?? '');
            const rowOutput = String(logSpy._calls[1]?.[0] ?? '');
            const output = String(logSpy._calls[2]?.[0] ?? '');
            const parsed = JSON.parse(output);

            expect(headerOutput).toContain('cpu');
            expect(headerOutput).toContain('memory');
            expect(headerOutput).toContain('uptime');
            expect(rowOutput).toContain(record.name);
            expect(parsed).toHaveLength(1);
            expect(parsed[0]?.name).toBe(record.name);
            expect(parsed[0]?.status).toBe(record.status);
            expect(parsed[0]?.commandPreview).toBe(record.commandPreview);
            expect(parsed[0]?.restartPolicy).toBe(record.restartPolicy);
            expect(parsed[0]?.killTimeout).toBe(record.killTimeout);
            expect(parsed[0]?.waitReady).toBe(record.waitReady);
            expect(parsed[0]?.listenTimeout).toBe(record.listenTimeout);
            expect(parsed[0]?.liveMetrics?.uptimeMs).toBeGreaterThan(0);
        } finally {
            process.chdir(originalCwd);
            logSpy.restore();
            rmSync(workspaceRoot, { recursive: true, force: true });
        }
    });

    it('prints detailed process metadata for pm show', async () => {
        const { workspaceRoot, record } = createPmWorkspace({
            proxy: {
                port: 3010,
                host: '127.0.0.1',
                targetHost: '127.0.0.1',
                envVar: 'PORT',
            },
            proxyTargetPort: 44010,
        });
        const originalCwd = process.cwd();
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

        process.chdir(workspaceRoot);

        try {
            await runPmCommand(['show', record.name]);

            expect(logSpy._calls.length).toBe(1);
            const output = String(logSpy._calls[0]?.[0] ?? '');

            expect(output).toContain(`Process: ${record.name}`);
            expect(output).toContain('status:');
            expect(output).toContain(record.status);
            expect(output).toContain('cpu:');
            expect(output).toContain('memory:');
            expect(output).toContain('uptime:');
            expect(output).toContain('command:');
            expect(output).toContain(record.commandPreview);
            expect(output).toContain('wait ready:');
            expect(output).toContain('disabled');
            expect(output).toContain('memory action:');
            expect(output).toContain('restart');
            expect(output).toContain('proxy:');
            expect(output).toContain('http://127.0.0.1:3010');
            expect(output).toContain('proxy strategy:');
            expect(output).toContain('proxy');
            expect(output).toContain('proxy target:');
            expect(output).toContain('127.0.0.1:44010');
            expect(output).toContain('kill timeout:');
            expect(output).toContain('12s');
            expect(output).toContain('watch paths:');
            expect(output).toContain(record.watchPaths[0]);
            expect(output).toContain('health check:');
            expect(output).toContain(record.healthCheck?.url ?? '');
            expect(output).toContain('metrics at:');
            expect(output).toContain('stdout log:');
            expect(output).toContain(record.logFiles.out);
            expect(output).toContain('env:');
            expect(output).toContain('NODE_ENV=production');
        } finally {
            process.chdir(originalCwd);
            logSpy.restore();
            rmSync(workspaceRoot, { recursive: true, force: true });
        }
    });

    it('supports describe as a JSON alias for process inspection', async () => {
        const { workspaceRoot, record } = createPmWorkspace();
        const originalCwd = process.cwd();
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

        process.chdir(workspaceRoot);

        try {
            await runPmCommand(['describe', record.name, '--json']);

            expect(logSpy._calls.length).toBe(1);
            const output = String(logSpy._calls[0]?.[0] ?? '');
            const parsed = JSON.parse(output);

            expect(parsed?.name).toBe(record.name);
            expect(parsed?.lastExitCode).toBe(record.lastExitCode);
            expect(parsed?.error).toBe(record.error);
            expect(parsed?.killTimeout).toBe(record.killTimeout);
            expect(parsed?.waitReady).toBe(record.waitReady);
            expect(parsed?.listenTimeout).toBe(record.listenTimeout);
            expect(parsed?.liveMetrics?.uptimeMs).toBeGreaterThan(0);
        } finally {
            process.chdir(originalCwd);
            logSpy.restore();
            await removeWorkspace(workspaceRoot).catch(() => undefined);
        }
    });
});

describe('pm scaling', () => {
    it('scales down a managed process group by removing the highest instances first', async () => {
        const workspaceRoot = mkdtempSync(join(tmpdir(), 'elit-pm-scale-'));
        const appsDir = join(workspaceRoot, '.elit', 'pm', 'apps');
        mkdirSync(appsDir, { recursive: true });

        const records = [
            createPmInstanceRecord(workspaceRoot, 'api', 1, 3),
            createPmInstanceRecord(workspaceRoot, 'api', 2, 3),
            createPmInstanceRecord(workspaceRoot, 'api', 3, 3),
        ];
        for (const record of records) {
            writeFileSync(join(appsDir, `${record.id}.json`), JSON.stringify(record, null, 2));
        }

        const originalCwd = process.cwd();
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
        process.chdir(workspaceRoot);

        try {
            await runPmCommand(['scale', 'api', '1']);

            expect(logSpy._calls.length).toBe(1);
            expect(String(logSpy._calls[0]?.[0] ?? '')).toContain('scaled api to 1 instance');

            const remainingEntries = readdirSync(appsDir).filter((entry) => entry.endsWith('.json'));
            expect(remainingEntries).toHaveLength(1);

            const remainingRecord = readWorkspacePmRecord(workspaceRoot, 'api');
            expect(remainingRecord.name).toBe('api');
            expect(remainingRecord.instances).toBe(1);
        } finally {
            process.chdir(originalCwd);
            logSpy.restore();
            await removeWorkspace(workspaceRoot).catch(() => undefined);
        }
    });
});

describe('pm control commands', () => {
    it('resets restart metadata for a managed process group', async () => {
        const workspaceRoot = mkdtempSync(join(tmpdir(), 'elit-pm-reset-'));
        const appsDir = join(workspaceRoot, '.elit', 'pm', 'apps');
        mkdirSync(appsDir, { recursive: true });

        const records = [
            createPmInstanceRecord(workspaceRoot, 'api', 1, 2, {
                restartCount: 4,
                lastExitCode: 1,
                error: 'boom',
            }),
            createPmInstanceRecord(workspaceRoot, 'api', 2, 2, {
                restartCount: 2,
                lastExitCode: 137,
                error: 'second boom',
            }),
        ];
        for (const record of records) {
            writeFileSync(join(appsDir, `${record.id}.json`), JSON.stringify(record, null, 2));
        }

        const originalCwd = process.cwd();
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
        process.chdir(workspaceRoot);

        try {
            await runPmCommand(['reset', 'api']);

            expect(logSpy._calls.length).toBe(1);
            expect(String(logSpy._calls[0]?.[0] ?? '')).toContain('reset 2 processes');

            const baseRecord = readWorkspacePmRecord(workspaceRoot, 'api');
            const secondRecord = readWorkspacePmRecord(workspaceRoot, sanitizePmProcessName('api:2'));

            expect(baseRecord.restartCount).toBe(0);
            expect(baseRecord.lastExitCode).toBeUndefined();
            expect(baseRecord.error).toBeUndefined();
            expect(secondRecord.restartCount).toBe(0);
            expect(secondRecord.lastExitCode).toBeUndefined();
            expect(secondRecord.error).toBeUndefined();
        } finally {
            process.chdir(originalCwd);
            logSpy.restore();
            rmSync(workspaceRoot, { recursive: true, force: true });
        }
    });

    it('sends a signal to every process in a managed group', async () => {
        const workspaceRoot = mkdtempSync(join(tmpdir(), 'elit-pm-signal-'));
        const appsDir = join(workspaceRoot, '.elit', 'pm', 'apps');
        mkdirSync(appsDir, { recursive: true });

        const records = [
            createPmInstanceRecord(workspaceRoot, 'api', 1, 2, { childPid: 4321 }),
            createPmInstanceRecord(workspaceRoot, 'api', 2, 2, { childPid: 4322 }),
        ];
        for (const record of records) {
            writeFileSync(join(appsDir, `${record.id}.json`), JSON.stringify(record, null, 2));
        }

        const originalCwd = process.cwd();
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
        const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);
        process.chdir(workspaceRoot);

        try {
            await runPmCommand(['send-signal', 'usr2', 'api']);

            expect(logSpy._calls.length).toBe(1);
            expect(String(logSpy._calls[0]?.[0] ?? '')).toContain('sent SIGUSR2 to 2 processes');

            const signalCalls = killSpy._calls.filter((call) => call[1] === 'SIGUSR2');
            expect(signalCalls).toHaveLength(2);
            expect(signalCalls[0]?.[0]).toBe(4321);
            expect(signalCalls[1]?.[0]).toBe(4322);
        } finally {
            process.chdir(originalCwd);
            killSpy.restore();
            logSpy.restore();
            rmSync(workspaceRoot, { recursive: true, force: true });
        }
    });

    it('reloads every instance in a managed process group', async () => {
        const workspaceRoot = mkdtempSync(join(tmpdir(), 'elit-pm-reload-'));
        const appsDir = join(workspaceRoot, '.elit', 'pm', 'apps');
        const entryFile = join(workspaceRoot, 'reload-app.js');
        mkdirSync(appsDir, { recursive: true });
        writeFileSync(entryFile, [
            'const http = require("node:http");',
            'let server;',
            'setTimeout(() => {',
            '  server = http.createServer((req, res) => {',
            '    res.statusCode = req.url === "/health" ? 200 : 404;',
            '    res.end("ok");',
            '  });',
            '  server.listen(Number(process.env.PORT), "127.0.0.1");',
            '}, 150);',
            'const shutdown = () => {',
            '  if (server) { server.close(() => process.exit(0)); return; }',
            '  process.exit(0);',
            '};',
            'process.on("SIGTERM", shutdown);',
            'process.on("SIGINT", shutdown);',
        ].join('\n'));

        const portA = 43950 + Math.floor(Math.random() * 200);
        const portB = portA + 1;

        const records = [
            createPmInstanceRecord(workspaceRoot, 'api', 1, 2, {
                type: 'file',
                runtime: 'node',
                script: undefined,
                file: entryFile,
                commandPreview: `node ${entryFile}`,
                restartPolicy: 'never',
                maxRestarts: 0,
                minUptime: 0,
                env: {
                    PORT: String(portA),
                },
                watch: false,
                watchPaths: [],
                watchIgnore: [],
                waitReady: true,
                listenTimeout: 1500,
                healthCheck: {
                    url: `http://127.0.0.1:${portA}/health`,
                    gracePeriod: 0,
                    interval: 100,
                    timeout: 100,
                    maxFailures: 1,
                },
            }),
            createPmInstanceRecord(workspaceRoot, 'api', 2, 2, {
                type: 'file',
                runtime: 'node',
                script: undefined,
                file: entryFile,
                commandPreview: `node ${entryFile}`,
                restartPolicy: 'never',
                maxRestarts: 0,
                minUptime: 0,
                env: {
                    PORT: String(portB),
                },
                watch: false,
                watchPaths: [],
                watchIgnore: [],
                waitReady: true,
                listenTimeout: 1500,
                healthCheck: {
                    url: `http://127.0.0.1:${portB}/health`,
                    gracePeriod: 0,
                    interval: 100,
                    timeout: 100,
                    maxFailures: 1,
                },
            }),
        ];
        for (const record of records) {
            writeFileSync(join(appsDir, `${record.id}.json`), JSON.stringify(record, null, 2));
        }

        const originalCwd = process.cwd();
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
        process.chdir(workspaceRoot);

        try {
            await runPmCommand(['reload', 'api']);

            const baseRecord = readWorkspacePmRecord(workspaceRoot, 'api');
            const secondRecord = readWorkspacePmRecord(workspaceRoot, sanitizePmProcessName('api:2'));

            expect(logSpy._calls.length).toBe(1);
            expect(String(logSpy._calls[0]?.[0] ?? '')).toContain('reloaded api, api:2');
            expect(baseRecord.name).toBe('api');
            expect(baseRecord.instances).toBe(2);
            expect(baseRecord.status).toBe('online');
            expect(Boolean(baseRecord.childPid)).toBe(true);
            expect(secondRecord.name).toBe('api:2');
            expect(secondRecord.instances).toBe(2);
            expect(secondRecord.status).toBe('online');
            expect(Boolean(secondRecord.childPid)).toBe(true);

            await runPmCommand(['stop', 'api']);
        } finally {
            process.chdir(originalCwd);
            logSpy.restore();
            await removeWorkspace(workspaceRoot).catch(() => undefined);
        }
    }, 12000);

    it('reloads a proxy-managed single instance without dropping the public endpoint', async () => {
        const workspaceRoot = mkdtempSync(join(tmpdir(), 'elit-pm-proxy-reload-'));
        const appsDir = join(workspaceRoot, '.elit', 'pm', 'apps');
        const logsDir = join(workspaceRoot, '.elit', 'pm', 'logs');
        const entryFile = join(workspaceRoot, 'proxy-app.js');
        mkdirSync(appsDir, { recursive: true });
        mkdirSync(logsDir, { recursive: true });
        writeFileSync(entryFile, [
            'const http = require("node:http");',
            'const version = `${process.pid}:${Date.now()}`;',
            'let server;',
            'setTimeout(() => {',
            '  server = http.createServer((req, res) => {',
            '    if (req.url === "/health") { res.statusCode = 200; res.end("ok"); return; }',
            '    res.statusCode = 200;',
            '    res.end(version);',
            '  });',
            '  server.listen(Number(process.env.PORT), "127.0.0.1");',
            '}, 120);',
            'const shutdown = () => {',
            '  if (server) { server.close(() => process.exit(0)); return; }',
            '  process.exit(0);',
            '};',
            'process.on("SIGTERM", shutdown);',
            'process.on("SIGINT", shutdown);',
        ].join('\n'));

        const publicPort = 43800 + Math.floor(Math.random() * 200);
        const record = createManagedPmRecord(workspaceRoot, {
            id: 'proxy-app',
            name: 'proxy-app',
            type: 'file',
            runtime: 'node',
            script: undefined,
            file: entryFile,
            commandPreview: `node ${entryFile}`,
            env: {},
            proxy: {
                port: publicPort,
                host: '127.0.0.1',
                targetHost: '127.0.0.1',
                envVar: 'PORT',
            },
            restartPolicy: 'never',
            maxRestarts: 0,
            minUptime: 0,
            watch: false,
            watchPaths: [],
            watchIgnore: [],
            waitReady: true,
            listenTimeout: 2000,
            healthCheck: {
                url: `http://127.0.0.1:${publicPort}/health`,
                gracePeriod: 0,
                interval: 100,
                timeout: 100,
                maxFailures: 1,
            },
            logFiles: {
                out: join(logsDir, 'proxy-app.out.log'),
                err: join(logsDir, 'proxy-app.err.log'),
            },
        });
        const recordPath = join(appsDir, 'proxy-app.json');
        writeFileSync(recordPath, JSON.stringify(record, null, 2));

        const loopPromise = runManagedProcessLoop(recordPath, record);
        const originalCwd = process.cwd();
        process.chdir(workspaceRoot);

        try {
            const initialRecord = await waitForRecord(workspaceRoot, (current) => current.status === 'online' && Boolean(current.childPid), 'proxy-app', 4000);
            const firstResponse = await fetch(`http://127.0.0.1:${publicPort}/?r=${Date.now()}`, { cache: 'no-store' }).then((response) => response.text());

            let reloadFinished = false;
            let requestFailures = 0;
            const seenResponses = new Set([firstResponse]);
            const poller = (async () => {
                while (!reloadFinished) {
                    try {
                        const body = await fetch(`http://127.0.0.1:${publicPort}/?r=${Date.now()}`, { cache: 'no-store' }).then((response) => response.text());
                        seenResponses.add(body);
                    } catch {
                        requestFailures += 1;
                    }

                    await new Promise((resolvePromise) => setTimeout(resolvePromise, 40));
                }
            })();

            await runPmCommand(['reload', 'proxy-app']);
            reloadFinished = true;
            await poller;

            const reloadedRecord = readWorkspacePmRecord(workspaceRoot, 'proxy-app');
            let secondResponse = firstResponse;
            const changeDeadline = Date.now() + 3000;
            while (secondResponse === firstResponse && Date.now() < changeDeadline) {
                secondResponse = await fetch(`http://127.0.0.1:${publicPort}/?r=${Date.now()}`, { cache: 'no-store' }).then((response) => response.text());
                await new Promise((resolvePromise) => setTimeout(resolvePromise, 40));
            }
            seenResponses.add(secondResponse);

            expect(requestFailures).toBe(0);
            expect(initialRecord.childPid).not.toBe(reloadedRecord.childPid);
            expect(initialRecord.proxyTargetPort).not.toBe(reloadedRecord.proxyTargetPort);
            expect(seenResponses.size).toBeGreaterThan(1);
            expect(reloadedRecord.status).toBe('online');
            expect(reloadedRecord.reloadRequestedAt).toBeUndefined();

            writeFileSync(recordPath, JSON.stringify({ ...reloadedRecord, desiredState: 'stopped' }, null, 2));
            await loopPromise;
        } finally {
            process.chdir(originalCwd);
            await removeWorkspace(workspaceRoot).catch(() => undefined);
        }
    }, 20000);

    it('reloads an inherit-managed single instance and keeps the public endpoint reachable', async () => {
        const workspaceRoot = mkdtempSync(join(tmpdir(), 'elit-pm-inherit-reload-'));
        const appsDir = join(workspaceRoot, '.elit', 'pm', 'apps');
        const logsDir = join(workspaceRoot, '.elit', 'pm', 'logs');
        const entryFile = join(workspaceRoot, 'inherit-app.js');
        mkdirSync(appsDir, { recursive: true });
        mkdirSync(logsDir, { recursive: true });
        writeFileSync(entryFile, [
            'const http = require("node:http");',
            'const version = `${process.pid}:${Date.now()}`;',
            'let server;',
            'setTimeout(() => {',
            '  server = http.createServer((req, res) => {',
            '    if (req.url === "/health") { res.statusCode = 200; res.end("ok"); return; }',
            '    res.statusCode = 200;',
            '    res.end(version);',
            '  });',
            '  server.listen(Number(process.env.PORT), "127.0.0.1");',
            '}, 120);',
            'const shutdown = () => {',
            '  if (server) { server.close(() => process.exit(0)); return; }',
            '  process.exit(0);',
            '};',
            'process.on("SIGTERM", shutdown);',
            'process.on("SIGINT", shutdown);',
        ].join('\n'));

        const publicPort = 44000 + Math.floor(Math.random() * 200);
        const record = createManagedPmRecord(workspaceRoot, {
            id: 'inherit-app',
            name: 'inherit-app',
            type: 'file',
            runtime: 'node',
            script: undefined,
            file: entryFile,
            commandPreview: `node ${entryFile}`,
            env: {
                PORT: String(publicPort),
            },
            proxy: {
                port: publicPort,
                host: '127.0.0.1',
                strategy: 'inherit',
            },
            restartPolicy: 'never',
            maxRestarts: 0,
            minUptime: 0,
            watch: false,
            watchPaths: [],
            watchIgnore: [],
            waitReady: true,
            listenTimeout: 2000,
            healthCheck: {
                url: `http://127.0.0.1:${publicPort}/health`,
                gracePeriod: 0,
                interval: 100,
                timeout: 100,
                maxFailures: 1,
            },
            logFiles: {
                out: join(logsDir, 'inherit-app.out.log'),
                err: join(logsDir, 'inherit-app.err.log'),
            },
        });
        const recordPath = join(appsDir, 'inherit-app.json');
        writeFileSync(recordPath, JSON.stringify(record, null, 2));

        const loopPromise = runManagedProcessLoop(recordPath, record);
        const originalCwd = process.cwd();
        process.chdir(workspaceRoot);

        try {
            const fetchInheritedText = async () => {
                return await fetch(`http://127.0.0.1:${publicPort}/?r=${Date.now()}`, {
                    cache: 'no-store',
                    signal: AbortSignal.timeout(1500),
                }).then((response) => response.text());
            };

            const initialRecord = await waitForRecord(workspaceRoot, (current) => current.status === 'online' && Boolean(current.childPid), 'inherit-app', 5000);
            const firstResponse = await fetchInheritedText();

            await runPmCommand(['reload', 'inherit-app']);

            const reloadedRecord = readWorkspacePmRecord(workspaceRoot, 'inherit-app');
            let secondResponse = '';
            let lastError;
            const responseDeadline = Date.now() + 3000;
            while (!secondResponse && Date.now() < responseDeadline) {
                try {
                    secondResponse = await fetchInheritedText();
                } catch (error) {
                    lastError = error;
                    await new Promise((resolvePromise) => setTimeout(resolvePromise, 40));
                }
            }

            if (!secondResponse) {
                throw lastError ?? new Error('inherit reload did not restore the public endpoint');
            }
            expect(initialRecord.childPid).not.toBe(reloadedRecord.childPid);
            expect(reloadedRecord.proxyTargetPort).toBeUndefined();
            expect(secondResponse.length).toBeGreaterThan(0);
            expect(reloadedRecord.status).toBe('online');
            expect(reloadedRecord.reloadRequestedAt).toBeUndefined();

            if (reloadedRecord.childPid) {
                terminateProcessTree(reloadedRecord.childPid, { force: true });
            }
            await Promise.race([
                loopPromise.catch(() => undefined),
                new Promise((resolvePromise) => setTimeout(resolvePromise, 1000)),
            ]);
        } finally {
            process.chdir(originalCwd);
            await removeWorkspace(workspaceRoot).catch(() => undefined);
        }
    }, 20000);

    it('load balances and forwards upgrades through a proxy-managed multi-instance group', async () => {
        const workspaceRoot = mkdtempSync(join(tmpdir(), 'elit-pm-proxy-group-'));
        const appsDir = join(workspaceRoot, '.elit', 'pm', 'apps');
        const logsDir = join(workspaceRoot, '.elit', 'pm', 'logs');
        const entryFile = join(workspaceRoot, 'proxy-group-app.js');
        mkdirSync(appsDir, { recursive: true });
        mkdirSync(logsDir, { recursive: true });
        writeFileSync(entryFile, [
            'const http = require("node:http");',
            'const version = process.env.INSTANCE_NAME;',
            'const server = http.createServer((req, res) => {',
            '  if (req.url === "/health") { res.statusCode = 200; res.end("ok"); return; }',
            '  res.statusCode = 200;',
            '  res.end(version);',
            '});',
            'server.on("upgrade", (_req, socket) => {',
            '  socket.write("HTTP/1.1 101 Switching Protocols\\r\\nConnection: Upgrade\\r\\nUpgrade: websocket\\r\\n\\r\\n");',
            '  socket.end(version);',
            '});',
            'server.listen(Number(process.env.APP_PORT), "127.0.0.1");',
            'const shutdown = () => server.close(() => process.exit(0));',
            'process.on("SIGTERM", shutdown);',
            'process.on("SIGINT", shutdown);',
        ].join('\n'));

        const publicPort = 44200 + Math.floor(Math.random() * 200);
        const proxy = {
            port: publicPort,
            host: '127.0.0.1',
            targetHost: '127.0.0.1',
            envVar: 'APP_PORT',
        };
        const firstRecord = createPmInstanceRecord(workspaceRoot, 'cluster-app', 1, 2, {
            type: 'file',
            runtime: 'node',
            script: undefined,
            file: entryFile,
            commandPreview: `node ${entryFile}`,
            env: { INSTANCE_NAME: 'one' },
            proxy,
            restartPolicy: 'never',
            maxRestarts: 0,
            minUptime: 0,
            watch: false,
            watchPaths: [],
            watchIgnore: [],
            waitReady: true,
            listenTimeout: 2000,
            healthCheck: {
                url: `http://127.0.0.1:${publicPort}/health`,
                gracePeriod: 0,
                interval: 100,
                timeout: 100,
                maxFailures: 1,
            },
            logFiles: {
                out: join(logsDir, 'cluster-app.out.log'),
                err: join(logsDir, 'cluster-app.err.log'),
            },
        });
        const secondRecord = createPmInstanceRecord(workspaceRoot, 'cluster-app', 2, 2, {
            type: 'file',
            runtime: 'node',
            script: undefined,
            file: entryFile,
            commandPreview: `node ${entryFile}`,
            env: { INSTANCE_NAME: 'two' },
            proxy,
            restartPolicy: 'never',
            maxRestarts: 0,
            minUptime: 0,
            watch: false,
            watchPaths: [],
            watchIgnore: [],
            waitReady: true,
            listenTimeout: 2000,
            healthCheck: {
                url: `http://127.0.0.1:${publicPort}/health`,
                gracePeriod: 0,
                interval: 100,
                timeout: 100,
                maxFailures: 1,
            },
            logFiles: {
                out: join(logsDir, 'cluster-app-2.out.log'),
                err: join(logsDir, 'cluster-app-2.err.log'),
            },
        });
        const firstPath = join(appsDir, `${firstRecord.id}.json`);
        const secondPath = join(appsDir, `${secondRecord.id}.json`);
        writeFileSync(firstPath, JSON.stringify(firstRecord, null, 2));
        writeFileSync(secondPath, JSON.stringify(secondRecord, null, 2));

        const firstLoop = runManagedProcessLoop(firstPath, firstRecord);
        let secondLoop;

        try {
            await waitForRecord(workspaceRoot, (current) => current.status === 'online' && Boolean(current.childPid), firstRecord.id, 4000);
            secondLoop = runManagedProcessLoop(secondPath, secondRecord);
            await waitForRecord(workspaceRoot, (current) => current.status === 'online' && Boolean(current.childPid), secondRecord.id, 4000);

            const seenResponses = new Set();
            const deadline = Date.now() + 3000;
            while (seenResponses.size < 2 && Date.now() < deadline) {
                const body = await fetchPmText(`http://127.0.0.1:${publicPort}/`);
                seenResponses.add(body);
                await new Promise((resolvePromise) => setTimeout(resolvePromise, 40));
            }

            const upgradePayload = String(await requestUpgradePayload(publicPort)).trim();

            expect(Array.from(seenResponses)).toContain('one');
            expect(Array.from(seenResponses)).toContain('two');
            expect(['one', 'two']).toContain(upgradePayload);

            writeFileSync(firstPath, JSON.stringify({ ...readWorkspacePmRecord(workspaceRoot, firstRecord.id), desiredState: 'stopped' }, null, 2));
            writeFileSync(secondPath, JSON.stringify({ ...readWorkspacePmRecord(workspaceRoot, secondRecord.id), desiredState: 'stopped' }, null, 2));
            await Promise.all([firstLoop, secondLoop]);
        } finally {
            if (secondLoop) {
                await Promise.resolve(secondLoop).catch(() => undefined);
            }
            await removeWorkspace(workspaceRoot).catch(() => undefined);
        }
    }, 20000);
});

describe('pm runner readiness', () => {
    it('waits for health readiness before marking a process online', async () => {
        const workspaceRoot = mkdtempSync(join(tmpdir(), 'elit-pm-ready-'));
        const appsDir = join(workspaceRoot, '.elit', 'pm', 'apps');
        const logsDir = join(workspaceRoot, '.elit', 'pm', 'logs');
        mkdirSync(appsDir, { recursive: true });
        mkdirSync(logsDir, { recursive: true });

        const port = 43150 + Math.floor(Math.random() * 200);
        const entryFile = join(workspaceRoot, 'ready-server.js');
        writeFileSync(entryFile, [
            'const http = require("node:http");',
            'let server;',
            'setTimeout(() => {',
            `  server = http.createServer((req, res) => { res.statusCode = req.url === "/health" ? 200 : 404; res.end("ok"); });`,
            `  server.listen(${port}, "127.0.0.1");`,
            '}, 150);',
            'const shutdown = () => {',
            '  if (server) { server.close(() => process.exit(0)); return; }',
            '  process.exit(0);',
            '};',
            'process.on("SIGTERM", shutdown);',
            'process.on("SIGINT", shutdown);',
        ].join('\n'));

        const record = createManagedPmRecord(workspaceRoot, {
            id: 'ready-app',
            name: 'ready-app',
            type: 'file',
            runtime: 'node',
            script: undefined,
            file: entryFile,
            commandPreview: `node ${entryFile}`,
            restartCount: 0,
            lastExitCode: undefined,
            error: undefined,
            watch: false,
            watchPaths: [],
            watchIgnore: [],
            waitReady: true,
            listenTimeout: 1200,
            minUptime: 0,
            maxRestarts: 1,
            healthCheck: {
                url: `http://127.0.0.1:${port}/health`,
                gracePeriod: 0,
                interval: 100,
                timeout: 100,
                maxFailures: 2,
            },
            logFiles: {
                out: join(logsDir, 'ready-app.out.log'),
                err: join(logsDir, 'ready-app.err.log'),
            },
        });
        const recordPath = join(appsDir, 'ready-app.json');
        writeFileSync(recordPath, JSON.stringify(record, null, 2));

        const loopPromise = runManagedProcessLoop(recordPath, record);

        try {
            const startingRecord = await waitForRecord(workspaceRoot, (current) => current.status === 'starting', 'ready-app', 400);
            expect(startingRecord.waitReady).toBe(true);

            const onlineRecord = await waitForRecord(workspaceRoot, (current) => current.status === 'online' && Boolean(current.childPid), 'ready-app', 2000);
            expect(onlineRecord.listenTimeout).toBe(1200);

            writeFileSync(recordPath, JSON.stringify({ ...onlineRecord, desiredState: 'stopped' }, null, 2));
            await loopPromise;

            const finalRecord = readWorkspacePmRecord(workspaceRoot, 'ready-app');
            expect(finalRecord.status).toBe('stopped');
        } finally {
            rmSync(workspaceRoot, { recursive: true, force: true });
        }
    });

    it('errors when waitReady exceeds listenTimeout', async () => {
        const workspaceRoot = mkdtempSync(join(tmpdir(), 'elit-pm-ready-timeout-'));
        const appsDir = join(workspaceRoot, '.elit', 'pm', 'apps');
        const logsDir = join(workspaceRoot, '.elit', 'pm', 'logs');
        mkdirSync(appsDir, { recursive: true });
        mkdirSync(logsDir, { recursive: true });

        const port = 43450 + Math.floor(Math.random() * 200);
        const entryFile = join(workspaceRoot, 'idle-process.js');
        writeFileSync(entryFile, [
            'setInterval(() => {}, 1000);',
            'process.on("SIGTERM", () => process.exit(0));',
            'process.on("SIGINT", () => process.exit(0));',
        ].join('\n'));

        const record = createManagedPmRecord(workspaceRoot, {
            id: 'timeout-app',
            name: 'timeout-app',
            type: 'file',
            runtime: 'node',
            script: undefined,
            file: entryFile,
            commandPreview: `node ${entryFile}`,
            restartCount: 0,
            lastExitCode: undefined,
            error: undefined,
            watch: false,
            watchPaths: [],
            watchIgnore: [],
            waitReady: true,
            listenTimeout: 200,
            minUptime: 0,
            maxRestarts: 0,
            healthCheck: {
                url: `http://127.0.0.1:${port}/health`,
                gracePeriod: 0,
                interval: 50,
                timeout: 50,
                maxFailures: 1,
            },
            logFiles: {
                out: join(logsDir, 'timeout-app.out.log'),
                err: join(logsDir, 'timeout-app.err.log'),
            },
        });
        const recordPath = join(appsDir, 'timeout-app.json');
        writeFileSync(recordPath, JSON.stringify(record, null, 2));

        try {
            await runManagedProcessLoop(recordPath, record);
            const finalRecord = readWorkspacePmRecord(workspaceRoot, 'timeout-app');
            expect(finalRecord.status).toBe('errored');
            expect(finalRecord.error).toContain('startup');
        } finally {
            rmSync(workspaceRoot, { recursive: true, force: true });
        }
    });

    it('restarts when the process exceeds maxMemoryBytes', async () => {
        const workspaceRoot = mkdtempSync(join(tmpdir(), 'elit-pm-memory-'));
        const appsDir = join(workspaceRoot, '.elit', 'pm', 'apps');
        const logsDir = join(workspaceRoot, '.elit', 'pm', 'logs');
        mkdirSync(appsDir, { recursive: true });
        mkdirSync(logsDir, { recursive: true });

        const entryFile = join(workspaceRoot, 'memory-app.js');
        writeFileSync(entryFile, [
            'setInterval(() => {}, 1000);',
            'process.on("SIGTERM", () => process.exit(0));',
            'process.on("SIGINT", () => process.exit(0));',
        ].join('\n'));

        const record = createManagedPmRecord(workspaceRoot, {
            id: 'memory-app',
            name: 'memory-app',
            type: 'file',
            runtime: 'node',
            script: undefined,
            file: entryFile,
            commandPreview: `node ${entryFile}`,
            restartPolicy: 'never',
            maxRestarts: 0,
            minUptime: 0,
            restartCount: 0,
            lastExitCode: undefined,
            error: undefined,
            watch: false,
            watchPaths: [],
            watchIgnore: [],
            healthCheck: undefined,
            maxMemoryBytes: 1,
            logFiles: {
                out: join(logsDir, 'memory-app.out.log'),
                err: join(logsDir, 'memory-app.err.log'),
            },
        });
        const recordPath = join(appsDir, 'memory-app.json');
        writeFileSync(recordPath, JSON.stringify(record, null, 2));

        const loopPromise = runManagedProcessLoop(recordPath, record);

        try {
            const erroredRecord = await waitForRecord(workspaceRoot, (current) => current.status === 'errored', 'memory-app', 5000);
            expect(erroredRecord.error).toContain('memory');
            await loopPromise;
        } finally {
            await removeWorkspace(workspaceRoot).catch(() => undefined);
        }
    });

    it('stops when memoryAction is set to stop', async () => {
        const workspaceRoot = mkdtempSync(join(tmpdir(), 'elit-pm-memory-stop-'));
        const appsDir = join(workspaceRoot, '.elit', 'pm', 'apps');
        const logsDir = join(workspaceRoot, '.elit', 'pm', 'logs');
        mkdirSync(appsDir, { recursive: true });
        mkdirSync(logsDir, { recursive: true });

        const entryFile = join(workspaceRoot, 'memory-stop-app.js');
        writeFileSync(entryFile, [
            'setInterval(() => {}, 1000);',
            'process.on("SIGTERM", () => process.exit(0));',
            'process.on("SIGINT", () => process.exit(0));',
        ].join('\n'));

        const record = createManagedPmRecord(workspaceRoot, {
            id: 'memory-stop-app',
            name: 'memory-stop-app',
            type: 'file',
            runtime: 'node',
            script: undefined,
            file: entryFile,
            commandPreview: `node ${entryFile}`,
            restartPolicy: 'always',
            maxRestarts: 5,
            minUptime: 0,
            restartCount: 0,
            lastExitCode: undefined,
            error: undefined,
            watch: false,
            watchPaths: [],
            watchIgnore: [],
            healthCheck: undefined,
            maxMemoryBytes: 1,
            memoryAction: 'stop',
            logFiles: {
                out: join(logsDir, 'memory-stop-app.out.log'),
                err: join(logsDir, 'memory-stop-app.err.log'),
            },
        });
        const recordPath = join(appsDir, 'memory-stop-app.json');
        writeFileSync(recordPath, JSON.stringify(record, null, 2));

        await runManagedProcessLoop(recordPath, record);

        const finalRecord = readWorkspacePmRecord(workspaceRoot, 'memory-stop-app');
        try {
            expect(finalRecord.status).toBe('errored');
            expect(finalRecord.restartCount).toBe(0);
            expect(finalRecord.error).toContain('memory');
        } finally {
            await removeWorkspace(workspaceRoot).catch(() => undefined);
        }
    });

    it('uses exponential backoff delay for unstable restarts', async () => {
        const workspaceRoot = mkdtempSync(join(tmpdir(), 'elit-pm-backoff-'));
        const appsDir = join(workspaceRoot, '.elit', 'pm', 'apps');
        const logsDir = join(workspaceRoot, '.elit', 'pm', 'logs');
        mkdirSync(appsDir, { recursive: true });
        mkdirSync(logsDir, { recursive: true });

        const entryFile = join(workspaceRoot, 'crash-app.js');
        writeFileSync(entryFile, 'process.exit(1);');

        const record = createManagedPmRecord(workspaceRoot, {
            id: 'backoff-app',
            name: 'backoff-app',
            type: 'file',
            runtime: 'node',
            script: undefined,
            file: entryFile,
            commandPreview: `node ${entryFile}`,
            restartPolicy: 'always',
            restartDelay: 10,
            expBackoffRestartDelay: 200,
            maxRestarts: 2,
            minUptime: 0,
            restartCount: 0,
            lastExitCode: undefined,
            error: undefined,
            watch: false,
            watchPaths: [],
            watchIgnore: [],
            healthCheck: undefined,
            logFiles: {
                out: join(logsDir, 'backoff-app.out.log'),
                err: join(logsDir, 'backoff-app.err.log'),
            },
        });
        const recordPath = join(appsDir, 'backoff-app.json');
        writeFileSync(recordPath, JSON.stringify(record, null, 2));

        await runManagedProcessLoop(recordPath, record);

        const finalRecord = readWorkspacePmRecord(workspaceRoot, 'backoff-app');
        const stdoutLog = readFileSync(join(logsDir, 'backoff-app.out.log'), 'utf8');

        try {
            expect(finalRecord.status).toBe('errored');
            expect(stdoutLog).toContain('restarting in 200ms');
            expect(stdoutLog).toContain('restarting in 400ms');
        } finally {
            await removeWorkspace(workspaceRoot).catch(() => undefined);
        }
    }, 12000);

    it('caps exponential backoff delay with expBackoffRestartMaxDelay', async () => {
        const workspaceRoot = mkdtempSync(join(tmpdir(), 'elit-pm-backoff-cap-'));
        const appsDir = join(workspaceRoot, '.elit', 'pm', 'apps');
        const logsDir = join(workspaceRoot, '.elit', 'pm', 'logs');
        mkdirSync(appsDir, { recursive: true });
        mkdirSync(logsDir, { recursive: true });

        const entryFile = join(workspaceRoot, 'backoff-cap-app.js');
        writeFileSync(entryFile, 'process.exit(1);');

        const record = createManagedPmRecord(workspaceRoot, {
            id: 'backoff-cap-app',
            name: 'backoff-cap-app',
            type: 'file',
            runtime: 'node',
            script: undefined,
            file: entryFile,
            commandPreview: `node ${entryFile}`,
            restartPolicy: 'always',
            restartDelay: 10,
            expBackoffRestartDelay: 200,
            expBackoffRestartMaxDelay: 250,
            maxRestarts: 2,
            minUptime: 0,
            restartCount: 0,
            lastRestartAt: undefined,
            lastExitCode: undefined,
            error: undefined,
            watch: false,
            watchPaths: [],
            watchIgnore: [],
            healthCheck: undefined,
            logFiles: {
                out: join(logsDir, 'backoff-cap-app.out.log'),
                err: join(logsDir, 'backoff-cap-app.err.log'),
            },
        });
        const recordPath = join(appsDir, 'backoff-cap-app.json');
        writeFileSync(recordPath, JSON.stringify(record, null, 2));

        await runManagedProcessLoop(recordPath, record);

        const finalRecord = readWorkspacePmRecord(workspaceRoot, 'backoff-cap-app');
        const stdoutLog = readFileSync(join(logsDir, 'backoff-cap-app.out.log'), 'utf8');
        try {
            expect(finalRecord.status).toBe('errored');
            expect(finalRecord.restartCount).toBe(3);
            expect(stdoutLog).toContain('restarting in 200ms');
            expect(stdoutLog).toContain('restarting in 250ms');
        } finally {
            await removeWorkspace(workspaceRoot).catch(() => undefined);
        }
    }, 12000);

    it('resets restart counts when the last restart falls outside restartWindow', async () => {
        const workspaceRoot = mkdtempSync(join(tmpdir(), 'elit-pm-window-'));
        const appsDir = join(workspaceRoot, '.elit', 'pm', 'apps');
        const logsDir = join(workspaceRoot, '.elit', 'pm', 'logs');
        mkdirSync(appsDir, { recursive: true });
        mkdirSync(logsDir, { recursive: true });

        const entryFile = join(workspaceRoot, 'window-app.js');
        writeFileSync(entryFile, 'process.exit(1);');

        const record = createManagedPmRecord(workspaceRoot, {
            id: 'window-app',
            name: 'window-app',
            type: 'file',
            runtime: 'node',
            script: undefined,
            file: entryFile,
            commandPreview: `node ${entryFile}`,
            restartPolicy: 'always',
            restartDelay: 10,
            maxRestarts: 1,
            restartWindow: 100,
            minUptime: 0,
            restartCount: 8,
            lastRestartAt: new Date(Date.now() - 2000).toISOString(),
            lastExitCode: undefined,
            error: undefined,
            watch: false,
            watchPaths: [],
            watchIgnore: [],
            healthCheck: undefined,
            logFiles: {
                out: join(logsDir, 'window-app.out.log'),
                err: join(logsDir, 'window-app.err.log'),
            },
        });
        const recordPath = join(appsDir, 'window-app.json');
        writeFileSync(recordPath, JSON.stringify(record, null, 2));

        await runManagedProcessLoop(recordPath, record);

        const finalRecord = readWorkspacePmRecord(workspaceRoot, 'window-app');
        const stdoutLog = readFileSync(join(logsDir, 'window-app.out.log'), 'utf8');
        try {
            expect(finalRecord.status).toBe('errored');
            expect(finalRecord.restartCount).toBe(2);
            expect(stdoutLog).toContain('restarting in 10ms');
        } finally {
            await removeWorkspace(workspaceRoot).catch(() => undefined);
        }
    }, 12000);

    it('restarts on cronRestart schedules', async () => {
        const workspaceRoot = mkdtempSync(join(tmpdir(), 'elit-pm-cron-'));
        const appsDir = join(workspaceRoot, '.elit', 'pm', 'apps');
        const logsDir = join(workspaceRoot, '.elit', 'pm', 'logs');
        mkdirSync(appsDir, { recursive: true });
        mkdirSync(logsDir, { recursive: true });

        const entryFile = join(workspaceRoot, 'cron-app.js');
        writeFileSync(entryFile, [
            'setInterval(() => {}, 1000);',
            'process.on("SIGTERM", () => process.exit(0));',
            'process.on("SIGINT", () => process.exit(0));',
        ].join('\n'));

        const record = createManagedPmRecord(workspaceRoot, {
            id: 'cron-app',
            name: 'cron-app',
            type: 'file',
            runtime: 'node',
            script: undefined,
            file: entryFile,
            commandPreview: `node ${entryFile}`,
            restartPolicy: 'never',
            cronRestart: '@every 1s',
            maxRestarts: 0,
            minUptime: 0,
            restartCount: 0,
            lastExitCode: undefined,
            error: undefined,
            watch: false,
            watchPaths: [],
            watchIgnore: [],
            healthCheck: undefined,
            logFiles: {
                out: join(logsDir, 'cron-app.out.log'),
                err: join(logsDir, 'cron-app.err.log'),
            },
        });
        const recordPath = join(appsDir, 'cron-app.json');
        writeFileSync(recordPath, JSON.stringify(record, null, 2));

        const loopPromise = runManagedProcessLoop(recordPath, record);

        try {
            const erroredRecord = await waitForRecord(workspaceRoot, (current) => current.status === 'errored', 'cron-app', 5000);
            expect(erroredRecord.error).toContain('cron');
            await loopPromise;
        } finally {
            await removeWorkspace(workspaceRoot).catch(() => undefined);
        }
    }, 12000);
});

