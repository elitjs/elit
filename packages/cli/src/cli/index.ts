import { runBuild, runBuildDev, runBuildPreview } from './build';
import { runDesktop, runMobile, runNative, runPm, runWapk } from './commands';
import { runDev, runPreview } from './dev-preview';
import { printHelp, printVersion } from './help';
import { COMMANDS, VERSION_FLAGS, type Command } from './shared';
import { runTest } from './test';

export { parseBuildArgs, parseBuildDevArgs, parseBuildPreviewArgs, runBuild, runBuildDev, runBuildPreview } from './build';
export { runDesktop, runMobile, runNative, runPm, runWapk } from './commands';
export { runDev, runPreview } from './dev-preview';
export { printHelp, printVersion } from './help';
export { COMMANDS, VERSION_FLAGS } from './shared';
export type { Command } from './shared';
export { runTest } from './test';

export async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const command = VERSION_FLAGS.has(args[0] || '') ? 'version' : ((args[0] as Command) || 'help');

    if (!COMMANDS.includes(command)) {
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }

    switch (command) {
        case 'dev':
            await runDev(args.slice(1));
            break;
        case 'build':
            await runBuild(args.slice(1));
            break;
        case 'build-dev':
            await runBuildDev(args.slice(1));
            break;
        case 'build-preview':
            await runBuildPreview(args.slice(1));
            break;
        case 'preview':
            await runPreview(args.slice(1));
            break;
        case 'test':
            await runTest(args.slice(1));
            break;
        case 'desktop':
            await runDesktop(args.slice(1));
            break;
        case 'mobile':
            await runMobile(args.slice(1));
            break;
        case 'native':
            await runNative(args.slice(1));
            break;
        case 'pm':
            await runPm(args.slice(1));
            break;
        case 'wapk':
            await runWapk(args.slice(1));
            break;
        case 'version':
            printVersion();
            break;
        case 'help':
        default:
            printHelp();
            break;
    }
}