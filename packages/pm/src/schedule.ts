interface PmCronField {
    values: Set<number>;
    wildcard: boolean;
}

export interface PmRestartSchedule {
    expression: string;
    kind: 'every' | 'cron';
    intervalMs?: number;
    hasSeconds: boolean;
    seconds?: PmCronField;
    minutes?: PmCronField;
    hours?: PmCronField;
    daysOfMonth?: PmCronField;
    months?: PmCronField;
    daysOfWeek?: PmCronField;
}

const PM_EVERY_PATTERN = /^@every\s+(\d+)(ms|s|m|h|d)$/i;

function parsePositiveInteger(value: string, optionName: string, min = 0): number {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < min) {
        throw new Error(`${optionName} must be a number >= ${min}`);
    }

    return parsed;
}

function fillRange(values: Set<number>, start: number, end: number, step: number, min: number, max: number, optionName: string): void {
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < min || end > max || start > end) {
        throw new Error(`${optionName} contains an invalid range: ${start}-${end}`);
    }

    if (!Number.isInteger(step) || step < 1) {
        throw new Error(`${optionName} contains an invalid step: ${step}`);
    }

    for (let current = start; current <= end; current += step) {
        values.add(current);
    }
}

function parseCronSegment(segment: string, values: Set<number>, min: number, max: number, optionName: string): void {
    const normalized = segment.trim();
    if (!normalized) {
        throw new Error(`${optionName} contains an empty field segment.`);
    }

    const [rangeToken, stepToken] = normalized.split('/');
    if (normalized.split('/').length > 2) {
        throw new Error(`${optionName} contains an invalid step segment: ${normalized}`);
    }

    const step = stepToken === undefined ? 1 : parsePositiveInteger(stepToken, optionName, 1);
    if (rangeToken === '*') {
        fillRange(values, min, max, step, min, max, optionName);
        return;
    }

    if (rangeToken.includes('-')) {
        const [startToken, endToken] = rangeToken.split('-');
        if (!startToken || !endToken) {
            throw new Error(`${optionName} contains an invalid range: ${normalized}`);
        }

        const start = parsePositiveInteger(startToken, optionName, min);
        const end = parsePositiveInteger(endToken, optionName, min);
        fillRange(values, start, end, step, min, max, optionName);
        return;
    }

    const start = parsePositiveInteger(rangeToken, optionName, min);
    fillRange(values, start, stepToken === undefined ? start : max, step, min, max, optionName);
}

function parseCronField(token: string, min: number, max: number, optionName: string): PmCronField {
    const normalized = token.trim();
    if (!normalized) {
        throw new Error(`${optionName} contains an empty field.`);
    }

    if (normalized === '*') {
        const values = new Set<number>();
        fillRange(values, min, max, 1, min, max, optionName);
        return {
            values,
            wildcard: true,
        };
    }

    const values = new Set<number>();
    for (const segment of normalized.split(',')) {
        parseCronSegment(segment, values, min, max, optionName);
    }

    if (values.size === 0) {
        throw new Error(`${optionName} must match at least one value.`);
    }

    return {
        values,
        wildcard: false,
    };
}

function matchesCronField(field: PmCronField | undefined, value: number): boolean {
    if (!field) {
        return true;
    }

    return field.wildcard || field.values.has(value);
}

