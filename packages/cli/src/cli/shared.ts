export const COMMANDS = ['dev', 'build', 'build-dev', 'build-preview', 'preview', 'test', 'desktop', 'mobile', 'native', 'pm', 'wapk', 'help', 'version'] as const;

export type Command = typeof COMMANDS[number];
export type ArgHandler<T> = (options: T, value: string | undefined, index: { current: number }) => void;

export const VERSION_FLAGS = new Set(['--version', '-v']);

export function setupShutdownHandlers(closeFunc: () => Promise<void>): void {
    const shutdown = async () => {
        console.log('\n[Server] Shutting down...');
        await closeFunc();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

export function parseArgs<T>(args: string[], handlers: Record<string, ArgHandler<T>>, options: T): T {
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const handler = handlers[arg];

        if (!handler) {
            continue;
        }

        const index = { current: i };
        handler(options, args[i + 1], index);
        i = index.current;
    }

    return options;
}