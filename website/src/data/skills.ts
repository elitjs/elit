export interface SkillInfo {
    name: string;
    description: string;
    category: 'pattern' | 'reference';
}

export const SKILLS: SkillInfo[] = [
    { name: 'elit-component', description: 'UI with @elitjs/el factories + @elitjs/dom renderer.', category: 'pattern' },
    { name: 'elit-state', description: 'Reactive state: createState, computed, bindValue, SharedState.', category: 'pattern' },
    { name: 'elit-server', description: 'HTTP routes, WebSocket, middleware, dev/preview config.', category: 'pattern' },
    { name: 'elit-native-desktop', description: 'Native Android/iOS generation + desktop / WAPK runtimes.', category: 'pattern' },
    { name: 'elit-project-structure', description: 'Multi-file app layout + elit.config.ts blocks.', category: 'pattern' },
    { name: 'elit-config', description: 'Writing elit.config.ts — every block (dev/build/preview/test/desktop/mobile/pm/wapk).', category: 'pattern' },
    { name: 'elit-wapk', description: 'Package, run, inspect, extract, patch .wapk archives.', category: 'pattern' },
    { name: 'elit-pm', description: 'Process manager: script/file/wapk start, reload, scale, health, proxy.', category: 'pattern' },

    { name: 'elit-ref-el-dom', description: '@elitjs/el + @elitjs/dom exact signatures.', category: 'reference' },
    { name: 'elit-ref-state', description: '@elitjs/state: createState, computed, effect, reactive, SharedState.', category: 'reference' },
    { name: 'elit-ref-router', description: '@elitjs/router: createRouter, createRouterView, routerLink.', category: 'reference' },
    { name: 'elit-ref-server', description: '@elitjs/server: ServerRouter, createDevServer, middleware, proxy.', category: 'reference' },
    { name: 'elit-ref-style', description: '@elitjs/style: CreateStyle class — every method.', category: 'reference' },
    { name: 'elit-ref-database', description: '@elitjs/database: Database class + @db/<name> VM flow.', category: 'reference' },
    { name: 'elit-ref-fs-path', description: '@elitjs/fs + @elitjs/path (sync/async/promises, posix/win32).', category: 'reference' },
    { name: 'elit-ref-native-desktop', description: '@elitjs/native + @elitjs/desktop exact signatures.', category: 'reference' },
    { name: 'elit-ref-net', description: '@elitjs/http, https, ws, wss, smtp-server, mime-types.', category: 'reference' },
    { name: 'elit-ref-build', description: '@elitjs/build: build() + BuildOptions/ResolveConfig types.', category: 'reference' },
    { name: 'elit-ref-devtools', description: '@elitjs/devtools: installDevTools, trackState, trackRouter.', category: 'reference' },
    { name: 'elit-ref-test', description: '@elitjs/test: runTests, globals, reporters, coverage.', category: 'reference' },
    { name: 'elit-ref-cli', description: 'elit CLI commands + create-elit scaffolder templates.', category: 'reference' },
    { name: 'elit-ref-utils', description: '@elitjs/core, runtime, config, render-context, universal, hmr.', category: 'reference' },
];

export const SKILL_CATEGORIES: Record<SkillInfo['category'], string> = {
    pattern: 'Pattern skills (use-case oriented)',
    reference: 'Reference skills (exact API surface)',
};
