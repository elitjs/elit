#!/usr/bin/env python3
"""Copy LICENSE to every package and create minimal README.md where missing.

Idempotent: existing README.md files are preserved. LICENSE is overwritten to
guarantee uniform content across packages.
"""
import os
import sys

ROOT = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
PACKAGES = os.path.join(ROOT, 'packages')

with open(os.path.join(ROOT, 'LICENSE'), 'rb') as f:
    LICENSE_BYTES = f.read()

# Concise descriptions per package. Inferred from package purpose.
DESCRIPTIONS = {
    'build': 'Build pipeline, bundler integration, and contracts for Elit apps.',
    'chokidar': 'Cross-platform file watcher wrapping chokidar for Elit.',
    'cli': 'Command-line interface for scaffolding, building, and serving Elit apps.',
    'config': 'Configuration loading and validation for Elit projects.',
    'core': 'Shared types and primitives used across all @elitjs/* packages.',
    'create-elit': 'Project scaffolder for new Elit apps (basic, fullstack, native).',
    'database': 'Database integration helpers for Elit apps.',
    'desktop': 'Desktop runtime and host integration for Elit.',
    'desktop-auto-render': 'Automatic render bootstrap for Elit desktop targets.',
    'dev-build': 'Development-mode build pipeline with HMR for Elit.',
    'devtools': 'Browser DevTools panel for inspecting Elit state, router, and render telemetry.',
    'dom': 'DOM rendering, reconciliation, and reactive primitives for Elit.',
    'el': 'Element DSL and component primitives for Elit.',
    'fs': 'Filesystem polyfill tuned for Elit runtimes (browser, desktop, native).',
    'hmr': 'Hot-module replacement runtime for Elit dev servers.',
    'http': 'HTTP server adapter for Elit.',
    'https': 'HTTPS server adapter for Elit.',
    'mime-types': 'MIME type lookup utility for Elit servers.',
    'native': 'Native (mobile/desktop) runtime rendering and bindings for Elit.',
    'path': 'Path utilities polyfilled across Elit runtimes.',
    'pm': 'Package-manager detection and invocation for Elit tools.',
    'preview-build': 'Preview production build pipeline for Elit.',
    'render-context': 'Render context (constants, globals, captured render) for Elit.',
    'router': 'Client-side router with createRouter, routerLink, and routerView.',
    'runtime': 'Shared runtime helpers used across Elit server and client.',
    'server': 'Server runtime composing HTTP/HTTPS/WS adapters for Elit.',
    'smtp-server': 'SMTP server adapter for Elit.',
    'state': 'Reactive state, computed values, and effects for Elit (facade over @elitjs/dom).',
    'style': 'CSS-in-JS renderer, selector parser, and style store for Elit.',
    'test': 'Jest-based test runner integration for Elit projects.',
    'universal': 'Universal (isomorphic) helpers shared by client and server Elit code.',
    'wapk': 'WAPK archive, runtime, online sync, and remote resolution for Elit.',
    'workspace-package': 'Workspace package discovery and metadata helpers for Elit tooling.',
    'ws': 'WebSocket server adapter for Elit.',
    'wss': 'Secure WebSocket (wss) server adapter for Elit.',
}

README_TEMPLATE = """# @elitjs/{name}

{description} Extracted from [elit](https://github.com/elitjs/elit) as a standalone package.

## Install

```bash
npm install @elitjs/{name}
```

## License

MIT
"""

license_count = 0
readme_count = 0

for name in sorted(os.listdir(PACKAGES)):
    pkg_dir = os.path.join(PACKAGES, name)
    if not os.path.isdir(pkg_dir):
        continue

    license_path = os.path.join(pkg_dir, 'LICENSE')
    with open(license_path, 'wb') as f:
        f.write(LICENSE_BYTES)
    license_count += 1

    readme_path = os.path.join(pkg_dir, 'README.md')
    if os.path.exists(readme_path):
        continue
    description = DESCRIPTIONS.get(name)
    if description is None:
        print(f'SKIP README (no description): {name}')
        continue
    content = README_TEMPLATE.format(name=name, description=description)
    with open(readme_path, 'wb') as f:
        f.write(content.encode('utf-8'))
    readme_count += 1

print(f'LICENSE written: {license_count}')
print(f'README created: {readme_count}')
