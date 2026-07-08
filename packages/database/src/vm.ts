import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

import { create, read, remove, save, update } from './operations';
import { transpileVmModule } from './transpile';
import type { VMModuleLoader, VMOptions, VMTranspileOptions, VMTransformResult } from './types';

async function SystemModuleResolver(customOptions?: VMOptions) {
    const moduleRegistry = new Map<string, any>();

    moduleRegistry.set('update', (dbName: string, fnName: string, code: unknown) =>
        update(dbName, fnName, code, customOptions));
    moduleRegistry.set('remove', (dbName: string, fnName: string) =>
        remove(dbName, fnName, customOptions));
    moduleRegistry.set('create', (dbName: string, code: string | Function) =>
        create(dbName, code, customOptions));
    moduleRegistry.set('save', (dbName: string, code: unknown) =>
        save(dbName, code, customOptions));
    moduleRegistry.set('read', (dbName: string) =>
        read(dbName, customOptions));

    const context: Record<string, any> = {
        require: (moduleName: string) => {
            const module = moduleRegistry.get(moduleName);
            if (!module) {
                throw new Error(`Module '${moduleName}' not found`);
            }
            return module.default || module;
        },

        import: async (moduleName: string) => {
            const module = moduleRegistry.get(moduleName);
            if (!module) {
                throw new Error(`Module '${moduleName}' not found`);
            }
            return {
                default: module.default || module,
            };
        },
    };

    for (const [name, moduleExports] of moduleRegistry) {
        context[name] = moduleExports.default || moduleExports;
    }

    return context;
}

export class VM {
    private transpiler: (code: string, options?: VMTranspileOptions) => VMTransformResult;
    private ctx: vm.Context;
    private registerModules: { [key: string]: any };
    private DATABASE_DIR: string;
    private SCRIPTDB_DIR: string;
    private pkgScriptDB: { dependencies?: Record<string, string> } = {};
    private language: 'ts' | 'js';
    private _registerModules: { [key: string]: any };
    private options: VMOptions;

    constructor(options?: VMOptions) {
        this.options = options || {};
        this.DATABASE_DIR = options?.dir || path.join(process.cwd(), 'databases');
        this.SCRIPTDB_DIR = process.cwd();

        if (!fs.existsSync(this.DATABASE_DIR)) {
            fs.mkdirSync(this.DATABASE_DIR, { recursive: true });
        }
        if (!fs.existsSync(this.SCRIPTDB_DIR)) {
            fs.mkdirSync(this.SCRIPTDB_DIR, { recursive: true });
        }

        const pkgPath = path.join(this.SCRIPTDB_DIR, 'package.json');
        if (fs.existsSync(pkgPath)) {
            this.pkgScriptDB = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        }
        this.language = options?.language || 'ts';
        this.transpiler = transpileVmModule;

        this.registerModules = options?.registerModules || {};
        this._registerModules = { ...this.registerModules };

        this._registerModules.require = ((moduleId: string) => this.createRequire(moduleId)).bind(this);

        this.ctx = vm.createContext(this._registerModules);
    }

    register(context: { [key: string]: any }) {
        this.registerModules = { ...this.registerModules, ...context };
        this._registerModules = { ...this._registerModules, ...context };
        const originalRequire = context.require;
        this._registerModules.require = ((moduleId: string) => {
            try {
                return this.createRequire(moduleId);
            } catch (error) {
                if (originalRequire && !moduleId.startsWith('@db/') && !moduleId.startsWith('./') && !moduleId.startsWith('../')) {
                    return originalRequire(moduleId);
                }
                throw error;
            }
        }).bind(this);
        this.ctx = vm.createContext(this._registerModules);
    }

    private createRequire(moduleId: string): any {
        if (!moduleId) {
            console.error('[createRequire] moduleId is undefined');
            return {};
        }

        if (moduleId.startsWith('@db/')) {
            const relativePath = moduleId.substring(4);
            moduleId = './' + relativePath;
        }

        if (moduleId.startsWith('./') || moduleId.startsWith('../')) {
            const dbDir = this.DATABASE_DIR || process.cwd();
            const fullPath = path.join(dbDir, moduleId);

            let actualPath: string | undefined = fullPath;
            if (fs.existsSync(fullPath)) {
                actualPath = fullPath;
            } else {
                const extensions = ['.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.cjs'];
                for (const ext of extensions) {
                    if (fs.existsSync(fullPath + ext)) {
                        actualPath = fullPath + ext;
                        break;
                    }
                }
            }

            if (!actualPath || !fs.existsSync(actualPath)) {
                throw new Error(`Module '${moduleId}' not found at ${fullPath}`);
            }

            if (actualPath.endsWith('.ts') || actualPath.endsWith('.tsx') || actualPath.endsWith('.mts') || actualPath.endsWith('.cts') || actualPath.endsWith('.js') || actualPath.endsWith('.mjs')) {
                const content = fs.readFileSync(actualPath, 'utf8');
                const loader: VMModuleLoader = actualPath.endsWith('.ts') || actualPath.endsWith('.mts') || actualPath.endsWith('.cts')
                    ? 'ts'
                    : actualPath.endsWith('.tsx')
                        ? 'tsx'
                        : 'js';
                const js = this.transpiler(content, {
                    loader,
                    format: 'cjs',
                    filename: actualPath,
                }).code;

                const moduleWrapper = { exports: {} };
                const moduleContext = vm.createContext({
                    ...this._registerModules,
                    module: moduleWrapper,
                    exports: moduleWrapper.exports,
                });

                vm.runInContext(js, moduleContext, { filename: actualPath });
                return moduleWrapper.exports;
            }

            return require(actualPath);
        }

        return require(moduleId);
    }