function matchesCronDate(schedule: PmRestartSchedule, candidate: Date): boolean {
    if (schedule.kind !== 'cron') {
        return false;
    }

    const secondMatches = schedule.hasSeconds ? matchesCronField(schedule.seconds, candidate.getSeconds()) : true;
    const minuteMatches = matchesCronField(schedule.minutes, candidate.getMinutes());
    const hourMatches = matchesCronField(schedule.hours, candidate.getHours());
    const monthMatches = matchesCronField(schedule.months, candidate.getMonth() + 1);
    const dayOfMonthMatches = matchesCronField(schedule.daysOfMonth, candidate.getDate());
    const dayOfWeekMatches = matchesCronField(schedule.daysOfWeek, candidate.getDay());

    const domWildcard = schedule.daysOfMonth?.wildcard ?? true;
    const dowWildcard = schedule.daysOfWeek?.wildcard ?? true;
    const dayMatches = domWildcard && dowWildcard
        ? true
        : domWildcard
            ? dayOfWeekMatches
            : dowWildcard
                ? dayOfMonthMatches
                : dayOfMonthMatches || dayOfWeekMatches;

    return secondMatches && minuteMatches && hourMatches && monthMatches && dayMatches;
}

export function parsePmRestartSchedule(expression: string, optionName = '--cron-restart'): PmRestartSchedule {
    const normalized = expression.trim();
    const everyMatch = PM_EVERY_PATTERN.exec(normalized);
    if (everyMatch) {
        const [, valueText, unit] = everyMatch;
        const value = parsePositiveInteger(valueText ?? '', optionName, 1);
        const multiplier = unit?.toLowerCase() === 'ms'
            ? 1
            : unit?.toLowerCase() === 's'
                ? 1000
                : unit?.toLowerCase() === 'm'
                    ? 60_000
                    : unit?.toLowerCase() === 'h'
                        ? 3_600_000
                        : 86_400_000;

        return {
            expression: normalized,
            kind: 'every',
            intervalMs: value * multiplier,
            hasSeconds: true,
        };
    }

    const fields = normalized.split(/\s+/).filter((field) => field.length > 0);
    if (fields.length !== 5 && fields.length !== 6) {
        throw new Error(`${optionName} must be a 5-field cron expression or @every <duration>.`);
    }

    const hasSeconds = fields.length === 6;
    const offset = hasSeconds ? 1 : 0;

    return {
        expression: normalized,
        kind: 'cron',
        hasSeconds,
        seconds: hasSeconds ? parseCronField(fields[0] ?? '', 0, 59, optionName) : undefined,
        minutes: parseCronField(fields[0 + offset] ?? '', 0, 59, optionName),
        hours: parseCronField(fields[1 + offset] ?? '', 0, 23, optionName),
        daysOfMonth: parseCronField(fields[2 + offset] ?? '', 1, 31, optionName),
        months: parseCronField(fields[3 + offset] ?? '', 1, 12, optionName),
        daysOfWeek: parseCronField(fields[4 + offset] ?? '', 0, 6, optionName),
    };
}

export function normalizePmRestartSchedule(value: unknown, optionName = '--cron-restart'): string | undefined {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    if (typeof value !== 'string') {
        throw new Error(`${optionName} must be a cron string or @every <duration>.`);
    }

    const normalized = value.trim();
    if (!normalized) {
        throw new Error(`${optionName} must be a non-empty cron string or @every <duration>.`);
    }

    parsePmRestartSchedule(normalized, optionName);
    return normalized;
}

export function resolveNextPmScheduleOccurrence(schedule: PmRestartSchedule, after: Date = new Date()): Date | undefined {
    if (schedule.kind === 'every') {
        return new Date(after.getTime() + (schedule.intervalMs ?? 0));
    }

    const stepMs = schedule.hasSeconds ? 1000 : 60_000;
    const candidate = new Date(after.getTime());
    if (schedule.hasSeconds) {
        candidate.setMilliseconds(0);
        candidate.setSeconds(candidate.getSeconds() + 1);
    } else {
        candidate.setSeconds(0, 0);
        candidate.setMinutes(candidate.getMinutes() + 1);
    }

    const maxIterations = schedule.hasSeconds ? 2_678_400 : 527_040;
    for (let index = 0; index < maxIterations; index++) {
        if (matchesCronDate(schedule, candidate)) {
            return new Date(candidate.getTime());
        }

        candidate.setTime(candidate.getTime() + stepMs);
    }

    return undefined;
}