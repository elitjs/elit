function extractArg(code: string, functionName: string): string | null {
    const searchString = `.${functionName}(`;
    const startIndex = code.indexOf(searchString);
    if (startIndex === -1) return null;

    let parenCount = 0;
    let inString = false;
    let stringChar = '';
    const argumentStart = startIndex + searchString.length;

    for (let index = argumentStart; index < code.length; index++) {
        const char = code[index];

        if (!inString) {
            if (char === '(') {
                parenCount++;
            } else if (char === ')') {
                parenCount--;
                if (parenCount < 0) {
                    return code.slice(argumentStart, index);
                }
            } else if (char === '"' || char === '\'' || char === '`') {
                inString = true;
                stringChar = char;
            }
        } else if (char === '\\' && index + 1 < code.length) {
            index++;
        } else if (char === stringChar) {
            inString = false;
        }
    }

    return null;
}

function extractReceivedValue(errorMessage: string): string | null {
    const receivedIndex = errorMessage.indexOf('Received:');
    if (receivedIndex === -1) return null;

    const afterReceived = errorMessage.slice(receivedIndex + 9).trimStart();
    const newlineIndex = afterReceived.indexOf('\n');
    if (newlineIndex !== -1) {
        return afterReceived.slice(0, newlineIndex).trimEnd();
    }

    return afterReceived.trimEnd();
}

function parseQuotedString(value: string): { quote: string; content: string } | null {
    if (value.length < 2) return null;

    const firstChar = value[0];
    const lastChar = value[value.length - 1];

    if ((firstChar === '"' || firstChar === '\'' || firstChar === '`') && firstChar === lastChar) {
        return {
            quote: firstChar,
            content: value.slice(1, -1),
        };
    }

    return null;
}

function stripQuotes(value: string): string {
    if (value.length < 2) return value;

    const firstChar = value[0];
    const lastChar = value[value.length - 1];

    if ((firstChar === '"' || firstChar === '\'' || firstChar === '`') && firstChar === lastChar) {
        return value.slice(1, -1);
    }

    return value;
}

