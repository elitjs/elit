#!/usr/bin/env python3
"""Insert 'Wait for @elitjs/* deps' step before 'Normalize file: deps' in all publish workflows."""
import os

WORKFLOW_DIR = os.path.join('.github', 'workflows')

WAIT_STEP = """      - name: Wait for @elitjs/* deps
        working-directory: ./packages/PKGNAME
        run: node ../../scripts/wait-for-deps.mjs ${{ steps.version.outputs.version }}

"""

count = 0
for name in sorted(os.listdir(WORKFLOW_DIR)):
    if not name.startswith('publish-elitjs-') or not name.endswith('.yml'):
        continue
    pkgname = name[len('publish-elitjs-'):-len('.yml')]
    path = os.path.join(WORKFLOW_DIR, name)
    with open(path, 'rb') as f:
        content = f.read()
    if b'Wait for @elitjs/* deps' in content:
        print(f'SKIP (already has step): {name}')
        continue
    pattern = b'      - name: Normalize file: deps\n'
    if pattern not in content:
        print(f'SKIP (no Normalize step): {name}')
        continue
    step = WAIT_STEP.replace('PKGNAME', pkgname).encode('utf-8')
    new_content = content.replace(pattern, step + pattern, 1)
    with open(path, 'wb') as f:
        f.write(new_content)
    count += 1
    print(f'UPDATED: {name}')

print(f'\nTotal: {count} workflows updated')
