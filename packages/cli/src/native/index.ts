import { printNativeHelp } from './config';
import { generateNativeFromCli } from './generate';

export type {
    LoadedNativeEntryResult,
    NativeEntryRenderOptions,
    NativeEntryRuntimeTarget,
} from './shared';
export { generateNativeEntryOutput } from './generate';
export {
    loadNativeEntryResult,
    loadNativeEntryValue,
    resolveNativeEntryExport,
    resolveNativeExportValue,
} from './entry';

export async function runNativeCommand(args: string[]): Promise<void> {
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        printNativeHelp();
        return;
    }

    const command = args[0];

    switch (command) {
        case 'generate':
            if (args.slice(1).length === 0 || args.slice(1).includes('--help') || args.slice(1).includes('-h')) {
                printNativeHelp();
                return;
            }
            await generateNativeFromCli(args.slice(1));
            return;
        default:
            throw new Error(`Unknown native command: ${command}`);
    }
}