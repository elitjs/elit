import { readdirSync } from '@elitjs/fs';
import { join, relative } from '@elitjs/path';

function globToRegex(pattern: string): RegExp {
    let expanded = pattern;
    const openBraceIndex = pattern.indexOf('{');
    if (openBraceIndex !== -1) {
        const closeBraceIndex = pattern.indexOf('}', openBraceIndex);
        if (closeBraceIndex !== -1) {
            const options = pattern.slice(openBraceIndex + 1, closeBraceIndex).split(',');
            const before = pattern.slice(0, openBraceIndex);
            const after = pattern.slice(closeBraceIndex + 1);
            expanded = before + '(' + options.join('|') + ')' + after;
        }
    }

    let regexStr = '^';
    for (let index = 0; index < expanded.length; index++) {
        const char = expanded[index];
        switch (char) {
            case '.':
                regexStr += '\\.';
                break;
            case '*':
                regexStr += '.*';
                break;
            case '?':
                regexStr += '.';
                break;
            case '+':
            case '^':
            case '$':
            case '|':
            case '(':
            case ')':
            case '[':
            case ']':
            case '{':
            case '}':
            case '\\':
                regexStr += '\\' + char;
                break;
            default:
                regexStr += char;
        }
    }
    regexStr += '$';

    return new RegExp(regexStr);
}

function matchesPattern(relativePath: string, pattern: string): boolean {
    const openBraceIndex = pattern.indexOf('{');

    if (openBraceIndex !== -1) {
        const closeBraceIndex = pattern.indexOf('}', openBraceIndex);
        if (closeBraceIndex !== -1) {
            const options = pattern.slice(openBraceIndex + 1, closeBraceIndex).split(',');
            const before = pattern.slice(0, openBraceIndex);
            const after = pattern.slice(closeBraceIndex + 1);

            for (const option of options) {
                if (matchesPattern(relativePath, before + option + after)) {
                    return true;
                }
            }
            return false;
        }
    }

    return globToRegex(pattern).test(relativePath);
}

function normalizePathForPattern(path: string): string {
    return path.replace(/\\/g, '/');
}

export function findTestFiles(root: string, include: string[], exclude: string[]): string[] {
    const files: string[] = [];

    function scanDir(dir: string) {
        try {
            const entries = readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                if (typeof entry === 'string') {
                    continue;
                }

                const fullPath = join(dir, entry.name);

                if (entry.isDirectory()) {
                    const relativePath = normalizePathForPattern(relative(root, fullPath));
                    if (exclude.some((pattern) => matchesPattern(relativePath, pattern))) {
                        continue;
                    }
                    scanDir(fullPath);
                } else if (entry.isFile()) {
                    const relativePath = normalizePathForPattern(relative(root, fullPath));
                    if (exclude.some((pattern) => matchesPattern(relativePath, pattern))) {
                        continue;
                    }
                    for (const pattern of include) {
                        if (matchesPattern(relativePath, pattern)) {
                            files.push(fullPath);
                            break;
                        }
                    }
                }
            }
        } catch {
        }
    }

    scanDir(root);
    return files;
}