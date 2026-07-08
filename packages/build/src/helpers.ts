import { statSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, existsSync } from '@elitjs/fs';
import { resolve, join, basename, extname, dirname } from '@elitjs/path';
import type { BuildOptions } from './contracts';
import type { ResolvedBuildOptions, ResolvedBuildPaths } from './types';

export function ensureDir(dirPath: string): void {
    try {
        mkdirSync(dirPath, { recursive: true });
    } catch {
        // Directory might already exist.
    }
}

export function calculateBuildMetrics(startTime: number, outputPath: string): { buildTime: number; size: number } {
    const buildTime = Date.now() - startTime;
    const stats = statSync(outputPath);
    return { buildTime, size: stats.size };
}

export function readFileAsString(filePath: string): string {
    const contentBuffer = readFileSync(filePath, 'utf-8');
    return typeof contentBuffer === 'string' ? contentBuffer : contentBuffer.toString('utf-8');
}

export function resolveBuildPaths(config: ResolvedBuildOptions): ResolvedBuildPaths {
    const entryPath = resolve(config.entry);
    const outDir = resolve(config.outDir);

    let outFile = config.outFile;
    if (!outFile) {
        const baseName = basename(config.entry, extname(config.entry));
        const ext = config.format === 'cjs' ? '.cjs' : '.js';
        outFile = baseName + ext;
    }

    return {
        entryPath,
        outDir,
        outFile,
        outputPath: join(outDir, outFile),
    };
}

export function createDefine(config: BuildOptions): Record<string, string> {
    const define: Record<string, string> = {};

    if (!config.env) {
        return define;
    }

    Object.entries(config.env).forEach(([key, value]) => {
        if (key.startsWith('VITE_')) {
            define[`import.meta.env.${key}`] = JSON.stringify(value);
        }
    });

    if (config.env.MODE) {
        define['import.meta.env.MODE'] = JSON.stringify(config.env.MODE);
    }

    define['import.meta.env.DEV'] = JSON.stringify(config.env.MODE !== 'production');
    define['import.meta.env.PROD'] = JSON.stringify(config.env.MODE === 'production');

    return define;
}

export function copyBuildFiles(config: ResolvedBuildOptions, outDir: string): void {
    if (!config.copy || config.copy.length === 0) {
        return;
    }

    if (config.logging) {
        console.log('\n📦 Copying files...');
    }

    for (const copyItem of config.copy) {
        const fromPath = resolve(copyItem.from);
        const toPath = resolve(outDir, copyItem.to);
        const targetDir = dirname(toPath);

        if (!existsSync(targetDir)) {
            ensureDir(targetDir);
        }

        if (!existsSync(fromPath)) {
            if (config.logging) {
                console.warn(`  ⚠ File not found: ${copyItem.from}`);
            }
            continue;
        }

        if (copyItem.transform) {
            const content = readFileAsString(fromPath);
            const transformed = copyItem.transform(content, config);
            writeFileSync(toPath, transformed);
        } else {
            copyFileSync(fromPath, toPath);
        }

        if (config.logging) {
            console.log(`  ✓ ${copyItem.from} → ${copyItem.to}`);
        }
    }
}

export function formatBytes(bytes: number): string {
    if (bytes === 0) {
        return '0 B';
    }

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}