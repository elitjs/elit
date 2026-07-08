import { existsSync } from '@elitjs/fs';
import { resolve } from '@elitjs/path';
import { readFileAsString, removeQuotes } from './utils';

/**
 * Load environment variables from .env files
 */
export function loadEnv(mode: string = 'development', cwd: string = process.cwd()): Record<string, string> {
    const env: Record<string, string> = { MODE: mode };

    const envFiles = [
        `.env.${mode}.local`,
        `.env.${mode}`,
        '.env.local',
        '.env'
    ];

    for (const file of envFiles) {
        const filePath = resolve(cwd, file);
        if (existsSync(filePath)) {
            const content = readFileAsString(filePath);
            const lines = content.split('\n');

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) {
                    continue;
                }

                const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
                if (match) {
                    const [, key, value] = match;
                    const cleanValue = removeQuotes(value);
                    if (!(key in env)) {
                        env[key] = cleanValue;
                    }
                }
            }
        }
    }

    return env;
}