/// <reference path="../../packages/test/src/globals.d.ts" />

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createWapkLiveSync, packWapkDirectory, prepareWapkApp, readWapkArchive } from '../../packages/wapk/src';

const DRIVE_FILE_ID_ENV = 'ELIT_TEST_GOOGLE_DRIVE_FILE_ID';
const DRIVE_SHARED_ENV = 'ELIT_TEST_GOOGLE_DRIVE_SHARED_DRIVE';
const GOOGLE_DRIVE_TOKEN_ENV = 'GOOGLE_DRIVE_ACCESS_TOKEN';

const hasGoogleDriveIntegrationEnv = Boolean(process.env[GOOGLE_DRIVE_TOKEN_ENV] && process.env[DRIVE_FILE_ID_ENV]);
const googleDriveIntegrationTest = hasGoogleDriveIntegrationEnv ? test : test.skip;

function createTempDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'elit-wapk-google-drive-'));
}

function createTempWapkProject(rootDir) {
    const projectDir = path.join(rootDir, 'project');
    fs.mkdirSync(path.join(projectDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify({
        name: 'real-drive-sync-app',
        version: '1.0.0',
        main: 'src/index.js',
    }, null, 2));
    fs.writeFileSync(path.join(projectDir, 'src', 'index.js'), 'console.log("seed-archive");\n');
    return projectDir;
}

function buildGoogleDriveFileUrl(
    fileId,
    params,
) {
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
    fileId,
    params,
) {
    const url = new URL(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}`);
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined) {
            continue;
        }

        url.searchParams.set(key, typeof value === 'boolean' ? String(value) : value);
    }

    return url.toString();
}

async function readResponseMessage(response) {
    try {
        const text = (await response.text()).trim();
        return text.length > 0 ? text.slice(0, 400) : response.statusText;
    } catch {
        return response.statusText;
    }
}

async function downloadGoogleDriveArchive(
    fileId,
    accessToken,
    supportsAllDrives,
) {
    const response = await fetch(buildGoogleDriveFileUrl(fileId, {
        alt: 'media',
        supportsAllDrives,
    }), {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Google Drive download failed (${response.status}): ${await readResponseMessage(response)}`);
    }

    return Buffer.from(await response.arrayBuffer());
}

async function uploadGoogleDriveArchive(
    fileId,
    accessToken,
    supportsAllDrives,
    buffer,
) {
    const response = await fetch(buildGoogleDriveUploadUrl(fileId, {
        uploadType: 'media',
        supportsAllDrives,
    }), {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/octet-stream',
        },
        body: new Uint8Array(buffer),
    });

    if (!response.ok) {
        throw new Error(`Google Drive upload failed (${response.status}): ${await readResponseMessage(response)}`);
    }
}

googleDriveIntegrationTest('syncs a WAPK archive against a real Google Drive file and restores the original contents', async () => {
    const accessToken = process.env[GOOGLE_DRIVE_TOKEN_ENV];
    const fileId = process.env[DRIVE_FILE_ID_ENV];
    const supportsAllDrives = process.env[DRIVE_SHARED_ENV] === 'true';

    if (!accessToken || !fileId) {
        throw new Error(`Missing ${GOOGLE_DRIVE_TOKEN_ENV} or ${DRIVE_FILE_ID_ENV}.`);
    }

    const tempDir = createTempDir();
    const projectDir = createTempWapkProject(tempDir);
    const seedArchivePath = path.join(tempDir, 'seed.wapk');
    const updatedArchivePath = path.join(tempDir, 'updated.wapk');
    const syncedArchivePath = path.join(tempDir, 'synced.wapk');
    let preparedWorkDir;
    let originalBuffer;
    let pendingError;

    try {
        originalBuffer = await downloadGoogleDriveArchive(fileId, accessToken, supportsAllDrives);

        await packWapkDirectory(projectDir, {
            outputPath: seedArchivePath,
        });
        await uploadGoogleDriveArchive(fileId, accessToken, supportsAllDrives, fs.readFileSync(seedArchivePath));

        const prepared = await prepareWapkApp(`gdrive://${fileId}`, {
            googleDrive: {
                fileId,
                accessTokenEnv: GOOGLE_DRIVE_TOKEN_ENV,
                supportsAllDrives,
            },
            syncInterval: 75,
            archiveSyncInterval: 75,
            watchArchive: true,
        });
        preparedWorkDir = prepared.workDir;

        const liveSync = createWapkLiveSync(prepared);

        try {
            fs.writeFileSync(path.join(projectDir, 'src', 'index.js'), 'console.log("pulled-from-google-drive");\n');
            await packWapkDirectory(projectDir, {
                outputPath: updatedArchivePath,
            });
            await uploadGoogleDriveArchive(fileId, accessToken, supportsAllDrives, fs.readFileSync(updatedArchivePath));

            await liveSync.flush();

            expect(fs.readFileSync(path.join(prepared.workDir, 'src', 'index.js'), 'utf8')).toBe('console.log("pulled-from-google-drive");\n');

            const markerName = `integration-${Date.now()}.txt`;
            const markerContent = `real-drive-sync:${Date.now()}`;
            fs.writeFileSync(path.join(prepared.workDir, markerName), markerContent);

            await liveSync.flush();

            fs.writeFileSync(
                syncedArchivePath,
                await downloadGoogleDriveArchive(fileId, accessToken, supportsAllDrives),
            );
            const syncedArchive = readWapkArchive(syncedArchivePath);
            const markerFile = syncedArchive.files.find((file) => file.path === markerName);

            expect(markerFile?.content.toString('utf8')).toBe(markerContent);
        } finally {
            await liveSync.stop();
        }
    } catch (error) {
        pendingError = error;
    } finally {
        if (originalBuffer) {
            try {
                await uploadGoogleDriveArchive(fileId, accessToken, supportsAllDrives, originalBuffer);
            } catch (restoreError) {
                if (!pendingError) {
                    pendingError = restoreError;
                } else {
                    console.error(
                        '[wapk] Failed to restore the original Google Drive archive after the integration test:',
                        restoreError,
                    );
                }
            }
        }

        if (preparedWorkDir) {
            fs.rmSync(preparedWorkDir, { recursive: true, force: true });
        }
        fs.rmSync(tempDir, { recursive: true, force: true });
    }

    if (pendingError) {
        throw pendingError;
    }
});