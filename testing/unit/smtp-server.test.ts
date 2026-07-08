/// <reference path="../../packages/test/src/globals.d.ts" />

import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import { join } from 'node:path';

import { createDevServer } from '../../packages/server/src';
import { createSmtpServer } from '../../packages/smtp-server/src';

async function waitForListening(server: any): Promise<void> {
    if (server.listening) {
        return;
    }

    await new Promise<void>((resolve) => {
        server.once('listening', resolve);
    });
}

function getPort(address: any): number {
    return typeof address === 'object' && address ? address.port : 0;
}

async function readSmtpBanner(port: number): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const socket = net.createConnection({ port, host: '127.0.0.1' });
        let banner = '';

        socket.setEncoding('utf8');
        socket.once('error', reject);
        socket.on('data', (chunk: string) => {
            banner += chunk;

            if (banner.includes('\n')) {
                socket.end();
                resolve(banner);
            }
        });
    });
}

async function expectPortClosed(port: number): Promise<void> {
    await new Promise<void>((resolve, reject) => {
        const socket = net.createConnection({ port, host: '127.0.0.1' });

        socket.once('connect', () => {
            socket.end();
            reject(new Error(`Expected SMTP port ${port} to be closed`));
        });

        socket.once('error', () => {
            resolve();
        });
    });
}

describe('smtp server helpers', () => {
    it('creates and starts an SMTP listener handle', async () => {
        const smtp = createSmtpServer({
            port: 0,
            host: '127.0.0.1',
            disabledCommands: ['STARTTLS', 'AUTH'],
        });

        smtp.listen();

        try {
            await waitForListening(smtp.server.server as any);

            const port = getPort(smtp.address());
            const banner = await readSmtpBanner(port);

            expect(port).toBeGreaterThan(0);
            expect(banner).toContain('220');
        } finally {
            await smtp.close();
        }
    });
});

describe('config-driven smtp listeners', () => {
    it('starts preview smtp listeners from global and client config and closes them with the dev server', async () => {
        const tempDirectory = fs.mkdtempSync(join(os.tmpdir(), 'elit-smtp-server-'));
        const publicRoot = join(tempDirectory, 'public');
        const adminRoot = join(tempDirectory, 'admin');

        try {
            fs.mkdirSync(publicRoot, { recursive: true });
            fs.mkdirSync(adminRoot, { recursive: true });
            fs.writeFileSync(join(publicRoot, 'index.html'), '<!doctype html><html><body>public</body></html>');
            fs.writeFileSync(join(adminRoot, 'index.html'), '<!doctype html><html><body>admin</body></html>');

            const devServer = createDevServer({
                port: 0,
                host: '127.0.0.1',
                logging: false,
                open: false,
                mode: 'preview',
                smtp: {
                    port: 0,
                    host: '127.0.0.1',
                    disabledCommands: ['STARTTLS', 'AUTH'],
                },
                clients: [
                    {
                        root: publicRoot,
                        basePath: '',
                    },
                    {
                        root: adminRoot,
                        basePath: '/admin',
                        smtp: {
                            port: 0,
                            host: '127.0.0.1',
                            disabledCommands: ['STARTTLS', 'AUTH'],
                        },
                    },
                ],
            });

            const smtpPorts: number[] = [];

            try {
                await waitForListening(devServer.server as any);
                expect(devServer.smtpServers).toHaveLength(2);

                for (const smtpServer of devServer.smtpServers) {
                    await waitForListening(smtpServer.server.server as any);
                    const port = getPort(smtpServer.address());
                    smtpPorts.push(port);

                    expect(port).toBeGreaterThan(0);
                    expect(await readSmtpBanner(port)).toContain('220');
                }
            } finally {
                await devServer.close();
            }

            for (const port of smtpPorts) {
                await expectPortClosed(port);
            }
        } finally {
            fs.rmSync(tempDirectory, { recursive: true, force: true });
        }
    });
});