import { writeFileSync } from '@elitjs/fs';

import type { TestResult } from '../runtime';
import type { TestReporterLifecycle } from '../test/reporter-factory';

function escapeXml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Writes a JUnit XML report (default ./junit.xml) — the format CI systems
 * (GitHub Actions, GitLab, Jenkins, …) consume natively.
 */
export class JUnitReporter implements TestReporterLifecycle {
    constructor(private readonly outputPath: string = 'junit.xml') {}

    onRunEnd(results: TestResult[]): void {
        const total = results.length;
        const failures = results.filter((result) => result.status === 'fail').length;
        const duration = results.reduce((sum, result) => sum + result.duration, 0);

        const cases = results
            .map((result) => {
                const title = result.suite ? `${result.suite} > ${result.name}` : result.name;
                const attributes = [
                    `classname="${escapeXml(result.file ?? '')}"`,
                    `name="${escapeXml(title)}"`,
                    `time="${(result.duration / 1000).toFixed(3)}"`,
                ].join(' ');

                if (result.status === 'fail') {
                    const message = escapeXml(result.error?.message ?? 'failed');
                    return `    <testcase ${attributes}><failure message="${message}">${escapeXml(result.error?.stack ?? '')}</failure></testcase>`;
                }
                if (result.status === 'skip' || result.status === 'todo') {
                    return `    <testcase ${attributes}><skipped/></testcase>`;
                }
                return `    <testcase ${attributes} />`;
            })
            .join('\n');

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="elit-test" tests="${total}" failures="${failures}" time="${(duration / 1000).toFixed(3)}">
  <testsuite name="elit" tests="${total}" failures="${failures}" time="${(duration / 1000).toFixed(3)}">
${cases}
  </testsuite>
</testsuites>
`;

        writeFileSync(this.outputPath, xml);
        console.log(`\n JUnit report written to ${this.outputPath}\n`);
    }
}
