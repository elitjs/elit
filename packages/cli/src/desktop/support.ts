import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

import { resolveWorkspacePackageImport } from '@elitjs/workspace-package';
import {
    PACKAGE_ROOT,
    type DesktopBootstrapEntry,
    type DesktopBootstrapSupportModuleName,
} from './shared';

function toDesktopBootstrapImportPath(fromPath: string, toPath: string): string {
    const importPath = relative(dirname(fromPath), toPath).replace(/\\/g, '/');
    return importPath.startsWith('./') || importPath.startsWith('../') ? importPath : `./${importPath}`;
}

function isNodeModulesPackagePath(path: string): boolean {
    return path
        .split(/[\\/]+/)
        .some((segment) => segment.toLowerCase() === 'node_modules');
}

function formatDesktopDisplayName(value: string): string {
    if (!value) {
        return 'Elit';
    }

    return value
        .split(/[._-]+/)
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ');
}

export function resolveDesktopEntryDisplayName(entryPath: string, fallbackName: string): string {
    let currentDir = dirname(resolve(entryPath));

    while (true) {
        const packageJsonPath = join(currentDir, 'package.json');
        if (existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
                    appName?: string;
                    name?: string;
                    productName?: string;
                };
                const configuredName = packageJson.productName ?? packageJson.appName ?? packageJson.name;
                if (configuredName) {
                    return formatDesktopDisplayName(configuredName);
                }
            } catch {
                // Ignore invalid package metadata while walking upward.
            }
        }

        const parentDir = dirname(currentDir);
        if (parentDir === currentDir) {
            break;
        }
        currentDir = parentDir;
    }

    return formatDesktopDisplayName(fallbackName);
}

export function resolveDesktopBootstrapSupportModulePath(
    moduleName: DesktopBootstrapSupportModuleName,
    packageRoot = PACKAGE_ROOT,
    options: { preferredBuiltFormat?: 'cjs' | 'esm' } = {},
): string {
    const builtCandidates = options.preferredBuiltFormat === 'cjs'
        ? [
            resolve(packageRoot, 'dist', `${moduleName}.cjs`),
            resolve(packageRoot, 'dist', `${moduleName}.js`),
            resolve(packageRoot, 'dist', `${moduleName}.mjs`),
        ]
        : [
            resolve(packageRoot, 'dist', `${moduleName}.mjs`),
            resolve(packageRoot, 'dist', `${moduleName}.js`),
            resolve(packageRoot, 'dist', `${moduleName}.cjs`),
        ];
    const candidates = [
        resolve(packageRoot, 'src', `${moduleName}.ts`),
        ...builtCandidates,
    ];

    for (const candidate of candidates) {
        if (existsSync(candidate)) {
            return candidate;
        }
    }

    throw new Error(
        `Desktop support module "${moduleName}" was not found in ${packageRoot}. Expected one of: ${candidates.join(', ')}`,
    );
}

export function resolveDesktopCargoTargetBaseDir(
    packageRoot = PACKAGE_ROOT,
    cwd = process.cwd(),
    env: NodeJS.ProcessEnv = process.env,
    platform: NodeJS.Platform = process.platform,
): string {
    const explicitTargetDir = env.ELIT_DESKTOP_CARGO_TARGET_DIR?.trim();
    if (explicitTargetDir) {
        return resolve(explicitTargetDir);
    }

    const localAppData = env.LOCALAPPDATA?.trim();
    if (platform === 'win32' && localAppData) {
        return resolve(localAppData, 'elit', 'target', 'desktop');
    }

    if (isNodeModulesPackagePath(packageRoot)) {
        return resolve(cwd, '.elit', 'target', 'desktop');
    }

    return resolve(packageRoot, 'target', 'desktop');
}

export function resolveDesktopBinaryOverridePath(
    configuredPath: string | undefined,
    envName: 'ELIT_DESKTOP_BINARY_PATH' | 'ELIT_DESKTOP_NATIVE_BINARY_PATH',
    cwd = process.cwd(),
    env: NodeJS.ProcessEnv = process.env,
): string | undefined {
    const explicitPath = env[envName]?.trim() || configuredPath?.trim();

    if (!explicitPath) {
        return undefined;
    }

    return resolve(cwd, explicitPath);
}

