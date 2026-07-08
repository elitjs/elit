import { readFileSync } from '@elitjs/fs';

import { runtimeState } from './state';

function getAssertionMethod(stack: string): string | undefined {
    const assertionMatch = stack.match(/at _?Expect\.(\w+)/);
    return assertionMatch ? assertionMatch[1] : undefined;
}

function getTargetPattern(assertionMethod: string | undefined): string {
    if (assertionMethod === 'toEqual') return '.toEqual(';
    if (assertionMethod === 'toStrictEqual') return '.toStrictEqual(';
    if (assertionMethod === 'toMatch') return '.toMatch(';
    if (assertionMethod === 'toContain') return '.toContain(';
    if (assertionMethod === 'toHaveLength') return '.toHaveLength(';
    if (assertionMethod === 'toBeDefined') return '.toBeDefined(';
    if (assertionMethod === 'toBeNull') return '.toBeNull(';
    if (assertionMethod === 'toBeUndefined') return '.toBeUndefined(';
    if (assertionMethod === 'toBeTruthy') return '.toBeTruthy(';
    if (assertionMethod === 'toBeFalsy') return '.toBeFalsy(';
    if (assertionMethod === 'toThrow') return '.toThrow(';
    if (assertionMethod === 'toBeGreaterThan') return '.toBeGreaterThan(';
    if (assertionMethod === 'toBeGreaterThanOrEqual') return '.toBeGreaterThanOrEqual(';
    if (assertionMethod === 'toBeLessThan') return '.toBeLessThan(';
    if (assertionMethod === 'toBeLessThanOrEqual') return '.toBeLessThanOrEqual(';
    return '.toBe(';
}

function readSourceLines(filePath: string): string[] | undefined {
    try {
        let sourceCode = readFileSync(filePath, 'utf-8');
        if (Buffer.isBuffer(sourceCode)) {
            sourceCode = sourceCode.toString('utf-8');
        }
        return (sourceCode as string).split('\n');
    } catch {
        return undefined;
    }
}

function resolveMappedLine(lineNumber: number, sourceLines: string[], assertionMethod: string | undefined): number {
    const targetPattern = getTargetPattern(assertionMethod);

    if (lineNumber <= 0 || lineNumber > sourceLines.length) {
        return lineNumber;
    }

    if (sourceLines[lineNumber - 1].includes(targetPattern)) {
        return lineNumber;
    }

    for (let index = 1; index <= 3; index++) {
        const searchLine = lineNumber - index;
        if (searchLine > 0 && searchLine <= sourceLines.length && sourceLines[searchLine - 1].includes(targetPattern)) {
            return searchLine;
        }
    }

    return lineNumber;
}

export function resolveAssertionContext(stack: string | undefined): { lineNumber?: number; codeSnippet?: string } {
    if (!stack) {
        return {};
    }

    const assertionMethod = getAssertionMethod(stack);
    const stackFrames: Array<{ line: number; column: number }> = [];

    for (const line of stack.split('\n')) {
        const match = line.match(/<anonymous>:([0-9]+):([0-9]+)/);
        if (match) {
            stackFrames.push({
                line: parseInt(match[1], 10),
                column: parseInt(match[2], 10),
            });
        }
    }

    const targetFrame = stackFrames.length > 1 ? stackFrames[1] : stackFrames[0];
    let lineNumber: number | undefined;

    if (targetFrame && runtimeState.currentSourceMapConsumer) {
        try {
            const transpiledLine = targetFrame.line - runtimeState.wrapperLineOffset;
            const originalPosition = runtimeState.currentSourceMapConsumer.originalPositionFor({
                line: transpiledLine,
                column: targetFrame.column,
            });

            if (originalPosition.line !== null) {
                lineNumber = originalPosition.line;
            } else {
                const posWithoutColumn = runtimeState.currentSourceMapConsumer.originalPositionFor({
                    line: transpiledLine,
                    column: 0,
                });

                if (posWithoutColumn.line !== null) {
                    lineNumber = posWithoutColumn.line;
                } else {
                    const lineMappings: Array<{ line: number; distance: number }> = [];

                    runtimeState.currentSourceMapConsumer.eachMapping((mapping) => {
                        if (mapping.originalLine !== null) {
                            lineMappings.push({
                                line: mapping.originalLine,
                                distance: Math.abs(mapping.generatedLine - transpiledLine),
                            });
                        }
                    });

                    if (lineMappings.length > 0) {
                        lineMappings.sort((left, right) => left.distance - right.distance);
                        lineNumber = lineMappings[0].line;
                    }
                }
            }
        } catch {
        }
    }

    if (!runtimeState.currentTestFile || !lineNumber) {
        return { lineNumber };
    }

    const sourceLines = readSourceLines(runtimeState.currentTestFile);
    if (!sourceLines) {
        return { lineNumber };
    }

    lineNumber = resolveMappedLine(lineNumber, sourceLines, assertionMethod);
    const codeLine = lineNumber > 0 && lineNumber <= sourceLines.length ? sourceLines[lineNumber - 1] : undefined;

    return {
        lineNumber,
        codeSnippet: codeLine ? codeLine.trim() : undefined,
    };
}