#!/usr/bin/env python3
"""Rewrite GitHub org across the repo: elitjs/elit -> elitjs/elit.

Binary mode preserves CRLF on Windows. Touches every file under repo root
except .git, node_modules, and dist directories.
"""
import os

ROOT = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
OLD = b'elitjs/elit'
NEW = b'elitjs/elit'

SKIP_DIRS = {'.git', 'node_modules', 'dist', '.cache'}
count_files = 0
count_replacements = 0

for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
    for fname in filenames:
        path = os.path.join(dirpath, fname)
        try:
            with open(path, 'rb') as f:
                content = f.read()
        except (PermissionError, OSError):
            continue
        if OLD not in content:
            continue
        n = content.count(OLD)
        new_content = content.replace(OLD, NEW)
        with open(path, 'wb') as f:
            f.write(new_content)
        count_files += 1
        count_replacements += n
        rel = os.path.relpath(path, ROOT)
        print(f'  {rel}: {n}')

print(f'\nFiles updated: {count_files}')
print(f'Replacements: {count_replacements}')
