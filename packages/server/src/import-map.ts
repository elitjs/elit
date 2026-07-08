import { join, resolve } from '@elitjs/path';
import { readFile, readdir } from '@elitjs/fs';

import { findSpecialDir, type ImportMapEntry } from './utils';

interface PackageExports {
  [key: string]: string | PackageExports;
}

interface PackageJson {
  name?: string;
  main?: string;
  module?: string;
  browser?: string | Record<string, string | false>;
  exports?: string | PackageExports | { [key: string]: any };
  type?: 'module' | 'commonjs';
  sideEffects?: boolean | string[];
}

const importMapCache = new Map<string, Promise<ImportMapEntry>>();

export function clearImportMapCache(): void {
  importMapCache.clear();
}

export async function createImportMap(rootDir: string, basePath: string = ''): Promise<string> {
  const imports = await generateExternalImportMaps(rootDir, basePath);
  return `<script type="importmap">${JSON.stringify({ imports }, null, 2)}</script>`;
}

async function generateExternalImportMaps(rootDir: string, basePath: string = ''): Promise<ImportMapEntry> {
  const cacheKey = `${rootDir}:${basePath}`;
  const cached = importMapCache.get(cacheKey);
  if (cached) return cached;

  const promise = scanNodeModules(rootDir, basePath);
  importMapCache.set(cacheKey, promise);
  return promise;
}

async function scanNodeModules(rootDir: string, basePath: string): Promise<ImportMapEntry> {
  const importMap: ImportMapEntry = {};
  const nodeModulesPath = await findNodeModules(rootDir);

  if (!nodeModulesPath) {
    return importMap;
  }

  try {
    const packages = await readdir(nodeModulesPath);

    for (const pkgEntry of packages) {
      const pkg = typeof pkgEntry === 'string' ? pkgEntry : pkgEntry.name;
      if (pkg.startsWith('.')) continue;

      if (pkg.startsWith('@')) {
        try {
          const scopedPackages = await readdir(join(nodeModulesPath, pkg));
          for (const scopedEntry of scopedPackages) {
            const scopedPkg = typeof scopedEntry === 'string' ? scopedEntry : scopedEntry.name;
            const fullPkgName = `${pkg}/${scopedPkg}`;
            await processPackage(nodeModulesPath, fullPkgName, importMap, basePath);
          }
        } catch {
          // Skip if can't read scoped directory.
        }
      } else {
        await processPackage(nodeModulesPath, pkg, importMap, basePath);
      }
    }
  } catch (error) {
    console.error('[Import Maps] Error scanning node_modules:', error);
  }

  return importMap;
}

async function findNodeModules(startDir: string): Promise<string | null> {
  const foundDir = await findSpecialDir(startDir, 'node_modules');
  return foundDir ? join(foundDir, 'node_modules') : null;
}

function isBrowserCompatible(pkgName: string, pkgJson: PackageJson): boolean {
  const buildTools = [
    'typescript', 'esbuild', '@esbuild/',
    'tsx', 'tsup', 'rollup', 'vite', 'webpack', 'parcel',
    'terser', 'uglify', 'babel', '@babel/',
    'postcss', 'autoprefixer', 'cssnano',
    'sass', 'less', 'stylus',
  ];

  const nodeOnly = [
    'node-', '@node-', 'fsevents', 'chokidar',
    'express', 'koa', 'fastify', 'nest',
    'commander', 'yargs', 'inquirer', 'chalk', 'ora',
    'nodemon', 'pm2', 'dotenv',
  ];

  const testingTools = [
    'jest', 'vitest', 'mocha', 'chai', 'jasmine',
    '@jest/', '@testing-library/', '@vitest/',
    'playwright', 'puppeteer', 'cypress',
  ];

  const linters = [
    'eslint', '@eslint/', 'prettier', 'tslint',
    'stylelint', 'commitlint',
  ];

  const typeDefinitions = [
    '@types/', '@typescript-eslint/',
  ];

  const utilities = [
    'get-tsconfig', 'resolve-pkg-maps', 'pkg-types',
    'fast-glob', 'globby', 'micromatch',
    'execa', 'cross-spawn', 'shelljs',
  ];

  const skipPatterns = [
    ...buildTools,
    ...nodeOnly,
    ...testingTools,
    ...linters,
    ...typeDefinitions,
    ...utilities,
  ];

  if (skipPatterns.some((pattern) => pkgName.startsWith(pattern))) {
    return false;
  }

  if (pkgJson.browser || pkgJson.module) {
    return true;
  }

  if (pkgJson.exports) {
    const exportsStr = JSON.stringify(pkgJson.exports);
    if (exportsStr.includes('"import"') || exportsStr.includes('"browser"')) {
      return true;
    }
  }

  if (pkgJson.type === 'commonjs' && !pkgJson.module && !pkgJson.browser) {
    return false;
  }

  return !!(pkgJson.exports || pkgJson.type === 'module' || pkgJson.module);
}

