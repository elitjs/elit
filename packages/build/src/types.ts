import type { BuildOptions } from './contracts';

export type BuildPlatform = NonNullable<BuildOptions['platform']>;

export interface ResolvedBuildOptions extends BuildOptions {
    outDir: string;
    minify: boolean;
    sourcemap: boolean;
    target: NonNullable<BuildOptions['target']>;
    format: NonNullable<BuildOptions['format']>;
    treeshake: boolean;
    logging: boolean;
    external: string[];
}

export interface ResolvedBuildPaths {
    entryPath: string;
    outDir: string;
    outFile: string;
    outputPath: string;
}

export interface RuntimeBuildContext {
    config: ResolvedBuildOptions;
    paths: ResolvedBuildPaths;
    platform: BuildPlatform;
    plugins: any[];
    define: Record<string, string>;
    startTime: number;
}

export interface RuntimeBuildResult {
    result: any;
    buildTime: number;
    size: number;
}

export interface WorkspacePackagePluginOptions {
    preferBuilt?: boolean;
    preferredBuiltFormat?: 'cjs' | 'esm';
}