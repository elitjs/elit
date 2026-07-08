/// <reference path="../../packages/test/src/globals.d.ts" />

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createWapkLiveSync, extractWapkArchive, packWapkDirectory, prepareWapkApp, readWapkArchive, runPreparedWapkApp, runWapkCommand, shouldUseShellExecution } from '../../packages/wapk/src';

function createTempDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'elit-wapk-'));
}

function createTempWapkProject(): string {
    const dir = createTempDir();
    fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
        name: 'test-wapk-app',
        version: '1.0.0',
        main: 'src/index.js',
    }, null, 2));
    fs.writeFileSync(path.join(dir, 'src', 'index.js'), 'console.log("hello");\n');
    return dir;
}

function createGoogleDriveFetchMock(initialBuffer: Buffer, fileId = 'drive-file-id') {
    const originalFetch = global.fetch;
    let remoteBuffer = Buffer.from(initialBuffer);
    let revision = 0;

    const createMetadata = () => ({
        id: fileId,
        name: 'remote-app.wapk',
        modifiedTime: new Date(1710000000000 + revision).toISOString(),
        size: String(remoteBuffer.length),
        md5Checksum: createHash('md5').update(remoteBuffer).digest('hex'),
    });

    const jsonResponse = (payload: unknown) => new Response(JSON.stringify(payload), {
        headers: { 'content-type': 'application/json' },
    });

    global.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
        const url = typeof input === 'string'
            ? input
            : input instanceof URL
                ? input.toString()
                : input.url;

        if (!url.includes(`/files/${fileId}`)) {
            throw new Error(`Unexpected Google Drive URL: ${url}`);
        }

        const method = init?.method ?? 'GET';
        if (method === 'GET') {
            if (url.includes('alt=media')) {
                return new Response(remoteBuffer, {
                    headers: { 'content-type': 'application/octet-stream' },
                });
            }

            return jsonResponse(createMetadata());
        }

        if (method === 'PATCH') {
            const body = init?.body;
            if (!body) {
                throw new Error('Google Drive upload body was missing.');
            }

            remoteBuffer = Buffer.isBuffer(body)
                ? Buffer.from(body)
                : Buffer.from(await new Response(body).arrayBuffer());
            revision += 1;
            return jsonResponse(createMetadata());
        }

        throw new Error(`Unexpected Google Drive method: ${method}`);
    }) as typeof fetch;

    return {
        getBuffer(): Buffer {
            return Buffer.from(remoteBuffer);
        },
        setBuffer(buffer: Buffer): void {
            remoteBuffer = Buffer.from(buffer);
            revision += 1;
        },
        restore(): void {
            global.fetch = originalFetch;
        },
    };
}

function createGoogleDriveOnlineFetchMock(
    initialBuffer: Buffer,
    options: {
        fileId?: string;
        onlineUrl?: string;
        shutdownSignals?: Array<{ signal: 'SIGINT' | 'SIGTERM'; delayMs?: number }>;
    } = {},
) {
    const originalFetch = global.fetch;
    const fileId = options.fileId ?? 'drive-file-id';
    const launcherUrl = new URL(options.onlineUrl ?? 'http://localhost:4179/');
    const shutdownSignals = options.shutdownSignals ?? [{ signal: 'SIGINT', delayMs: 0 }];
    let remoteBuffer = Buffer.from(initialBuffer);
    let revision = 0;
    let createPayload: any;
    let closePayload: any;

    const createMetadata = () => ({
        id: fileId,
        name: 'remote-app.wapk',
        modifiedTime: new Date(1710000000000 + revision).toISOString(),
        size: String(remoteBuffer.length),
        md5Checksum: createHash('md5').update(remoteBuffer).digest('hex'),
    });

    const jsonResponse = (payload: unknown) => new Response(JSON.stringify(payload), {
        headers: { 'content-type': 'application/json' },
    });

    const readJsonBody = async (body: any) => {
        if (typeof body === 'string') {
            return JSON.parse(body);
        }

        return JSON.parse(await new Response(body).text());
    };

    global.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
        const requestUrl = typeof input === 'string'
            ? input
            : input instanceof URL
                ? input.toString()
                : input.url;
        const url = new URL(requestUrl);
        const method = init?.method ?? 'GET';

        if (url.origin === launcherUrl.origin && url.pathname === launcherUrl.pathname && method === 'GET') {
            return new Response('ok', { status: 200 });
        }

        if (url.origin === launcherUrl.origin && url.pathname === '/api/shared-session/create' && method === 'POST') {
            createPayload = await readJsonBody(init?.body);
            for (const shutdownSignal of shutdownSignals) {
                setTimeout(() => {
                    process.emit(shutdownSignal.signal);
                }, shutdownSignal.delayMs ?? 0);
            }
            return jsonResponse({
                ok: true,
                joinKey: 'ABCD-EFGH-IJKL',
                adminToken: 'admin-token',
            });
        }

        if (url.origin === launcherUrl.origin && url.pathname === '/api/shared-session/read' && method === 'POST') {
            return jsonResponse({
                ok: true,
                revision: 0,
                changed: false,
            });
        }

        if (url.origin === launcherUrl.origin && url.pathname === '/api/shared-session/close' && method === 'POST') {
            closePayload = await readJsonBody(init?.body);
            return jsonResponse({ ok: true });
        }

        if (!requestUrl.includes(`/files/${fileId}`)) {
            throw new Error(`Unexpected URL: ${requestUrl}`);
        }

        if (method === 'GET') {
            if (requestUrl.includes('alt=media')) {
                return new Response(remoteBuffer, {
                    headers: { 'content-type': 'application/octet-stream' },
                });
            }

            return jsonResponse(createMetadata());
        }

        if (method === 'PATCH') {
            const body = init?.body;
            if (!body) {
                throw new Error('Google Drive upload body was missing.');
            }

            remoteBuffer = Buffer.isBuffer(body)
                ? Buffer.from(body)
                : Buffer.from(await new Response(body).arrayBuffer());
            revision += 1;
            return jsonResponse(createMetadata());
        }

        throw new Error(`Unexpected method for ${requestUrl}: ${method}`);
    }) as typeof fetch;

    return {
        getCreatePayload() {
            return createPayload;
        },
        getClosePayload() {
            return closePayload;
        },
        restore(): void {
            global.fetch = originalFetch;
        },
    };
}

