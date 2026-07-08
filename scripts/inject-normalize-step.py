#!/usr/bin/env python3
"""Insert 'Normalize file: deps' step before 'Publish to NPM' in all publish workflows."""
import os
import re

WORKFLOW_DIR = os.path.join('.github', 'workflows')

NORMALIZE_STEP = """      - name: Normalize file: deps
        working-directory: ./packages/PKGNAME
        run: node ../../scripts/normalize-deps.mjs ${{ steps.version.outputs.version }}

"""

count = 0
for name in sorted(os.listdir(WORKFLOW_DIR)):
    if not name.startswith('publish-elitjs-') or not name.endswith('.yml'):
        continue
    pkgname = name[len('publish-elitjs-'):-len('.yml')]
    path = os.path.join(WORKFLOW_DIR, name)
    with open(path, 'rb') as f:
        content = f.read()
    if b'Normalize file: deps' in content:
        print(f'SKIP (already has step): {name}')
        continue
    pattern = b'      - name: Publish to NPM\n'
    if pattern not in content:
        print(f'SKIP (no Publish step): {name}')
        continue
    step = NORMALIZE_STEP.replace('PKGNAME', pkgname).encode('utf-8')
    new_content = content.replace(pattern, step + pattern, 1)
    with open(path, 'wb') as f:
        f.write(new_content)
    count += 1
    print(f'UPDATED: {name}')

print(f'\nTotal: {count} workflows updated')
