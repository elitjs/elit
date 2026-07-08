import type { VNode } from '@elitjs/core';
import { CodeBlock } from '../components/CodeBlock';

const SECTIONS = [
    { id: 'install', label: 'Installation' },
    { id: 'create-state', label: 'State' },
    { id: 'render', label: 'Render' },
    { id: 'router', label: 'Router' },
    { id: 'native', label: 'Native' },
    { id: 'packages', label: 'Packages' },
];

const INSTALL_CODE = `# Pick only what you need
npm install @elitjs/core @elitjs/el @elitjs/dom @elitjs/state
`;

const STATE_CODE = `import { createState, computed } from '@elitjs/state';

const count = createState(0);
const doubled = computed([count], (n) => n * 2);

count.subscribe((v) => console.log('count:', v));

count.value++;          // logs: count: 1
console.log(doubled.value); // 2`;

const RENDER_CODE = `import { render } from '@elitjs/dom';
import { el } from '@elitjs/el';
import { createState } from '@elitjs/state';

const open = createState(false);
const Modal = el('dialog', {
    open,
    style: { padding: '20px', borderRadius: '8px' },
}, el('p', {}, 'Hello world'));

render('#app', Modal);`;

const ROUTER_CODE = `import { createRouter, createRouterView, routerLink } from '@elitjs/router';

const router = createRouter({
    mode: 'history',
    routes: [
        { path: '/', component: () => el('h1', {}, 'Home') },
        { path: '/about', component: () => el('h1', {}, 'About') },
    ],
});

const View = createRouterView(router);
const Link = routerLink({ to: '/about', children: ['Go to About'] });`;

const NATIVE_CODE = `import { renderNativeTree } from '@elitjs/native';
import { el } from '@elitjs/el';

const App = el('view', {},
    el('text', {}, 'Hello native'),
    el('button', { onPress: () => {} }, 'Tap'),
);

const tree = renderNativeTree(App, { platform: 'generic' });
// tree.roots is runtime-agnostic; ship to iOS/Android/desktop`;

export const DocsPage = (): VNode => ({
    tagName: 'div',
    props: { class: 'docs-layout' },
    children: [
        {
            tagName: 'aside',
            props: { class: 'docs-sidebar' },
            children: [
                { tagName: 'h4', props: {}, children: ['Getting started'] },
                ...SECTIONS.map((s) => ({
                    tagName: 'a',
                    props: {
                        href: `#/docs`,
                        onClick: (e: Event) => {
                            e.preventDefault();
                            document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        },
                    },
                    children: [s.label],
                })),
            ],
        },
        {
            tagName: 'article',
            props: { class: 'docs-content' },
            children: [
                { tagName: 'h1', props: {}, children: ['Documentation'] },
                {
                    tagName: 'p',
                    props: { style: { color: '#9aa3b8' } },
                    children: ['A guided tour of the @elitjs/* packages. Each snippet below is runnable — copy it into a fresh project.'],
                },

                { tagName: 'h2', props: { id: 'install' }, children: ['Installation'] },
                { tagName: 'p', props: {}, children: ['Elit.js ships as scoped @elitjs/* packages. Install only what you import — or grab the meta package for the batteries-included experience.'] },
                CodeBlock({ label: 'shell', code: INSTALL_CODE }),

                { tagName: 'h2', props: { id: 'create-state' }, children: ['State'] },
                { tagName: 'p', props: {}, children: ['createState returns a State<T> with value, subscribe, and destroy. computed derives new states from inputs and recomputes only when dependencies change.'] },
                CodeBlock({ label: 'state.ts', code: STATE_CODE }),

                { tagName: 'h2', props: { id: 'render' }, children: ['Render'] },
                { tagName: 'p', props: {}, children: ['render() mounts a VNode tree into the DOM. The el() helper is hyperscript — supports any tag, props, and children including State instances.'] },
                CodeBlock({ label: 'app.ts', code: RENDER_CODE }),

                { tagName: 'h2', props: { id: 'router' }, children: ['Router'] },
                { tagName: 'p', props: {}, children: ['createRouter wires up history-mode routing. createRouterView renders the matched component, and routerLink builds navigation links.'] },
                CodeBlock({ label: 'router.ts', code: ROUTER_CODE }),

                { tagName: 'h2', props: { id: 'native' }, children: ['Native'] },
                { tagName: 'p', props: {}, children: ['renderNativeTree transforms the same VNode tree into a runtime-agnostic NativeTree. Hand it to iOS, Android, or desktop runtimes.'] },
                CodeBlock({ label: 'native.ts', code: NATIVE_CODE }),

                { tagName: 'h2', props: { id: 'packages' }, children: ['Packages'] },
                {
                    tagName: 'p',
                    props: {},
                    children: [
                        'See the full list on the ',
                        { tagName: 'a', props: { href: '#/' }, children: ['homepage'] },
                        '. All 34 packages are independently versioned and ship TypeScript types.',
                    ],
                },
            ],
        },
    ],
});
