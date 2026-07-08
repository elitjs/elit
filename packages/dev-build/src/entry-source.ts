import type { DevServerOptions } from '@elitjs/server';

import {
    createInlineConfigSource,
    normalizeImportPath,
} from '@elitjs/preview-build';
import { resolveStandaloneDevFallbackRootRelativePath } from './plan';
import type { StandaloneDevBuildOptions, StandaloneDevBuildPlan } from './types';

export function createStandaloneDevEntrySource(
    configPath: string | null | undefined,
    plan: StandaloneDevBuildPlan,
    devConfig?: DevServerOptions | null,
    buildOptions?: Pick<StandaloneDevBuildOptions, 'cwd' | 'buildConfig' | 'allBuilds'>,
): string {
    const fallbackRootRelativePath = resolveStandaloneDevFallbackRootRelativePath(plan, {
        cwd: buildOptions?.cwd,
        buildConfig: buildOptions?.buildConfig,
        allBuilds: buildOptions?.allBuilds,
    });
    const configImportBlock = configPath
        ? `import userConfigModule from ${JSON.stringify(normalizeImportPath(configPath))};\nconst resolvedConfig = userConfigModule ?? {};`
        : 'const resolvedConfig = {} as Record<string, any>;';
    const inlineConfigSource = createInlineConfigSource({
        port: devConfig?.port,
        host: devConfig?.host,
        open: devConfig?.open,
        logging: devConfig?.logging,
        domain: devConfig?.domain,
        env: devConfig?.env,
        basePath: devConfig?.basePath,
        index: devConfig?.index,
        watch: devConfig?.watch,
        ignore: devConfig?.ignore,
    });

    const clientArraySource = plan.clients
        ? `const runtimeClients = [
${plan.clients.map((client, index) => `  {
    ...(mergedConfig.clients?.[${index}] ?? {}),
    basePath: mergedConfig.clients?.[${index}]?.basePath ?? ${JSON.stringify(client.basePath)},
    fallbackRoot: resolve(__dirname, ${JSON.stringify(client.fallbackRootRelativePath)}),
    index: mergedConfig.clients?.[${index}]?.index ?? ${client.index ? JSON.stringify(client.index) : 'undefined'},
    root: resolve(__dirname, ${JSON.stringify(client.rootRelativePath)}),
    mode: 'dev',
  }`).join(',\n')}
];`
        : '';

    const rootSource = plan.usesClientArray
        ? '    clients: runtimeClients,\n'
        : `    root: resolve(__dirname, ${JSON.stringify(plan.rootRelativePath || '.')}),\n    fallbackRoot: resolve(__dirname, ${JSON.stringify(fallbackRootRelativePath)}),\n    basePath: mergedConfig.basePath ?? '',\n    index: mergedConfig.index ?? ${plan.index ? JSON.stringify(plan.index) : 'undefined'},\n`;

    return `import { createDevServer } from 'elit/server';
import { resolve } from 'node:path';

${configImportBlock}

const inlineDevConfig = ${inlineConfigSource};
const runtimeConfig = (resolvedConfig as any).dev ?? {};
const mergedConfig = { ...runtimeConfig, ...inlineDevConfig };
${clientArraySource}
const options = {
    port: mergedConfig.port || 3000,
    host: mergedConfig.host || 'localhost',
    open: mergedConfig.open ?? false,
    logging: mergedConfig.logging ?? true,
    domain: mergedConfig.domain,
    api: mergedConfig.api,
    ws: mergedConfig.ws,
    https: mergedConfig.https,
    ssr: mergedConfig.ssr,
    proxy: mergedConfig.proxy,
    worker: mergedConfig.worker ?? [],
    watch: mergedConfig.watch ?? ['**/*.ts', '**/*.js', '**/*.html', '**/*.css'],
    ignore: mergedConfig.ignore ?? ['node_modules/**', 'dist/**', '.git/**', '**/*.d.ts'],
    env: mergedConfig.env,
${rootSource}    mode: 'dev',
};

const devServer = createDevServer(options);

const shutdown = async () => {
    await devServer.close();
    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
`;
}