export function createDesktopBootstrapEntry(
    entryPath: string,
    appName: string,
    options: { preferredBuiltFormat?: 'cjs' | 'esm' } = {},
): DesktopBootstrapEntry {
    const bootstrapId = randomUUID();
    const bootstrapPath = join(dirname(entryPath), `.elit-desktop-bootstrap-${appName}-${bootstrapId}.ts`);
    const preludePath = join(dirname(entryPath), `.elit-desktop-prelude-${appName}-${bootstrapId}.ts`);
    const desktopAutoRenderPath = resolveDesktopBootstrapSupportModulePath('desktop-auto-render', PACKAGE_ROOT, options);
    const renderContextPath = resolveDesktopBootstrapSupportModulePath('render-context', PACKAGE_ROOT, options);
    const defaultTitle = `${resolveDesktopEntryDisplayName(entryPath, appName)} Desktop`;

    writeFileSync(
        preludePath,
        [
            `import { installDesktopRenderTracking } from ${JSON.stringify(toDesktopBootstrapImportPath(preludePath, desktopAutoRenderPath))};`,
            `import { clearCapturedRenderedVNode, clearDesktopRenderOptions, setRenderRuntimeTarget } from ${JSON.stringify(toDesktopBootstrapImportPath(preludePath, renderContextPath))};`,
            '',
            `setRenderRuntimeTarget(${JSON.stringify('desktop')});`,
            'clearCapturedRenderedVNode();',
            'clearDesktopRenderOptions();',
            'installDesktopRenderTracking();',
            '',
        ].join('\n'),
        'utf8',
    );

    writeFileSync(
        bootstrapPath,
        [
            `import { completeDesktopAutoRender } from ${JSON.stringify(toDesktopBootstrapImportPath(bootstrapPath, desktopAutoRenderPath))};`,
            `import ${JSON.stringify(toDesktopBootstrapImportPath(bootstrapPath, preludePath))};`,
            `import ${JSON.stringify(toDesktopBootstrapImportPath(bootstrapPath, entryPath))};`,
            '',
            `const desktopAutoRenderOptions = ${JSON.stringify({
                center: true,
                height: 720,
                title: defaultTitle,
                width: 1080,
            })};`,
            '',
            'try {',
            '    completeDesktopAutoRender(desktopAutoRenderOptions);',
            '} catch (error) {',
            '    console.error(error);',
            '    if (typeof process !== "undefined" && typeof process.exit === "function") {',
            '        process.exit(1);',
            '    }',
            '    throw error;',
            '}',
            '',
        ].join('\n'),
        'utf8',
    );

    return {
        bootstrapPath,
        cleanupPaths: [bootstrapPath, preludePath],
    };
}

export function createWorkspacePackagePlugin(
    entryDir: string,
    options: { preferBuilt?: boolean; preferredBuiltFormat?: 'cjs' | 'esm' } = {},
) {
    return {
        name: 'workspace-package-self-reference',
        setup(build: any) {
            build.onResolve({ filter: /^elit(?:\/.*)?$/ }, (args: { path: string; resolveDir?: string }) => {
                const resolved = resolveWorkspacePackageImport(args.path, args.resolveDir || entryDir, options);
                return resolved ? { path: resolved } : undefined;
            });
        },
    };
}

export function resolveDesktopIcon(entryPath?: string): string | undefined {
    if (!entryPath) {
        return undefined;
    }

    const entryDir = dirname(resolve(entryPath));
    const projectDir = dirname(entryDir);
    const searchDirs = [
        entryDir,
        join(entryDir, 'public'),
        projectDir,
        join(projectDir, 'public'),
    ];
    const candidates = [
        'icon.ico',
        'icon.png',
        'icon.svg',
        'favicon.ico',
        'favicon.png',
        'favicon.svg',
    ];

    for (const searchDir of searchDirs) {
        for (const candidate of candidates) {
            const iconPath = join(searchDir, candidate);
            if (existsSync(iconPath)) {
                return iconPath;
            }
        }
    }

    return undefined;
}