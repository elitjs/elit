import path from 'node:path';
import * as nodeModule from 'node:module';

import type { StripTypeScriptTypes, VMModuleLoader, VMTranspileOptions, VMTransformResult } from './types';

const stripTypeScriptTypes = typeof (nodeModule as { stripTypeScriptTypes?: unknown }).stripTypeScriptTypes === 'function'
    ? ((nodeModule as { stripTypeScriptTypes: StripTypeScriptTypes }).stripTypeScriptTypes)
    : undefined;

let cachedEsbuildTransformSync:
    | ((code: string, options: { loader?: VMModuleLoader; format?: 'cjs' }) => { code: string })
    | null
    | undefined;

function getEsbuildTransformSync() {
    if (cachedEsbuildTransformSync !== undefined) {
        return cachedEsbuildTransformSync;
    }

    if (typeof nodeModule.createRequire !== 'function') {
        cachedEsbuildTransformSync = null;
        return cachedEsbuildTransformSync;
    }

    try {
        const requireFromApp = nodeModule.createRequire(path.join(process.cwd(), 'package.json'));
        const esbuildModule = requireFromApp('esbuild') as {
            transformSync?: (code: string, options: { loader?: VMModuleLoader; format?: 'cjs' }) => { code: string };
        };

        cachedEsbuildTransformSync = typeof esbuildModule?.transformSync === 'function'
            ? esbuildModule.transformSync.bind(esbuildModule)
            : null;
    } catch {
        cachedEsbuildTransformSync = null;
    }

    return cachedEsbuildTransformSync;
}

function parseModuleBindings(specifiers: string): Array<{ imported: string; local: string }> {
    return specifiers
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
        .map((entry) => {
            const [imported, local] = entry.split(/\s+as\s+/);
            return {
                imported: (imported || '').trim(),
                local: (local || imported || '').trim(),
            };
        })
        .filter((entry) => entry.imported.length > 0 && entry.local.length > 0);
}

function formatNamedImportBindings(specifiers: string): string {
    return parseModuleBindings(specifiers)
        .map(({ imported, local }) => imported === local ? imported : `${imported}: ${local}`)
        .join(', ');
}

function formatNamedExportAssignments(specifiers: string): string {
    return parseModuleBindings(specifiers)
        .map(({ imported, local }) => `module.exports.${local} = ${imported};`)
        .join('\n');
}

function stripTypescriptSource(source: string, filename: string): string {
    if (!stripTypeScriptTypes) {
        throw new Error('TypeScript database execution requires Node.js 22+ or the esbuild package.');
    }

    const originalEmitWarning = process.emitWarning;

    try {
        process.emitWarning = (((warning: string | Error, ...args: any[]) => {
            if (typeof warning === 'string' && warning.includes('stripTypeScriptTypes')) {
                return;
            }

            return (originalEmitWarning as any).call(process, warning, ...args);
        }) as typeof process.emitWarning);

        return stripTypeScriptTypes(source, {
            mode: 'transform',
            sourceUrl: filename,
        });
    } finally {
        process.emitWarning = originalEmitWarning;
    }
}

function isSimpleIdentifier(value: string): boolean {
    return /^[A-Za-z_$][\w$]*$/.test(value);
}

function stripOptionalLineTerminator(value: string): string {
    const trimmed = value.trim();
    return trimmed.endsWith(';')
        ? trimmed.slice(0, -1).trimEnd()
        : trimmed;
}

function parseQuotedModulePath(value: string): string | null {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
        return null;
    }

    const quote = trimmed[0];
    if ((quote !== '"' && quote !== "'") || trimmed[trimmed.length - 1] !== quote) {
        return null;
    }

    return trimmed.slice(1, -1);
}

function getLineIndentation(line: string): string {
    const match = line.match(/^\s*/);
    return match?.[0] ?? '';
}

function rewriteImportLine(
    line: string,
    nextImportBinding: () => string,
    resolveDefaultImport: (bindingName: string) => string,
): string | null {
    const indentation = getLineIndentation(line);
    const trimmed = stripOptionalLineTerminator(line);
    if (!trimmed.startsWith('import ')) {
        return null;
    }

    const importBody = trimmed.slice('import '.length).trim();
    const sideEffectModulePath = parseQuotedModulePath(importBody);
    if (sideEffectModulePath !== null) {
        return `${indentation}require(${JSON.stringify(sideEffectModulePath)});`;
    }

    const fromIndex = importBody.lastIndexOf(' from ');
    if (fromIndex === -1) {
        return null;
    }

    const clause = importBody.slice(0, fromIndex).trim();
    const modulePath = parseQuotedModulePath(importBody.slice(fromIndex + 6));
    if (!clause || modulePath === null) {
        return null;
    }

    const buildDefaultImport = (defaultName: string): { bindingName: string; code: string } | null => {
        if (!isSimpleIdentifier(defaultName)) {
            return null;
        }

        const bindingName = nextImportBinding();
        return {
            bindingName,
            code: [
                `${indentation}const ${bindingName} = require(${JSON.stringify(modulePath)});`,
                `${indentation}const ${defaultName} = ${resolveDefaultImport(bindingName)};`,
            ].join('\n'),
        };
    };

    if (clause.startsWith('* as ')) {
        const namespaceName = clause.slice(5).trim();
        return isSimpleIdentifier(namespaceName)
            ? `${indentation}const ${namespaceName} = require(${JSON.stringify(modulePath)});`
            : null;
    }

    if (clause.startsWith('{') && clause.endsWith('}')) {
        const namedBindings = clause.slice(1, -1).trim();
        return namedBindings.length > 0
            ? `${indentation}const { ${formatNamedImportBindings(namedBindings)} } = require(${JSON.stringify(modulePath)});`
            : null;
    }

    const commaIndex = clause.indexOf(',');
    if (commaIndex !== -1) {
        const defaultName = clause.slice(0, commaIndex).trim();
        const remainder = clause.slice(commaIndex + 1).trim();
        const defaultImport = buildDefaultImport(defaultName);
        if (!defaultImport) {
            return null;
        }

        if (remainder.startsWith('* as ')) {
            const namespaceName = remainder.slice(5).trim();
            if (!isSimpleIdentifier(namespaceName)) {
                return null;
            }

            return `${defaultImport.code}\n${indentation}const ${namespaceName} = ${defaultImport.bindingName};`;
        }

        if (remainder.startsWith('{') && remainder.endsWith('}')) {
            const namedBindings = remainder.slice(1, -1).trim();
            if (!namedBindings) {
                return null;
            }

            return `${defaultImport.code}\n${indentation}const { ${formatNamedImportBindings(namedBindings)} } = ${defaultImport.bindingName};`;
        }

        return null;
    }

    return buildDefaultImport(clause)?.code ?? null;
}

