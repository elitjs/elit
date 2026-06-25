import { watch, type FSWatcher } from '../../server/chokidar';

export interface ServerWatcherOptions {
    files: string[];
    debounceMs?: number;
    onChange: (path: string) => void;
    onError?: (error: Error) => void;
}

export interface ServerWatcher {
    close(): Promise<void>;
}

export function createServerWatcher(options: ServerWatcherOptions): ServerWatcher {
    const debounceMs = options.debounceMs ?? 300;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastPath: string | null = null;
    let closed = false;

    const watcher: FSWatcher = watch(options.files, {
        ignoreInitial: true,
        persistent: true,
    });

    const schedule = (path: string) => {
        lastPath = path;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            if (closed || lastPath === null) return;
            options.onChange(lastPath);
            lastPath = null;
        }, debounceMs);
    };

    watcher.on('change', (path: string) => schedule(path));
    watcher.on('add', (path: string) => schedule(path));
    watcher.on('unlink', (path: string) => schedule(path));
    watcher.on('error', (error: Error) => {
        if (closed) return;
        if (options.onError) {
            options.onError(error);
        } else {
            console.warn('[Server HMR] watcher error:', error.message);
        }
    });

    return {
        close: async () => {
            closed = true;
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
            try {
                await watcher.close();
            } catch {
                // Ignore close errors during teardown.
            }
        },
    };
}
