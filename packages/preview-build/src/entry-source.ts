import type { PreviewOptions } from '@elitjs/server';

import {
    createInlineConfigSource,
    normalizeImportPath,
} from './helpers';
import type { StandalonePreviewBuildPlan } from './types';

export function createStandalonePreviewEntrySource(
    configPath: string | null | undefined,
    plan: StandalonePreviewBuildPlan,
    previewConfig?: PreviewOptions | null,
): string {
    const configImportBlock = configPath
        ? `import userConfigModule from ${JSON.stringify(normalizeImportPath(configPath))};\nconst resolvedConfig = userConfigModule ?? {};`
        : 'const resolvedConfig = {} as Record<string, any>;';
    const inlineConfigSource = createInlineConfigSource({
        port: previewConfig?.port,
        host: previewConfig?.host,
        open: previewConfig?.open,
        logging: previewConfig?.logging,
        domain: previewConfig?.domain,
        env: previewConfig?.env,
        basePath: previewConfig?.basePath,
        index: previewConfig?.index,
    });

    const clientArraySource = plan.clients
        ? `const runtimeClients = [
${plan.clients.map((client, index) => `  {
    ...(mergedPreviewConfig.clients?.[${index}] ?? {}),
    basePath: mergedPreviewConfig.clients?.[${index}]?.basePath ?? ${JSON.stringify(client.basePath)},
    index: mergedPreviewConfig.clients?.[${index}]?.index ?? ${client.index ? JSON.stringify(client.index) : 'undefined'},
    root: resolve(__dirname, ${JSON.stringify(client.rootRelativePath)}),
  }`).join(',\n')}
];`
        : '';

    const rootSource = plan.usesClientArray
        ? '    clients: runtimeClients,\n'
        : `    root: resolve(__dirname, ${JSON.stringify(plan.rootRelativePath || '.')}),\n    basePath: mergedPreviewConfig.basePath ?? '',\n    index: mergedPreviewConfig.index ?? ${plan.index ? JSON.stringify(plan.index) : 'undefined'},\n`;

    return `import { createDevServer } from 'elit/server';
import { resolve } from 'node:path';

${configImportBlock}

const inlinePreviewConfig = ${inlineConfigSource};
const previewConfig = (resolvedConfig as any).preview ?? {};
const mergedPreviewConfig = { ...previewConfig, ...inlinePreviewConfig };
${clientArraySource}
const options = {
    port: mergedPreviewConfig.port || 4173,
    host: mergedPreviewConfig.host || 'localhost',
    open: mergedPreviewConfig.open ?? false,
    logging: mergedPreviewConfig.logging ?? true,
    domain: mergedPreviewConfig.domain,
    api: mergedPreviewConfig.api,
    ws: mergedPreviewConfig.ws,
    https: mergedPreviewConfig.https,
    ssr: mergedPreviewConfig.ssr,
    proxy: mergedPreviewConfig.proxy,
    worker: mergedPreviewConfig.worker,
    env: mergedPreviewConfig.env,
${rootSource}    mode: 'preview',
};

const devServer = createDevServer(options);

if (options.logging === false) {
    const previewUrl = \`http://\${options.host}:\${options.port}\`;
    console.log(\`[elit] Preview server running at \${previewUrl}\`);
}

const shutdown = async () => {
    await devServer.close();
    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
`;
}