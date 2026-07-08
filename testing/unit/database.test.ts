/// <reference path="../../packages/test/src/globals.d.ts" />

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { Database } from '../../packages/database/src';
import { save } from '../../packages/database/src';
import { update } from '../../packages/database/src';

function createTempDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'elit-database-'));
}

describe('database helpers preserve typed declarations', () => {
    it('save updates an existing typed binding in place', () => {
        const dir = createTempDir();
        const dbPath = path.join(dir, 'users.ts');

        try {
            fs.writeFileSync(
                dbPath,
                [
                    'type User = { id: number; name: string };',
                    '',
                    'export const users: User[] = [',
                    '    { id: 1, name: "Ann" }',
                    '];',
                    '',
                    'export default users;',
                    '',
                ].join('\n'),
                'utf8'
            );

            save('users', [{ id: 2, name: 'Bob' }], { dir });

            const content = fs.readFileSync(dbPath, 'utf8');

            expect(content).toBe([
                'type User = { id: number; name: string };',
                '',
                'export const users: User[] = [',
                '    {',
                '        id: 2,',
                '        name: "Bob"',
                '    }',
                '];',
                '',
                'export default users;',
                '',
            ].join('\n'));
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('update preserves type annotations instead of appending a duplicate export', () => {
        const dir = createTempDir();
        const dbPath = path.join(dir, 'users.ts');

        try {
            fs.writeFileSync(
                dbPath,
                [
                    'type User = { id: number; active: boolean };',
                    '',
                    'export const users: User[] = [];',
                    '',
                    'export default users;',
                    '',
                ].join('\n'),
                'utf8'
            );

            update('users', 'users', [{ id: 3, active: true }], { dir });

            const content = fs.readFileSync(dbPath, 'utf8');

            expect(content).toBe([
                'type User = { id: number; active: boolean };',
                '',
                'export const users: User[] = [',
                '    {',
                '        id: 3,',
                '        active: true',
                '    }',
                '];',
                '',
                'export default users;',
                '',
            ].join('\n'));

            expect((content.match(/export const users: User\[] =/g) || []).length).toBe(1);
            expect(content.includes('export const users: any = users;')).toBe(false);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('executes ES module JavaScript database files without requiring CommonJS packaging', async () => {
        const dir = createTempDir();

        try {
            fs.writeFileSync(path.join(dir, 'users.js'), [
                'export const users = [{ id: 1, name: "Ann" }];',
                'export default users;',
                '',
            ].join('\n'), 'utf8');

            const db = new Database({ dir, language: 'js' });
            const result = await db.execute(`
                import { users } from '@db/users';
                console.log(users[0].name);
            `);

            expect(result.logs).toEqual([
                {
                    type: 'log',
                    args: ['Ann'],
                },
            ]);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('strips TypeScript syntax from database modules without a bundled esbuild dependency', async () => {
        const dir = createTempDir();

        try {
            fs.writeFileSync(path.join(dir, 'users.ts'), [
                'type User = { id: number; name: string };',
                '',
                'export const users: User[] = [{ id: 1, name: "Ann" }];',
                'export default users;',
                '',
            ].join('\n'), 'utf8');

            const db = new Database({ dir, language: 'ts' });
            const result = await db.execute(`
                import { users } from '@db/users';
                console.log(users[0].name);
            `);

            expect(result.logs).toEqual([
                {
                    type: 'log',
                    args: ['Ann'],
                },
            ]);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('preserves underlying @db module execution errors instead of masking them as missing modules', async () => {
        const dir = createTempDir();

        try {
            fs.writeFileSync(path.join(dir, 'broken.ts'), [
                'throw new Error("broken module");',
                '',
                'export const value = 1;',
                '',
            ].join('\n'), 'utf8');

            const db = new Database({ dir, language: 'ts' });

            await expect(db.execute(`
                import { value } from '@db/broken';
                console.log(value);
            `)).rejects.toThrow('broken module');
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('loads @db TypeScript modules in fallback mode without leaking caller bindings into the module scope', async () => {
        const dir = createTempDir();
        const originalSourceTextModule = (vm as any).SourceTextModule;

        try {
            fs.writeFileSync(path.join(dir, 'users.ts'), [
                'export const users = [{ id: 1, name: "Ann" }];',
                'export default users;',
                '',
            ].join('\n'), 'utf8');

            (vm as any).SourceTextModule = undefined;

            const db = new Database({ dir, language: 'ts' });
            const result = await db.execute(`
                import { users } from '@db/users';
                console.log(users[0].name);
            `);

            expect(result.logs).toEqual([
                {
                    type: 'log',
                    args: ['Ann'],
                },
            ]);
        } finally {
            (vm as any).SourceTextModule = originalSourceTextModule;
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('rewrites default plus namespace imports in fallback mode without using regex-heavy import parsing', async () => {
        const dir = createTempDir();
        const originalSourceTextModule = (vm as any).SourceTextModule;

        try {
            fs.writeFileSync(path.join(dir, 'users.ts'), [
                'export const users = [{ id: 1, name: "Ann" }];',
                'export default users;',
                '',
            ].join('\n'), 'utf8');

            (vm as any).SourceTextModule = undefined;

            const db = new Database({ dir, language: 'ts' });
            const result = await db.execute(`
                import defaultUsers, * as usersModule from '@db/users';
                console.log(defaultUsers[0].name, usersModule.users[0].name, usersModule.default[0].name);
            `);

            expect(result.logs).toEqual([
                {
                    type: 'log',
                    args: ['Ann', 'Ann', 'Ann'],
                },
            ]);
        } finally {
            (vm as any).SourceTextModule = originalSourceTextModule;
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('rewrites default plus named imports in fallback mode without using regex-heavy import parsing', async () => {
        const dir = createTempDir();
        const originalSourceTextModule = (vm as any).SourceTextModule;

        try {
            fs.writeFileSync(path.join(dir, 'users.ts'), [
                'export const users = [{ id: 1, name: "Ann" }];',
                'export default users;',
                '',
            ].join('\n'), 'utf8');

            (vm as any).SourceTextModule = undefined;

            const db = new Database({ dir, language: 'ts' });
            const result = await db.execute(`
                import defaultUsers, { users as namedUsers } from '@db/users';
                console.log(defaultUsers[0].name, namedUsers[0].name);
            `);

            expect(result.logs).toEqual([
                {
                    type: 'log',
                    args: ['Ann', 'Ann'],
                },
            ]);
        } finally {
            (vm as any).SourceTextModule = originalSourceTextModule;
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });
});
