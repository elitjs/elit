export interface PackageInfo {
    name: string;
    description: string;
    category: 'core' | 'client' | 'server' | 'native' | 'tooling';
}

export const PACKAGES: PackageInfo[] = [
    { name: '@elitjs/core', description: 'Shared types: VNode, State, Props, JsonNode.', category: 'core' },
    { name: '@elitjs/el', description: 'Element DSL — hyperscript + tag factories.', category: 'client' },
    { name: '@elitjs/dom', description: 'DOM renderer, reconciliation, reactive primitives.', category: 'client' },
    { name: '@elitjs/state', description: 'createState, computed, effect — facade over dom.', category: 'client' },
    { name: '@elitjs/router', description: 'Client-side router with guards and history.', category: 'client' },
    { name: '@elitjs/style', description: 'CSS-in-JS — selectors, scoping, style store.', category: 'client' },
    { name: '@elitjs/hmr', description: 'Hot-module replacement runtime for dev servers.', category: 'client' },
    { name: '@elitjs/render-context', description: 'Constants, globals, captured-render context.', category: 'core' },
    { name: '@elitjs/universal', description: 'Isomorphic helpers shared by client and server.', category: 'core' },
    { name: '@elitjs/server', description: 'Server runtime — HTTP/HTTPS/WS composition.', category: 'server' },
    { name: '@elitjs/http', description: 'HTTP server adapter.', category: 'server' },
    { name: '@elitjs/https', description: 'HTTPS server adapter.', category: 'server' },
    { name: '@elitjs/ws', description: 'WebSocket server adapter.', category: 'server' },
    { name: '@elitjs/wss', description: 'Secure WebSocket (wss) server adapter.', category: 'server' },
    { name: '@elitjs/database', description: 'Database integration helpers.', category: 'server' },
    { name: '@elitjs/smtp-server', description: 'SMTP server adapter.', category: 'server' },
    { name: '@elitjs/native', description: 'Native (mobile/desktop) VNode-to-tree transform.', category: 'native' },
    { name: '@elitjs/desktop', description: 'Desktop runtime and host integration.', category: 'native' },
    { name: '@elitjs/desktop-auto-render', description: 'Automatic render bootstrap for desktop.', category: 'native' },
    { name: '@elitjs/wapk', description: 'WAPK archive, runtime, online sync.', category: 'native' },
    { name: '@elitjs/cli', description: 'Command-line interface — scaffolding, build, serve.', category: 'tooling' },
    { name: '@elitjs/config', description: 'Configuration loading and validation.', category: 'tooling' },
    { name: '@elitjs/build', description: 'Build pipeline and bundler integration.', category: 'tooling' },
    { name: '@elitjs/dev-build', description: 'Development-mode build pipeline with HMR.', category: 'tooling' },
    { name: '@elitjs/preview-build', description: 'Preview production build pipeline.', category: 'tooling' },
    { name: '@elitjs/pm', description: 'Process manager — start, stop, watch, restart.', category: 'tooling' },
    { name: '@elitjs/devtools', description: 'Browser DevTools panel for inspecting Elit.js apps.', category: 'tooling' },
    { name: '@elitjs/test', description: 'Test runner integration for Elit.js projects.', category: 'tooling' },
    { name: '@elitjs/chokidar', description: 'Cross-platform file watcher.', category: 'tooling' },
    { name: '@elitjs/fs', description: 'Filesystem polyfill for all Elit.js runtimes.', category: 'tooling' },
    { name: '@elitjs/path', description: 'Path utilities polyfilled across runtimes.', category: 'tooling' },
    { name: '@elitjs/mime-types', description: 'MIME type lookup for servers.', category: 'tooling' },
    { name: '@elitjs/runtime', description: 'Shared runtime helpers for client/server.', category: 'core' },
    { name: '@elitjs/workspace-package', description: 'Workspace package discovery helpers.', category: 'tooling' },
    { name: 'create-elit', description: 'Project scaffolder for new Elit.js apps.', category: 'tooling' },
    { name: 'create-elit-skills', description: 'Scaffolds Elit.js AI skills (SKILL.md) for Claude Code, agents, and Copilot.', category: 'tooling' },
];

export const PACKAGE_CATEGORIES: Record<PackageInfo['category'], string> = {
    core: 'Core',
    client: 'Client',
    server: 'Server',
    native: 'Native & Desktop',
    tooling: 'Tooling',
};
