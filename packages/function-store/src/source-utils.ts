import type { DeclarationKind, DeclarationMatch, UpdateValue } from './types';

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findMatchingBlockEnd(source: string, openIndex: number): number {
    let depth = 0;
    let stringChar: string | null = null;

    for (let index = openIndex; index < source.length; index += 1) {
        const char = source[index];
        const nextChar = source[index + 1];

        if (stringChar) {
            if (char === '\\') {
                index += 1;
                continue;
            }

            if (char === stringChar) {
                stringChar = null;
            }
            continue;
        }

        if (char === '/' && nextChar === '/') {
            index += 2;
            while (index < source.length && source[index] !== '\n') {
                index += 1;
            }
            continue;
        }

        if (char === '/' && nextChar === '*') {
            index += 2;
            while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) {
                index += 1;
            }
            index += 1;
            continue;
        }

        if (char === '"' || char === "'" || char === '`') {
            stringChar = char;
            continue;
        }

        if (char === '{') {
            depth += 1;
        } else if (char === '}') {
            depth -= 1;
            if (depth === 0) {
                return index;
            }
        }
    }

    return source.length - 1;
}

function findInitializerEnd(source: string, startIndex: number): number {
    let braceDepth = 0;
    let bracketDepth = 0;
    let parenDepth = 0;
    let stringChar: string | null = null;

    for (let index = startIndex; index < source.length; index += 1) {
        const char = source[index];
        const nextChar = source[index + 1];

        if (stringChar) {
            if (char === '\\') {
                index += 1;
                continue;
            }

            if (char === stringChar) {
                stringChar = null;
            }
            continue;
        }

        if (char === '/' && nextChar === '/') {
            index += 2;
            while (index < source.length && source[index] !== '\n') {
                index += 1;
            }
            continue;
        }

        if (char === '/' && nextChar === '*') {
            index += 2;
            while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) {
                index += 1;
            }
            index += 1;
            continue;
        }

        if (char === '"' || char === "'" || char === '`') {
            stringChar = char;
            continue;
        }

        if (char === '{') {
            braceDepth += 1;
        } else if (char === '}') {
            braceDepth = Math.max(0, braceDepth - 1);
        } else if (char === '[') {
            bracketDepth += 1;
        } else if (char === ']') {
            bracketDepth = Math.max(0, bracketDepth - 1);
        } else if (char === '(') {
            parenDepth += 1;
        } else if (char === ')') {
            parenDepth = Math.max(0, parenDepth - 1);
        } else if (char === ';' && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
            return index;
        }
    }

    return source.length;
}

function looksLikeDeclarationSnippet(source: string): boolean {
    const trimmed = source.trim();
    return /^(?:export\s+)?(?:async\s+function\b|function\b|class\b|(?:const|let|var)\b)/.test(trimmed);
}

function replaceExistingBindingValue(source: string, bindingName: string, serializedValue: string): string | null {
    const escapedName = escapeRegExp(bindingName);
    const declarationRegex = new RegExp(`(?:export\\s+)?(?:const|let|var)\\s+${escapedName}(?:\\s*:\\s*[^=;]+)?\\s*=`, 'm');
    const declarationMatch = declarationRegex.exec(source);

    if (!declarationMatch || declarationMatch.index === undefined) {
        return null;
    }

    const equalsIndex = source.indexOf('=', declarationMatch.index);
    if (equalsIndex === -1) {
        return null;
    }

    const initializerEnd = findInitializerEnd(source, equalsIndex + 1);
    const suffix = initializerEnd < source.length
        ? source.slice(initializerEnd)
        : ';';

    return `${source.slice(0, equalsIndex + 1)} ${serializedValue}${suffix}`;
}