describe('wapk helpers', () => {
    it('uses shell execution for Windows command scripts only', () => {
        expect(shouldUseShellExecution('C:/tools/npm.cmd', 'win32')).toBe(true);
        expect(shouldUseShellExecution('C:/tools/tsx.CMD', 'win32')).toBe(true);
        expect(shouldUseShellExecution('C:/tools/node.exe', 'win32')).toBe(false);
        expect(shouldUseShellExecution('/usr/bin/npm', 'linux')).toBe(false);
    });

    it('packs a directory and infers runtime and entry from package.json scripts', async () => {
        const dir = createTempDir();

        try {
            fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
            fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
                name: '@scope/demo-app',
                version: '2.1.0',
                scripts: {
                    start: 'bun run src/server.ts',
                },
            }, null, 2));
            fs.writeFileSync(path.join(dir, 'src', 'server.ts'), 'console.log("hello");\n');
            fs.writeFileSync(path.join(dir, 'README.md'), '# demo\n');

            const archivePath = await packWapkDirectory(dir, {
                outputPath: path.join(dir, 'demo.wapk'),
            });
            const archive = readWapkArchive(archivePath);

            expect(archive.header.name).toBe('@scope/demo-app');
            expect(archive.header.version).toBe('2.1.0');
            expect(archive.header.runtime).toBe('bun');
            expect(archive.header.entry).toBe('src/server.ts');
            expect(archive.files.some((file) => file.path === 'src/server.ts')).toBe(true);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('falls back to build.entry when wapk.entry is omitted', async () => {
        const dir = createTempDir();

        try {
            fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
            fs.writeFileSync(path.join(dir, 'elit.config.json'), JSON.stringify({
                build: [
                    {
                        entry: './src/main.ts',
                    },
                ],
                wapk: {
                    name: 'build-entry-app',
                    version: '1.0.0',
                    runtime: 'node',
                    script: {
                        start: 'npm run preview',
                    },
                },
            }, null, 2));
            fs.writeFileSync(path.join(dir, 'src', 'main.ts'), 'console.log("from-build-entry");\n');

            const archivePath = await packWapkDirectory(dir, {
                outputPath: path.join(dir, 'build-entry-app.wapk'),
            });
            const archive = readWapkArchive(archivePath);

            expect(archive.header.name).toBe('build-entry-app');
            expect(archive.header.entry).toBe('src/main.ts');
            expect(archive.header.scripts?.start).toBe('npm run preview');
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('includes node_modules by default and keeps --include-deps compatible', async () => {
        const dir = createTempDir();

        try {
            fs.mkdirSync(path.join(dir, 'node_modules', 'example'), { recursive: true });
            fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
                name: 'deps-app',
                version: '1.0.0',
                main: 'index.js',
                dependencies: {
                    example: '1.0.0',
                },
            }, null, 2));
            fs.writeFileSync(path.join(dir, 'index.js'), 'console.log("deps");\n');
            fs.writeFileSync(path.join(dir, 'node_modules', 'example', 'index.js'), 'module.exports = 1;\n');

            const withoutDeps = readWapkArchive(await packWapkDirectory(dir, {
                outputPath: path.join(dir, 'without-deps.wapk'),
            }));
            const withDeps = readWapkArchive(await packWapkDirectory(dir, {
                includeDeps: true,
                outputPath: path.join(dir, 'with-deps.wapk'),
            }));

            expect(withoutDeps.files.some((file) => file.path === 'node_modules/example/index.js')).toBe(true);
            expect(withDeps.files.some((file) => file.path === 'node_modules/example/index.js')).toBe(true);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('supports !pattern rules in .wapkignore to re-include previously ignored paths', async () => {
        const dir = createTempDir();

        try {
            fs.mkdirSync(path.join(dir, 'dist'), { recursive: true });
            fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
                name: 'ignore-negation-app',
                version: '1.0.0',
                main: 'index.js',
            }, null, 2));
            fs.writeFileSync(path.join(dir, 'index.js'), ['console.log("ignore-negation");', ''].join('\n'));
            fs.writeFileSync(path.join(dir, 'dist', 'main.js'), ['console.log("built");', ''].join('\n'));
            fs.writeFileSync(path.join(dir, 'secret.txt'), ['do-not-pack', ''].join('\n'));
            fs.writeFileSync(path.join(dir, '.wapkignore'), ['dist', '!dist', 'secret.txt', ''].join('\n'));

            const archive = readWapkArchive(await packWapkDirectory(dir, {
                outputPath: path.join(dir, 'ignore-negation-app.wapk'),
            }));

            expect(archive.files.some((file) => file.path === 'dist/main.js')).toBe(true);
            expect(archive.files.some((file) => file.path === 'secret.txt')).toBe(false);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('supports directory rules, globstar rules, and escaped leading ! in .wapkignore', async () => {
        const dir = createTempDir();

        try {
            fs.mkdirSync(path.join(dir, 'dist'), { recursive: true });
            fs.mkdirSync(path.join(dir, 'nested'), { recursive: true });
            fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
                name: 'ignore-gitlike-app',
                version: '1.0.0',
                main: 'index.js',
            }, null, 2));
            fs.writeFileSync(path.join(dir, 'index.js'), ['console.log("root");', ''].join('\n'));
            fs.writeFileSync(path.join(dir, 'dist', 'main.js'), ['console.log("dist");', ''].join('\n'));
            fs.writeFileSync(path.join(dir, 'dist', 'main.js.map'), ['{}', ''].join('\n'));
            fs.writeFileSync(path.join(dir, 'nested', 'bundle.js.map'), ['{}', ''].join('\n'));
            fs.writeFileSync(path.join(dir, '!keep.txt'), ['keep-me-out', ''].join('\n'));
            fs.writeFileSync(path.join(dir, '.wapkignore'), ['dist/', '!dist/', '**/*.map', '\\!keep.txt', ''].join('\n'));

            const archive = readWapkArchive(await packWapkDirectory(dir, {
                outputPath: path.join(dir, 'ignore-gitlike-app.wapk'),
            }));

            expect(archive.files.some((file) => file.path === 'dist/main.js')).toBe(true);
            expect(archive.files.some((file) => file.path === 'dist/main.js.map')).toBe(false);
            expect(archive.files.some((file) => file.path === 'nested/bundle.js.map')).toBe(false);
            expect(archive.files.some((file) => file.path === '!keep.txt')).toBe(false);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('packs nested standalone package dependencies even when root node_modules is ignored', async () => {
        const dir = createTempDir();

        try {
            fs.mkdirSync(path.join(dir, 'dev-dist'), { recursive: true });
            fs.mkdirSync(path.join(dir, 'node_modules', 'example-runtime'), { recursive: true });
            fs.mkdirSync(path.join(dir, 'node_modules', '@example', 'helper-runtime'), { recursive: true });
            fs.writeFileSync(path.join(dir, '.wapkignore'), 'node_modules\n');
            fs.writeFileSync(path.join(dir, 'elit.config.json'), JSON.stringify({
                wapk: {
                    name: 'nested-runtime-app',
                    version: '1.0.0',
                    runtime: 'node',
                    entry: './dev-dist/index.js',
                },
            }, null, 2));
            fs.writeFileSync(path.join(dir, 'dev-dist', 'index.js'), 'require("example-runtime");\n');
            fs.writeFileSync(path.join(dir, 'dev-dist', 'package.json'), JSON.stringify({
                private: true,
                main: 'index.js',
                dependencies: {
                    'example-runtime': '1.0.0',
                },
            }, null, 2));
            fs.writeFileSync(path.join(dir, 'node_modules', 'example-runtime', 'package.json'), JSON.stringify({
                name: 'example-runtime',
                version: '1.0.0',
                main: 'index.js',
                dependencies: {
                    '@example/helper-runtime': '1.0.0',
                },
            }, null, 2));
            fs.writeFileSync(path.join(dir, 'node_modules', 'example-runtime', 'index.js'), 'module.exports = 1;\n');
            fs.writeFileSync(path.join(dir, 'node_modules', '@example', 'helper-runtime', 'package.json'), JSON.stringify({
                name: '@example/helper-runtime',
                version: '1.0.0',
                main: 'index.js',
            }, null, 2));
            fs.writeFileSync(path.join(dir, 'node_modules', '@example', 'helper-runtime', 'index.js'), 'module.exports = 2;\n');

            const archivePath = await packWapkDirectory(dir, {
                outputPath: path.join(dir, 'nested-runtime-app.wapk'),
            });
            const archive = readWapkArchive(archivePath);

            expect(archive.files.some((file) => file.path === 'dev-dist/package.json')).toBe(true);
            expect(archive.files.some((file) => file.path === 'dev-dist/node_modules/example-runtime/package.json')).toBe(true);
            expect(archive.files.some((file) => file.path === 'dev-dist/node_modules/example-runtime/index.js')).toBe(true);
            expect(archive.files.some((file) => file.path === 'dev-dist/node_modules/@example/helper-runtime/index.js')).toBe(true);
            expect(archive.files.some((file) => file.path === 'node_modules/example-runtime/index.js')).toBe(false);
            expect(archive.files.some((file) => file.path === 'node_modules/@example/helper-runtime/index.js')).toBe(false);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('skips root dependency installation when scripts.start points directly at a nested runtime entry', async () => {
        const dir = createTempDir();

        try {
            fs.mkdirSync(path.join(dir, 'dev-dist'), { recursive: true });
            fs.mkdirSync(path.join(dir, 'root-only-lib'), { recursive: true });

            fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
                name: 'skip-root-install-app',
                version: '1.0.0',
                type: 'commonjs',
                scripts: {
                    start: 'node ./dev-dist/index.js',
                },
                dependencies: {
                    'root-only-lib': 'file:./root-only-lib',
                },
            }, null, 2));
            fs.writeFileSync(path.join(dir, 'elit.config.json'), JSON.stringify({
                wapk: {
                    name: 'skip-root-install-app',
                    version: '1.0.0',
                    runtime: 'node',
                    entry: './dev-dist/index.js',
                },
            }, null, 2));
            fs.writeFileSync(path.join(dir, 'root-only-lib', 'package.json'), JSON.stringify({
                name: 'root-only-lib',
                version: '1.0.0',
                main: 'index.js',
            }, null, 2));
            fs.writeFileSync(path.join(dir, 'root-only-lib', 'index.js'), 'module.exports = "root-only-lib";\n');
            fs.writeFileSync(path.join(dir, 'dev-dist', 'index.js'), 'console.log("nested-runtime");\n');
            fs.writeFileSync(path.join(dir, 'dev-dist', 'package.json'), JSON.stringify({
                private: true,
                type: 'commonjs',
                main: 'index.js',
            }, null, 2));

            const archivePath = await packWapkDirectory(dir, {
                outputPath: path.join(dir, 'skip-root-install-app.wapk'),
            });
            const prepared = await prepareWapkApp(archivePath);

            expect(fs.existsSync(path.join(prepared.workDir, 'node_modules'))).toBe(false);
            expect(fs.existsSync(path.join(prepared.workDir, 'dev-dist', 'node_modules'))).toBe(false);

            fs.rmSync(prepared.workDir, { recursive: true, force: true });
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('packs linked node_modules packages by dereferencing their package contents', async () => {
        const workspaceDir = createTempDir();
        const appDir = path.join(workspaceDir, 'app');
        const linkedPackageDir = path.join(workspaceDir, 'linked-lib');
        const linkedDependencyDir = path.join(workspaceDir, 'node_modules', 'dep-lib');

        try {
            fs.mkdirSync(path.join(appDir, 'src'), { recursive: true });
            fs.mkdirSync(path.join(appDir, 'node_modules'), { recursive: true });
            fs.mkdirSync(path.join(linkedPackageDir, 'dist'), { recursive: true });
            fs.mkdirSync(linkedDependencyDir, { recursive: true });

            fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify({
                name: 'linked-app',
                version: '1.0.0',
                main: 'src/index.mjs',
                type: 'module',
                dependencies: {
                    'linked-lib': 'file:../linked-lib',
                },
            }, null, 2));
            fs.writeFileSync(path.join(appDir, 'src', 'index.mjs'), 'import { value } from "linked-lib";\nconsole.log(value);\n');

            fs.writeFileSync(path.join(linkedPackageDir, 'package.json'), JSON.stringify({
                name: 'linked-lib',
                version: '1.0.0',
                type: 'module',
                main: './dist/index.js',
                module: './dist/index.mjs',
                dependencies: {
                    'dep-lib': '1.0.0',
                },
                files: ['dist'],
            }, null, 2));
            fs.writeFileSync(path.join(linkedPackageDir, 'dist', 'index.js'), 'module.exports = { value: 1 };\n');
            fs.writeFileSync(path.join(linkedPackageDir, 'dist', 'index.mjs'), 'export const value = 1;\n');
            fs.writeFileSync(path.join(linkedDependencyDir, 'package.json'), JSON.stringify({
                name: 'dep-lib',
                version: '1.0.0',
            }, null, 2));
            fs.writeFileSync(path.join(linkedDependencyDir, 'index.js'), 'module.exports = 1;\n');

            fs.symlinkSync(
                linkedPackageDir,
                path.join(appDir, 'node_modules', 'linked-lib'),
                process.platform === 'win32' ? 'junction' : 'dir',
            );

            const archivePath = await packWapkDirectory(appDir, {
                outputPath: path.join(workspaceDir, 'linked-app.wapk'),
            });
            const archive = readWapkArchive(archivePath);

            expect(archive.files.some((file) => file.path === 'node_modules/linked-lib/package.json')).toBe(true);
            expect(archive.files.some((file) => file.path === 'node_modules/linked-lib/dist/index.mjs')).toBe(true);
            expect(archive.files.some((file) => file.path === 'node_modules/dep-lib/index.js')).toBe(true);
        } finally {
            fs.rmSync(workspaceDir, { recursive: true, force: true });
        }
    });

    it('does not include the output archive itself when packing inside the source directory', async () => {
        const dir = createTempDir();

        try {
            fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
                name: 'self-pack-app',
                version: '1.0.0',
                main: 'index.js',
            }, null, 2));
            fs.writeFileSync(path.join(dir, 'index.js'), 'console.log("self-pack");\n');

            const archivePath = await packWapkDirectory(dir, {
                outputPath: path.join(dir, 'self-pack-app.wapk'),
            });
            const archive = readWapkArchive(archivePath);

            expect(archive.files.some((file) => file.path === 'self-pack-app.wapk')).toBe(false);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('reads wapk config from elit.config.json and extracts archive contents into a named directory', async () => {
        const dir = createTempDir();

        try {
            fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
            fs.writeFileSync(path.join(dir, 'elit.config.json'), JSON.stringify({
                wapk: {
                    name: 'extract-app',
                    version: '1.0.0',
                    runtime: 'node',
                    entry: 'src/main.js',
                    port: 4321,
                    desktop: {
                        width: 900,
                    },
                },
            }, null, 2));
            fs.writeFileSync(path.join(dir, 'src', 'main.js'), 'console.log("extract");\n');

            const archivePath = await packWapkDirectory(dir, {
                outputPath: path.join(dir, 'extract-app.wapk'),
            });
            const archive = readWapkArchive(archivePath);
            const outputDir = path.join(dir, 'out');
            const extractedDir = extractWapkArchive(archivePath, outputDir);

            expect(archive.header.port).toBe(4321);
            expect(archive.header.desktop?.width).toBe(900);
            expect(extractedDir).toBe(path.join(outputDir, 'extract-app'));
            expect(fs.readFileSync(path.join(extractedDir, 'src', 'main.js'), 'utf8')).toBe('console.log("extract");\n');
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('patches a WAPK archive using .wapkpatch include and exclude rules', async () => {
        const targetDir = createTempDir();
        const patchDir = createTempDir();

        try {
            fs.mkdirSync(path.join(targetDir, 'src'), { recursive: true });
            fs.mkdirSync(path.join(targetDir, 'database'), { recursive: true });
            fs.mkdirSync(path.join(targetDir, 'src', 'nested'), { recursive: true });
            fs.mkdirSync(path.join(targetDir, 'database', 'nested'), { recursive: true });
            fs.writeFileSync(path.join(targetDir, 'package.json'), JSON.stringify({
                name: 'target-app',
                version: '1.0.0',
                main: 'index.js',
            }, null, 2));
            fs.writeFileSync(path.join(targetDir, 'index.js'), 'console.log("base-index");\n');
            fs.writeFileSync(path.join(targetDir, 'src', 'feature.js'), 'console.log("base-feature");\n');
            fs.writeFileSync(path.join(targetDir, 'src', 'nested', 'child.js'), 'console.log("base-nested-feature");\n');
            fs.writeFileSync(path.join(targetDir, 'database', 'seed.json'), '{"from":"target"}\n');
            fs.writeFileSync(path.join(targetDir, 'database', 'nested', 'seed.json'), '{"from":"target-nested"}\n');

            const archivePath = await packWapkDirectory(targetDir, {
                outputPath: path.join(targetDir, 'app.wapk'),
            });

            fs.mkdirSync(path.join(patchDir, 'src'), { recursive: true });
            fs.mkdirSync(path.join(patchDir, 'database'), { recursive: true });
            fs.mkdirSync(path.join(patchDir, 'src', 'nested'), { recursive: true });
            fs.mkdirSync(path.join(patchDir, 'database', 'nested'), { recursive: true });
            fs.writeFileSync(path.join(patchDir, 'package.json'), JSON.stringify({
                name: 'patch-app',
                version: '9.0.0',
                main: 'index.js',
            }, null, 2));
            fs.writeFileSync(path.join(patchDir, '.wapkpatch'), ['index.js', 'src/*', '!database/*', ''].join('\n'));
            fs.writeFileSync(path.join(patchDir, 'index.js'), 'console.log("patched-index");\n');
            fs.writeFileSync(path.join(patchDir, 'src', 'feature.js'), 'console.log("patched-feature");\n');
            fs.writeFileSync(path.join(patchDir, 'src', 'added.js'), 'console.log("added-feature");\n');
            fs.writeFileSync(path.join(patchDir, 'src', 'nested', 'child.js'), 'console.log("patched-nested-feature");\n');
            fs.writeFileSync(path.join(patchDir, 'database', 'seed.json'), '{"from":"patch"}\n');
            fs.writeFileSync(path.join(patchDir, 'database', 'nested', 'seed.json'), '{"from":"patch-nested"}\n');

            const patchArchivePath = await packWapkDirectory(patchDir, {
                outputPath: path.join(patchDir, 'patch.wapk'),
            });

            await runWapkCommand(['patch', archivePath, '--from', patchArchivePath], targetDir);

            const archive = readWapkArchive(archivePath);
            expect(archive.header.name).toBe('target-app');
            expect(archive.files.find((file) => file.path === 'index.js')?.content.toString('utf8')).toBe('console.log("patched-index");\n');
            expect(archive.files.find((file) => file.path === 'src/feature.js')?.content.toString('utf8')).toBe('console.log("patched-feature");\n');
            expect(archive.files.find((file) => file.path === 'src/added.js')?.content.toString('utf8')).toBe('console.log("added-feature");\n');
            expect(archive.files.find((file) => file.path === 'src/nested/child.js')?.content.toString('utf8')).toBe('console.log("patched-nested-feature");\n');
            expect(archive.files.find((file) => file.path === 'database/seed.json')?.content.toString('utf8')).toBe('{"from":"target"}\n');
            expect(archive.files.find((file) => file.path === 'database/nested/seed.json')?.content.toString('utf8')).toBe('{"from":"target-nested"}\n');
            expect(archive.files.some((file) => file.path === '.wapkpatch')).toBe(false);
        } finally {
            fs.rmSync(targetDir, { recursive: true, force: true });
            fs.rmSync(patchDir, { recursive: true, force: true });
        }
    });

    it('preserves target archive locking when patching a locked archive', async () => {
        const targetDir = createTempWapkProject();
        const patchDir = createTempDir();

        try {
            const archivePath = await packWapkDirectory(targetDir, {
                outputPath: path.join(targetDir, 'locked-target.wapk'),
                password: 'target-secret',
            });

            fs.mkdirSync(path.join(patchDir, 'src'), { recursive: true });
            fs.writeFileSync(path.join(patchDir, 'package.json'), JSON.stringify({
                name: 'patch-locked-target',
                version: '1.0.0',
                main: 'src/index.js',
            }, null, 2));
            fs.writeFileSync(path.join(patchDir, '.wapkpatch'), ['src/index.js', ''].join('\n'));
            fs.writeFileSync(path.join(patchDir, 'src', 'index.js'), 'console.log("patched-locked-target");\n');

            const patchArchivePath = await packWapkDirectory(patchDir, {
                outputPath: path.join(patchDir, 'patch-locked-target.wapk'),
            });

            await runWapkCommand(['patch', archivePath, '--from', patchArchivePath, '--password', 'target-secret'], targetDir);

            expect(() => readWapkArchive(archivePath)).toThrow('password-protected');
            expect(readWapkArchive(archivePath, {
                password: 'target-secret',
            }).files.find((file) => file.path === 'src/index.js')?.content.toString('utf8')).toBe('console.log("patched-locked-target");\n');
        } finally {
            fs.rmSync(targetDir, { recursive: true, force: true });
            fs.rmSync(patchDir, { recursive: true, force: true });
        }
    });

    it('supports --use and --from-password when the patch archive is locked', async () => {
        const targetDir = createTempWapkProject();
        const patchDir = createTempDir();

        try {
            const archivePath = await packWapkDirectory(targetDir, {
                outputPath: path.join(targetDir, 'target.wapk'),
            });

            fs.mkdirSync(path.join(patchDir, 'src'), { recursive: true });
            fs.writeFileSync(path.join(patchDir, 'package.json'), JSON.stringify({
                name: 'locked-patch',
                version: '1.0.0',
                main: 'src/index.js',
            }, null, 2));
            fs.writeFileSync(path.join(patchDir, '.wapkpatch'), ['src/index.js', ''].join('\n'));
            fs.writeFileSync(path.join(patchDir, 'src', 'index.js'), 'console.log("patched-from-locked-patch");\n');

            const patchArchivePath = await packWapkDirectory(patchDir, {
                outputPath: path.join(patchDir, 'locked-patch.wapk'),
                password: 'patch-secret',
            });

            await runWapkCommand(['patch', archivePath, '--use', patchArchivePath, '--from-password', 'patch-secret'], targetDir);

            expect(readWapkArchive(archivePath).files.find((file) => file.path === 'src/index.js')?.content.toString('utf8')).toBe('console.log("patched-from-locked-patch");\n');
        } finally {
            fs.rmSync(targetDir, { recursive: true, force: true });
            fs.rmSync(patchDir, { recursive: true, force: true });
        }
    });

    it('requires .wapkpatch in the patch archive', async () => {
        const targetDir = createTempWapkProject();
        const patchDir = createTempDir();

        try {
            const archivePath = await packWapkDirectory(targetDir, {
                outputPath: path.join(targetDir, 'target.wapk'),
            });

            fs.mkdirSync(path.join(patchDir, 'src'), { recursive: true });
            fs.writeFileSync(path.join(patchDir, 'package.json'), JSON.stringify({
                name: 'missing-manifest-patch',
                version: '1.0.0',
                main: 'src/index.js',
            }, null, 2));
            fs.writeFileSync(path.join(patchDir, 'src', 'index.js'), 'console.log("missing-manifest");\n');

            const patchArchivePath = await packWapkDirectory(patchDir, {
                outputPath: path.join(patchDir, 'missing-manifest.wapk'),
            });

            await expect(runWapkCommand(['patch', archivePath, '--from', patchArchivePath], targetDir)).rejects.toThrow(
                'Patch archive must include a .wapkpatch manifest file.',
            );
        } finally {
            fs.rmSync(targetDir, { recursive: true, force: true });
            fs.rmSync(patchDir, { recursive: true, force: true });
        }
    });

    it('reads wapk config from elit.config.mts', async () => {
        const dir = createTempDir();

        try {
            fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
            fs.writeFileSync(path.join(dir, 'elit.config.mts'), [
                'export default {',
                '    wapk: {',
                '        name: "mts-app",',
                '        version: "3.0.0",',
                '        runtime: "deno",',
                '        entry: "src/main.ts",',
                '    },',
                '};',
                '',
            ].join('\n'));
            fs.writeFileSync(path.join(dir, 'src', 'main.ts'), 'console.log("mts");\n');

            const archivePath = await packWapkDirectory(dir, {
                outputPath: path.join(dir, 'mts-app.wapk'),
            });
            const archive = readWapkArchive(archivePath);

            expect(archive.header.name).toBe('mts-app');
            expect(archive.header.version).toBe('3.0.0');
            expect(archive.header.runtime).toBe('deno');
            expect(archive.header.entry).toBe('src/main.ts');
            expect(archive.files.some((file) => file.path.startsWith('.elit-config-'))).toBe(false);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('ignores legacy wapk.config.json when resolving package metadata', async () => {
        const dir = createTempDir();

        try {
            fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
            fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
                name: 'package-json-app',
                version: '1.0.0',
                main: 'src/index.js',
            }, null, 2));
            fs.writeFileSync(path.join(dir, 'wapk.config.json'), JSON.stringify({
                name: 'legacy-config-app',
                version: '9.9.9',
                runtime: 'bun',
                entry: 'legacy.js',
            }, null, 2));
            fs.writeFileSync(path.join(dir, 'src', 'index.js'), 'console.log("package-json");\n');

            const archivePath = await packWapkDirectory(dir, {
                outputPath: path.join(dir, 'package-json-app.wapk'),
            });
            const archive = readWapkArchive(archivePath);

            expect(archive.header.name).toBe('package-json-app');
            expect(archive.header.version).toBe('1.0.0');
            expect(archive.header.runtime).toBe('node');
            expect(archive.header.entry).toBe('src/index.js');
            expect(archive.files.some((file) => file.path === 'wapk.config.json')).toBe(false);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('locks archives with password and requires the matching password to read them', async () => {
        const dir = createTempWapkProject();

        try {
            const archivePath = await packWapkDirectory(dir, {
                outputPath: path.join(dir, 'locked.wapk'),
                password: 'secret-123',
            });

            expect(() => readWapkArchive(archivePath)).toThrow('password-protected');
            expect(() => readWapkArchive(archivePath, { password: 'wrong-password' })).toThrow('Invalid WAPK credentials.');

            const archive = readWapkArchive(archivePath, { password: 'secret-123' });
            expect(archive.version).toBe(2);
            expect(archive.lock?.password).toBe(true);
            expect(archive.files.some((file) => file.path === 'src/index.js')).toBe(true);

            const extractedDir = extractWapkArchive(
                archivePath,
                path.join(dir, 'out'),
                { password: 'secret-123' },
            );
            expect(fs.readFileSync(path.join(extractedDir, 'src', 'index.js'), 'utf8')).toBe('console.log("hello");\n');
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('reads lock settings from elit.config.json via password', async () => {
        const dir = createTempDir();

        try {
            fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
            fs.writeFileSync(path.join(dir, 'elit.config.json'), JSON.stringify({
                wapk: {
                    name: 'config-lock-app',
                    version: '1.0.0',
                    runtime: 'node',
                    entry: 'src/main.js',
                    lock: {
                        password: 'config-secret',
                    },
                },
            }, null, 2));
            fs.writeFileSync(path.join(dir, 'src', 'main.js'), 'console.log("locked-from-config");\n');

            const archivePath = await packWapkDirectory(dir, {
                outputPath: path.join(dir, 'config-locked.wapk'),
            });
            const archive = readWapkArchive(archivePath, {
                password: 'config-secret',
            });

            expect(archive.version).toBe(2);
            expect(archive.header.name).toBe('config-lock-app');
            expect(archive.lock?.password).toBe(true);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    test('configurable sync interval', async () => {
        const dir = createTempWapkProject();
        try {
            await packWapkDirectory(dir, { outputPath: path.join(dir, 'test.wapk') });
            
            // Prepare with custom sync interval
            const prepared = await prepareWapkApp(path.join(dir, 'test.wapk'), { syncInterval: 100 });
            expect(prepared.syncInterval).toBe(100);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    test('event-driven watcher mode', async () => {
        const dir = createTempWapkProject();
        try {
            const archivePath = await packWapkDirectory(dir, {
                outputPath: path.join(dir, 'test.wapk'),
                password: 'watcher-password',
            });
            
            // Prepare with watcher enabled
            const prepared = await prepareWapkApp(archivePath, {
                useWatcher: true,
                password: 'watcher-password',
            });
            expect(prepared.useWatcher).toBe(true);
            expect(prepared.lock?.password).toBe('watcher-password');

            // Create live sync controller
            const liveSync = createWapkLiveSync(prepared);
            
            // Write a test file
            fs.writeFileSync(path.join(prepared.workDir, 'test-file.txt'), 'hello');

            // Force an archive flush so the encrypted archive is updated deterministically.
            await liveSync.flush();
            await liveSync.stop();

            // Verify archive was updated
            const finalArchive = readWapkArchive(archivePath, {
                password: 'watcher-password',
            });
            expect(finalArchive.files.some((file) => file.path === 'test-file.txt')).toBe(true);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    test('pulls external archive changes back into the working directory for cloud-synced archives', async () => {
        const dir = createTempWapkProject();
        try {
            const archivePath = await packWapkDirectory(dir, {
                outputPath: path.join(dir, 'shared.wapk'),
            });

            const prepared = await prepareWapkApp(archivePath, {
                syncInterval: 100,
                watchArchive: true,
            });
            const liveSync = createWapkLiveSync(prepared);

            fs.writeFileSync(path.join(dir, 'src', 'index.js'), 'console.log("updated-from-drive");\n');
            await packWapkDirectory(dir, {
                outputPath: archivePath,
            });

            await liveSync.flush();

            expect(fs.readFileSync(path.join(prepared.workDir, 'src', 'index.js'), 'utf8')).toBe('console.log("updated-from-drive");\n');

            await liveSync.stop();
            fs.rmSync(prepared.workDir, { recursive: true, force: true });
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    test('keeps node_modules in the archive after live-sync writes local changes', async () => {
        const dir = createTempDir();

        try {
            fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
            fs.mkdirSync(path.join(dir, 'node_modules', 'example'), { recursive: true });
            fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
                name: 'sync-node-modules-app',
                version: '1.0.0',
                main: 'src/index.js',
            }, null, 2));
            fs.writeFileSync(path.join(dir, 'src', 'index.js'), 'console.log("sync");\n');
            fs.writeFileSync(path.join(dir, 'node_modules', 'example', 'package.json'), JSON.stringify({
                name: 'example',
                version: '1.0.0',
                main: 'index.js',
            }, null, 2));
            fs.writeFileSync(path.join(dir, 'node_modules', 'example', 'index.js'), 'module.exports = 1;\n');

            const archivePath = await packWapkDirectory(dir, {
                outputPath: path.join(dir, 'sync-node-modules.wapk'),
            });
            const prepared = await prepareWapkApp(archivePath, {
                syncInterval: 50,
                watchArchive: true,
            });
            const liveSync = createWapkLiveSync(prepared);

            fs.writeFileSync(path.join(prepared.workDir, 'data.json'), '{"ok":true}\n');
            await liveSync.flush();
            await liveSync.stop();

            const archive = readWapkArchive(archivePath);
            expect(archive.files.some((file) => file.path === 'data.json')).toBe(true);
            expect(archive.files.some((file) => file.path === 'node_modules/example/index.js')).toBe(true);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    test('runs the configured default archive from elit.config.json', async () => {
        const dir = createTempDir();
        const archivePath = path.join(dir, 'shared', 'google-drive-app.wapk');
        const markerPath = path.join(dir, 'ran.txt');

        try {
            fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
            fs.mkdirSync(path.dirname(archivePath), { recursive: true });
            fs.writeFileSync(path.join(dir, 'elit.config.json'), JSON.stringify({
                wapk: {
                    name: 'config-run-app',
                    version: '1.0.0',
                    runtime: 'node',
                    entry: 'src/index.js',
                    env: {
                        ELIT_WAPK_MARK: markerPath,
                    },
                    run: {
                        file: './shared/google-drive-app.wapk',
                        watchArchive: true,
                        syncInterval: 75,
                    },
                },
            }, null, 2));
            fs.writeFileSync(
                path.join(dir, 'src', 'index.js'),
                'require("node:fs").writeFileSync(process.env.ELIT_WAPK_MARK, "configured-run");\n',
            );

            await packWapkDirectory(dir, {
                outputPath: archivePath,
            });

            await runWapkCommand([], dir);

            expect(fs.readFileSync(markerPath, 'utf8')).toBe('configured-run');
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    test('does not install extracted dependencies automatically when node_modules are missing from the archive', async () => {
        const workspaceDir = createTempDir();
        const packageRoot = path.join(workspaceDir, 'workspace-root');
        const appDir = path.join(packageRoot, 'examples', 'repair-app');

        try {
            fs.mkdirSync(path.join(packageRoot, 'dist'), { recursive: true });
            fs.mkdirSync(path.join(appDir, 'src'), { recursive: true });

            fs.writeFileSync(path.join(packageRoot, 'package.json'), JSON.stringify({
                name: 'elit',
                version: '1.0.0',
                type: 'module',
                exports: {
                    './server': {
                        import: './dist/server.mjs',
                        require: './dist/server.js',
                    },
                },
            }, null, 2));
            fs.writeFileSync(path.join(packageRoot, 'dist', 'server.mjs'), 'export const serverOk = true;\n');
            fs.writeFileSync(path.join(packageRoot, 'dist', 'server.js'), 'exports.serverOk = true;\n');

            fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify({
                name: 'repair-app',
                version: '1.0.0',
                main: 'src/index.js',
                dependencies: {
                    elit: 'file:../../',
                },
            }, null, 2));
            fs.writeFileSync(path.join(appDir, 'package-lock.json'), JSON.stringify({
                name: 'repair-app',
                version: '1.0.0',
                lockfileVersion: 3,
                requires: true,
                packages: {
                    '': {
                        name: 'repair-app',
                        version: '1.0.0',
                        dependencies: {
                            elit: 'file:../../',
                        },
                    },
                    '../..': {
                        name: 'elit',
                        version: '1.0.0',
                    },
                    'node_modules/elit': {
                        resolved: '../..',
                        link: true,
                    },
                },
            }, null, 2));
            fs.writeFileSync(path.join(appDir, 'src', 'index.js'), 'console.log("repair-app");\n');

            const archivePath = await packWapkDirectory(appDir, {
                outputPath: path.join(workspaceDir, 'repair-app.wapk'),
            });
            const prepared = await prepareWapkApp(archivePath, {
                dependencySearchRoots: [packageRoot],
            });

            expect(fs.existsSync(path.join(prepared.workDir, 'node_modules'))).toBe(false);
            expect(fs.existsSync(path.join(prepared.workDir, 'node_modules', 'elit', 'package.json'))).toBe(false);

            fs.rmSync(prepared.workDir, { recursive: true, force: true });
        } finally {
            fs.rmSync(workspaceDir, { recursive: true, force: true });
        }
    });

    test('runs browser-style archives through the packaged start script', async () => {
        const dir = createTempDir();

        try {
            fs.mkdirSync(path.join(dir, 'public'), { recursive: true });
            fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
            fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
                name: 'browser-start-app',
                version: '1.0.0',
                main: 'src/main.js',
                scripts: {
                    start: 'node server.js',
                },
            }, null, 2));
            fs.writeFileSync(path.join(dir, 'public', 'index.html'), '<!doctype html><html><body><div id="app"></div></body></html>\n');
            fs.writeFileSync(path.join(dir, 'src', 'main.js'), 'window.location.pathname;\n');
            fs.writeFileSync(path.join(dir, 'server.js'), 'require("node:fs").writeFileSync("started.txt", "preview-ok");\n');

            const archivePath = await packWapkDirectory(dir, {
                outputPath: path.join(dir, 'browser-start.wapk'),
            });
            const prepared = await prepareWapkApp(archivePath, {
                syncInterval: 50,
            });

            const exitCode = await runPreparedWapkApp(prepared);
            const archive = readWapkArchive(archivePath);
            const startedFile = archive.files.find((file) => file.path === 'started.txt');

            expect(exitCode).toBe(0);
            expect(startedFile?.content.toString('utf8').trim()).toBe('preview-ok');
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    test('runs browser-style start scripts through the local platform bin shim', async () => {
        const dir = createTempDir();

        try {
            fs.mkdirSync(path.join(dir, 'public'), { recursive: true });
            fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
            fs.mkdirSync(path.join(dir, 'node_modules', '.bin'), { recursive: true });
            fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
                name: 'browser-start-bin-app',
                version: '1.0.0',
                main: 'src/main.js',
                scripts: {
                    start: 'elit preview',
                },
            }, null, 2));
            fs.writeFileSync(path.join(dir, 'public', 'index.html'), '<!doctype html><html><body><div id="app"></div></body></html>\n');
            fs.writeFileSync(path.join(dir, 'src', 'main.js'), 'window.location.pathname;\n');

            if (process.platform === 'win32') {
                fs.writeFileSync(path.join(dir, 'node_modules', '.bin', 'elit'), '#!/bin/sh\necho wrong-shim\n');
                fs.writeFileSync(
                    path.join(dir, 'node_modules', '.bin', 'elit.cmd'),
                    '@echo off\r\necho preview-ok> started.txt\r\n',
                );
            } else {
                fs.writeFileSync(
                    path.join(dir, 'node_modules', '.bin', 'elit'),
                    '#!/bin/sh\nprintf "preview-ok" > started.txt\n',
                );
                fs.chmodSync(path.join(dir, 'node_modules', '.bin', 'elit'), 0o755);
                fs.writeFileSync(path.join(dir, 'node_modules', '.bin', 'elit.cmd'), '@echo off\r\n');
            }

            const archivePath = await packWapkDirectory(dir, {
                outputPath: path.join(dir, 'browser-start-bin.wapk'),
            });
            const prepared = await prepareWapkApp(archivePath, {
                syncInterval: 50,
            });

            const exitCode = await runPreparedWapkApp(prepared);
            const archive = readWapkArchive(archivePath);
            const startedFile = archive.files.find((file) => file.path === 'started.txt');

            expect(exitCode).toBe(0);
            expect(startedFile?.content.toString('utf8').trim()).toBe('preview-ok');
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    test('runs browser-style start scripts from the packaged node_modules bin target', async () => {
        const dir = createTempDir();

        try {
            fs.mkdirSync(path.join(dir, 'public'), { recursive: true });
            fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
            fs.mkdirSync(path.join(dir, 'node_modules', 'elit', 'dist'), { recursive: true });
            fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
                name: 'browser-start-package-bin-app',
                version: '1.0.0',
                main: 'src/main.js',
                scripts: {
                    start: 'elit preview',
                },
            }, null, 2));
            fs.writeFileSync(path.join(dir, 'public', 'index.html'), '<!doctype html><html><body><div id="app"></div></body></html>\n');
            fs.writeFileSync(path.join(dir, 'src', 'main.js'), 'window.location.pathname;\n');
            fs.writeFileSync(path.join(dir, 'node_modules', 'elit', 'package.json'), JSON.stringify({
                name: 'elit',
                version: '1.0.0',
                bin: {
                    elit: './dist/cli.js',
                },
            }, null, 2));
            fs.writeFileSync(
                path.join(dir, 'node_modules', 'elit', 'dist', 'cli.js'),
                'require("node:fs").writeFileSync("started.txt", process.argv.slice(2).join(" "));\n',
            );

            const archivePath = await packWapkDirectory(dir, {
                outputPath: path.join(dir, 'browser-start-package-bin.wapk'),
            });
            const prepared = await prepareWapkApp(archivePath, {
                syncInterval: 50,
            });

            const exitCode = await runPreparedWapkApp(prepared);
            const archive = readWapkArchive(archivePath);
            const startedFile = archive.files.find((file) => file.path === 'started.txt');

            expect(exitCode).toBe(0);
            expect(startedFile?.content.toString('utf8')).toBe('preview');
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    test('syncs a WAPK archive directly with Google Drive without a local archive file', async () => {
        const dir = createTempWapkProject();
        const tempArchivePath = path.join(dir, 'seed.wapk');
        let driveMock: ReturnType<typeof createGoogleDriveFetchMock> | undefined;

        try {
            await packWapkDirectory(dir, { outputPath: tempArchivePath });
            driveMock = createGoogleDriveFetchMock(fs.readFileSync(tempArchivePath));

            const prepared = await prepareWapkApp('gdrive://drive-file-id', {
                googleDrive: {
                    fileId: 'drive-file-id',
                    accessToken: 'token-123',
                },
                syncInterval: 100,
                watchArchive: true,
            });
            const liveSync = createWapkLiveSync(prepared);

            fs.writeFileSync(path.join(dir, 'src', 'index.js'), 'console.log("updated-from-google-drive");\n');
            await packWapkDirectory(dir, { outputPath: tempArchivePath });
            driveMock.setBuffer(fs.readFileSync(tempArchivePath));

            await liveSync.flush();
            expect(fs.readFileSync(path.join(prepared.workDir, 'src', 'index.js'), 'utf8')).toBe('console.log("updated-from-google-drive");\n');

            fs.writeFileSync(path.join(prepared.workDir, 'remote-write.txt'), 'hello-drive');
            await liveSync.flush();
            await liveSync.stop();

            fs.writeFileSync(tempArchivePath, driveMock.getBuffer());
            const syncedArchive = readWapkArchive(tempArchivePath);
            expect(syncedArchive.files.some((file) => file.path === 'remote-write.txt')).toBe(true);

            fs.rmSync(prepared.workDir, { recursive: true, force: true });
        } finally {
            driveMock?.restore();
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    test('runs the configured Google Drive archive from elit.config.json', async () => {
        const dir = createTempDir();
        const seedArchivePath = path.join(dir, 'seed.wapk');
        const markerPath = path.join(dir, 'ran-remote.txt');
        let driveMock: ReturnType<typeof createGoogleDriveFetchMock> | undefined;

        try {
            fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
            fs.writeFileSync(path.join(dir, 'elit.config.json'), JSON.stringify({
                wapk: {
                    name: 'remote-config-app',
                    version: '1.0.0',
                    runtime: 'node',
                    entry: 'src/index.js',
                    env: {
                        ELIT_WAPK_MARK: markerPath,
                    },
                    run: {
                        googleDrive: {
                            fileId: 'drive-file-id',
                            accessToken: 'token-456',
                        },
                        watchArchive: true,
                        syncInterval: 75,
                    },
                },
            }, null, 2));
            fs.writeFileSync(
                path.join(dir, 'src', 'index.js'),
                'require("node:fs").writeFileSync(process.env.ELIT_WAPK_MARK, "configured-google-drive-run");\n',
            );

            await packWapkDirectory(dir, { outputPath: seedArchivePath });
            driveMock = createGoogleDriveFetchMock(fs.readFileSync(seedArchivePath));

            await runWapkCommand([], dir);

            expect(fs.readFileSync(markerPath, 'utf8')).toBe('configured-google-drive-run');
        } finally {
            driveMock?.restore();
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    test('runs the configured Google Drive archive online from elit.config.json', async () => {
        const dir = createTempDir();
        const seedArchivePath = path.join(dir, 'seed-online.wapk');
        const previousExitCode = process.exitCode;
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        let fetchMock: ReturnType<typeof createGoogleDriveOnlineFetchMock> | undefined;

        try {
            fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
            fs.writeFileSync(path.join(dir, 'elit.config.json'), JSON.stringify({
                wapk: {
                    name: 'remote-online-app',
                    version: '1.0.0',
                    runtime: 'node',
                    entry: 'src/index.js',
                    run: {
                        googleDrive: {
                            fileId: 'drive-file-id',
                            accessToken: 'token-789',
                        },
                        online: true,
                        onlineUrl: 'http://localhost:4179',
                        password: 'config-secret',
                    },
                },
            }, null, 2));
            fs.writeFileSync(path.join(dir, 'src', 'index.js'), 'console.log("configured-google-drive-online");\n');

            await packWapkDirectory(dir, {
                outputPath: seedArchivePath,
                password: 'config-secret',
            });

            fetchMock = createGoogleDriveOnlineFetchMock(fs.readFileSync(seedArchivePath), {
                onlineUrl: 'http://localhost:4179',
            });

            await runWapkCommand([], dir);

            expect(fetchMock.getCreatePayload()?.snapshot?.hostLabel).toBe('remote-online-app');
            expect(fetchMock.getCreatePayload()?.snapshot?.locked).toBe(true);
            expect(fetchMock.getCreatePayload()?.snapshot?.header?.name).toBe('remote-online-app');
            expect(fetchMock.getClosePayload()?.joinKey).toBe('ABCD-EFGH-IJKL');
            expect(fetchMock.getClosePayload()?.adminToken).toBe('admin-token');
            expect(logSpy._calls.some((call) => call.join(' ').includes('Share key: ABCD-EFGH-IJKL'))).toBe(true);
            expect(errorSpy._calls).toHaveLength(0);
        } finally {
            process.exitCode = previousExitCode;
            fetchMock?.restore();
            logSpy.restore();
            errorSpy.restore();
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    test('ignores SIGTERM for online sessions until SIGINT arrives', async () => {
        const dir = createTempDir();
        const seedArchivePath = path.join(dir, 'seed-online.wapk');
        const previousExitCode = process.exitCode;
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        let fetchMock: ReturnType<typeof createGoogleDriveOnlineFetchMock> | undefined;

        try {
            fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
            fs.writeFileSync(path.join(dir, 'elit.config.json'), JSON.stringify({
                wapk: {
                    name: 'remote-online-app',
                    version: '1.0.0',
                    runtime: 'node',
                    entry: 'src/index.js',
                    run: {
                        googleDrive: {
                            fileId: 'drive-file-id',
                            accessToken: 'token-789',
                        },
                        online: true,
                        onlineUrl: 'http://localhost:4179',
                    },
                },
            }, null, 2));
            fs.writeFileSync(path.join(dir, 'src', 'index.js'), 'console.log("configured-google-drive-online");\n');

            await packWapkDirectory(dir, {
                outputPath: seedArchivePath,
            });

            fetchMock = createGoogleDriveOnlineFetchMock(fs.readFileSync(seedArchivePath), {
                onlineUrl: 'http://localhost:4179',
                shutdownSignals: [
                    { signal: 'SIGTERM', delayMs: 0 },
                    { signal: 'SIGINT', delayMs: 0 },
                ],
            });

            await runWapkCommand([], dir);

            expect(fetchMock.getClosePayload()?.joinKey).toBe('ABCD-EFGH-IJKL');
            expect(fetchMock.getClosePayload()?.adminToken).toBe('admin-token');
            expect(logSpy._calls.some((call) => call.join(' ').includes('Join URL:  http://localhost:4179/?join=ABCD-EFGH-IJKL&launchSource=elit-wapk-online'))).toBe(true);
            expect(warnSpy._calls.some((call) => {
                const message = call.join(' ');
                return message.includes('Ignoring SIGTERM while shared session ABCD-EFGH-IJKL is active (pid ')
                    && message.includes(', ppid ');
            })).toBe(true);
            expect(logSpy._calls.some((call) => call.join(' ').includes('Received SIGINT; closing shared session ABCD-EFGH-IJKL'))).toBe(true);
            expect(errorSpy._calls).toHaveLength(0);
        } finally {
            process.exitCode = previousExitCode;
            fetchMock?.restore();
            logSpy.restore();
            warnSpy.restore();
            errorSpy.restore();
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    test('allows SIGTERM to close online sessions when explicitly enabled', async () => {
        const dir = createTempDir();
        const seedArchivePath = path.join(dir, 'seed-online.wapk');
        const previousExitCode = process.exitCode;
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        let fetchMock: ReturnType<typeof createGoogleDriveOnlineFetchMock> | undefined;

        try {
            fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
            fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
                name: 'local-online-app',
                version: '1.0.0',
                main: 'src/index.js',
            }, null, 2));
            fs.writeFileSync(path.join(dir, 'src', 'index.js'), 'console.log("local-online");\n');

            await packWapkDirectory(dir, {
                outputPath: seedArchivePath,
            });

            fetchMock = createGoogleDriveOnlineFetchMock(fs.readFileSync(seedArchivePath), {
                onlineUrl: 'http://localhost:4179',
                shutdownSignals: [
                    { signal: 'SIGTERM', delayMs: 0 },
                ],
            });

            await runWapkCommand(['run', seedArchivePath, '--online', '--online-url', 'http://localhost:4179', '--allow-sigterm-close'], dir);

            expect(fetchMock.getClosePayload()?.joinKey).toBe('ABCD-EFGH-IJKL');
            expect(fetchMock.getClosePayload()?.adminToken).toBe('admin-token');
            expect(logSpy._calls.some((call) => {
                const message = call.join(' ');
                return message.includes('Received SIGTERM for shared session ABCD-EFGH-IJKL (pid ')
                    && message.includes(', ppid ')
                    && message.includes('closing because --allow-sigterm-close is enabled');
            })).toBe(true);
            expect(warnSpy._calls).toHaveLength(0);
            expect(errorSpy._calls).toHaveLength(0);
        } finally {
            process.exitCode = previousExitCode;
            fetchMock?.restore();
            logSpy.restore();
            warnSpy.restore();
            errorSpy.restore();
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });
});