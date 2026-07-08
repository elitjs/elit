import type { VNode } from '@elitjs/core';
import { link } from '../link';
import { img } from '@elitjs/el';
import { getTheme, toggleTheme } from '../theme';

const ThemeToggle = (): VNode => {
    const initial = getTheme();
    return {
        tagName: 'button',
        props: {
            type: 'button',
            class: 'theme-toggle',
            title: 'Toggle theme',
            'aria-label': 'Toggle theme',
            onClick: () => {
                const next = toggleTheme();
                const btn = document.querySelector('.theme-toggle');
                if (btn) btn.textContent = next === 'dark' ? '☾' : '☀';
            },
        },
        children: [initial === 'dark' ? '☾' : '☀'],
    };
};

export const Header = (): VNode => ({
    tagName: 'header',
    props: { class: 'header' },
    children: [
        {
            tagName: 'div',
            props: { class: 'header-inner' },
            children: [
                link({
                    to: '/',
                    class: 'brand',
                    children: [
                        { tagName: 'span', props: { class: 'brand-dot' }, children: [img({ src: '/favicon.svg' })] },
                        { tagName: 'span', props: {}, children: ['Elit.js'] },
                    ],
                }),
                {
                    tagName: 'nav',
                    props: { class: 'nav' },
                    children: [
                        link({ to: '/docs', class: 'nav-link', children: ['Docs'] }),
                        link({ to: '/examples', class: 'nav-link', children: ['Examples'] }),
                        link({ to: '/playground', class: 'nav-link', children: ['Playground'] }),
                        {
                            tagName: 'a',
                            props: {
                                href: 'https://github.com/elitjs/elit',
                                class: 'nav-link',
                                target: '_blank',
                                rel: 'noopener',
                            },
                            children: ['GitHub ↗'],
                        },
                        ThemeToggle(),
                        link({ to: '/docs', class: 'cta-primary', children: ['Get started'] }),
                    ],
                },
            ],
        },
    ],
});