export function buildSuggestion(code: string, errorMessage: string): string {
    const receivedValue = extractReceivedValue(errorMessage);

    if (code.includes('.toBeGreaterThanOrEqual(')) {
        const currentValue = extractArg(code, 'toBeGreaterThanOrEqual');
        if (currentValue && receivedValue) {
            const actualValue = Number(receivedValue);
            if (!Number.isNaN(actualValue)) {
                return code.replace(
                    `.toBeGreaterThanOrEqual(${currentValue})`,
                    `.toBeGreaterThanOrEqual(${actualValue})`
                );
            }
        }
    } else if (code.includes('.toBeGreaterThan(')) {
        const currentValue = extractArg(code, 'toBeGreaterThan');
        if (currentValue && receivedValue) {
            const actualValue = Number(receivedValue);
            if (!Number.isNaN(actualValue)) {
                return code.replace(
                    `.toBeGreaterThan(${currentValue})`,
                    `.toBeGreaterThan(${actualValue - 1})`
                );
            }
        }
    } else if (code.includes('.toBeLessThanOrEqual(')) {
        const currentValue = extractArg(code, 'toBeLessThanOrEqual');
        if (currentValue && receivedValue) {
            const actualValue = Number(receivedValue);
            if (!Number.isNaN(actualValue)) {
                return code.replace(
                    `.toBeLessThanOrEqual(${currentValue})`,
                    `.toBeLessThanOrEqual(${actualValue})`
                );
            }
        }
    } else if (code.includes('.toBeLessThan(')) {
        const currentValue = extractArg(code, 'toBeLessThan');
        if (currentValue && receivedValue) {
            const actualValue = Number(receivedValue);
            if (!Number.isNaN(actualValue)) {
                return code.replace(
                    `.toBeLessThan(${currentValue})`,
                    `.toBeLessThan(${actualValue + 1})`
                );
            }
        }
    } else if (code.includes('.toStrictEqual(')) {
        const expectedValue = extractArg(code, 'toStrictEqual');
        if (expectedValue && receivedValue) {
            const quoted = parseQuotedString(expectedValue);
            if (quoted) {
                return code.replace(
                    `.toStrictEqual(${expectedValue})`,
                    `.toStrictEqual(${quoted.quote}${stripQuotes(receivedValue)}${quoted.quote})`
                );
            }

            return code.replace(
                `.toStrictEqual(${expectedValue})`,
                `.toStrictEqual(${receivedValue})`
            );
        }
    } else if (code.includes('.toEqual(')) {
        const expectedValue = extractArg(code, 'toEqual');
        if (expectedValue && receivedValue) {
            const quoted = parseQuotedString(expectedValue);
            if (quoted) {
                return code.replace(
                    `.toEqual(${expectedValue})`,
                    `.toEqual(${quoted.quote}${stripQuotes(receivedValue)}${quoted.quote})`
                );
            }

            return code.replace(
                `.toEqual(${expectedValue})`,
                `.toEqual(${receivedValue})`
            );
        }
    } else if (code.includes('.toMatch(')) {
        const expectedPattern = extractArg(code, 'toMatch');
        if (expectedPattern && receivedValue) {
            const quoted = parseQuotedString(expectedPattern);
            if (quoted) {
                return code.replace(
                    `.toMatch(${expectedPattern})`,
                    `.toMatch(${quoted.quote}${stripQuotes(receivedValue)}${quoted.quote})`
                );
            }
        }
    } else if (code.includes('.toContain(')) {
        const expectedValue = extractArg(code, 'toContain');
        if (expectedValue && receivedValue) {
            const quoted = parseQuotedString(expectedValue);
            if (quoted) {
                return code.replace(
                    `.toContain(${expectedValue})`,
                    `.toContain(${quoted.quote}${stripQuotes(receivedValue)}${quoted.quote})`
                );
            }

            return code.replace(
                `.toContain(${expectedValue})`,
                `.toContain(${receivedValue})`
            );
        }
    } else if (code.includes('.toHaveLength(')) {
        const expectedLength = extractArg(code, 'toHaveLength');
        if (expectedLength && receivedValue) {
            const actualLength = Number(receivedValue);
            if (!Number.isNaN(actualLength)) {
                return code.replace(
                    `.toHaveLength(${expectedLength})`,
                    `.toHaveLength(${actualLength})`
                );
            }
        }
    } else if (code.includes('.toBe(')) {
        const expectedValue = extractArg(code, 'toBe');
        if (expectedValue) {
            if (receivedValue) {
                const quoted = parseQuotedString(expectedValue);
                if (quoted) {
                    return code.replace(
                        `.toBe(${expectedValue})`,
                        `.toBe(${quoted.quote}${stripQuotes(receivedValue)}${quoted.quote})`
                    );
                }

                return code.replace(
                    `.toBe(${expectedValue})`,
                    `.toBe(${receivedValue})`
                );
            }

            if (expectedValue.includes('\'') || expectedValue.includes('"')) {
                return code.replace('.toBe(', '.toEqual(');
            }
        }
    } else if (code.includes('.toBeDefined()')) {
        return code.replace('.toBeDefined()', '.toBeTruthy()');
    } else if (code.includes('.toBeNull()')) {
        return code.replace('.toBeNull()', '.toBeUndefined()');
    } else if (code.includes('.toBeUndefined()')) {
        return code.replace('.toBeUndefined()', '.toBeNull()');
    } else if (code.includes('.toBeTruthy()')) {
        return code.replace('.toBeTruthy()', '.toBeDefined()');
    } else if (code.includes('.toBeFalsy()')) {
        return code.replace('.toBeFalsy()', '.toBeUndefined()');
    }

    return '';
}