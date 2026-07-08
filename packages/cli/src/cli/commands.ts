import { runDesktopCommand } from '../desktop';
import { runMobileCommand } from '../mobile';
import { runNativeCommand } from '../native';
import { runPmCommand } from '@elitjs/pm';
import { runWapkCommand } from '@elitjs/wapk';

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

export async function runDesktop(args: string[]): Promise<void> {
    try {
        await runDesktopCommand(args);
    } catch (error) {
        console.error(getErrorMessage(error));
        process.exit(1);
    }
}

export async function runMobile(args: string[]): Promise<void> {
    try {
        await runMobileCommand(args);
    } catch (error) {
        console.error(`Error: ${getErrorMessage(error)}`);
        process.exit(1);
    }
}

export async function runNative(args: string[]): Promise<void> {
    try {
        await runNativeCommand(args);
    } catch (error) {
        console.error(`Error: ${getErrorMessage(error)}`);
        process.exit(1);
    }
}

export async function runWapk(args: string[]): Promise<void> {
    try {
        await runWapkCommand(args);
    } catch (error) {
        console.error(getErrorMessage(error));
        process.exit(1);
    }
}

export async function runPm(args: string[]): Promise<void> {
    try {
        await runPmCommand(args);
    } catch (error) {
        console.error(getErrorMessage(error));
        process.exit(1);
    }
}