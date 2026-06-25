import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';

export interface ResolveOptions {
    clientRoot: string;
    alias?: Record<string, string> | undefined;
}

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const NON_SOURCE_EXTENSIONS = new Set([
    '.css', '.scss', '.sass', '.less',
    '.html', '.htm',
    '.json',
    '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.avif',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.mp4', '.mp3', '.webm', '.wav', '.ogg',
    '.pdf', '.txt', '.md',
]);

const IMPORT_SPEC_RE = /\b(?:import|export)\b[^=;]*?\bfrom\s*['"]([^'"]+)['"]/g;
const SIDE_EFFECT_IMPORT_RE = /\bimport\s*['"]([^'"]+)['"]/g;
const REQUIRE_RE = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const LINE_COMMENT_RE = /\/\/[^\n]*/g;
const BLOCK_COMMENT_RE = /\/\*[\s\S]*?\*\//g;

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

function normalizeSeparators(p: string): string {
    return sep === '\\' ? p.replace(/\\/g, '/') : p;
}

function sortByLongestKey(entries: [string, string][]): [string, string][] {
    return [...entries].sort((a, b) => b[0].length - a[0].length);
}

function stripComments(source: string): string {
    return source.replace(BLOCK_COMMENT_RE, '').replace(LINE_COMMENT_RE, '');
}

function extractStaticImports(source: string): string[] {
    const clean = stripComments(source);
    const out: string[] = [];

    let match: RegExpExecArray | null;
    IMPORT_SPEC_RE.lastIndex = 0;
    while ((match = IMPORT_SPEC_RE.exec(clean)) !== null) {
        out.push(match[1]);
    }

    SIDE_EFFECT_IMPORT_RE.lastIndex = 0;
    while ((match = SIDE_EFFECT_IMPORT_RE.exec(clean)) !== null) {
        if (!out.includes(match[1])) out.push(match[1]);
    }

    REQUIRE_RE.lastIndex = 0;
    while ((match = REQUIRE_RE.exec(clean)) !== null) {
        if (!out.includes(match[1])) out.push(match[1]);
    }

    return out;
}

export function resolveLocalFile(
    specifier: string,
    importerDir: string,
    options: ResolveOptions,
): string | undefined {
    if (isExternalSpecifier(specifier)) return undefined;
    if (specifier.includes('?')) return undefined;

    const aliasEntries = options.alias
        ? sortByLongestKey(Object.entries(options.alias).filter(([k]) => typeof k === 'string' && k.length > 0))
        : [];

    let candidateBase: string | undefined;

    for (const [aliasKey, aliasTarget] of aliasEntries) {
        const isExact = specifier === aliasKey;
        const isPrefix = specifier.startsWith(aliasKey + '/');
        if (!isExact && !isPrefix) continue;

        const rest = isExact ? '' : specifier.slice(aliasKey.length).replace(/^\/+/, '');
        const targetAbs = isAbsolute(aliasTarget) ? aliasTarget : resolve(options.clientRoot, aliasTarget);
        candidateBase = rest ? join(targetAbs, rest) : targetAbs;
        break;
    }

    if (candidateBase === undefined) {
        if (isBareSpecifier(specifier)) return undefined;
        candidateBase = isAbsolute(specifier) ? specifier : resolve(importerDir, specifier);
    }

    return tryResolveSourceFile(candidateBase);
}

function tryResolveSourceFile(base: string): string | undefined {
    const explicit = getExistingSourceFile(base);
    if (explicit) return normalizeSeparators(explicit);

    for (const ext of SOURCE_EXTENSIONS) {
        const candidate = base + ext;
        if (existsSync(candidate) && statSync(candidate).isFile()) {
            return normalizeSeparators(candidate);
        }
    }

    for (const ext of SOURCE_EXTENSIONS) {
        const candidate = join(base, 'index' + ext);
        if (existsSync(candidate) && statSync(candidate).isFile()) {
            return normalizeSeparators(candidate);
        }
    }

    return undefined;
}

function getExistingSourceFile(path: string): string | undefined {
    if (!existsSync(path)) return undefined;
    let stats;
    try {
        stats = statSync(path);
    } catch {
        return undefined;
    }
    if (!stats.isFile()) return undefined;
    const lower = path.toLowerCase();
    for (const ext of NON_SOURCE_EXTENSIONS) {
        if (lower.endsWith(ext)) return undefined;
    }
    return path;
}

export function discoverServerEntries(
    configPath: string,
    options: ResolveOptions,
): string[] {
    let content: string;
    try {
        content = readFileSync(configPath, 'utf8');
    } catch {
        return [];
    }

    const specifiers = extractStaticImports(content);
    const configDir = dirname(configPath);
    const entries: string[] = [];

    for (const spec of specifiers) {
        const resolved = resolveLocalFile(spec, configDir, options);
        if (resolved && !entries.includes(resolved)) {
            entries.push(resolved);
        }
    }

    return entries;
}

export interface BuildGraphOptions extends ResolveOptions {
    maxFiles?: number;
    onParseError?: (file: string, error: unknown) => void;
}

export function buildServerDependencyGraph(
    entries: string[],
    options: BuildGraphOptions,
): Set<string> {
    const visited = new Set<string>();
    const queue: string[] = [...entries];
    const maxFiles = options.maxFiles ?? 5000;

    while (queue.length > 0) {
        const file = queue.shift()!;
        if (visited.has(file)) continue;
        if (visited.size >= maxFiles) break;

        if (!existsSync(file)) continue;

        visited.add(file);

        let content: string;
        try {
            content = readFileSync(file, 'utf8');
        } catch {
            continue;
        }

        const specifiers = extractStaticImports(content);
        const fileDir = dirname(file);

        for (const spec of specifiers) {
            const resolved = resolveLocalFile(spec, fileDir, options);
            if (resolved && !visited.has(resolved)) {
                queue.push(resolved);
            }
        }
    }

    return visited;
}
