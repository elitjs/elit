import { existsSync, readdirSync } from '@elitjs/fs';
import { join } from '@elitjs/path';

function globToRegex(pattern: string): RegExp {
    const regexPattern = pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*/g, '__DOUBLE_STAR__')
        .replace(/\*/g, '[^/\\\\]*')
        .replace(/__DOUBLE_STAR__/g, '.*');

    return new RegExp(`^${regexPattern.replace(/\\/g, '[\\\\/]')}$`);
}

function matchesInclude(filePath: string, include: string[]): boolean {
    const normalizedPath = filePath.replace(/\\/g, '/');
    return include.some((pattern) => {
        const regex = globToRegex(pattern);
        return regex.test(normalizedPath);
    });
}

function matchesExclude(filePath: string, exclude: string[]): boolean {
    const normalizedPath = filePath.replace(/\\/g, '/');
    return exclude.some((pattern) => {
        const regex = globToRegex(pattern);
        return regex.test(normalizedPath);
    });
}

export function findAllTypeScriptFiles(dir: string, include: string[], exclude: string[]): string[] {
    const files: string[] = [];

    if (!existsSync(dir)) {
        return files;
    }

    try {
        const entries = readdirSync(dir, { withFileTypes: true } as any) as Array<string | {
            name: string;
            isDirectory(): boolean;
            isFile(): boolean;
        }>;

        for (const entry of entries) {
            if (typeof entry === 'string') {
                const fullPath = join(dir, entry);
                if (fullPath.endsWith('.ts') && matchesInclude(fullPath, include) && !matchesExclude(fullPath, exclude)) {
                    files.push(fullPath);
                }
                continue;
            }

            const fullPath = join(dir, entry.name);

            if (entry.isDirectory()) {
                if (!matchesExclude(fullPath + '/', exclude)) {
                    files.push(...findAllTypeScriptFiles(fullPath, include, exclude));
                }
            } else if (entry.isFile() && fullPath.endsWith('.ts')) {
                if (matchesInclude(fullPath, include) && !matchesExclude(fullPath, exclude)) {
                    files.push(fullPath);
                }
            }
        }
    } catch {
    }

    return files;
}