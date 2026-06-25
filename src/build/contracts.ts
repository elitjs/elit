export interface ResolveConfig {
    /**
     * Map import specifiers to alternative targets. Keys are matched at the
     * start of an import specifier; values are filesystem paths (relative to
     * the project root, or absolute). Example: `{ '@': './src' }` rewrites
     * `import x from '@/components/foo'` to `./src/components/foo`.
     */
    alias?: Record<string, string>;
}

export interface BuildOptions {
    entry: string;
    outDir?: string;
    outFile?: string;
    minify?: boolean;
    sourcemap?: boolean;
    target?: 'es2015' | 'es2016' | 'es2017' | 'es2018' | 'es2019' | 'es2020' | 'es2021' | 'es2022' | 'esnext';
    format?: 'esm' | 'cjs' | 'iife';
    globalName?: string;
    platform?: 'browser' | 'node' | 'neutral';
    basePath?: string;
    external?: string[];
    resolve?: ResolveConfig;
    treeshake?: boolean;
    logging?: boolean;
    env?: Record<string, string>;
    copy?: Array<{ from: string; to: string; transform?: (content: string, config: BuildOptions) => string }>;
    onBuildEnd?: (result: BuildResult) => void | Promise<void>;
    standalonePreview?: boolean;
    standaloneDev?: boolean;
    standaloneDevOutFile?: string;
    standalonePreviewOutFile?: string;
}

export interface BuildResult {
    outputPath: string;
    buildTime: number;
    size: number;
}
