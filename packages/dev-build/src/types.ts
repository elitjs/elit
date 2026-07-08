import type { DevServerOptions } from '@elitjs/server';

export interface StandaloneDevClientPlan {
    basePath: string;
    fallbackRootRelativePath: string;
    index?: string;
    rootRelativePath: string;
}

export interface StandaloneDevBuildPlan {
    clients?: StandaloneDevClientPlan[];
    fallbackRootRelativePath?: string;
    index?: string;
    outputPath: string;
    outputRoot: string;
    packageJsonPath: string;
    rootRelativePath?: string;
    usesClientArray: boolean;
}

export interface StandaloneDevBuildOptions {
    allBuilds?: Array<{ outDir?: string }>;
    buildConfig?: { outDir?: string } | null;
    configPath?: string | null;
    cwd?: string;
    devConfig?: DevServerOptions | null;
    logging?: boolean;
    outDir?: string;
    outFile?: string;
}