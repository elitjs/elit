import type { BuildOptions } from '@elitjs/build';
import type { PreviewOptions } from '@elitjs/server';

export interface StandalonePreviewClientPlan {
    basePath: string;
    index?: string;
    rootRelativePath: string;
}

export interface StandalonePreviewBuildPlan {
    clients?: StandalonePreviewClientPlan[];
    index?: string;
    outputPath: string;
    outputRoot: string;
    packageJsonPath: string;
    rootRelativePath?: string;
    usesClientArray: boolean;
}

export interface StandalonePreviewBuildOptions {
    allBuilds: BuildOptions[];
    buildConfig: BuildOptions;
    configPath?: string | null;
    cwd?: string;
    logging?: boolean;
    previewConfig?: PreviewOptions | null;
    outFile?: string;
}