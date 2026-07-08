export function formatErrorStack(error: Error): string {
    if (!error.stack) {
        return error.message;
    }

    const lines = error.stack.split('\n');
    let formatted = `${error.message}\n`;

    for (const line of lines.slice(1, 6)) {
        formatted += `  ${line.trim()}\n`;
    }

    return formatted;
}

export function formatProgress(current: number, total: number): string {
    const percentage = Math.floor((current / total) * 100);
    const filled = Math.floor(percentage / 2);
    const empty = 50 - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `[${bar}] ${percentage}% (${current}/${total})`;
}