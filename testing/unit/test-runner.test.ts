/// <reference path="../../packages/test/src/globals.d.ts" />

import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

const CLI_ENTRY = resolve(process.cwd(), 'packages/cli/dist/index.cjs');

interface CliRun {
    exitCode: number;
    stdout: string;
}

async function runCli(args: string[]): Promise<CliRun> {
    try {
        const { stdout } = await run(process.execPath, [CLI_ENTRY, 'test', '--run', ...args], {
            cwd: process.cwd(),
            maxBuffer: 10 * 1024 * 1024,
        });
        return { exitCode: 0, stdout };
    } catch (error: any) {
        return { exitCode: error.code ?? 1, stdout: (error.stdout ?? '') + (error.stderr ?? '') };
    }
}

describe('@elitjs/test runner features', () => {
    let workDir: string;

    beforeEach(() => {
        workDir = mkdtempSync(join(tmpdir(), 'elit-runner-'));
    });

    afterEach(() => {
        rmSync(workDir, { recursive: true, force: true });
    });

    it('retries flaky tests until they pass', async () => {
        const testFile = join(workDir, 'flaky.test.ts');
        writeFileSync(testFile, `
            let attempts = 0;
            describe('flaky suite', () => {
                it('passes on the second attempt', () => {
                    attempts++;
                    if (attempts < 2) throw new Error('first attempt fails');
                });
            });
        `);

        const withRetry = await runCli(['--file', testFile, '--retries', '1']);
        expect(withRetry.stdout).toContain('1 passed');
        expect(withRetry.exitCode).toBe(0);

        // Same file without retries must fail and exit non-zero.
        rmSync(testFile);
        writeFileSync(testFile, `
            let attempts = 0;
            describe('flaky suite', () => {
                it('passes on the second attempt', () => {
                    attempts++;
                    if (attempts < 2) throw new Error('first attempt fails');
                });
            });
        `);
        const withoutRetry = await runCli(['--file', testFile]);
        expect(withoutRetry.stdout).toContain('1 failed');
        expect(withoutRetry.exitCode).not.toBe(0);
    }, 60000);

    it('exits non-zero when tests fail', async () => {
        const testFile = join(workDir, 'failing.test.ts');
        writeFileSync(testFile, `
            describe('bad', () => {
                it('always fails', () => {
                    throw new Error('nope');
                });
            });
        `);

        const result = await runCli(['--file', testFile]);
        expect(result.stdout).toContain('1 failed');
        expect(result.exitCode).not.toBe(0);
    }, 60000);

    it('toMatchSnapshot records baselines and compares them', async () => {
        const testFile = join(workDir, 'snap.test.ts');
        writeFileSync(testFile, `
            describe('snapshots', () => {
                it('captures an object', () => {
                    expect({ b: 2, a: 1 }).toMatchSnapshot();
                });
            });
        `);

        // No baseline yet -> failure with a helpful hint.
        const first = await runCli(['--file', testFile]);
        expect(first.stdout).toContain('does not exist');
        expect(first.exitCode).not.toBe(0);

        // -u records the baseline.
        const update = await runCli(['--file', testFile, '--update-snapshots']);
        expect(update.stdout).toContain('1 passed');
        expect(existsSync(join(workDir, '__snapshots__', 'snap.test.ts.snap.json'))).toBe(true);

        // Same value now passes without any flag.
        const second = await runCli(['--file', testFile]);
        expect(second.stdout).toContain('1 passed');
        expect(second.exitCode).toBe(0);

        // Changed value -> mismatch failure with stored/received diff.
        writeFileSync(testFile, `
            describe('snapshots', () => {
                it('captures an object', () => {
                    expect({ b: 3, a: 1 }).toMatchSnapshot();
                });
            });
        `);
        const mismatch = await runCli(['--file', testFile]);
        expect(mismatch.stdout).toContain('mismatch');
        expect(mismatch.exitCode).not.toBe(0);
    }, 120000);

    it('runs files across parallel workers', async () => {
        for (const name of ['alpha', 'beta', 'gamma']) {
            writeFileSync(join(workDir, `${name}.test.ts`), `
                describe('${name}', () => {
                    it('works', async () => {
                        await new Promise((resolvePromise) => setTimeout(resolvePromise, 200));
                    });
                });
            `);
        }
        const files = ['alpha.test.ts', 'beta.test.ts', 'gamma.test.ts']
            .map((name) => join(workDir, name))
            .join(',');

        const serial = await runCli(['--file', files]);
        expect(serial.stdout).toContain('3 passed');

        const parallel = await runCli(['--file', files, '--workers', '3']);
        expect(parallel.stdout).toContain('3 passed');
        expect(parallel.exitCode).toBe(0);
    }, 120000);

    it('elit e2e discovers e2e files by convention', async () => {
        // *.e2e.test.ts matches; plain unit names must not.
        writeFileSync(join(workDir, 'flow.e2e.test.ts'), `
            describe('e2e flow', () => {
                it('passes', () => {});
            });
        `);
        writeFileSync(join(workDir, 'unit.test.ts'), `
            describe('unit', () => {
                it('should not be picked by elit e2e', () => {
                    throw new Error('unit file leaked into e2e discovery');
                });
            });
        `);

        const runE2E = await run(process.execPath, [CLI_ENTRY, 'e2e', '--run'], {
            cwd: workDir,
            maxBuffer: 10 * 1024 * 1024,
        }).then(
            (result) => ({ code: 0, stdout: result.stdout }),
            (error: any) => ({ code: error.code ?? 1, stdout: (error.stdout ?? '') + (error.stderr ?? '') }),
        );

        expect(runE2E.stdout).toContain('1 passed');
        expect(runE2E.stdout).not.toContain('leaked');
        expect(runE2E.code).toBe(0);
    }, 60000);

    it('--list reports tests without running them', async () => {
        const testFile = join(workDir, 'listable.test.ts');
        writeFileSync(testFile, `
            describe('list suite', () => {
                it('never executes this', () => { throw new Error('must not run in --list'); });
            });
        `);
        const result = await runCli(['--file', testFile, '--list']);
        expect(result.stdout).toContain('list suite');
        expect(result.stdout).not.toContain('must not run');
        expect(result.exitCode).toBe(0);
    }, 60000);

    it('--repeat-each runs every test N times', async () => {
        const testFile = join(workDir, 'repeat.test.ts');
        writeFileSync(testFile, `
            describe('repeat', () => {
                it('runs twice', () => {});
            });
        `);
        const result = await runCli(['--file', testFile, '--repeat-each', '2']);
        expect(result.stdout).toContain('2 passed');
    }, 60000);

    it('--grep-invert excludes matching tests', async () => {
        const testFile = join(workDir, 'invert.test.ts');
        writeFileSync(testFile, `
            describe('invert', () => {
                it('keep me', () => {});
                it('slow one', () => {});
            });
        `);
        const result = await runCli(['--file', testFile, '--grep-invert', 'slow']);
        expect(result.stdout).toContain('1 passed');
    }, 60000);

    it('--shard splits files across shards', async () => {
        for (const name of ['shard-a', 'shard-b']) {
            writeFileSync(join(workDir, `${name}.test.ts`), `
                describe('${name}', () => { it('passes', () => {}); });
            `);
        }
        const files = [join(workDir, 'shard-a.test.ts'), join(workDir, 'shard-b.test.ts')].join(',');
        const first = await runCli(['--file', files, '--shard', '1/2']);
        const second = await runCli(['--file', files, '--shard', '2/2']);
        expect(first.stdout).toContain('1 passed');
        expect(second.stdout).toContain('1 passed');
    }, 60000);

    it('--reporter junit writes junit.xml', async () => {
        const testFile = join(workDir, 'junit-me.test.ts');
        writeFileSync(testFile, `
            describe('junit', () => { it('passes', () => {}); });
        `);
        const runInDir = await run(process.execPath, [CLI_ENTRY, 'test', '--run', '--file', testFile, '--reporter', 'junit'], {
            cwd: workDir,
            maxBuffer: 10 * 1024 * 1024,
        });
        const report = readFileSync(join(workDir, 'junit.xml'), 'utf-8') as string;
        expect(report).toContain('<testsuites');
        expect(report).toContain('name="junit &gt; passes"');
    }, 60000);

    it('--reporter html writes a self-contained report', async () => {
        const testFile = join(workDir, 'html-me.test.ts');
        writeFileSync(testFile, `
            describe('html', () => { it('passes', () => {}); });
        `);
        await run(process.execPath, [CLI_ENTRY, 'test', '--run', '--file', testFile, '--reporter', 'html'], {
            cwd: workDir,
            maxBuffer: 10 * 1024 * 1024,
        });
        const html = readFileSync(join(workDir, 'e2e-report', 'index.html'), 'utf-8') as string;
        expect(html).toContain('Elit Test Report');
    }, 60000);

    it('webServer starts and stops around the run', async () => {
        // A unique port per run — an orphaned server from a previous attempt
        // must never be silently reused here.
        const webServerPort = 58000 + Math.floor(Math.random() * 1000);
        writeFileSync(
            join(workDir, 'ws-server.cjs'),
            `require('http').createServer((request, response) => response.end('ok')).listen(${webServerPort});`,
        );
        writeFileSync(join(workDir, 'elit.config.ts'), `
            export default {
                test: {
                    webServer: {
                        command: 'node ws-server.cjs',
                        port: ${webServerPort},
                        timeout: 15000,
                    },
                },
            };
        `);
        writeFileSync(join(workDir, 'ws.test.ts'), `
            describe('ws', () => {
                it('server responds', async () => {
                    const response = await fetch('http://127.0.0.1:${webServerPort}/');
                    if (response.status !== 200) throw new Error('server not up');
                });
            });
        `);

        const attempt = await run(process.execPath, [CLI_ENTRY, 'test', '--run', '--file', 'ws.test.ts'], {
            cwd: workDir,
            maxBuffer: 10 * 1024 * 1024,
        }).then(
            (result) => ({ code: 0, stdout: result.stdout }),
            (error: any) => ({ code: error.code ?? 1, stdout: (error.stdout ?? '') + (error.stderr ?? '') }),
        );

        expect(attempt.stdout).toContain('Tests:');
        expect(attempt.stdout).toContain('1 passed');
        expect(attempt.stdout).not.toContain('1 failed');
        expect(attempt.code).toBe(0);

        // The spawned server must be gone after the run.
        const stillUp = await fetch(`http://127.0.0.1:${webServerPort}/`).then(() => true, () => false);
        expect(stillUp).toBe(false);
    }, 60000);

    it('workers stay isolated per file', async () => {
        // Both files mutate module-scoped state — a shared module registry would
        // clash, isolated workers must not.
        for (const name of ['one', 'two']) {
            writeFileSync(join(workDir, `${name}.test.ts`), `
                const marker = Symbol('${name}');
                describe('${name}', () => {
                    it('sees its own module', () => {
                        if ((globalThis as any).__marker && (globalThis as any).__marker !== marker) {
                            throw new Error('module state leaked between files');
                        }
                        (globalThis as any).__marker = marker;
                    });
                });
            `);
        }
        const files = [join(workDir, 'one.test.ts'), join(workDir, 'two.test.ts')].join(',');
        const result = await runCli(['--file', files, '--workers', '2']);
        expect(result.stdout).toContain('2 passed');
    }, 120000);
});
