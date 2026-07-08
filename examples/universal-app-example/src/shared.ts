import { createState } from '../../../src/state';
import type { Child, State } from '../../../src/types';

export const APP_NAME = 'Elit Universal Example';
export const APP_TAGLINE = 'One repo validating browser, desktop, and Android mobile workflows.';
export const APP_LINK = 'https://github.com/elitjs/elit';

export const INITIAL_VALIDATION_COUNT = 3;
export const INITIAL_VALIDATION_TARGET = 'web + desktop + mobile';
export const INITIAL_REPO_NOTE = 'Desktop and mobile are driven from the same repo.';
export const INITIAL_NATIVE_ENABLED = true;

export const UNIVERSAL_FORM_COPY = {
    title: 'Web state and shared content',
    questionLabel: 'What are you validating?',
    questionPlaceholder: 'web + desktop + mobile',
    noteLabel: 'Repo note',
    notePlaceholder: 'Explain what changed in the shared component tree',
    toggleLabel: 'Keep native mobile generation enabled for Android checks',
} as const;

export const UNIVERSAL_PRIMARY_ACTION_LABEL = 'Record another validation pass';

export interface UniversalExampleState {
    launchCount: State<number>;
    validationTarget: State<string>;
    notes: State<string>;
    nativeEnabled: State<boolean>;
}

export function createUniversalExampleState(): UniversalExampleState {
    return {
        launchCount: createState(INITIAL_VALIDATION_COUNT),
        validationTarget: createState(INITIAL_VALIDATION_TARGET),
        notes: createState(INITIAL_REPO_NOTE),
        nativeEnabled: createState(INITIAL_NATIVE_ENABLED),
    };
}

export function createUniversalStatusMessages(state: UniversalExampleState): Child[] {
    return [
        ['Validation counter: ', state.launchCount],
        ['Current validation target: ', state.validationTarget],
        ['Latest note: ', state.notes],
        ['Native mobile generation enabled: ', state.nativeEnabled],
        'The primary CTA now carries shared bridge metadata through elit/universal while web/native form state now shares the same binding model.',
    ];
}

export function createInitialStatusMessages(): string[] {
    return [
        `Validation counter: ${INITIAL_VALIDATION_COUNT}`,
        `Current validation target: ${INITIAL_VALIDATION_TARGET}`,
        `Latest note: ${INITIAL_REPO_NOTE}`,
        `Native mobile generation: ${INITIAL_NATIVE_ENABLED ? 'enabled' : 'disabled'}`,
        'The primary CTA now carries shared bridge metadata through elit/universal while the web handler still updates local state.',
    ];
}

export const PLATFORM_SURFACES = [
    {
        id: 'web',
        title: 'Web',
        description: 'Build and preview the browser app from the same project root.',
    },
    {
        id: 'desktop',
        title: 'Desktop',
        description: 'Run the same repo inside the native WebView desktop runtime.',
    },
    {
        id: 'mobile',
        title: 'Mobile',
        description: 'Sync built web assets and generate Android Compose from a native entry.',
    },
] as const;

export const VALIDATION_STEPS = [
    'Browser build output under dist/',
    'Desktop IPC smoke run',
    'Android scaffold + Compose generation',
    'Shared repo-level scripts for all three surfaces',
];

export const SHARED_CHECKLIST = [
    'Reactive state on the web app',
    'Desktop shell with native IPC',
    'Compose toggle and text input generation',
    'External link handling for native mobile',
];
