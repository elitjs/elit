/**
 * Runtime detection and global type declarations
 * Shared across all modules for consistency
 */

/**
 * Runtime detection (cached at module load)
 */
export const runtime = (() => {
  // @ts-ignore - Deno global
  if (typeof Deno !== 'undefined') return 'deno';
  // @ts-ignore - Bun global
  if (typeof Bun !== 'undefined') return 'bun';
  return 'node';
})() as 'node' | 'bun' | 'deno';

export const isNode = runtime === 'node';
export const isBun = runtime === 'bun';
export const isDeno = runtime === 'deno';

// Global declarations for runtime-specific APIs
declare global {
  // @ts-ignore - Bun global
  const Bun: {
    build(options: {
      entrypoints: string[];
      outdir?: string;
      target?: string;
      format?: string;
      minify?: boolean;
      sourcemap?: string;
      external?: string[];
      naming?: string;
      plugins?: any[];
      define?: Record<string, string>;
    }): Promise<{
      success: boolean;
      outputs: Array<{ path: string; size: number }>;
      logs: any[];
    }>;
    Transpiler: new (options?: {
      loader?: string;
      target?: string;
      minify?: boolean;
    }) => {
      transform(code: string, loader?: string): Promise<string>;
      transformSync(code: string, loader?: string): string;
    };
    file(path: string): {
      size: number;
      arrayBuffer(): ArrayBuffer | Promise<ArrayBuffer>;
      exists(): Promise<boolean>;
    };
    write(path: string, data: string | Buffer | Uint8Array): Promise<void>;
  } | undefined;

  // @ts-ignore - Deno global
  const Deno: {
    emit(rootSpecifier: string | URL, options?: {
      bundle?: 'module' | 'classic';
      check?: boolean;
      compilerOptions?: any;
      importMap?: string;
      importMapPath?: string;
      sources?: Record<string, string>;
    }): Promise<{
      files: Record<string, string>;
      diagnostics: any[];
    }>;
    writeTextFile(path: string, data: string): Promise<void>;
    readFile(path: string): Promise<Uint8Array>;
    readFileSync(path: string): Uint8Array;
    writeFile(path: string, data: Uint8Array): Promise<void>;
    writeFileSync(path: string, data: Uint8Array): void;
    stat(path: string): Promise<any>;
    statSync(path: string): any;
    mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
    mkdirSync(path: string, options?: { recursive?: boolean }): void;
    readDir(path: string): AsyncIterable<any>;
    readDirSync(path: string): Iterable<any>;
    remove(path: string, options?: { recursive?: boolean }): Promise<void>;
    removeSync(path: string, options?: { recursive?: boolean }): void;
    rename(oldPath: string, newPath: string): Promise<void>;
    renameSync(oldPath: string, newPath: string): void;
    copyFile(src: string, dest: string): Promise<void>;
    copyFileSync(src: string, dest: string): void;
    realPath(path: string): Promise<string>;
    realPathSync(path: string): string;
    watchFs(paths: string | string[]): AsyncIterable<{
      kind: string;
      paths: string[];
    }>;
    build: {
      os: string;
    };
  } | undefined;
}
