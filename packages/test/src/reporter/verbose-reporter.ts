import type { TestResult } from '../runtime';

import { colors } from './colors';

export class VerboseReporter {
    private currentSuite: string = '';

    onRunStart(_files: string[]) {
        console.log(`\n${colors.cyan}Running tests${colors.reset}\n`);
    }

    onTestResult(result: TestResult) {
        if (result.suite !== this.currentSuite) {
            this.currentSuite = result.suite;
            console.log(`\n${colors.dim}${result.suite}${colors.reset}`);
        }

        const icon = result.status === 'pass' ? colors.green + '  ✓' :
            result.status === 'fail' ? colors.red + '  ✕' :
                result.status === 'skip' ? colors.yellow + '  ⊘' :
                    colors.cyan + '  ○';

        console.log(`${icon}${colors.reset} ${result.name}${colors.dim} (${result.duration}ms)${colors.reset}`);

        if (result.status === 'fail' && result.error) {
            console.log(`\n${colors.red}    ${result.error.message}${colors.reset}`);
            if (result.error.stack) {
                const lines = result.error.stack.split('\n').slice(1, 4);
                lines.forEach((line) => console.log(`${colors.dim}    ${line}${colors.reset}`));
            }
        }
    }

    onRunEnd(results: TestResult[]) {
        const passed = results.filter((result) => result.status === 'pass').length;
        const failed = results.filter((result) => result.status === 'fail').length;
        const skipped = results.filter((result) => result.status === 'skip').length;

        console.log(`\n${colors.dim}${'─'.repeat(50)}${colors.reset}\n`);

        if (failed === 0) {
            console.log(`${colors.green}All tests passed!${colors.reset}`);
            console.log(`${colors.dim}${passed} tests${colors.reset}\n`);
            return;
        }

        console.log(`${colors.red}${failed} tests failed${colors.reset}`);
        console.log(`${colors.green}${passed} tests passed${colors.reset}`);
        if (skipped > 0) {
            console.log(`${colors.yellow}${skipped} tests skipped${colors.reset}`);
        }
        console.log('');
    }
}