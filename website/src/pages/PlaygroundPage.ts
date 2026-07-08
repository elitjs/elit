import type { VNode, Child } from '@elitjs/core';
import { createState, computed } from '@elitjs/state';
import type { State } from '@elitjs/core';
import { el } from '@elitjs/el';
import { render } from '@elitjs/dom';

const escapeHtml = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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

const DEFAULT_CODE = `// Elit.js playground — edit, then click Run.
// el() builds VNodes, createState() holds reactive state,
// render() mounts them into target.

const count = createState(0);

const Counter = el('div', { style: { textAlign: 'center', fontFamily: 'sans-serif' } },
    el('h1', { style: { margin: '0 0 12px', fontSize: '20px' } }, 'Counter'),
    el('button', {
        onClick: () => count.value++,
        style: {
            padding: '8px 16px', fontSize: '16px', cursor: 'pointer',
            border: '1px solid #ccc', borderRadius: '6px',
        },
    }, 'Clicks: ', count),
);

render(target, Counter);
// count is reactive — click the button to see it update.`;

interface PlaygroundState {
    code: string;
    error: string | null;
}

export const PlaygroundPage = (): VNode => {
    const codeState = createState<PlaygroundState>({ code: DEFAULT_CODE, error: null });
    const runCount = createState(0);

    const highlightedHtml = computed([codeState], (s) => ({ __html: highlight(s.code) + '\n' }));

    let preEl: HTMLPreElement | null = null;

    const syncScroll = (e: Event): void => {
        const ta = e.target as HTMLTextAreaElement;
        if (preEl) {
            preEl.scrollTop = ta.scrollTop;
            preEl.scrollLeft = ta.scrollLeft;
        }
    };

    const runCode = (state: State<PlaygroundState>) => {
        const { code } = state.value;
        const target = document.getElementById('playground-target');
        if (!target) return;
        target.innerHTML = '';

        try {
            const fn = new Function('el', 'createState', 'render', 'target', code);
            fn(el, createState, render, target);
            state.value = { code, error: null };
            runCount.value++;
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            state.value = { code, error: msg };
        }
    };

    setTimeout(() => runCode(codeState), 0);

    const onInput = (e: Event) => {
        const target = e.target as HTMLTextAreaElement;
        codeState.value = { ...codeState.value, code: target.value };
    };

    const onRun = () => runCode(codeState);

    const errorNode: Child = { tagName: 'div', props: {}, children: [] };
    const reactiveError = (() => {
        // Subscribe so error text updates reactively
        codeState.subscribe((s) => {
            const div = errorNode as any;
            if (div && div.tagName) {
                div.props = div.props || {};
                div.children = s.error ? [s.error] : [];
            }
        });
        return errorNode;
    })();

    return {
        tagName: 'div',
        props: { class: 'playground-layout' },
        children: [
            {
                tagName: 'div',
                props: { class: 'playground-editor' },
                children: [
                    {
                        tagName: 'div',
                        props: { class: 'playground-toolbar' },
                        children: [
                            { tagName: 'span', props: {}, children: ['playground.ts'] },
                            { tagName: 'span', props: { style: { flex: '1' } }, children: [] },
                            {
                                tagName: 'button',
                                props: { class: 'playground-run', onClick: onRun },
                                children: ['▶ Run'],
                            },
                        ],
                    },
                    {
                        tagName: 'div',
                        props: { class: 'playground-editor-container' },
                        children: [
                            {
                                tagName: 'pre',
                                props: {
                                    class: 'playground-highlight',
                                    'aria-hidden': 'true',
                                    ref: (el: HTMLElement | SVGElement) => {
                                        preEl = el as HTMLPreElement;
                                    },
                                    dangerouslySetInnerHTML: highlightedHtml,
                                },
                                children: [],
                            },
                            {
                                tagName: 'textarea',
                                props: {
                                    class: 'playground-textarea',
                                    spellcheck: false,
                                    onInput,
                                    onScroll: syncScroll,
                                },
                                children: [DEFAULT_CODE],
                            },
                        ],
                    },
                ],
            },
            {
                tagName: 'div',
                props: { class: 'playground-preview', style: { display: 'flex', flexDirection: 'column' } },
                children: [
                    {
                        tagName: 'div',
                        props: {
                            style: {
                                padding: '8px 12px',
                                background: '#141821',
                                color: '#9aa3b8',
                                fontFamily: 'ui-monospace, Menlo, monospace',
                                fontSize: '12px',
                                borderBottom: '1px solid #2a3142',
                            },
                        },
                        children: ['preview'],
                    },
                    {
                        tagName: 'div',
                        props: {
                            id: 'playground-target',
                            style: { flex: '1', padding: '24px', color: '#0b0d13', overflow: 'auto' },
                        },
                        children: [],
                    },
                    {
                        tagName: 'div',
                        props: {
                            ref: (host: HTMLElement | SVGElement) => {
                                const el = host as HTMLElement;
                                codeState.subscribe((s) => {
                                    el.textContent = s.error ?? '';
                                    el.style.display = s.error ? 'block' : 'none';
                                });
                            },
                            style: {
                                padding: '8px 12px',
                                background: '#3a1414',
                                color: '#ff9bce',
                                fontFamily: 'ui-monospace, Menlo, monospace',
                                fontSize: '12px',
                                display: 'none',
                            },
                        },
                        children: [],
                    },
                ],
            },
        ],
    };
};
