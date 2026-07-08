#!/usr/bin/env python3
"""Rewrite elit/* imports to @elitjs/* in create-elit templates and docs (CRLF-safe)."""
import os
import re

ROOT = os.path.join('packages', 'create-elit', 'src', 'templates')

MAPPING = [
    (rb"from 'elit/el'", rb"from '@elitjs/el'"),
    (rb"from 'elit/state'", rb"from '@elitjs/state'"),
    (rb"from 'elit/dom'", rb"from '@elitjs/dom'"),
    (rb"from 'elit/router'", rb"from '@elitjs/router'"),
    (rb"from 'elit/server'", rb"from '@elitjs/server'"),
    (rb"from 'elit/database'", rb"from '@elitjs/database'"),
    (rb"from 'elit/style'", rb"from '@elitjs/style'"),
    (rb"from 'elit/native'", rb"from '@elitjs/native'"),
    (rb"from 'elit/desktop'", rb"from '@elitjs/desktop'"),
    (rb"from 'elit/http'", rb"from '@elitjs/http'"),
    (rb"from 'elit/https'", rb"from '@elitjs/https'"),
    (rb"from 'elit/ws'", rb"from '@elitjs/ws'"),
    (rb"from 'elit/wss'", rb"from '@elitjs/wss'"),
    (rb"from 'elit/smtp-server'", rb"from '@elitjs/smtp-server'"),
    (rb"from 'elit/test'", rb"from '@elitjs/test'"),
    (rb"from 'elit/config'", rb"from '@elitjs/config'"),
    (rb"from 'elit'", rb"from '@elitjs/router'"),
]

EXTS = ('.ts', '.tsx', '.js', '.mjs', '.md')

changed = []
for dirpath, _, filenames in os.walk(ROOT):
    for name in filenames:
        if not name.endswith(EXTS):
            continue
        path = os.path.join(dirpath, name)
        with open(path, 'rb') as f:
            original = f.read()
        new = original
        for pattern, repl in MAPPING:
            new = re.sub(pattern, repl, new)
        if new != original:
            with open(path, 'wb') as f:
                f.write(new)
            changed.append(os.path.relpath(path))

print(f'Rewrote {len(changed)} files:')
for p in changed:
    print(f'  {p}')
