import { relative } from '@elitjs/path';

import type { FileCoverage } from './types';

export interface CoverageMetric {
    total: number;
    covered: number;
    percentage: number;
}

export interface CoverageMetrics {
    statements: CoverageMetric;
    branches: CoverageMetric;
    functions: CoverageMetric;
    lines: CoverageMetric;
}

export interface CoverageTotals extends CoverageMetrics {
    overallPercentage: number;
    totalFiles: number;
    coveredFiles: number;
}

function calculatePercentage(covered: number, total: number): number {
    return total > 0 ? (covered / total) * 100 : 0;
}

export function calculateFileCoverage(file: FileCoverage): CoverageMetrics {
    return {
        statements: {
            total: file.statements,
            covered: file.coveredStatements,
            percentage: calculatePercentage(file.coveredStatements, file.statements),
        },
        branches: {
            total: file.branches,
            covered: file.coveredBranches,
            percentage: calculatePercentage(file.coveredBranches, file.branches),
        },
        functions: {
            total: file.functions,
            covered: file.coveredFunctions,
            percentage: calculatePercentage(file.coveredFunctions, file.functions),
        },
        lines: {
            total: file.lines,
            covered: file.coveredLines,
            percentage: calculatePercentage(file.coveredLines, file.lines),
        },
    };
}

export function calculateCoverageTotals(coverageMap: Map<string, FileCoverage>): CoverageTotals {
    let totalStatements = 0;
    let coveredStatements = 0;
    let totalBranches = 0;
    let coveredBranches = 0;
    let totalFunctions = 0;
    let coveredFunctions = 0;
    let totalLines = 0;
    let coveredLines = 0;
    let coveredFiles = 0;

    for (const coverage of coverageMap.values()) {
        totalStatements += coverage.statements;
        coveredStatements += coverage.coveredStatements;
        totalBranches += coverage.branches;
        coveredBranches += coverage.coveredBranches;
        totalFunctions += coverage.functions;
        coveredFunctions += coverage.coveredFunctions;
        totalLines += coverage.lines;
        coveredLines += coverage.coveredLines;

        if (coverage.coveredStatements > 0) {
            coveredFiles++;
        }
    }

    const statements = {
        total: totalStatements,
        covered: coveredStatements,
        percentage: calculatePercentage(coveredStatements, totalStatements),
    };
    const branches = {
        total: totalBranches,
        covered: coveredBranches,
        percentage: calculatePercentage(coveredBranches, totalBranches),
    };
    const functions = {
        total: totalFunctions,
        covered: coveredFunctions,
        percentage: calculatePercentage(coveredFunctions, totalFunctions),
    };
    const lines = {
        total: totalLines,
        covered: coveredLines,
        percentage: calculatePercentage(coveredLines, totalLines),
    };

    return {
        statements,
        branches,
        functions,
        lines,
        overallPercentage: (statements.percentage + branches.percentage + functions.percentage + lines.percentage) / 4,
        totalFiles: coverageMap.size,
        coveredFiles,
    };
}

export function toRelativePath(cwd: string, filePath: string): string {
    return relative(cwd, filePath).replace(/\\/g, '/');
}

export function getSafeReportFileName(filePath: string): string {
    return filePath.replace(/[\/\\]/g, '_') + '.html';
}

export function formatUncoveredLines(uncoveredLines: number[] | undefined): string {
    if (!uncoveredLines || uncoveredLines.length === 0) {
        return '';
    }

    const ranges: string[] = [];
    let start = uncoveredLines[0];
    let end = uncoveredLines[0];

    for (let index = 1; index < uncoveredLines.length; index++) {
        if (uncoveredLines[index] === end + 1) {
            end = uncoveredLines[index];
            continue;
        }

        if (start === end) {
            ranges.push(start.toString());
        } else {
            ranges.push(`${start}-${end}`);
        }

        start = uncoveredLines[index];
        end = uncoveredLines[index];
    }

    if (start === end) {
        ranges.push(start.toString());
    } else {
        ranges.push(`${start}-${end}`);
    }

    return ranges.join(',');
}

export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function escapeXml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}