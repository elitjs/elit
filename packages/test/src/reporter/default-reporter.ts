import type { TestResult } from '../runtime';
import { relative } from '@elitjs/path';

import { colorize, type ReporterColor } from './colors';
import { buildSuggestion } from './suggestions';
import type { TestReporterOptions } from './types';

export class TestReporter {
    private options: TestReporterOptions;
    private startTime: number = 0;
    private currentFile: string | undefined = undefined;
    private fileTestCount: number = 0;
    private totalFiles: number = 0;

    constructor(options: TestReporterOptions = {}) {
        this.options = {
            verbose: false,
            colors: true,
            ...options,
        };
    }

    private c(color: ReporterColor, text: string): string {
        return colorize(color, text, this.options.colors !== false);
    }

    onRunStart(files: string[]) {
        this.startTime = Date.now();
        this.totalFiles = files.length;
        console.log(`\n${this.c('bold', 'Test Files')}:  ${files.length}`);
        console.log(`${this.c('dim', '─'.repeat(50))}\n`);
    }

    onTestResult(result: TestResult) {
        const filePath = result.file
            ? relative(process.cwd(), result.file).split('\\').join('/')
            : undefined;

        if (filePath !== this.currentFile) {
            if (this.currentFile && this.fileTestCount > 0) {
                console.log('');
            }

            this.currentFile = filePath;
            this.fileTestCount = 0;

            if (filePath) {
                console.log(`${this.c('cyan', '●')} ${this.c('bold', filePath)}`);
                console.log(`${this.c('dim', '┄'.repeat(50))}`);
            }
        }

        this.fileTestCount++;

        if (result.status === 'pass') {
            console.log(`  ${this.c('green', '✓')} ${this.c('dim', result.suite + ' > ')}${result.name} ${this.c('dim', `(${result.duration}ms)`)}`);
            return;
        }

        if (result.status === 'fail') {
            console.log(`  ${this.c('red', '✕')} ${this.c('dim', result.suite + ' > ')}${result.name}`);

            if (!result.error) {
                return;
            }

            if (result.file) {
                const relativePath = relative(process.cwd(), result.file).split('\\').join('/');
                const lineSuffix = result.lineNumber ? `:${result.lineNumber}` : '';
                console.log(`    ${this.c('cyan', `📄 ${relativePath}${lineSuffix}`)}`);
            }

            for (const line of result.error.message.split('\n')) {
                if (line.includes('Expected:')) {
                    console.log(`    ${this.c('green', 'Expected:')} ${line.trim().replace('Expected:', '').trim()}`);
                } else if (line.includes('Received:')) {
                    console.log(`    ${this.c('red', 'Received:')} ${line.trim().replace('Received:', '').trim()}`);
                } else {
                    console.log(`    ${this.c('red', line.trim())}`);
                }
            }

            if (result.codeSnippet) {
                const suggestion = buildSuggestion(result.codeSnippet, result.error.message || '');
                console.log(`    ${this.c('dim', 'Code:')}`);
                console.log(`    ${this.c('dim', result.codeSnippet)}`);
                if (suggestion && suggestion !== result.codeSnippet) {
                    console.log(`    ${this.c('yellow', 'example →')} ${this.c('green', suggestion)}`);
                }
            }

            if (this.options.verbose && result.error.stack) {
                const stack = result.error.stack.split('\n').slice(1, 3).join('\n');
                console.log(`    ${this.c('dim', stack)}`);
            }

            return;
        }

        if (result.status === 'skip') {
            console.log(`  ${this.c('yellow', '○')} ${this.c('dim', result.suite + ' > ')}${result.name} ${this.c('yellow', '(skipped)')}`);
            return;
        }

        console.log(`  ${this.c('cyan', '○')} ${this.c('dim', result.suite + ' > ')}${result.name} ${this.c('cyan', '(todo)')}`);
    }

    onRunEnd(results: TestResult[]) {
        const duration = Date.now() - this.startTime;
        const passed = results.filter((result) => result.status === 'pass').length;
        const failed = results.filter((result) => result.status === 'fail').length;
        const skipped = results.filter((result) => result.status === 'skip').length;
        const total = results.length;

        if (this.currentFile && this.fileTestCount > 0) {
            console.log('');
        }

        console.log(`${this.c('dim', '─'.repeat(50))}`);
        console.log('');
        console.log(`${this.c('bold', 'Test Suites:')} ${this.c('green', `${this.totalFiles} passed`)}${this.c('dim', `, ${this.totalFiles} total`)}`);
        console.log(`${this.c('bold', 'Tests:')}       ${this.c('green', `${passed} passed`)}${failed > 0 ? `, ${this.c('red', `${failed} failed`)}` : ''}${skipped > 0 ? `, ${this.c('yellow', `${skipped} skipped`)}` : ''}${this.c('dim', `, ${total} total`)}`);
        console.log(`${this.c('bold', 'Snapshots:')}   ${this.c('dim', '0 total')}`);
        console.log(`${this.c('bold', 'Time:')}        ${this.c('dim', `${(duration / 1000).toFixed(2)}s`)}`);
        console.log('');
    }
}