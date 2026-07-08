import type { TestResult } from '../runtime';

import { colorize, type ReporterColor } from './colors';

export class DotReporter {
    private passed = 0;
    private failed = 0;
    private skipped = 0;
    private todo = 0;
    private lineLength = 0;

    onRunStart(files: string[]) {
        console.log(`\n  ${files.length} test files\n`);
    }

    onTestResult(result: TestResult) {
        const symbol = result.status === 'pass' ? '.' :
            result.status === 'fail' ? this.c('red', 'F') :
                result.status === 'skip' ? this.c('yellow', 'o') :
                    this.c('cyan', 'o');

        process.stdout.write(symbol);
        this.lineLength++;

        if (result.status === 'pass') this.passed++;
        else if (result.status === 'fail') this.failed++;
        else if (result.status === 'skip') this.skipped++;
        else if (result.status === 'todo') this.todo++;

        if (this.lineLength >= 50) {
            process.stdout.write('\n    ');
            this.lineLength = 0;
        }
    }

    onRunEnd(_results: TestResult[]) {
        console.log(`\n\n  ${this.c('green', this.passed + ' passed')} ${this.c('dim', '·')} ${this.c('red', this.failed + ' failed')} ${this.c('dim', '·')} ${this.c('yellow', this.skipped + ' skipped')}\n`);
    }

    private c(color: ReporterColor, text: string): string {
        return colorize(color, text);
    }
}