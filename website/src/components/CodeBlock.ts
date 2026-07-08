import type { Child, VNode } from '@elitjs/core';

interface CodeBlockProps {
    label?: string;
    code: string;
}

const escapeHtml = (s: string): string =>
    s.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

const highlight = (code: string): string => {
    const escaped = escapeHtml(code);
    const pattern = /(\/\/[^\n]*)|('[^']*'|"[^"]*"|`[^`]*`)|\b(import|from|export|const|let|var|function|return|if|else|for|of|in|new|class|interface|type|async|await|default)\b|\b(\d+)\b|\b(render|createState|computed|el|effect|subscribe|createRouter|createRouterView|routerLink|renderNativeTree|renderToDOM|dom)\b/g;
    return escaped.replace(pattern, (match, comment, str, kw, num, fn) => {
        if (comment) return `<span style="color:#6b748a;font-style:italic">${comment}</span>`;
        if (str) return `<span style="color:#34d399">${str}</span>`;
        if (kw) return `<span style="color:#a78bfa">${kw}</span>`;
        if (num) return `<span style="color:#fbbf24">${num}</span>`;
        if (fn) return `<span style="color:#22d3ee">${fn}</span>`;
        return match;
    });
};

const COPY_SCRIPT = `
(function(btn, code) {
    const id = '__elit_code_' + Math.random().toString(36).slice(2);
    btn.dataset.id = id;
    btn.addEventListener('click', () => {
        try {
            navigator.clipboard.writeText(code);
            btn.textContent = 'Copied';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = 'Copy';
                btn.classList.remove('copied');
            }, 1600);
        } catch (e) {}
    });
})(arguments[0], ${JSON.stringify('__CODE_PLACEHOLDER__')});
`;

export const CodeBlock = ({ label, code }: CodeBlockProps): VNode => {
    const copyScript = COPY_SCRIPT.replace(JSON.stringify('__CODE_PLACEHOLDER__'), JSON.stringify(code));

    const children: Child[] = [{
        tagName: 'div',
        props: { class: 'code-block' },
        children: [
            {
                tagName: 'div',
                props: { class: 'code-header' },
                children: [
                    {
                        tagName: 'div',
                        props: { class: 'code-header-left' },
                        children: [
                            {
                                tagName: 'div',
                                props: { class: 'code-dots' },
                                children: [
                                    { tagName: 'span', props: { class: 'code-dot red' }, children: [] },
                                    { tagName: 'span', props: { class: 'code-dot yellow' }, children: [] },
                                    { tagName: 'span', props: { class: 'code-dot green' }, children: [] },
                                ],
                            },
                            {
                                tagName: 'span',
                                props: { class: 'code-label' },
                                children: [label ?? 'snippet'],
                            },
                        ],
                    },
                    {
                        tagName: 'button',
                        props: {
                            class: 'code-copy',
                            type: 'button',
                            ref: (btn: HTMLElement | SVGElement) => {
                                const el = btn as HTMLButtonElement;
                                try {
                                    (new Function('return (function(btn){' + copyScript + '})'))()(el);
                                } catch (e) {
                                    el.addEventListener('click', () => {
                                        try { navigator.clipboard.writeText(code); } catch (_) {}
                                    });
                                }
                            },
                        },
                        children: ['Copy'],
                    },
                ],
            },
            {
                tagName: 'pre',
                props: {},
                children: [{
                    tagName: 'code',
                    props: { dangerouslySetInnerHTML: { __html: highlight(code) } },
                    children: [],
                }],
            },
        ],
    }];

    return { tagName: 'div', props: {}, children };
};
