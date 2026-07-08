import type { VNode } from '@elitjs/core';
import { img } from '@elitjs/el';

export const Footer = (): VNode => ({
    tagName: 'footer',
    props: { class: 'footer' },
    children: [
        {
            tagName: 'div',
            props: { class: 'footer-inner' },
            children: [
                {
                    tagName: 'div',
                    props: {},
                    children: [
                        {
                            tagName: 'div',
                            props: { class: 'footer-brand-row' },
                            children: [
                                { tagName: 'span', props: { class: 'brand-dot' }, children: [img({ src: '/favicon.svg' })] },
                                { tagName: 'span', props: {}, children: ['Elit.js'] },
                            ],
                        },
                        {
                            tagName: 'p',
                            props: { class: 'footer-brand-sub' },
                            children: ['Reactive web, desktop, native, and WAPK — one VNode tree, many runtimes. Built with TypeScript, no compiler pass.'],
                        },
                    ],
                },
                {
                    tagName: 'div',
                    props: {},
                    children: [
                        { tagName: 'div', props: { class: 'footer-col-title' }, children: ['Product'] },
                        {
                            tagName: 'ul',
                            props: { class: 'footer-list' },
                            children: [
                                { tagName: 'li', props: {}, children: [{ tagName: 'a', props: { href: '#/docs', class: 'footer-link' }, children: ['Docs'] }] },
                                { tagName: 'li', props: {}, children: [{ tagName: 'a', props: { href: '#/examples', class: 'footer-link' }, children: ['Examples'] }] },
                                { tagName: 'li', props: {}, children: [{ tagName: 'a', props: { href: '#/playground', class: 'footer-link' }, children: ['Playground'] }] },
                                { tagName: 'li', props: {}, children: [{ tagName: 'a', props: { href: '#/docs#packages', class: 'footer-link' }, children: ['Packages'] }] },
                            ],
                        },
                    ],
                },
                {
                    tagName: 'div',
                    props: {},
                    children: [
                        { tagName: 'div', props: { class: 'footer-col-title' }, children: ['Ecosystem'] },
                        {
                            tagName: 'ul',
                            props: { class: 'footer-list' },
                            children: [
                                { tagName: 'li', props: {}, children: [{ tagName: 'a', props: { href: 'https://www.npmjs.com/org/elitjs', class: 'footer-link', target: '_blank', rel: 'noopener' }, children: ['npm'] }] },
                                { tagName: 'li', props: {}, children: [{ tagName: 'a', props: { href: 'https://github.com/elitjs/elit', class: 'footer-link', target: '_blank', rel: 'noopener' }, children: ['GitHub'] }] },
                                { tagName: 'li', props: {}, children: [{ tagName: 'a', props: { href: 'https://github.com/elitjs/elit/issues', class: 'footer-link', target: '_blank', rel: 'noopener' }, children: ['Issues'] }] },
                                { tagName: 'li', props: {}, children: [{ tagName: 'a', props: { href: 'https://github.com/elitjs/elit/releases', class: 'footer-link', target: '_blank', rel: 'noopener' }, children: ['Changelog'] }] },
                            ],
                        },
                    ],
                },
                {
                    tagName: 'div',
                    props: {},
                    children: [
                        { tagName: 'div', props: { class: 'footer-col-title' }, children: ['Community'] },
                        {
                            tagName: 'ul',
                            props: { class: 'footer-list' },
                            children: [
                                { tagName: 'li', props: {}, children: [{ tagName: 'a', props: { href: 'https://github.com/elitjs/elit/blob/main/LICENSE', class: 'footer-link', target: '_blank', rel: 'noopener' }, children: ['MIT License'] }] },
                                { tagName: 'li', props: {}, children: [{ tagName: 'a', props: { href: 'https://github.com/elitjs/elit/discussions', class: 'footer-link', target: '_blank', rel: 'noopener' }, children: ['Discussions'] }] },
                            ],
                        },
                    ],
                },
            ],
        },
        {
            tagName: 'div',
            props: { class: 'footer-copy' },
            children: [
                { tagName: 'span', props: {}, children: [`© ${new Date().getFullYear()} Elit.js. MIT licensed.`] },
                { tagName: 'span', props: {}, children: ['Built with Elit.js · ', { tagName: 'a', props: { href: 'https://github.com/elitjs/elit/tree/main/website' }, children: ['view source'] }, ' ↗'] },
            ],
        },
    ],
});
