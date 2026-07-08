export const colors = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
} as const;

export type ReporterColor = keyof typeof colors;

export function colorize(color: ReporterColor, text: string, enabled: boolean = true): string {
    return enabled ? colors[color] + text + colors.reset : text;
}