import type { VNode } from '@elitjs/core';
import { CodeBlock } from '../components/CodeBlock';
import { FEATURES } from '../data/features';
import { PACKAGE_CATEGORIES, PACKAGES } from '../data/packages';
import { SKILL_CATEGORIES, SKILLS } from '../data/skills';
import { link } from '../link';

const QUICK_START = `import { render } from '@elitjs/dom';
import { createState } from '@elitjs/state';
import { el } from '@elitjs/el';

const count = createState(0);

const App = el('main', { style: { padding: '24px' } },
    el('h1', {}, 'Counter'),
    el('button', {
        onClick: () => count.value++,
        style: { padding: '8px 16px', fontSize: '16px' },
    }, 'Clicks: ', count),
);

render('#app', App);`;

const TERMINAL_LINES = [
    { prompt: '$', cmd: 'npm create elit@latest my-app', cls: 'cmd' },
    { out: 'λ Setting up your Elit.js project...', cls: 'out' },
    { prompt: '$', cmd: 'cd my-app && npm install', cls: 'cmd' },
    { out: 'λ added 248 packages in 6s', cls: 'out' },
    { prompt: '$', cmd: 'npm run dev', cls: 'cmd' },
    { out: '', cls: 'out' },
    { out: '  ➜  Local:   http://localhost:5180', cls: 'kw' },
    { out: '  ➜  Network: ready in 380ms', cls: 'kw' },
];

