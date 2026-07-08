import { existsSync, mkdirSync, readFileSync, writeFileSync } from '@elitjs/fs';
import { join } from '@elitjs/path';

import {
    calculateCoverageTotals,
    calculateFileCoverage,
    escapeHtml,
    formatUncoveredLines,
    getSafeReportFileName,
    toRelativePath,
} from './shared';
import type { FileCoverage } from './types';

function getCoverageClass(percentage: number): 'high' | 'medium' | 'low' {
    if (percentage >= 80) return 'high';
    if (percentage >= 50) return 'medium';
    return 'low';
}

export function generateHtmlReport(coverageMap: Map<string, FileCoverage>, reportsDir: string): void {
    if (!existsSync(reportsDir)) {
        mkdirSync(reportsDir, { recursive: true });
    }

    const totals = calculateCoverageTotals(coverageMap);
    const cwd = process.cwd();

    const indexHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Coverage Report</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%236366f1'/%3E%3Cstop offset='100%25' stop-color='%238b5cf6'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100' height='100' rx='20' fill='url(%23grad)'/%3E%3Crect x='28' y='25' width='44' height='8' rx='4' fill='white'/%3E%3Crect x='28' y='46' width='32' height='8' rx='4' fill='white'/%3E%3Crect x='28' y='67' width='44' height='8' rx='4' fill='white'/%3E%3Crect x='28' y='25' width='8' height='50' rx='4' fill='white'/%3E%3Ccircle cx='72' cy='50' r='6' fill='white' opacity='0.5'/%3E%3C/svg%3E">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #0d1117;
            color: #c9d1d9;
            padding: 20px;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        h1 {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 20px;
            color: #58a6ff;
        }
        .overall-bar {
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 6px;
            padding: 15px 20px;
            margin-bottom: 20px;
        }
        .overall-bar-inner {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .overall-bar-label {
            font-size: 14px;
            font-weight: 600;
            color: #8b949e;
            min-width: 140px;
        }
        .overall-bar-visual {
            flex: 1;
            height: 24px;
            background: #21262d;
            border-radius: 4px;
            overflow: hidden;
            position: relative;
        }
        .overall-bar-fill {
            height: 100%;
            background: ${totals.overallPercentage >= 80 ? '#3fb950' : totals.overallPercentage >= 50 ? '#d29922' : '#f85149'};
            display: flex;
            align-items: center;
            justify-content: center;
            transition: width 0.3s ease;
        }
        .overall-bar-text {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 12px;
            font-weight: 600;
            color: #ffffff;
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }
        .files-info {
            font-size: 13px;
            color: #8b949e;
            margin-top: 8px;
        }
        .files-info span { color: #58a6ff; font-weight: 600; }
        .summary {
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .summary-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 15px;
            color: #c9d1d9;
        }
        .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
        .metric {
            background: #21262d;
            border: 1px solid #30363d;
            border-radius: 6px;
            padding: 15px;
            text-align: center;
        }
        .metric-label { font-size: 12px; color: #8b949e; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px; }
        .metric-value { font-size: 24px; font-weight: 700; }
        .metric-value.high { color: #3fb950; }
        .metric-value.medium { color: #d29922; }
        .metric-value.low { color: #f85149; }
        .progress-bar {
            height: 8px;
            background: #21262d;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 8px;
        }
        .progress-fill { height: 100%; transition: width 0.3s ease; }
        .progress-fill.high { background: #3fb950; }
        .progress-fill.medium { background: #d29922; }
        .progress-fill.low { background: #f85149; }
        .metric-count { font-size: 11px; color: #8b949e; margin-top: 5px; }
        .file-list {
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 6px;
            overflow: hidden;
        }
        .file-header {
            display: grid;
            grid-template-columns: 1fr 80px 80px 80px 80px;
            padding: 12px 15px;
            background: #21262d;
            font-size: 12px;
            font-weight: 600;
            color: #8b949e;
            border-bottom: 1px solid #30363d;
        }
        .file-row {
            display: grid;
            grid-template-columns: 1fr 80px 80px 80px 80px;
            padding: 10px 15px;
            border-bottom: 1px solid #21262d;
            font-size: 13px;
        }
        .file-row:hover { background: #21262d; }
        .file-row:last-child { border-bottom: none; }
        .file-name { color: #58a6ff; text-decoration: none; cursor: pointer; }
        .file-name:hover { text-decoration: underline; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; margin-left: 8px; }
        .badge.covered { background: #238636; color: #fff; }
        .badge.uncovered { background: #da3633; color: #fff; }
        .coverage-cell { text-align: center; }
        .coverage-percent { font-weight: 600; }
        .coverage-percent.high { color: #3fb950; }
        .coverage-percent.medium { color: #d29922; }
        .coverage-percent.low { color: #f85149; }
        .coverage-count { font-size: 11px; color: #8b949e; margin-top: 2px; }
        .search-container {
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 20px;
        }
        .search-input {
            width: 100%;
            padding: 10px 15px;
            background: #21262d;
            border: 1px solid #30363d;
            border-radius: 6px;
            color: #c9d1d9;
            font-size: 14px;
            font-family: inherit;
            outline: none;
            transition: border-color 0.2s ease;
        }
        .search-input:focus {
            border-color: #58a6ff;
        }
        .search-input::placeholder {
            color: #8b949e;
        }
        .hidden { display: none !important; }
        .no-results {
            padding: 20px;
            text-align: center;
            color: #8b949e;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Coverage Report</h1>

        <div class="overall-bar">
            <div class="overall-bar-inner">
                <div class="overall-bar-label">Overall Coverage</div>
                <div class="overall-bar-visual">
                    <div class="overall-bar-fill" style="width: ${totals.overallPercentage}%"></div>
                    <div class="overall-bar-text">${totals.overallPercentage.toFixed(2)}%</div>
                </div>
            </div>
            <div class="files-info"><span>${totals.coveredFiles}</span> of ${totals.totalFiles} files covered</div>
        </div>

        <div class="summary">
            <div class="summary-title">Coverage Metrics</div>
            <div class="metrics">
                <div class="metric">
                    <div class="metric-label">Statements</div>
                    <div class="metric-value ${getCoverageClass(totals.statements.percentage)}">${totals.statements.percentage.toFixed(2)}%</div>
                    <div class="progress-bar">
                        <div class="progress-fill ${getCoverageClass(totals.statements.percentage)}" style="width: ${totals.statements.percentage}%"></div>
                    </div>
                    <div class="metric-count">${totals.statements.covered}/${totals.statements.total}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Branches</div>
                    <div class="metric-value ${getCoverageClass(totals.branches.percentage)}">${totals.branches.percentage.toFixed(2)}%</div>
                    <div class="progress-bar">
                        <div class="progress-fill ${getCoverageClass(totals.branches.percentage)}" style="width: ${totals.branches.percentage}%"></div>
                    </div>
                    <div class="metric-count">${totals.branches.covered}/${totals.branches.total}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Functions</div>
                    <div class="metric-value ${getCoverageClass(totals.functions.percentage)}">${totals.functions.percentage.toFixed(2)}%</div>
                    <div class="progress-bar">
                        <div class="progress-fill ${getCoverageClass(totals.functions.percentage)}" style="width: ${totals.functions.percentage}%"></div>
                    </div>
                    <div class="metric-count">${totals.functions.covered}/${totals.functions.total}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Lines</div>
                    <div class="metric-value ${getCoverageClass(totals.lines.percentage)}">${totals.lines.percentage.toFixed(2)}%</div>
                    <div class="progress-bar">
                        <div class="progress-fill ${getCoverageClass(totals.lines.percentage)}" style="width: ${totals.lines.percentage}%"></div>
                    </div>
                    <div class="metric-count">${totals.lines.covered}/${totals.lines.total}</div>
                </div>
            </div>
        </div>

        <div class="search-container">
            <input type="text" id="search-input" class="search-input" placeholder="🔍 Search files..." autocomplete="off">
        </div>

        <div class="file-list">
            <div class="file-header">
                <div>File</div>
                <div style="text-align: center">Stmts</div>
                <div style="text-align: center">Branch</div>
                <div style="text-align: center">Funcs</div>
                <div style="text-align: center">Lines</div>
            </div>
            <div id="file-rows">
            ${Array.from(coverageMap.entries()).map(([filePath, coverage]) => {
                const stats = calculateFileCoverage(coverage);
                const fileName = toRelativePath(cwd, filePath);
                const safeFileName = getSafeReportFileName(fileName);
                const isCovered = coverage.coveredStatements > 0;
                return `
                    <div class="file-row" onclick="window.location.href='${safeFileName}'">
                        <div>
                            <span class="file-name">${fileName}</span>
                            ${isCovered ? '<span class="badge covered">Covered</span>' : '<span class="badge uncovered">Not Covered</span>'}
                        </div>
                        <div class="coverage-cell">
                            <div class="coverage-percent ${getCoverageClass(stats.statements.percentage)}">${stats.statements.percentage.toFixed(2)}%</div>
                            <div class="coverage-count">${coverage.coveredStatements}/${coverage.statements}</div>
                        </div>
                        <div class="coverage-cell">
                            <div class="coverage-percent ${getCoverageClass(stats.branches.percentage)}">${stats.branches.percentage.toFixed(2)}%</div>
                            <div class="coverage-count">${coverage.coveredBranches}/${coverage.branches}</div>
                        </div>
                        <div class="coverage-cell">
                            <div class="coverage-percent ${getCoverageClass(stats.functions.percentage)}">${stats.functions.percentage.toFixed(2)}%</div>
                            <div class="coverage-count">${coverage.coveredFunctions}/${coverage.functions}</div>
                        </div>
                        <div class="coverage-cell">
                            <div class="coverage-percent ${getCoverageClass(stats.lines.percentage)}">${stats.lines.percentage.toFixed(2)}%</div>
                            <div class="coverage-count">${coverage.coveredLines}/${coverage.lines}</div>
                        </div>
                    </div>
                `;
            }).join('')}
            </div>
            <div id="no-results" class="no-results hidden">No files found matching your search</div>
        </div>
    </div>

    <script>
        const searchInput = document.getElementById('search-input');
        const fileRows = document.getElementById('file-rows');
        const noResults = document.getElementById('no-results');
        const fileRowElements = fileRows.querySelectorAll('.file-row');

        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            let visibleCount = 0;

            fileRowElements.forEach(function(row) {
                const fileName = row.querySelector('.file-name').textContent.toLowerCase();
                if (fileName.includes(searchTerm)) {
                    row.classList.remove('hidden');
                    visibleCount++;
                } else {
                    row.classList.add('hidden');
                }
            });

            if (visibleCount === 0) {
                noResults.classList.remove('hidden');
            } else {
                noResults.classList.add('hidden');
            }
        });
    </script>
</body>
</html>`;

    writeFileSync(join(reportsDir, 'index.html'), indexHtml, 'utf-8');

    for (const [filePath, coverage] of coverageMap.entries()) {
        generateFileDetailPage(filePath, coverage, reportsDir, cwd);
    }
}

function generateFileDetailPage(
    filePath: string,
    coverage: FileCoverage,
    reportsDir: string,
    cwd: string
): void {
    const fileName = toRelativePath(cwd, filePath);
    const safeFileName = getSafeReportFileName(fileName);
    const stats = calculateFileCoverage(coverage);

    let sourceLines: string[] = [];
    try {
        const sourceCode = readFileSync(filePath, 'utf-8').toString();
        sourceLines = sourceCode.split('\n');
    } catch {
        sourceLines = ['// Unable to read source file'];
    }

    const uncoveredSet = new Set(coverage.uncoveredLines || []);

    const fileHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Coverage: ${fileName}</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%236366f1'/%3E%3Cstop offset='100%25' stop-color='%238b5cf6'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100' height='100' rx='20' fill='url(%23grad)'/%3E%3Crect x='28' y='25' width='44' height='8' rx='4' fill='white'/%3E%3Crect x='28' y='46' width='32' height='8' rx='4' fill='white'/%3E%3Crect x='28' y='67' width='44' height='8' rx='4' fill='white'/%3E%3Crect x='28' y='25' width='8' height='50' rx='4' fill='white'/%3E%3Ccircle cx='72' cy='50' r='6' fill='white' opacity='0.5'/%3E%3C/svg%3E">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #0d1117;
            color: #c9d1d9;
            padding: 20px;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        a { color: #58a6ff; text-decoration: none; }
        a:hover { text-decoration: underline; }
        h1 {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 10px;
            color: #58a6ff;
        }
        .breadcrumb {
            font-size: 14px;
            color: #8b949e;
            margin-bottom: 20px;
        }
        .breadcrumb a { color: #58a6ff; }
        .summary {
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .summary-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 15px;
            color: #c9d1d9;
        }
        .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
        .metric {
            background: #21262d;
            border: 1px solid #30363d;
            border-radius: 6px;
            padding: 15px;
            text-align: center;
        }
        .metric-label { font-size: 12px; color: #8b949e; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px; }
        .metric-value { font-size: 24px; font-weight: 700; }
        .metric-value.high { color: #3fb950; }
        .metric-value.medium { color: #d29922; }
        .metric-value.low { color: #f85149; }
        .progress-bar {
            height: 8px;
            background: #21262d;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 8px;
        }
        .progress-fill { height: 100%; transition: width 0.3s ease; }
        .progress-fill.high { background: #3fb950; }
        .progress-fill.medium { background: #d29922; }
        .progress-fill.low { background: #f85149; }
        .metric-count { font-size: 11px; color: #8b949e; margin-top: 5px; }
        .code-container {
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 6px;
            overflow: hidden;
        }
        .code-header {
            padding: 10px 15px;
            background: #21262d;
            border-bottom: 1px solid #30363d;
            font-size: 13px;
            color: #8b949e;
            display: flex;
            justify-content: space-between;
        }
        .legend { display: flex; gap: 15px; font-size: 12px; }
        .legend-item { display: flex; align-items: center; gap: 5px; }
        .legend-box { width: 12px; height: 12px; border-radius: 2px; }
        .legend-box.covered { background: rgba(63, 185, 80, 0.2); border: 1px solid #3fb950; }
        .legend-box.uncovered { background: rgba(248, 81, 73, 0.2); border: 1px solid #f85149; }
        .code-table { width: 100%; border-collapse: collapse; }
        .code-table td { padding: 0; }
        .line-number {
            width: 50px;
            text-align: right;
            padding: 0 15px;
            color: #8b949e;
            font-size: 12px;
            user-select: none;
            border-right: 1px solid #30363d;
        }
        .line-content {
            padding: 0 15px;
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
            font-size: 13px;
            line-height: 20px;
            white-space: pre;
        }
        tr.covered .line-content { background: rgba(63, 185, 80, 0.1); }
        tr.uncovered .line-content { background: rgba(248, 81, 73, 0.15); }
        tr.uncovered .line-number { color: #f85149; }
        tr:hover td { background: rgba(88, 166, 255, 0.1); }
    </style>
</head>
<body>
    <div class="container">
        <div class="breadcrumb">
            <a href="index.html">← Back to Coverage Report</a>
        </div>

        <h1>${fileName}</h1>

        <div class="summary">
            <div class="summary-title">Coverage Metrics</div>
            <div class="metrics">
                <div class="metric">
                    <div class="metric-label">Statements</div>
                    <div class="metric-value ${getCoverageClass(stats.statements.percentage)}">${stats.statements.percentage.toFixed(2)}%</div>
                    <div class="progress-bar">
                        <div class="progress-fill ${getCoverageClass(stats.statements.percentage)}" style="width: ${stats.statements.percentage}%"></div>
                    </div>
                    <div class="metric-count">${coverage.coveredStatements}/${coverage.statements}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Branches</div>
                    <div class="metric-value ${getCoverageClass(stats.branches.percentage)}">${stats.branches.percentage.toFixed(2)}%</div>
                    <div class="progress-bar">
                        <div class="progress-fill ${getCoverageClass(stats.branches.percentage)}" style="width: ${stats.branches.percentage}%"></div>
                    </div>
                    <div class="metric-count">${coverage.coveredBranches}/${coverage.branches}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Functions</div>
                    <div class="metric-value ${getCoverageClass(stats.functions.percentage)}">${stats.functions.percentage.toFixed(2)}%</div>
                    <div class="progress-bar">
                        <div class="progress-fill ${getCoverageClass(stats.functions.percentage)}" style="width: ${stats.functions.percentage}%"></div>
                    </div>
                    <div class="metric-count">${coverage.coveredFunctions}/${coverage.functions}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Lines</div>
                    <div class="metric-value ${getCoverageClass(stats.lines.percentage)}">${stats.lines.percentage.toFixed(2)}%</div>
                    <div class="progress-bar">
                        <div class="progress-fill ${getCoverageClass(stats.lines.percentage)}" style="width: ${stats.lines.percentage}%"></div>
                    </div>
                    <div class="metric-count">${coverage.coveredLines}/${coverage.lines}</div>
                </div>
            </div>
        </div>

        ${coverage.uncoveredLines && coverage.uncoveredLines.length > 0 ? `
        <div class="summary">
            <div class="summary-title">Uncovered Lines</div>
            <div style="font-size: 13px; color: #f85149;">${formatUncoveredLines(coverage.uncoveredLines)}</div>
        </div>
        ` : ''}

        <div class="code-container">
            <div class="code-header">
                <span>Source Code</span>
                <div class="legend">
                    <div class="legend-item"><div class="legend-box covered"></div><span>Covered</span></div>
                    <div class="legend-item"><div class="legend-box uncovered"></div><span>Uncovered</span></div>
                </div>
            </div>
            <table class="code-table">
                ${sourceLines.map((line, index) => {
                    const lineNumber = index + 1;
                    const isUncovered = uncoveredSet.has(lineNumber);
                    const hasCoverage = coverage.lines > 0;
                    const rowClass = hasCoverage ? (isUncovered ? 'uncovered' : 'covered') : '';
                    return `
                        <tr class="${rowClass}">
                            <td class="line-number">${lineNumber}</td>
                            <td class="line-content">${escapeHtml(line) || ' '}</td>
                        </tr>
                    `;
                }).join('')}
            </table>
        </div>
    </div>
</body>
</html>`;

    writeFileSync(join(reportsDir, safeFileName), fileHtml, 'utf-8');
}