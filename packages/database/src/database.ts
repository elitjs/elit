import { create, read, remove, rename, save, update } from './operations';
import type { VMOptions } from './types';
import { VM } from './vm';

export class Database {
    private vm: VM;
    private options: VMOptions;

    constructor(options?: VMOptions) {
        this.options = {
            language: 'ts',
            registerModules: {},
            ...options,
        };
        this.vm = new VM(this.options);
    }

    register(context: { [key: string]: any }) {
        this.vm.register(context);
    }

    async execute(code: string) {
        return await this.vm.run(code);
    }

    create(dbName: string, code: string | Function): void {
        return create(dbName, code, this.options);
    }

    read(dbName: string): string {
        return read(dbName, this.options);
    }

    remove(dbName: string, fnName?: string): string | boolean {
        return remove(dbName, fnName || '', this.options);
    }

    rename(oldName: string, newName: string): string {
        return rename(oldName, newName, this.options);
    }

    save(dbName: string, code: unknown): void {
        return save(dbName, code, this.options);
    }

    update(dbName: string, fnName: string, code: unknown): string {
        return update(dbName, fnName, code, this.options);
    }
}