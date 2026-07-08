import { readFileSync } from '@elitjs/fs';

const executedLinesMap = new Map<string, Set<number>>();
const totalLinesMap = new Map<string, number>();

export function getExecutableLines(filePath: string): Set<number> {
    const executableLines = new Set<number>();

    try {
        const sourceCode = readFileSync(filePath, 'utf-8').toString();
        const lines = sourceCode.split('\n');

        for (let index = 0; index < lines.length; index++) {
            const line = lines[index].trim();

            if (!line ||
                line.startsWith('//') ||
                line.startsWith('*') ||
                line.startsWith('/*') ||
                line.startsWith('*/') ||
                line === '{' ||
                line === '}' ||
                /^import\s+.*$/.test(line) ||
                /^export\s+(interface|type|enum)\s+.*$/.test(line) ||
                /^interface\s+.*$/.test(line) ||
                /^type\s+.*$/.test(line) ||
                /^enum\s+.*$/.test(line)) {
                continue;
            }

            executableLines.add(index + 1);
        }
    } catch {
        return new Set<number>();
    }

    totalLinesMap.set(filePath, executableLines.size);
    return executableLines;
}

export function markFileAsCovered(_filePath: string): void {
}

export function markLineExecuted(filePath: string, lineNumber: number): void {
    let executedLines = executedLinesMap.get(filePath);
    if (!executedLines) {
        executedLines = new Set<number>();
        executedLinesMap.set(filePath, executedLines);
    }

    executedLines.add(lineNumber);
}

export function getExecutedLines(filePath: string): Set<number> {
    return executedLinesMap.get(filePath) || new Set<number>();
}

export function calculateUncoveredLines(filePath: string): number[] {
    const executableLines = getExecutableLines(filePath);
    const executedLines = getExecutedLines(filePath);

    const uncoveredLines: number[] = [];
    for (const line of executableLines) {
        if (!executedLines.has(line)) {
            uncoveredLines.push(line);
        }
    }

    return uncoveredLines.sort((left, right) => left - right);
}

export function resetCoverageTracking(): void {
    executedLinesMap.clear();
    totalLinesMap.clear();
}

export function initializeCoverageTracking(): void {
    resetCoverageTracking();
}