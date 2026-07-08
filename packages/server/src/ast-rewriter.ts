import { parse } from 'acorn';
import MagicString from 'magic-string';
import { dirname, extname, isAbsolute, join, relative, resolve } from '@elitjs/path';

export interface RewriteSpecifiersOptions {
  importerPath: string;
  clientRoot: string;
  alias?: Record<string, string> | undefined;
}

export interface RewriteSpecifiersResult {
  code: string;
  changed: boolean;
  parseFailed: boolean;
}

interface AcornNode {
  type: string;
  start: number;
  end: number;
  value?: unknown;
  raw?: string;
  name?: string;
  source?: AcornNode | null;
  declaration?: AcornNode | null;
  specifiers?: AcornNode[];
  expression?: AcornNode | null;
  callee?: AcornNode | null;
  arguments?: AcornNode[];
  body?: AcornNode | AcornNode[] | null;
  [key: string]: unknown;
}

interface SpecifierLiteral {
  value: string;
  start: number;
  end: number;
  quote: string;
}

function isExternalSpecifier(specifier: string): boolean {
  return (
    specifier.startsWith('http://') ||
    specifier.startsWith('https://') ||
    specifier.startsWith('data:') ||
    specifier.startsWith('blob:') ||
    specifier.startsWith('node:')
  );
}

function isBareSpecifier(specifier: string): boolean {
  return (
    !specifier.startsWith('./') &&
    !specifier.startsWith('../') &&
    !specifier.startsWith('/') &&
    !specifier.startsWith('#')
  );
}

export function resolveSpecifier(
  specifier: string,
  importerDir: string,
  clientRoot: string,
  aliasEntries: [string, string][],
): string | undefined {
  if (isExternalSpecifier(specifier)) return undefined;

  if (aliasEntries.length > 0) {
    for (const [aliasKey, aliasTarget] of aliasEntries) {
      const isExact = specifier === aliasKey;
      const isPrefix = specifier.startsWith(aliasKey + '/');
      if (!isExact && !isPrefix) continue;

      const rest = isExact ? '' : specifier.slice(aliasKey.length).replace(/^\/+/, '');
      const targetAbs = isAbsolute(aliasTarget) ? aliasTarget : resolve(clientRoot, aliasTarget);
      const targetFile = rest ? join(targetAbs, rest) : targetAbs;
      let rel = relative(importerDir, targetFile).replace(/\\/g, '/');
      if (!rel.startsWith('.')) rel = './' + rel;
      if (!extname(rel)) rel += '.js';
      return rel;
    }
  }

  if (isBareSpecifier(specifier)) return undefined;
  if (specifier.includes('?')) return undefined;

  if (specifier.endsWith('.ts')) {
    return specifier.slice(0, -3) + '.js';
  }
  if (specifier.endsWith('.tsx')) {
    return specifier.slice(0, -4) + '.jsx';
  }
  if (specifier.endsWith('.css')) {
    return specifier + '?inline';
  }

  return undefined;
}

function getSpecifierLiteral(node: AcornNode | null | undefined): SpecifierLiteral | null {
  if (!node || node.type !== 'Literal') return null;
  if (typeof node.value !== 'string') return null;
  const raw = typeof node.raw === 'string' ? node.raw : `"${node.value}"`;
  return {
    value: node.value,
    start: node.start,
    end: node.end,
    quote: raw[0],
  };
}

function collectSpecifierLiterals(root: AcornNode): SpecifierLiteral[] {
  const out: SpecifierLiteral[] = [];
  const SKIP_KEYS = new Set(['type', 'start', 'end', 'range', 'loc']);

  const visit = (node: AcornNode | null | undefined) => {
    if (!node) return;

    switch (node.type) {
      case 'ImportDeclaration':
      case 'ExportAllDeclaration':
      case 'ExportNamedDeclaration': {
        const lit = getSpecifierLiteral(node.source);
        if (lit) out.push(lit);
        break;
      }
      case 'ImportExpression': {
        const lit = getSpecifierLiteral(node.source);
        if (lit) out.push(lit);
        break;
      }
      case 'CallExpression': {
        const callee = node.callee;
        if (callee && callee.type === 'Identifier' && callee.name === 'require' && node.arguments) {
          const lit = getSpecifierLiteral(node.arguments[0]);
          if (lit) out.push(lit);
        }
        break;
      }
    }

    for (const key of Object.keys(node)) {
      if (SKIP_KEYS.has(key)) continue;
      const value = node[key];
      if (Array.isArray(value)) {
        for (const child of value) {
          if (child && typeof child === 'object' && typeof (child as { type?: unknown }).type === 'string') {
            visit(child as AcornNode);
          }
        }
      } else if (value && typeof value === 'object' && typeof (value as { type?: unknown }).type === 'string') {
        visit(value as AcornNode);
      }
    }
  };

  visit(root);
  return out;
}

export function rewriteModuleSpecifiers(
  source: string,
  options: RewriteSpecifiersOptions,
): RewriteSpecifiersResult {
  const aliasEntries = options.alias
    ? Object.entries(options.alias).filter(([key]) => typeof key === 'string' && key.length > 0)
    : [];
  aliasEntries.sort((a, b) => b[0].length - a[0].length);

  if (aliasEntries.length === 0 && !source.includes('.ts') && !source.includes('.css')) {
    return { code: source, changed: false, parseFailed: false };
  }

  let root: AcornNode;
  try {
    root = parse(source, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: false,
      ranges: false,
    }) as unknown as AcornNode;
  } catch {
    return { code: source, changed: false, parseFailed: true };
  }

  const importerDir = dirname(options.importerPath);
  const literals = collectSpecifierLiterals(root);
  const ms = new MagicString(source);
  let changed = false;

  for (const lit of literals) {
    const next = resolveSpecifier(lit.value, importerDir, options.clientRoot, aliasEntries);
    if (!next || next === lit.value) continue;
    ms.overwrite(lit.start, lit.end, `${lit.quote}${next}${lit.quote}`);
    changed = true;
  }

  if (!changed) return { code: source, changed: false, parseFailed: false };
  return { code: ms.toString(), changed: true, parseFailed: false };
}
