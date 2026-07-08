#!/usr/bin/env python3
"""Scaffold a @elitjs/* server-side package with standard config."""
import json
import os
import sys
import shutil

def scaffold(name, description, deps):
    src_dir = f'src/server/{name}'
    pkg_dir = f'packages/{name}'
    src_dst = f'{pkg_dir}/src'
    if os.path.exists(pkg_dir):
        shutil.rmtree(pkg_dir)
    os.makedirs(src_dst, exist_ok=True)

    # Copy source
    for item in os.listdir(src_dir):
        s = os.path.join(src_dir, item)
        d = os.path.join(src_dst, item)
        if os.path.isdir(s):
            shutil.copytree(s, d)
        else:
            shutil.copy2(s, d)

    # Rewrite shares/runtime and sibling server imports
    rewrites = [
        (b"from '../../shares/runtime'", b"from '@elitjs/runtime'"),
        (b"from '../../shares/mime-types'", b"from '@elitjs/mime-types'"),
        (b"from '../http'", b"from '@elitjs/http'"),
        (b"from '../https'", b"from '@elitjs/https'"),
        (b"from '../fs'", b"from '@elitjs/fs'"),
        (b"from '../path'", b"from '@elitjs/path'"),
        (b"from '../ws'", b"from '@elitjs/ws'"),
        (b"from '../wss'", b"from '@elitjs/wss'"),
        (b"from '../chokidar'", b"from '@elitjs/chokidar'"),
        (b"from '../database'", b"from '@elitjs/database'"),
        (b"from '../smtp-server'", b"from '@elitjs/smtp-server'"),
    ]
    for dp, dn, fn in os.walk(src_dst):
        for f in fn:
            if not f.endswith('.ts'):
                continue
            p = os.path.join(dp, f)
            with open(p, 'rb') as fh:
                data = fh.read()
            new_data = data
            for old, new in rewrites:
                new_data = new_data.replace(old, new)
            if new_data != data:
                with open(p, 'wb') as fh:
                    fh.write(new_data)

    # Write package.json
    pkg = {
        "name": f"@elitjs/{name}",
        "version": "4.0.0",
        "description": description,
        "type": "module",
        "main": "dist/index.cjs",
        "module": "dist/index.mjs",
        "types": "dist/index.d.ts",
        "exports": {
            ".": {
                "types": "./dist/index.d.ts",
                "import": "./dist/index.mjs",
                "require": "./dist/index.cjs"
            }
        },
        "files": ["dist"],
        "scripts": {
            "build": "tsup",
            "dev": "tsup --watch"
        },
        "license": "MIT",
        "repository": {
            "type": "git",
            "url": "https://github.com/elitjs/elit.git",
            "directory": f"packages/{name}"
        },
        "bugs": {"url": "https://github.com/elitjs/elit/issues"},
        "homepage": "https://elitjs.github.io/elit/",
        "publishConfig": {"access": "public"},
        "dependencies": deps,
        "devDependencies": {
            "tsup": "^8.0.0",
            "typescript": "^5.3.0"
        }
    }
    with open(f'{pkg_dir}/package.json', 'w') as fh:
        json.dump(pkg, fh, indent=2)
        fh.write('\n')

    # Write tsup.config.ts
    with open(f'{pkg_dir}/tsup.config.ts', 'w') as fh:
        fh.write("""import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  minify: false,
  shims: true,
  target: 'es2020',
  platform: 'node',
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.mjs',
      dts: '.d.ts'
    };
  }
});
""")

    # Write tsconfig.json
    with open(f'{pkg_dir}/tsconfig.json', 'w') as fh:
        fh.write("""{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "types": ["node"]
  },
  "include": ["src"]
}
""")

    # Write .npmignore
    with open(f'{pkg_dir}/.npmignore', 'w') as fh:
        fh.write("""src
tsup.config.ts
tsconfig.json
node_modules
*.log
.DS_Store
""")

    print(f'Scaffolded {pkg_dir}')

if __name__ == '__main__':
    name = sys.argv[1]
    desc = sys.argv[2]
    deps_json = sys.argv[3] if len(sys.argv) > 3 else '{}'
    deps = json.loads(deps_json)
    scaffold(name, desc, deps)