function toInitializerSource(code: UpdateValue): string {
    if (typeof code === 'function') {
        return code.toString().trim();
    }

    if (typeof code === 'string') {
        const trimmed = code.trim();
        if (
            looksLikeDeclarationSnippet(trimmed) ||
            /=>/.test(trimmed) ||
            /^(?:\{|\[|\(|"|'|`|\d|-\d|true\b|false\b|null\b|undefined\b|new\b|await\b)/.test(trimmed)
        ) {
            return trimmed;
        }

        return valueToCode(code, 0);
    }

    return valueToCode(code, 0);
}

function shouldUseDeclarationSource(code: UpdateValue): code is string | Function {
    return typeof code === 'function' || (typeof code === 'string' && looksLikeDeclarationSnippet(code));
}

function normalizeFunctionDeclaration(name: string, code: string): string {
    const trimmed = code.trim().replace(/^export\s+/, '');

    if (/^async\s+function\s+[A-Za-z_$][\w$]*/.test(trimmed)) {
        return trimmed.replace(/^async\s+function\s+[A-Za-z_$][\w$]*/, `async function ${name}`);
    }

    if (/^async\s+function\s*\(/.test(trimmed)) {
        return trimmed.replace(/^async\s+function\s*\(/, `async function ${name}(`);
    }

    if (/^function\s+[A-Za-z_$][\w$]*/.test(trimmed)) {
        return trimmed.replace(/^function\s+[A-Za-z_$][\w$]*/, `function ${name}`);
    }

    if (/^function\s*\(/.test(trimmed)) {
        return trimmed.replace(/^function\s*\(/, `function ${name}(`);
    }

    return `function ${name}() {\n${trimmed}\n}`;
}

function normalizeClassDeclaration(name: string, code: string): string {
    const trimmed = code.trim().replace(/^export\s+/, '');

    if (/^class\s+[A-Za-z_$][\w$]*/.test(trimmed)) {
        return trimmed.replace(/^class\s+[A-Za-z_$][\w$]*/, `class ${name}`);
    }

    if (/^class(?:\s+extends\b|\s*\{)/.test(trimmed)) {
        return trimmed.replace(/^class/, `class ${name}`);
    }

    return `class ${name} ${trimmed}`;
}

function findDeclaration(source: string, name: string): DeclarationMatch | null {
    const escaped = escapeRegExp(name);
    const matches: DeclarationMatch[] = [];

    const valueRegex = new RegExp(`(?:export\\s+)?(?:const|let|var)\\s+${escaped}(?:\\s*:\\s*[^=;]+)?\\s*=`, 'm');
    const valueMatch = valueRegex.exec(source);
    if (valueMatch && valueMatch.index !== undefined) {
        const equalsIndex = source.indexOf('=', valueMatch.index);
        if (equalsIndex !== -1) {
            const initializerEnd = findInitializerEnd(source, equalsIndex + 1);
            const end = initializerEnd < source.length && source[initializerEnd] === ';'
                ? initializerEnd + 1
                : initializerEnd;
            matches.push({
                kind: 'valueDecl',
                start: valueMatch.index,
                end,
                exported: /^\s*export\b/.test(valueMatch[0]),
                prefixEnd: equalsIndex + 1,
            });
        }
    }

    const functionRegex = new RegExp(`(?:export\\s+)?(?:async\\s+)?function\\s+${escaped}\\s*\\(`, 'm');
    const functionMatch = functionRegex.exec(source);
    if (functionMatch && functionMatch.index !== undefined) {
        const braceOpen = source.indexOf('{', functionMatch.index);
        if (braceOpen !== -1) {
            const braceClose = findMatchingBlockEnd(source, braceOpen);
            const end = braceClose + 1 < source.length && source[braceClose + 1] === ';'
                ? braceClose + 2
                : braceClose + 1;
            matches.push({
                kind: 'functionDecl',
                start: functionMatch.index,
                end,
                exported: /^\s*export\b/.test(functionMatch[0]),
            });
        }
    }

    const classRegex = new RegExp(`(?:export\\s+)?class\\s+${escaped}(?=\\s|\\{)`, 'm');
    const classMatch = classRegex.exec(source);
    if (classMatch && classMatch.index !== undefined) {
        const braceOpen = source.indexOf('{', classMatch.index);
        if (braceOpen !== -1) {
            const braceClose = findMatchingBlockEnd(source, braceOpen);
            const end = braceClose + 1 < source.length && source[braceClose + 1] === ';'
                ? braceClose + 2
                : braceClose + 1;
            matches.push({
                kind: 'classDecl',
                start: classMatch.index,
                end,
                exported: /^\s*export\b/.test(classMatch[0]),
            });
        }
    }

    if (matches.length === 0) {
        return null;
    }

    matches.sort((left, right) => left.start - right.start);
    return matches[0];
}

function createStructuredReplacement(kind: Extract<DeclarationKind, 'functionDecl' | 'classDecl'>, name: string, code: UpdateValue): string {
    if (!shouldUseDeclarationSource(code)) {
        return `const ${name} = ${toInitializerSource(code)};`;
    }

    const source = code.toString();
    return kind === 'functionDecl'
        ? normalizeFunctionDeclaration(name, source)
        : normalizeClassDeclaration(name, source);
}

function createDeclarationSnippet(name: string, code: UpdateValue): string {
    if (typeof code === 'function') {
        const fnSource = code.toString().trim();
        if (/^(?:async\s+)?function\b/.test(fnSource)) {
            return `export ${normalizeFunctionDeclaration(name, fnSource)}`;
        }

        if (/^class\b/.test(fnSource)) {
            return `export ${normalizeClassDeclaration(name, fnSource)}`;
        }

        return `export const ${name} = ${fnSource};`;
    }

    if (typeof code === 'string') {
        const trimmed = code.trim();
        if (looksLikeDeclarationSnippet(trimmed)) {
            return trimmed;
        }
    }

    return `export const ${name} = ${toInitializerSource(code)};`;
}

function valueToCode(val: any, depth: number = 0): string {
    const indentUnit = '    ';
    const indent = indentUnit.repeat(depth);
    const indentInner = indentUnit.repeat(depth + 1);

    if (val === null) return 'null';
    const t = typeof val;
    if (t === 'string') return JSON.stringify(val);
    if (t === 'number' || t === 'boolean') return String(val);
    if (t === 'function') return val.toString();
    if (Array.isArray(val)) {
        if (val.length === 0) return '[]';
        const items = val.map((v) => valueToCode(v, depth + 1));
        return (
            '[\n' +
            items.map((it) => indentInner + it).join(',\n') +
            '\n' +
            indent +
            ']'
        );
    }
    if (t === 'object') {
        const keys = Object.keys(val);
        if (keys.length === 0) return '{}';
        const entries = keys.map((k) => {
            const keyPart = isIdentifier(k) ? k : JSON.stringify(k);
            const v = valueToCode(val[k], depth + 1);
            return indentInner + keyPart + ': ' + v;
        });
        return '{\n' + entries.join(',\n') + '\n' + indent + '}';
    }
    return String(val);
}

function isIdentifier(key: any) {
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key);
}

export function buildDatabaseModuleSource(dbName: string, code: unknown, existingSource?: string): string {
    if (typeof code === 'string') {
        return code;
    }

    if (typeof code === 'function') {
        return code.toString();
    }

    const serializedValue = valueToCode(code, 0);

    if (existingSource && isIdentifier(dbName)) {
        const updatedSource = replaceExistingBindingValue(existingSource, dbName, serializedValue);

        if (updatedSource) {
            return updatedSource;
        }
    }

    if (isIdentifier(dbName)) {
        return `const ${dbName} = ${serializedValue};\n\nexport { ${dbName} };\nexport default ${dbName};\n`;
    }

    return `const value = ${serializedValue};\n\nexport default value;\n`;
}

export function removeDatabaseModuleEntry(source: string, fnName: string): string {
    let nextSource = source;
    const escaped = fnName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

    const startRe = new RegExp(
        `function\\s+${escaped}\\s*\\(|\\bclass\\s+${escaped}\\b|\\b(?:const|let|var)\\s+${escaped}\\s*=\\s*(?:function\\b|class\\b|\\(|\\{|\\[)`,
        'm',
    );

    const startMatch = nextSource.match(startRe);

    if (startMatch && startMatch.index !== undefined) {
        const startIdx = startMatch.index;
        const len = nextSource.length;
        const idxCurly = nextSource.indexOf('{', startIdx);
        const idxBracket = nextSource.indexOf('[', startIdx);
        let braceOpen = -1;
        if (idxCurly === -1) braceOpen = idxBracket;
        else if (idxBracket === -1) braceOpen = idxCurly;
        else braceOpen = Math.min(idxCurly, idxBracket);

        if (braceOpen !== -1) {
            const openingChar = nextSource[braceOpen];
            const closingChar = openingChar === '[' ? ']' : '}';
            let index = braceOpen + 1;
            let depth = 1;
            while (index < len && depth > 0) {
                const char = nextSource[index];
                if (char === openingChar) depth += 1;
                else if (char === closingChar) depth -= 1;
                index += 1;
            }
            const braceClose = index;
            let endIdx = braceClose;
            if (nextSource.slice(braceClose, braceClose + 1) === ';') {
                endIdx = braceClose + 1;
            }

            const before = nextSource.slice(0, startIdx);
            const after = nextSource.slice(endIdx);
            nextSource = before + after;
        } else {
            const semi = nextSource.indexOf(';', startIdx);
            let endIdx = semi !== -1 ? semi + 1 : nextSource.indexOf('\n\n', startIdx);
            if (endIdx === -1) endIdx = len;
            nextSource = nextSource.slice(0, startIdx) + nextSource.slice(endIdx);
        }
    }

    const exportRe = new RegExp(
        `export\\s+const\\s+${escaped}\\s*:\\s*any\\s*=\\s*${escaped}\\s*;?`,
        'g',
    );
    nextSource = nextSource.replace(exportRe, '');

    return nextSource.replace(/\n{3,}/g, '\n\n');
}

export function updateDatabaseModuleSource(source: string, fnName: string, code: UpdateValue): { source: string; changed: boolean } {
    let nextSource = source;
    const declaration = findDeclaration(nextSource, fnName);

    if (declaration) {
        if (declaration.kind === 'valueDecl' && declaration.prefixEnd !== undefined) {
            const initializer = toInitializerSource(code);
            nextSource =
                nextSource.slice(0, declaration.start) +
                nextSource.slice(declaration.start, declaration.prefixEnd) +
                ` ${initializer};` +
                nextSource.slice(declaration.end);
        } else if (declaration.kind === 'functionDecl') {
            const replacement = createStructuredReplacement('functionDecl', fnName, code);
            nextSource =
                nextSource.slice(0, declaration.start) +
                `${declaration.exported ? 'export ' : ''}${replacement.replace(/^export\s+/, '')}` +
                nextSource.slice(declaration.end);
        } else {
            const replacement = createStructuredReplacement('classDecl', fnName, code);
            nextSource =
                nextSource.slice(0, declaration.start) +
                `${declaration.exported ? 'export ' : ''}${replacement.replace(/^export\s+/, '')}` +
                nextSource.slice(declaration.end);
        }
    } else {
        const snippet = createDeclarationSnippet(fnName, code);
        const separator = nextSource.trim().length > 0 ? '\n\n' : '';
        nextSource = `${nextSource.trimEnd()}${separator}${snippet}\n`;
    }

    return {
        source: nextSource,
        changed: nextSource !== source,
    };
}