    resolvePath(fileList: any[], query: string) {
        const aliases = { '@db': this.DATABASE_DIR };

        let resolvedPath = query;
        for (const [alias, target] of Object.entries(aliases)) {
            if (resolvedPath.startsWith(alias + '/')) {
                resolvedPath = resolvedPath.replace(alias, target);
                break;
            }
        }

        resolvedPath = path.normalize(resolvedPath);

        return fileList.find((file) => {
            const normalizedFile = path.normalize(file);
            const fileWithoutExt = normalizedFile.replace(/\.[^/.]+$/, '');
            return normalizedFile === resolvedPath ||
                fileWithoutExt === resolvedPath ||
                normalizedFile === resolvedPath + '.ts' ||
                normalizedFile === resolvedPath + '.js';
        });
    }

    async moduleLinker(specifier: any, referencingModule: any) {
        const dbFiles = fs.readdirSync(this.DATABASE_DIR)
            .filter((file) => file.endsWith('.ts'))
            .map((file) => path.join(this.DATABASE_DIR, file));
        const dbResult = this.resolvePath(dbFiles, specifier);

        if (dbResult) {
            try {
                const actualModule = await import(dbResult);
                const exportNames = Object.keys(actualModule);
                return new vm.SyntheticModule(
                    exportNames,
                    function () {
                        exportNames.forEach((key) => {
                            this.setExport(key, actualModule[key]);
                        });
                    },
                    { identifier: specifier, context: referencingModule.context },
                );
            } catch (err) {
                console.error(`Failed to load database module ${specifier}:`, err);
                throw err;
            }
        }

        const allowedPackages = Object.keys(this.pkgScriptDB.dependencies || {});
        if (allowedPackages.includes(specifier)) {
            try {
                const modulePath = path.join(this.SCRIPTDB_DIR, 'node_modules', specifier);
                const actualModule = await import(modulePath);
                const exportNames = Object.keys(actualModule);
                return new vm.SyntheticModule(
                    exportNames,
                    function () {
                        exportNames.forEach((key) => {
                            this.setExport(key, actualModule[key]);
                        });
                    },
                    { identifier: specifier, context: referencingModule.context },
                );
            } catch (err) {
                console.error(`Failed to load workspace module ${specifier}:`, err);
                throw err;
            }
        }

        throw new Error(`Module ${specifier} is not allowed or not found.`);
    }

    async run(code: string) {
        const logs: any[] = [];

        const customConsole = ['log', 'error', 'warn', 'info', 'debug', 'trace'].reduce((acc: any, type: any) => {
            acc[type] = (...args: any[]) => logs.push({ type, args });
            return acc;
        }, {});

        this.register({
            console: customConsole,
        });

        const systemModules = await SystemModuleResolver(this.options);
        this.register(systemModules);

        const js = this.transpiler(code, {
            loader: this.language,
            format: 'cjs',
            filename: path.join(this.SCRIPTDB_DIR, `virtual-entry.${this.language}`),
        }).code;

        const SourceTextModule = (vm as any).SourceTextModule;
        if (typeof SourceTextModule === 'function') {
            const mod = new SourceTextModule(js, { context: this.ctx, identifier: path.join(this.SCRIPTDB_DIR, 'virtual-entry.js') });
            await mod.link(this.moduleLinker.bind(this));
            await mod.evaluate();

            return {
                namespace: mod.namespace,
                logs,
            };
        }

        let processedCode = js;

        processedCode = processedCode.replace(
            /var\s+(\w+)\s+=\s+require\((['"])([^'"]+)\2\);/g,
            (_match: string, varName: string, quote: string, modulePath: string) => {
                return `const ${varName} = require(${quote}${modulePath}${quote});`;
            },
        );

        processedCode = processedCode.replace(
            /import\s+\{([^}]+)\}\s+from\s+(['"])([^'"]+)\2/g,
            (_match: string, imports: string, quote: string, modulePath: string) => {
                return `const { ${imports} } = require(${quote}${modulePath}${quote});`;
            },
        );

        processedCode = processedCode.replace(
            /import\s+(\w+)\s+from\s+(['"])([^'"]+)\2/g,
            (_match: string, name: string, quote: string, modulePath: string) => {
                return `const ${name} = require(${quote}${modulePath}${quote});`;
            },
        );

        processedCode = processedCode.replace(/import\(([^)]+)\)/g, 'require($1)');
        try {
            const moduleWrapper = { exports: {} as any };
            const initialExports = moduleWrapper.exports;
            const originalModule = this._registerModules.module;
            const originalExports = this._registerModules.exports;

            this._registerModules.module = moduleWrapper;
            this._registerModules.exports = moduleWrapper.exports;
            this.ctx = vm.createContext(this._registerModules);

            let result: any;
            try {
                result = vm.runInContext(processedCode, this.ctx, {
                    filename: path.join(this.SCRIPTDB_DIR, 'virtual-entry.js'),
                });
            } finally {
                if (originalModule) {
                    this._registerModules.module = originalModule;
                } else {
                    delete this._registerModules.module;
                }

                if (originalExports) {
                    this._registerModules.exports = originalExports;
                } else {
                    delete this._registerModules.exports;
                }

                this.ctx = vm.createContext(this._registerModules);
            }

            const hasExplicitExports = moduleWrapper.exports !== initialExports
                || (typeof initialExports === 'object' && initialExports !== null && Object.keys(initialExports).length > 0);

            return {
                namespace: hasExplicitExports ? moduleWrapper.exports : result,
                logs,
            };
        } catch (error) {
            throw error;
        }
    }
}