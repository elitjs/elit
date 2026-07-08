export interface Feature {
    icon: string;
    title: string;
    description: string;
}

export const FEATURES: Feature[] = [
    {
        icon: '◐',
        title: 'One VNode tree',
        description: 'Describe UI once. Render to DOM, desktop, native, or WAPK from the same source.',
    },
    {
        icon: '⚡',
        title: 'Reactive by default',
        description: 'createState, computed, effect. Fine-grained subscriptions, no virtual DOM diffing tax.',
    },
    {
        icon: '⌘',
        title: 'TS-first',
        description: 'Strict types end-to-end. Props, VNode, and State are statically checked.',
    },
    {
        icon: '◈',
        title: 'Tiny core',
        description: '@elitjs/core is types only. @elitjs/dom ships the renderer in a few KB.',
    },
    {
        icon: '⇄',
        title: 'Isomorphic',
        description: 'Render to string on the server, hydrate on the client, share code in between.',
    },
    {
        icon: '▣',
        title: 'Scoped packages',
        description: 'Pick only what you import — @elitjs/router, @elitjs/state, @elitjs/style and more.',
    },
];
