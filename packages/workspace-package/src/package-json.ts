import { readFileSync } from '@elitjs/fs';

export function readPackageJson(filePath: string): { name?: string } | undefined {
    try {
        const packageJsonBuffer = readFileSync(filePath, 'utf-8');
        const packageJsonText = typeof packageJsonBuffer === 'string'
            ? packageJsonBuffer
            : packageJsonBuffer.toString('utf-8');

        return JSON.parse(packageJsonText) as { name?: string };
    } catch {
        return undefined;
    }
}