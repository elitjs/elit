/**
 * Merge CLI args with config file
 */
export function mergeConfig<T extends Record<string, any>>(
    config: T | undefined,
    cliArgs: Partial<T>
): T {
    if (!config) {
        return cliArgs as T;
    }

    return {
        ...config,
        ...Object.fromEntries(
            Object.entries(cliArgs).filter(([_, value]) => value !== undefined)
        )
    } as T;
}