function rewriteExportLine(
    line: string,
    namedExports: Set<string>,
    markDefaultExport: () => void,
): string | null {
    const trimmed = stripOptionalLineTerminator(line);
    if (!trimmed.startsWith('export ')) {
        return null;
    }

    const indentation = getLineIndentation(line);

    if (trimmed.startsWith('export default ')) {
        markDefaultExport();
        return `${indentation}module.exports = ${trimmed.slice('export default '.length)}`;
    }

    const valueDeclarationMatch = /^export\s+(const|let|var)\s+([A-Za-z_$][\w$]*)\b/.exec(trimmed);
    if (valueDeclarationMatch) {
        namedExports.add(valueDeclarationMatch[2]);
        return `${indentation}${trimmed.slice('export '.length)}`;
    }

    const asyncFunctionMatch = /^export\s+async\s+function\s+([A-Za-z_$][\w$]*)\b/.exec(trimmed);
    if (asyncFunctionMatch) {
        namedExports.add(asyncFunctionMatch[1]);
        return `${indentation}${trimmed.slice('export '.length)}`;
    }

    const functionMatch = /^export\s+function\s+([A-Za-z_$][\w$]*)\b/.exec(trimmed);
    if (functionMatch) {
        namedExports.add(functionMatch[1]);
        return `${indentation}${trimmed.slice('export '.length)}`;
    }

    const classMatch = /^export\s+class\s+([A-Za-z_$][\w$]*)\b/.exec(trimmed);
    if (classMatch) {
        namedExports.add(classMatch[1]);
        return `${indentation}${trimmed.slice('export '.length)}`;
    }

    if (trimmed.startsWith('export {') && trimmed.endsWith('}')) {
        const specifiers = trimmed.slice('export {'.length, -1).trim();
        return specifiers.length > 0
            ? `${indentation}${formatNamedExportAssignments(specifiers)}`
            : null;
    }

    return null;
}

function rewriteModuleSyntaxToCommonJs(source: string): string {
    let importCounter = 0;
    let hasDefaultExport = false;
    const namedExports = new Set<string>();

    const nextImportBinding = () => `__vm_import_${importCounter++}`;
    const resolveDefaultImport = (bindingName: string) => `${bindingName} && Object.prototype.hasOwnProperty.call(${bindingName}, "default") ? ${bindingName}.default : ${bindingName}`;
    const code = source
        .split(/\r?\n/)
        .map((line) => rewriteImportLine(line, nextImportBinding, resolveDefaultImport)
            ?? rewriteExportLine(line, namedExports, () => {
                hasDefaultExport = true;
            })
            ?? line)
        .join('\n');

    const exportFooter = [...namedExports].map((name) => `module.exports.${name} = ${name};`);
    if (hasDefaultExport) {
        exportFooter.push('module.exports.default = module.exports;');
    }

    return exportFooter.length > 0
        ? `${code.trimEnd()}\n${exportFooter.join('\n')}\n`
        : code;
}

export function transpileVmModule(source: string, options: VMTranspileOptions = {}): VMTransformResult {
    const loader = options.loader || 'js';
    const filename = options.filename || `virtual.${loader}`;

    if (loader === 'tsx' || loader === 'jsx') {
        const esbuildTransformSync = getEsbuildTransformSync();
        if (!esbuildTransformSync) {
            throw new Error(`JSX database execution requires the esbuild package (${filename}).`);
        }

        return esbuildTransformSync(source, {
            loader,
            format: options.format,
        });
    }

    if (loader === 'ts') {
        try {
            return {
                code: rewriteModuleSyntaxToCommonJs(stripTypescriptSource(source, filename)),
            };
        } catch (error) {
            const esbuildTransformSync = getEsbuildTransformSync();
            if (!esbuildTransformSync) {
                throw error;
            }

            return esbuildTransformSync(source, {
                loader,
                format: options.format,
            });
        }
    }

    return {
        code: rewriteModuleSyntaxToCommonJs(source),
    };
}