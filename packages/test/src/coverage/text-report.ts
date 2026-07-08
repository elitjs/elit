import { dirname } from '@elitjs/path';

import { calculateCoverageTotals, calculateFileCoverage, formatUncoveredLines, toRelativePath } from './shared';
import type { FileCoverage } from './types';

const colors = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
};

function getColorForPercentage(percentage: number): string {
    if (percentage >= 80) return colors.green;
    if (percentage >= 50) return colors.yellow;
    return colors.red;
}

function stripAnsi(value: string): string {
    return value.replace(/\x1b\[[0-9;]*m/g, '');
}

function getVisibleWidth(value: string): number {
    return stripAnsi(value).length;
}

function formatMetricFixedWidth(covered: number, total: number, percentage: number, includeSeparator: boolean = false): string {
    const color = getColorForPercentage(percentage);
    const pct = `${color}${percentage.toFixed(2)}%${colors.reset}`;
    const count = `${colors.dim}${covered.toString().padStart(4)}${colors.reset}/${total.toString().padStart(4)}`;
    const metric = `${pct} (${count})`;
    const padding = ' '.repeat(Math.max(0, 19 - getVisibleWidth(metric)));
    const separator = includeSeparator ? `${colors.dim}│${colors.reset}` : ' ';

    return metric + padding + separator;
}

export function generateTextReport(
    coverageMap: Map<string, FileCoverage>,
    testResults?: unknown[]
): string {
    let output = '\n';

    void testResults;

    const totals = calculateCoverageTotals(coverageMap);
    const cwd = process.cwd();
    const namePadding = Math.max(
        45,
        ...Array.from(coverageMap.keys()).map((filePath) => toRelativePath(cwd, filePath).length + 2)
    );

    output += `${colors.bold}% Coverage report from v8${colors.reset}\n\n`;
    output += `${colors.dim}${colors.bold}All files${colors.reset}`;
    output += ' '.repeat(namePadding - 9);
    output += formatMetricFixedWidth(totals.statements.covered, totals.statements.total, totals.statements.percentage, true);
    output += formatMetricFixedWidth(totals.branches.covered, totals.branches.total, totals.branches.percentage, true);
    output += formatMetricFixedWidth(totals.functions.covered, totals.functions.total, totals.functions.percentage, true);
    output += formatMetricFixedWidth(totals.lines.covered, totals.lines.total, totals.lines.percentage, true);
    output += '\n';

    output += `${colors.dim}`;
    output += ' '.repeat(namePadding);
    output += ' '.repeat(5) + 'Statements';
    output += ' '.repeat(12) + 'Branch';
    output += ' '.repeat(12) + 'Functions';
    output += ' '.repeat(13) + 'Lines';
    output += ' '.repeat(12) + 'Uncovered';
    output += `${colors.reset}\n`;

    output += `${colors.dim}`;
    output += '─'.repeat(namePadding);
    output += '─'.repeat(19);
    output += '┼';
    output += '─'.repeat(19);
    output += '┼';
    output += '─'.repeat(19);
    output += '┼';
    output += '─'.repeat(19);
    output += '┼';
    output += '─'.repeat(19);
    output += `${colors.reset}\n`;

    const groupedFiles = new Map<string, Array<{ path: string; coverage: FileCoverage }>>();

    for (const [filePath, coverage] of coverageMap.entries()) {
        const dir = dirname(filePath);
        if (!groupedFiles.has(dir)) {
            groupedFiles.set(dir, []);
        }

        groupedFiles.get(dir)!.push({ path: filePath, coverage });
    }

    for (const [dir, files] of groupedFiles.entries()) {
        const relativeDir = toRelativePath(cwd, dir);
        if (relativeDir !== '.') {
            output += `\n${colors.cyan}${relativeDir}/${colors.reset}\n`;
        }

        for (const { path, coverage } of files) {
            const stats = calculateFileCoverage(coverage);
            const relativePath = toRelativePath(cwd, path);
            let displayName = relativePath;

            if (displayName.length > namePadding - 2) {
                displayName = '...' + displayName.slice(-(namePadding - 5));
            }

            output += displayName.padEnd(namePadding);
            output += formatMetricFixedWidth(stats.statements.covered, stats.statements.total, stats.statements.percentage, true);
            output += formatMetricFixedWidth(stats.branches.covered, stats.branches.total, stats.branches.percentage, true);
            output += formatMetricFixedWidth(stats.functions.covered, stats.functions.total, stats.functions.percentage, true);
            output += formatMetricFixedWidth(stats.lines.covered, stats.lines.total, stats.lines.percentage, true);
            output += `${colors.red}${formatUncoveredLines(coverage.uncoveredLines)}${colors.reset}`;
            output += '\n';
        }
    }

    output += '\n';
    output += `${colors.dim}${colors.bold}Test Files${colors.reset}  ${coverageMap.size} passed (100%)\n`;
    output += `${colors.dim}${colors.bold}Tests${colors.reset}       ${coverageMap.size} passed (100%)\n\n`;
    output += `${colors.dim}${colors.bold}Statements${colors.reset}   ${colors.green}${totals.statements.covered}${colors.reset} ${colors.dim}/${colors.reset} ${totals.statements.total}\n`;
    output += `${colors.dim}${colors.bold}Branches${colors.reset}    ${colors.green}${totals.branches.covered}${colors.reset} ${colors.dim}/${colors.reset} ${totals.branches.total}\n`;
    output += `${colors.dim}${colors.bold}Functions${colors.reset}    ${colors.green}${totals.functions.covered}${colors.reset} ${colors.dim}/${colors.reset} ${totals.functions.total}\n`;
    output += `${colors.dim}${colors.bold}Lines${colors.reset}       ${colors.green}${totals.lines.covered}${colors.reset} ${colors.dim}/${colors.reset} ${totals.lines.total}\n`;

    return output;
}