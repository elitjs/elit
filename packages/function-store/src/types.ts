export interface VMOptions {
    language?: 'ts' | 'js';
    registerModules?: { [key: string]: any };
    dir?: string;
}

export type VMModuleLoader = 'ts' | 'tsx' | 'js' | 'jsx';

export interface VMTranspileOptions {
    filename?: string;
    format?: 'cjs';
    loader?: VMModuleLoader;
}

export interface VMTransformResult {
    code: string;
}

export type StripTypeScriptTypes = (
    code: string,
    options?: {
        mode?: 'strip' | 'transform';
        sourceMap?: boolean;
        sourceUrl?: string;
    },
) => string;

export type DeclarationKind = 'valueDecl' | 'functionDecl' | 'classDecl';
export type UpdateValue = unknown;

export interface DeclarationMatch {
    kind: DeclarationKind;
    start: number;
    end: number;
    exported: boolean;
    prefixEnd?: number;
}