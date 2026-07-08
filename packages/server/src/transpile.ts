import * as nodeModule from 'node:module';

type StripTypeScriptTypes = (
  code: string,
  options?: {
    mode?: 'strip' | 'transform';
    sourceMap?: boolean;
    sourceUrl?: string;
  },
) => string;

type NodeTransformLoader = 'ts' | 'tsx';

const stripTypeScriptTypes = typeof (nodeModule as { stripTypeScriptTypes?: unknown }).stripTypeScriptTypes === 'function'
  ? ((nodeModule as { stripTypeScriptTypes: StripTypeScriptTypes }).stripTypeScriptTypes)
  : undefined;

let cachedNodeEsbuildTransformSync:
  | ((code: string, options: { loader: NodeTransformLoader; format: 'esm'; target: 'es2020'; sourcemap: false | 'inline' }) => { code: string })
  | null
  | undefined;

function stripBrowserTypeScriptSource(source: string, filename: string): string {
  if (!stripTypeScriptTypes) {
    throw new Error(`TypeScript dev server transpilation requires Node.js 22+ or the esbuild package (${filename}).`);
  }

  const originalEmitWarning = process.emitWarning;

  try {
    process.emitWarning = (((warning: string | Error, ...args: any[]) => {
      if (typeof warning === 'string' && warning.includes('stripTypeScriptTypes')) {
        return;
      }

      return (originalEmitWarning as any).call(process, warning, ...args);
    }) as typeof process.emitWarning);

    return stripTypeScriptTypes(source, {
      mode: 'transform',
      sourceUrl: filename,
    });
  } finally {
    process.emitWarning = originalEmitWarning;
  }
}

async function getNodeEsbuildTransformSync() {
  if (cachedNodeEsbuildTransformSync !== undefined) {
    return cachedNodeEsbuildTransformSync;
  }

  try {
    const esbuildModule = await import('esbuild') as {
      transformSync?: (code: string, options: { loader: NodeTransformLoader; format: 'esm'; target: 'es2020'; sourcemap: false | 'inline' }) => { code: string };
    };

    cachedNodeEsbuildTransformSync = typeof esbuildModule.transformSync === 'function'
      ? esbuildModule.transformSync.bind(esbuildModule)
      : null;
  } catch {
    cachedNodeEsbuildTransformSync = null;
  }

  return cachedNodeEsbuildTransformSync;
}

export async function transpileNodeBrowserModule(source: string, options: { filename: string; loader: NodeTransformLoader; mode: 'dev' | 'preview' }): Promise<string> {
  const compileWithEsbuild = async () => {
    const esbuildTransformSync = await getNodeEsbuildTransformSync();

    if (!esbuildTransformSync) {
      const runtimeLabel = options.loader === 'tsx' ? 'TSX' : 'TypeScript';
      throw new Error(`${runtimeLabel} dev server transpilation requires the esbuild package (${options.filename}).`);
    }

    if (options.mode === 'preview') {
      const { default: JavaScriptObfuscator } = await import('javascript-obfuscator');
      const tsResult = esbuildTransformSync(source, {
        loader: options.loader,
        format: 'esm',
        target: 'es2020',
        sourcemap: false,
      });

      return JavaScriptObfuscator.obfuscate(tsResult.code, {
        compact: true,
        renameGlobals: false,
      }).getObfuscatedCode();
    }

    return esbuildTransformSync(source, {
      loader: options.loader,
      format: 'esm',
      target: 'es2020',
      sourcemap: 'inline',
    }).code;
  };

  if (options.loader === 'ts') {
    try {
      const stripped = stripBrowserTypeScriptSource(source, options.filename);

      if (options.mode === 'preview') {
        const { default: JavaScriptObfuscator } = await import('javascript-obfuscator');
        return JavaScriptObfuscator.obfuscate(stripped, {
          compact: true,
          renameGlobals: false,
        }).getObfuscatedCode();
      }

      return stripped;
    } catch {
      return compileWithEsbuild();
    }
  }

  return compileWithEsbuild();
}