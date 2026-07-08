import type { TestResult } from '../runtime';

import type { TestOptions } from './types';

type CoverageOptions = NonNullable<TestOptions['coverage']>;

export async function generateCoverage(options: CoverageOptions, testResults?: TestResult[]) {
    const {
        processCoverage,
        generateTextReport,
        generateHtmlReport,
        generateCoverageFinalJson,
        generateCloverXml,
    } = await import('../coverage');

    const { getCoveredFiles } = await import('../runtime');
    const coveredFilesForCoverage = getCoveredFiles();

    const coverageMap = await processCoverage({
        reportsDirectory: './coverage',
        include: options.include || ['**/*.ts', '**/*.js'],
        exclude: options.exclude || ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**'],
        reporter: options.reporter || ['text', 'html'],
        coveredFiles: coveredFilesForCoverage,
    });

    const reporters = options.reporter || ['text', 'html'];
    if (reporters.includes('text')) {
        console.log('\n' + generateTextReport(coverageMap, testResults));
    }

    if (reporters.includes('html')) {
        generateHtmlReport(coverageMap, './coverage');
        console.log('\n Coverage report: coverage/index.html\n');
    }

    if (reporters.includes('coverage-final.json')) {
        generateCoverageFinalJson(coverageMap, './coverage');
        console.log('\n Coverage report: coverage/coverage-final.json\n');
    }

    if (reporters.includes('clover')) {
        generateCloverXml(coverageMap, './coverage');
        console.log('\n Coverage report: coverage/clover.xml\n');
    }
}