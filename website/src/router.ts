import { createRouter, type Router, type RouterOptions } from '@elitjs/router';
import { HomePage } from './pages/HomePage';
import { DocsPage } from './pages/DocsPage';
import { ExamplesPage } from './pages/ExamplesPage';
import { PlaygroundPage } from './pages/PlaygroundPage';

export const ROUTES: RouterOptions = {
    mode: 'hash',
    routes: [
        { path: '/', component: () => HomePage() },
        { path: '/docs', component: () => DocsPage() },
        { path: '/examples', component: () => ExamplesPage() },
        { path: '/playground', component: () => PlaygroundPage() },
    ],
    notFound: () => ({
        tagName: 'div',
        props: { class: 'section', style: { textAlign: 'center', padding: '120px 24px' } },
        children: [
            { tagName: 'h1', props: {}, children: ['404'] },
            { tagName: 'p', props: { style: { color: '#9aa3b8' } }, children: ['Page not found.'] },
            {
                tagName: 'a',
                props: { href: '/', class: 'btn-primary' },
                children: ['Back home'],
            },
        ],
    }),
};

export const router: Router = createRouter(ROUTES);