export const HomePage = (): VNode => ({
    tagName: 'div',
    props: {},
    children: [
        {
            tagName: 'section',
            props: { class: 'hero' },
            children: [
                {
                    tagName: 'span',
                    props: { class: 'hero-eyebrow' },
                    children: [
                        { tagName: 'span', props: { class: 'dot' }, children: [] },
                        'v4.0.1 — ',
                        { tagName: 'strong', props: {}, children: ['36 scoped @elitjs/* packages'] },
                    ],
                },
                {
                    tagName: 'h1',
                    props: { class: 'hero-title' },
                    children: [
                        'Reactive web, desktop, ',
                        { tagName: 'span', props: { class: 'accent' }, children: ['and native'] },
                        ' from one source.',
                    ],
                },
                {
                    tagName: 'p',
                    props: { class: 'hero-lead' },
                    children: ['Elit.js is a TypeScript-first reactive framework. Describe your UI once as a VNode tree — render to DOM, desktop, native, or WAPK from the same source. No compiler pass, no virtual DOM tax.'],
                },
                {
                    tagName: 'div',
                    props: { class: 'hero-actions' },
                    children: [
                        link({ to: '/docs', class: 'btn-primary', children: ['Get started', ' →'] }),
                        link({ to: '/playground', class: 'btn-secondary', children: ['Try in browser'] }),
                    ],
                },
                {
                    tagName: 'div',
                    props: { class: 'hero-stats' },
                    children: [
                        { tagName: 'div', props: { class: 'hero-stat' }, children: [
                            { tagName: 'div', props: { class: 'hero-stat-num' }, children: ['36'] },
                            { tagName: 'div', props: { class: 'hero-stat-label' }, children: ['Packages'] },
                        ]},
                        { tagName: 'div', props: { class: 'hero-stat' }, children: [
                            { tagName: 'div', props: { class: 'hero-stat-num' }, children: ['~4KB'] },
                            { tagName: 'div', props: { class: 'hero-stat-label' }, children: ['Core size'] },
                        ]},
                        { tagName: 'div', props: { class: 'hero-stat' }, children: [
                            { tagName: 'div', props: { class: 'hero-stat-num' }, children: ['0'] },
                            { tagName: 'div', props: { class: 'hero-stat-label' }, children: ['Compiler steps'] },
                        ]},
                        { tagName: 'div', props: { class: 'hero-stat' }, children: [
                            { tagName: 'div', props: { class: 'hero-stat-num' }, children: ['MIT'] },
                            { tagName: 'div', props: { class: 'hero-stat-label' }, children: ['License'] },
                        ]},
                    ],
                },
                {
                    tagName: 'div',
                    props: { class: 'terminal' },
                    children: [
                        {
                            tagName: 'div',
                            props: { class: 'terminal-header' },
                            children: [
                                { tagName: 'span', props: { class: 'terminal-dot red' }, children: [] },
                                { tagName: 'span', props: { class: 'terminal-dot yellow' }, children: [] },
                                { tagName: 'span', props: { class: 'terminal-dot green' }, children: [] },
                                { tagName: 'span', props: { class: 'terminal-title' }, children: ['elit-website — bash — 80×24'] },
                            ],
                        },
                        {
                            tagName: 'div',
                            props: { class: 'terminal-body' },
                            children: TERMINAL_LINES.map((line): VNode => ({
                                tagName: 'div',
                                props: {},
                                children: line.prompt
                                    ? [
                                        { tagName: 'span', props: { class: 'prompt' }, children: [line.prompt, ' '] },
                                        { tagName: 'span', props: { class: line.cls }, children: [line.cmd] },
                                    ]
                                    : [{ tagName: 'span', props: { class: line.cls }, children: [line.out] }],
                            })),
                        },
                    ],
                },
            ],
        },
        {
            tagName: 'section',
            props: { class: 'section' },
            children: [
                {
                    tagName: 'div',
                    props: { class: 'section-head' },
                    children: [
                        { tagName: 'div', props: { class: 'section-label' }, children: ['Why Elit.js'] },
                        { tagName: 'h2', props: {}, children: ['Built for the whole stack'] },
                        {
                            tagName: 'p',
                            props: { class: 'section-subtitle' },
                            children: ['A reactive core that scales from a single button to a full native app — without changing how you think about UI.'],
                        },
                    ],
                },
                {
                    tagName: 'div',
                    props: { class: 'features-grid' },
                    children: FEATURES.map((f) => ({
                        tagName: 'div',
                        props: { class: 'feature-card' },
                        children: [
                            { tagName: 'div', props: { class: 'feature-icon' }, children: [f.icon] },
                            { tagName: 'h3', props: { class: 'feature-title' }, children: [f.title] },
                            { tagName: 'p', props: { class: 'feature-desc' }, children: [f.description] },
                        ],
                    })),
                },
            ],
        },
        {
            tagName: 'section',
            props: { class: 'section' },
            children: [
                {
                    tagName: 'div',
                    props: { class: 'two-col' },
                    children: [
                        {
                            tagName: 'div',
                            props: { class: 'two-col-text' },
                            children: [
                                { tagName: 'div', props: { class: 'section-label' }, children: ['Quick start'] },
                                { tagName: 'h2', props: {}, children: ['Reactive in three imports'] },
                                {
                                    tagName: 'p',
                                    props: {},
                                    children: ['No virtual DOM, no compiler pass. The button subscribes to state and re-renders itself — fine-grained, automatic, fast.'],
                                },
                                {
                                    tagName: 'div',
                                    props: { class: 'install-box' },
                                    children: [
                                        { tagName: 'span', props: { class: 'dollar' }, children: ['$'] },
                                        { tagName: 'span', props: {}, children: ['npm install '] },
                                        { tagName: 'span', props: { class: 'pkg' }, children: ['@elitjs/dom @elitjs/state @elitjs/el'] },
                                    ],
                                },
                                {
                                    tagName: 'p',
                                    props: { style: { margin: '0', fontSize: '14px' } },
                                    children: ['Then drop the snippet on the right into ', { tagName: 'code', props: {}, children: ['main.ts'] }, ' and you have a reactive counter.'],
                                },
                            ],
                        },
                        CodeBlock({ label: 'counter.ts', code: QUICK_START }),
                    ],
                },
            ],
        },
        {
            tagName: 'section',
            props: { class: 'section' },
            children: [
                {
                    tagName: 'div',
                    props: { class: 'section-head' },
                    children: [
                        { tagName: 'div', props: { class: 'section-label' }, children: ['AI skills'] },
                        { tagName: 'h2', props: {}, children: ['22 skills for your AI coding tool'] },
                        {
                            tagName: 'p',
                            props: { class: 'section-subtitle' },
                            children: [
                                'Scaffold ',
                                { tagName: 'code', props: {}, children: ['SKILL.md'] },
                                ' files into ',
                                { tagName: 'code', props: {}, children: ['.claude/skills'] },
                                ', ',
                                { tagName: 'code', props: {}, children: ['.agents/skills'] },
                                ', and ',
                                { tagName: 'code', props: {}, children: ['.github/skills'] },
                                ' so Claude Code, generic agents, and Copilot know the idiomatic Elit.js patterns and exact @elitjs/* API surface.',
                            ],
                        },
                        {
                            tagName: 'div',
                            props: { class: 'install-box', style: { marginTop: '20px' } },
                            children: [
                                { tagName: 'span', props: { class: 'dollar' }, children: ['$'] },
                                { tagName: 'span', props: {}, children: ['npm create elit-skills@latest ./'] },
                            ],
                        },
                    ],
                },
                ...Object.entries(SKILL_CATEGORIES).map(([cat, label]) => ({
                    tagName: 'div',
                    props: {},
                    children: [
                        { tagName: 'div', props: { class: 'pkg-category' }, children: [label] },
                        {
                            tagName: 'div',
                            props: { class: 'pkg-grid' },
                            children: SKILLS
                                .filter((s) => s.category === cat)
                                .map((skill) => ({
                                    tagName: 'div',
                                    props: { class: 'pkg-card' },
                                    children: [
                                        { tagName: 'div', props: { class: 'pkg-name' }, children: [skill.name] },
                                        { tagName: 'div', props: { class: 'pkg-desc' }, children: [skill.description] },
                                    ],
                                })),
                        },
                    ],
                })),
            ],
        },
        {
            tagName: 'section',
            props: { class: 'section' },
            children: [
                {
                    tagName: 'div',
                    props: { class: 'section-head' },
                    children: [
                        { tagName: 'div', props: { class: 'section-label' }, children: ['Ecosystem'] },
                        { tagName: 'h2', props: {}, children: ['36 scoped packages'] },
                        {
                            tagName: 'p',
                            props: { class: 'section-subtitle' },
                            children: ['Install only what you need. Each @elitjs/* package is independently versioned and ships its own types.'],
                        },
                    ],
                },
                ...Object.entries(PACKAGE_CATEGORIES).map(([cat, label]) => ({
                    tagName: 'div',
                    props: {},
                    children: [
                        { tagName: 'div', props: { class: 'pkg-category' }, children: [label] },
                        {
                            tagName: 'div',
                            props: { class: 'pkg-grid' },
                            children: PACKAGES
                                .filter((p) => p.category === cat)
                                .map((pkg) => ({
                                    tagName: 'div',
                                    props: { class: 'pkg-card' },
                                    children: [
                                        { tagName: 'div', props: { class: 'pkg-name' }, children: [pkg.name] },
                                        { tagName: 'div', props: { class: 'pkg-desc' }, children: [pkg.description] },
                                    ],
                                })),
                        },
                    ],
                })),
            ],
        },
    ],
});