async function processPackage(
  nodeModulesPath: string,
  pkgName: string,
  importMap: ImportMapEntry,
  basePath: string,
): Promise<void> {
  const pkgPath = join(nodeModulesPath, pkgName);
  const pkgJsonPath = join(pkgPath, 'package.json');

  try {
    const pkgJsonContent = await readFile(pkgJsonPath);
    const pkgJson: PackageJson = JSON.parse(pkgJsonContent.toString());

    if (!isBrowserCompatible(pkgName, pkgJson)) {
      return;
    }

    const baseUrl = basePath ? `${basePath}/node_modules/${pkgName}` : `/node_modules/${pkgName}`;

    if (pkgJson.exports) {
      processExportsField(pkgName, pkgJson.exports, baseUrl, importMap);
    } else {
      const entryPoint = pkgJson.browser || pkgJson.module || pkgJson.main || 'index.js';
      importMap[pkgName] = `${baseUrl}/${entryPoint}`;
      importMap[`${pkgName}/`] = `${baseUrl}/`;
    }
  } catch {
    // Skip packages without package.json or invalid JSON.
  }
}

function processExportsField(
  pkgName: string,
  exports: string | PackageExports | { [key: string]: any },
  baseUrl: string,
  importMap: ImportMapEntry,
): void {
  if (typeof exports === 'string') {
    importMap[pkgName] = `${baseUrl}/${exports}`;
    importMap[`${pkgName}/`] = `${baseUrl}/`;
    return;
  }

  if (typeof exports === 'object' && exports !== null) {
    if ('.' in exports) {
      const dotExport = exports['.'];
      const resolved = resolveExport(dotExport);
      if (resolved) {
        importMap[pkgName] = `${baseUrl}/${resolved}`;
      }
    } else if ('import' in exports) {
      const resolved = resolveExport(exports);
      if (resolved) {
        importMap[pkgName] = `${baseUrl}/${resolved}`;
      }
    }

    for (const [key, value] of Object.entries(exports)) {
      if (key === '.' || key === 'import' || key === 'require' || key === 'types' || key === 'default') {
        continue;
      }

      const resolved = resolveExport(value);
      if (resolved) {
        const cleanKey = key.startsWith('./') ? key.slice(2) : key;
        const importName = cleanKey ? `${pkgName}/${cleanKey}` : pkgName;
        importMap[importName] = `${baseUrl}/${resolved}`;
      }
    }

    importMap[`${pkgName}/`] = `${baseUrl}/`;
  }
}

function resolveExport(exportValue: any): string | null {
  if (typeof exportValue === 'string') {
    return exportValue.startsWith('./') ? exportValue.slice(2) : exportValue;
  }

  if (typeof exportValue === 'object' && exportValue !== null) {
    const resolved = exportValue.import || exportValue.browser || exportValue.default || exportValue.require;

    if (typeof resolved === 'object' && resolved !== null) {
      return resolveExport(resolved);
    }

    if (typeof resolved === 'string') {
      return resolved.startsWith('./') ? resolved.slice(2) : resolved;
    }
  }

  return null;
}
