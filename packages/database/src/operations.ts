import fs from 'node:fs';
import path from 'node:path';

import { buildDatabaseModuleSource, removeDatabaseModuleEntry, updateDatabaseModuleSource } from './source-utils';
import type { UpdateValue, VMOptions } from './types';

function getDatabaseDirectory(options?: VMOptions): string {
    return options?.dir || path.join(process.cwd(), 'databases');
}

function getDatabasePath(dbName: string, options?: VMOptions): string {
    return path.join(getDatabaseDirectory(options), `${dbName}.ts`);
}

export function create(dbName: string, code: string | Function, options?: VMOptions): void {
    const dbPath = getDatabasePath(dbName, options);
    fs.appendFileSync(dbPath, code.toString(), 'utf8');
}

export function read(dbName: string, options?: VMOptions): string {
    const dbPath = getDatabasePath(dbName, options);

    if (!fs.existsSync(dbPath)) {
        throw new Error(`Database '${dbName}' not found`);
    }

    return fs.readFileSync(dbPath, 'utf8');
}

export function remove(dbName: string, fnName: string, options?: VMOptions): string | boolean {
    const dbPath = getDatabasePath(dbName, options);
    if (!fs.existsSync(dbPath)) return false;

    if (!fnName) {
        const bak = `${dbPath}.bak`;
        try {
            fs.copyFileSync(dbPath, bak);
        } catch {
        }
        try {
            fs.unlinkSync(dbPath);
            return 'Removed successfully';
        } catch {
            return 'Removed failed';
        }
    }

    const bak = `${dbPath}.bak`;
    try {
        fs.copyFileSync(dbPath, bak);
    } catch {
    }

    const source = fs.readFileSync(dbPath, 'utf8');
    const nextSource = removeDatabaseModuleEntry(source, fnName);
    fs.writeFileSync(dbPath, nextSource, 'utf8');

    return `Removed ${fnName} from database ${dbName}.`;
}

export function rename(oldName: string, newName: string, options?: VMOptions): string {
    const dir = getDatabaseDirectory(options);
    const oldPath = path.join(dir, `${oldName}.ts`);
    const newPath = path.join(dir, `${newName}.ts`);

    if (!fs.existsSync(oldPath)) {
        return `Error: File '${oldName}.ts' does not exist in the database`;
    }

    if (fs.existsSync(newPath)) {
        return `Error: File '${newName}.ts' already exists in the database`;
    }

    try {
        fs.renameSync(oldPath, newPath);
        return `Successfully renamed '${oldName}.ts' to '${newName}.ts'`;
    } catch (error) {
        return `Error renaming file: ${error instanceof Error ? error.message : String(error)}`;
    }
}

export function save(dbName: string, code: unknown, options?: VMOptions): void {
    const dbPath = getDatabasePath(dbName, options);
    const existingSource = fs.existsSync(dbPath)
        ? fs.readFileSync(dbPath, 'utf8')
        : undefined;
    const fileContent = buildDatabaseModuleSource(dbName, code, existingSource);
    fs.writeFileSync(dbPath, fileContent, 'utf8');
}

export function update(dbName: string, fnName: string, code: UpdateValue, options?: VMOptions): string {
    const dbPath = getDatabasePath(dbName, options);

    if (!fs.existsSync(dbPath)) {
        try {
            fs.writeFileSync(dbPath, '', 'utf8');
        } catch {
            return `Failed to create dbPath file: ${dbPath}`;
        }
    }

    const source = fs.readFileSync(dbPath, 'utf8');
    const result = updateDatabaseModuleSource(source, fnName, code);
    fs.writeFileSync(dbPath, result.source, 'utf8');

    if (!result.changed) {
        return `Saved ${fnName} to database ${dbName}.`;
    }

    return `Updated ${dbName} with ${fnName}.`;
}