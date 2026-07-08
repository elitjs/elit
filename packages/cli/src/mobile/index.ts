import { loadConfig } from '@elitjs/config';
import { parseCommandOptions, parseInitArgs, parsePlatformArg, printMobileHelp } from './config';
import {
    buildMobilePlatform,
    initMobileProject,
    openMobileProject,
    runMobileDevices,
    runMobileDoctor,
    runMobilePlatform,
    syncMobileAssets,
} from './workflow';

export { resolveRequestedTarget } from './support';
export {
    getIosBuiltAppPath,
    buildIosXcodebuildArgs,
    pickPreferredIosSimulatorDevice,
    renderIosAppSource,
    renderIosAppRootSource,
    renderIosWebViewSource,
    renderIosRuntimeConfigSource,
    renderIosGeneratedPlaceholderSource,
    renderIosProjectFileSource,
} from './ios';
export {
    renderAndroidMainActivitySource,
    isManagedAndroidMainActivitySource,
    renderAndroidRuntimeConfigSource,
    renderAndroidGeneratedPlaceholderSource,
} from './android';

export async function runMobileCommand(args: string[]): Promise<void> {
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        printMobileHelp();
        return;
    }

    const command = args[0];

    switch (command) {
        case 'init': {
            const config = await loadConfig();
            initMobileProject(parseInitArgs(args.slice(1), config?.mobile));
            break;
        }
        case 'doctor': {
            const options = await parseCommandOptions(args.slice(1));
            runMobileDoctor(options);
            break;
        }
        case 'sync': {
            const options = await parseCommandOptions(args.slice(1));
            await syncMobileAssets(options);
            break;
        }
        case 'open': {
            const platform = parsePlatformArg(args[1]);
            const options = await parseCommandOptions(args.slice(2));
            openMobileProject(platform, options);
            break;
        }
        case 'run': {
            const platform = parsePlatformArg(args[1]);
            const options = await parseCommandOptions(args.slice(2));
            await runMobilePlatform(platform, args.slice(2), options);
            break;
        }
        case 'build': {
            const platform = parsePlatformArg(args[1]);
            const options = await parseCommandOptions(args.slice(2));
            await buildMobilePlatform(platform, args.slice(2), options);
            break;
        }
        case 'devices': {
            const platform = parsePlatformArg(args[1]);
            const options = await parseCommandOptions(args.slice(2));
            runMobileDevices(platform, options);
            break;
        }
        default:
            throw new Error(`Unknown mobile command: ${command}`);
    }
}