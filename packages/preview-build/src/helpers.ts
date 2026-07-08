import { existsSync, readFileSync, writeFileSync } from '@elitjs/fs';
import { resolveWorkspacePackageImport } from '@elitjs/workspace-package';

function normalizePackageDependencies(value: unknown): Record<string, string> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {};
    }

    const dependencies: Record<string, string> = {};
    for (const [key, entryValue] of Object.entries(value)) {
        if (typeof entryValue === 'string') {
            dependencies[key] = entryValue;
        }
    }

    return dependencies;
}

function readJsonFile(filePath: string): Record<string, unknown> | undefined {
    try {
        const rawContent = readFileSync(filePath, 'utf-8');
        const content = typeof rawContent === 'string' ? rawContent : rawContent.toString('utf-8');
        return JSON.parse(content) as Record<string, unknown>;
    } catch {
        return undefined;
    }
}

export function createWorkspacePackagePlugin(resolveDir: string, options: { preferBuilt?: boolean; preferredBuiltFormat?: 'cjs' | 'esm' } = {}) {
    return {
        name: 'workspace-package-self-reference',
        setup(build: any) {
            build.onResolve({ filter: /^elit(?:\/.*)?$/ }, (args: { path: string; resolveDir?: string }) => {
                const resolved = resolveWorkspacePackageImport(args.path, args.resolveDir || resolveDir, options);
                return resolved ? { path: resolved } : undefined;
            });
        },
    };
}

export function normalizeRelativePath(filePath: string): string {
    const normalized = filePath.replace(/\\/g, '/');
    return normalized === '' ? '.' : normalized;
}

export function normalizeImportPath(filePath: string): string {
    return filePath.replace(/\\/g, '/');
}

export function createInlineConfigSource(config: Record<string, unknown>): string {
    const entries = Object.entries(config).filter(([, value]) => value !== undefined);

    if (entries.length === 0) {
        return '{}';
    }

    return `{ ${entries.map(([key, value]) => `${JSON.stringify(key)}: ${JSON.stringify(value)}`).join(', ')} }`;
}

export function writeStandalonePackageJson(
    packageJsonPath: string,
    outputFile: string,
    options: { dependencies?: Record<string, string>; replaceDependencies?: boolean } = {},
): void {
    const currentPackageJson = existsSync(packageJsonPath)
        ? readJsonFile(packageJsonPath)
        : undefined;
    const basePackageJson = options.replaceDependencies && currentPackageJson
        ? Object.fromEntries(Object.entries(currentPackageJson).filter(([key]) => key !== 'dependencies'))
        : (currentPackageJson ?? {});

    const dependencies = options.replaceDependencies
        ? { ...(options.dependencies ?? {}) }
        : {
            ...normalizePackageDependencies(currentPackageJson?.dependencies),
            ...(options.dependencies ?? {}),
        };

    const nextPackageJson = {
        ...basePackageJson,
        ...(Object.keys(dependencies).length > 0 ? { dependencies } : {}),
        private: true,
        type: 'commonjs',
        main: outputFile,
    };

    writeFileSync(packageJsonPath, `${JSON.stringify(nextPackageJson, null, 2)}\n`);
}