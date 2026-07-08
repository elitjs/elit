import { readFileSync } from '@elitjs/fs';
import { relative } from '@elitjs/path';
import type { ElitConfig } from './types';

/**
 * Helper: Read file and ensure string output (eliminates duplication in file reading)
 */
export function readFileAsString(filePath: string): string {
    const contentBuffer = readFileSync(filePath, 'utf-8');
    return typeof contentBuffer === 'string' ? contentBuffer : contentBuffer.toString('utf-8');
}

/**
 * Helper: Remove surrounding quotes from string (eliminates duplication in env parsing)
 */
export function removeQuotes(value: string): string {
    const trimmed = value.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1);
    }
    return trimmed;
}

export function normalizeRelativeImportPath(fromDirectory: string, targetPath: string): string {
    const relativePath = relative(fromDirectory, targetPath).replace(/\\/g, '/');
    return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
}

/**
 * Helper: Import config module and return default or module (eliminates duplication in config loading)
 */
export async function importConfigModule(configPath: string): Promise<ElitConfig> {
    const { pathToFileURL } = await import('url');
    const configModule = await import(pathToFileURL(configPath).href);
    return configModule.default || configModule;
}

/**
 * Helper: Safe file cleanup (eliminates duplication in temp file cleanup)
 */
export async function safeCleanup(filePath: string): Promise<void> {
    try {
        const { unlinkSync } = await import('@elitjs/fs');
        unlinkSync(filePath);
    } catch {
        // Ignore cleanup errors
    }
}