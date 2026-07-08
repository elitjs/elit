import { relative } from '@elitjs/path';
import { readFileSync } from '@elitjs/fs';

import { findAllTypeScriptFiles } from './matching';
import { getExecutableLines } from './tracking';
import type { CoverageOptions, FileCoverage } from './types';

function analyzeSourceFile(filePath: string): { statements: number; branches: number; functions: number; lines: number } {
    try {
        const sourceCode = readFileSync(filePath, 'utf-8').toString();
        const lines = sourceCode.split('\n');

        let statements = 0;
        let branches = 0;
        let functions = 0;
        let executableLines = 0;

        const branchKeywords = ['if', 'else if', 'for', 'while', 'switch', 'case', 'catch', '?', '&&', '||'];
        const functionPatterns = [/function\s+\w+/, /(\w+)\s*\([^)]*\)\s*{/, /\(\s*\w+\s*(?:,\s*\w+\s*)*\)\s*=>/];

        for (const line of lines) {
            const trimmed = line.trim();

            if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*') ||
                trimmed.startsWith('import ') || trimmed.startsWith('export ') ||
                trimmed.startsWith('interface ') || trimmed.startsWith('type ') ||
                trimmed.startsWith('enum ') || trimmed.match(/^class\s+\w+/)) {
                continue;
            }

            for (const keyword of branchKeywords) {
                if (trimmed.includes(keyword)) {
                    branches++;
                    break;
                }
            }

            for (const pattern of functionPatterns) {
                if (pattern.test(trimmed)) {
                    functions++;
                    break;
                }
            }

            const codeOnly = trimmed
                .replace(/\{|\}|\(|\)|;$/g, '')
                .replace(/^import\s+.*$/, '')
                .replace(/^export\s+.*$/, '')
                .replace(/^interface\s+.*$/, '')
                .replace(/^type\s+.*$/, '')
                .replace(/^enum\s+.*$/, '')
                .replace(/^class\s+\w+.*$/, '')
                .trim();

            if (codeOnly && codeOnly.length > 0) {
                statements++;
                executableLines++;
            }
        }

        return { statements, branches, functions, lines: executableLines };
    } catch {
        return { statements: 0, branches: 0, functions: 0, lines: 0 };
    }
}

function createCoverageRecord(filePath: string, isCovered: boolean): FileCoverage {
    const analysis = analyzeSourceFile(filePath);
    const executableLines = getExecutableLines(filePath);
    const executedLines = isCovered ? executableLines : new Set<number>();
    const uncoveredLines = Array.from(executableLines)
        .filter((line) => !executedLines.has(line))
        .sort((left, right) => left - right);

    return {
        path: filePath,
        statements: analysis.statements,
        coveredStatements: isCovered ? analysis.statements : 0,
        branches: analysis.branches,
        coveredBranches: isCovered ? analysis.branches : 0,
        functions: analysis.functions,
        coveredFunctions: isCovered ? analysis.functions : 0,
        lines: executableLines.size,
        coveredLines: executedLines.size,
        uncoveredLines: uncoveredLines.length > 0 ? uncoveredLines : undefined,
    };
}

export async function processCoverage(options: CoverageOptions): Promise<Map<string, FileCoverage>> {
    const {
        include = ['**/*.ts'],
        exclude = ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**', '**/dist/**', '**/coverage/**'],
        coveredFiles,
    } = options;

    const coverageMap = new Map<string, FileCoverage>();
    const allTsFiles = findAllTypeScriptFiles(process.cwd(), include, exclude);

    for (const tsFile of allTsFiles) {
        const isCovered = coveredFiles?.has(tsFile) || false;
        coverageMap.set(tsFile, createCoverageRecord(tsFile, isCovered));
    }

    if (coveredFiles) {
        for (const coveredFile of coveredFiles) {
            if (coverageMap.has(coveredFile)) {
                continue;
            }

            const relativePath = relative(process.cwd(), coveredFile);
            const isOutsideProject = relativePath.startsWith('..');

            if (!coveredFile.includes('node_modules') && !coveredFile.includes('dist') && !isOutsideProject) {
                coverageMap.set(coveredFile, createCoverageRecord(coveredFile, true));
            }
        }
    }

    return coverageMap;
}