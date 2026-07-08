import { writeFileSync } from '@elitjs/fs';
import { join } from '@elitjs/path';

import { escapeXml, toRelativePath } from './shared';
import { getExecutableLines } from './tracking';
import type { FileCoverage } from './types';

export function generateCoverageFinalJson(
    coverageMap: Map<string, FileCoverage>,
    reportsDir: string
): void {
    const cwd = process.cwd();
    const coverageData: Record<string, { lines: Record<number, number> }> = {};

    for (const [filePath, coverage] of coverageMap.entries()) {
        const relativePath = toRelativePath(cwd, filePath);
        const lineMap: Record<number, number> = {};
        const executableLines = getExecutableLines(filePath);
        const isCovered = coverage.coveredStatements > 0;

        for (const line of executableLines) {
            lineMap[line] = isCovered ? 1 : 0;
        }

        coverageData[relativePath] = { lines: lineMap };
    }

    writeFileSync(join(reportsDir, 'coverage-final.json'), JSON.stringify(coverageData, null, 2), 'utf-8');
}

export function generateCloverXml(
    coverageMap: Map<string, FileCoverage>,
    reportsDir: string
): void {
    const timestamp = Date.now();
    const cwd = process.cwd();

    let totalFiles = 0;
    let totalClasses = 0;
    let totalElements = 0;
    let coveredElements = 0;
    let totalStatements = 0;
    let coveredStatements = 0;
    let totalBranches = 0;
    let coveredBranches = 0;
    let totalFunctions = 0;
    let coveredFunctions = 0;
    let totalLines = 0;
    let coveredLines = 0;

    const coveredClassCount = Array.from(coverageMap.values()).filter((coverage) => coverage.coveredStatements > 0).length;
    const fileEntries: string[] = [];

    for (const [filePath, coverage] of coverageMap.entries()) {
        const relativePath = toRelativePath(cwd, filePath);
        const escapedPath = escapeXml(relativePath);
        const fileElements = coverage.statements + coverage.branches + coverage.functions;
        const fileCoveredElements = coverage.coveredStatements + coverage.coveredBranches + coverage.coveredFunctions;

        totalFiles++;
        totalClasses++;
        totalStatements += coverage.statements;
        coveredStatements += coverage.coveredStatements;
        totalBranches += coverage.branches;
        coveredBranches += coverage.coveredBranches;
        totalFunctions += coverage.functions;
        coveredFunctions += coverage.coveredFunctions;
        totalLines += coverage.lines;
        coveredLines += coverage.coveredLines;
        totalElements += fileElements;
        coveredElements += fileCoveredElements;

        fileEntries.push(`
    <file name="${escapedPath}">
      <class name="${escapedPath}">
        <metrics complexity="0" elements="${fileElements}" coveredelements="${fileCoveredElements}"
                 methods="${coverage.functions}" coveredmethods="${coverage.coveredFunctions}"
                 statements="${coverage.statements}" coveredstatements="${coverage.coveredStatements}" />
      </class>
      <line num="1" type="stmt" count="${coverage.coveredStatements > 0 ? 1 : 0}" />
    </file>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<coverage generated="${timestamp}" clover="3.2.0">
  <project timestamp="${timestamp}" name="Coverage">
    <metrics complexity="0" elements="${totalElements}" coveredelements="${coveredElements}"
             conditionals="${totalBranches}" coveredconditionals="${coveredBranches}"
             statements="${totalStatements}" coveredstatements="${coveredStatements}"
             methods="${totalFunctions}" coveredmethods="${coveredFunctions}"
             classes="${totalClasses}" coveredclasses="${coveredClassCount}"
             files="${totalFiles}" loc="${totalLines}" ncloc="${totalLines - coveredLines}"
             packages="${totalFiles}" classes="${totalClasses}" />
    <package name="root">
      <metrics complexity="0" elements="${totalElements}" coveredelements="${coveredElements}"
               conditionals="${totalBranches}" coveredconditionals="${coveredBranches}"
               statements="${totalStatements}" coveredstatements="${coveredStatements}"
               methods="${totalFunctions}" coveredmethods="${coveredFunctions}"
               classes="${totalClasses}" coveredclasses="${coveredClassCount}"
               files="${totalFiles}" loc="${totalLines}" ncloc="${totalLines - coveredLines}" />
${fileEntries.join('')}
    </package>
  </project>
</coverage>`;

    writeFileSync(join(reportsDir, 'clover.xml'), xml, 'utf-8');
}