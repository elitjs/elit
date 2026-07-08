import type { Child, VNode } from '@elitjs/core';
import { createState } from '@elitjs/state';
import { CodeBlock } from '../components/CodeBlock';

const COUNTER_CODE = `const count = createState(0);

const Counter = el('div', { style: { textAlign: 'center' } },
    el('h2', { style: { margin: '0 0 12px', fontSize: '40px' } }, count),
    el('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center' } },
        el('button', {
            onClick: () => count.value--,
            style: { padding: '6px 14px', fontSize: '18px', cursor: 'pointer' },
        }, '-'),
        el('button', {
            onClick: () => count.value++,
            style: { padding: '6px 14px', fontSize: '18px', cursor: 'pointer' },
        }, '+'),
    ),
);`;

const TODO_CODE = `interface Todo { id: number; text: string; done: boolean; }
const todos = createState<Todo[]>([
    { id: 1, text: 'Learn Elit.js', done: true },
    { id: 2, text: 'Build something', done: false },
]);
let nextId = 3;

const input = createState('');

const toggle = (id: number) => {
    todos.value = todos.value.map((t) =>
        t.id === id ? { ...t, done: !t.done } : t,
    );
};

const add = () => {
    if (!input.value.trim()) return;
    todos.value = [...todos.value, { id: nextId++, text: input.value, done: false }];
    input.value = '';
};

let ulEl: HTMLUListElement | null = null;
const drawList = () => {
    if (!ulEl) return;
    ulEl.innerHTML = '';
    for (const t of todos.value) {
        const li = document.createElement('li');
        li.textContent = t.text;
        li.onclick = () => toggle(t.id);
        li.style.cssText = \`padding:6px 8px;cursor:pointer;\${t.done ? 'text-decoration:line-through;opacity:0.6' : ''}\`;
        ulEl.appendChild(li);
    }
};
todos.subscribe(drawList);

const TodoApp = el('div', { style: { minWidth: '260px' } },
    el('div', { style: { display: 'flex', gap: '6px', marginBottom: '10px' } },
        el('input', {
            value: input,
            onInput: (e: Event) => input.value = (e.target as HTMLInputElement).value,
            style: { flex: '1', padding: '5px 8px', fontSize: '13px' },
            placeholder: 'New todo...',
        }),
        el('button', { onClick: add, style: { padding: '5px 10px', cursor: 'pointer' } }, 'Add'),
    ),
    el('ul', {
        style: { listStyle: 'none', padding: '0', margin: '0' },
        ref: (el: HTMLElement) => { ulEl = el as HTMLUListElement; drawList(); },
    }),
);`;

const GREETING_CODE = `const name = createState('world');

const Greeting = el('div', { style: { textAlign: 'center' } },
    el('p', { style: { margin: '0 0 8px', fontSize: '15px' } }, 'What is your name?'),
    el('input', {
        value: name,
        onInput: (e: Event) => name.value = (e.target as HTMLInputElement).value,
        style: { padding: '5px 8px', fontSize: '13px', textAlign: 'center' },
        placeholder: 'Type your name...',
    }),
    el('p', { style: { marginTop: '10px', fontSize: '17px' } },
        'Hello, ',
        el('strong', { style: { color: '#c4a3ff' } }, name),
        '!',
    ),
);`;

interface Example {
    id: string;
    title: string;
    desc: string;
    code: string;
    render: () => VNode;
}

const Counter = (): VNode => {
    const count = createState(0);
    return {
        tagName: 'div',
        props: { style: { textAlign: 'center' } },
        children: [
            {
                tagName: 'h2',
                props: { style: { margin: '0 0 12px', fontSize: '40px' } },
                children: [count as unknown as Child],
            },
            {
                tagName: 'div',
                props: { style: { display: 'flex', gap: '8px', justifyContent: 'center' } },
                children: [
                    {
                        tagName: 'button',
                        props: {
                            onClick: () => count.value--,
                            style: { padding: '6px 14px', fontSize: '18px', cursor: 'pointer' },
                        },
                        children: ['-'],
                    },
                    {
                        tagName: 'button',
                        props: {
                            onClick: () => count.value++,
                            style: { padding: '6px 14px', fontSize: '18px', cursor: 'pointer' },
                        },
                        children: ['+'],
                    },
                ],
            },
        ],
    };
};

interface Todo {
    id: number;
    text: string;
    done: boolean;
}

const TodoApp = (): VNode => {
    const todos = createState<Todo[]>([
        { id: 1, text: 'Learn Elit.js', done: true },
        { id: 2, text: 'Build something', done: false },
    ]);
    const input = createState('');
    let nextId = 3;

    const toggle = (id: number): void => {
        todos.value = todos.value.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    };
    const add = (): void => {
        if (!input.value.trim()) return;
        todos.value = [...todos.value, { id: nextId++, text: input.value, done: false }];
        input.value = '';
    };

    let ulEl: HTMLUListElement | null = null;
    const drawList = (): void => {
        if (!ulEl) return;
        ulEl.innerHTML = '';
        for (const t of todos.value) {
            const li = document.createElement('li');
            li.textContent = t.text;
            li.onclick = (): void => toggle(t.id);
            li.style.cssText = `padding:6px 8px;cursor:pointer;color:inherit;${t.done ? 'text-decoration:line-through;opacity:0.6' : ''}`;
            ulEl.appendChild(li);
        }
    };
    todos.subscribe(drawList);

    return {
        tagName: 'div',
        props: { style: { minWidth: '260px' } },
        children: [
            {
                tagName: 'div',
                props: { style: { display: 'flex', gap: '6px', marginBottom: '10px' } },
                children: [
                    {
                        tagName: 'input',
                        props: {
                            value: input as unknown as string,
                            onInput: (e: Event) => {
                                input.value = (e.target as HTMLInputElement).value;
                            },
                            style: { flex: '1', padding: '5px 8px', fontSize: '13px' },
                            placeholder: 'New todo...',
                        },
                        children: [],
                    },
                    {
                        tagName: 'button',
                        props: { onClick: add, style: { padding: '5px 10px', cursor: 'pointer' } },
                        children: ['Add'],
                    },
                ],
            },
            {
                tagName: 'ul',
                props: {
                    style: { listStyle: 'none', padding: '0', margin: '0' },
                    ref: (el: HTMLElement | SVGElement) => {
                        ulEl = el as HTMLUListElement;
                        drawList();
                    },
                },
                children: [],
            },
        ],
    };
};

const Greeting = (): VNode => {
    const name = createState('world');
    return {
        tagName: 'div',
        props: { style: { textAlign: 'center' } },
        children: [
            {
                tagName: 'p',
                props: { style: { margin: '0 0 8px', fontSize: '15px' } },
                children: ['What is your name?'],
            },
            {
                tagName: 'input',
                props: {
                    value: name as unknown as string,
                    onInput: (e: Event) => {
                        name.value = (e.target as HTMLInputElement).value;
                    },
                    style: { padding: '5px 8px', fontSize: '13px', textAlign: 'center' },
                    placeholder: 'Type your name...',
                },
                children: [],
            },
            {
                tagName: 'p',
                props: { style: { marginTop: '10px', fontSize: '17px' } },
                children: [
                    'Hello, ',
                    {
                        tagName: 'strong',
                        props: { style: { color: '#c4a3ff' } },
                        children: [name as unknown as Child],
                    },
                    '!',
                ],
            },
        ],
    };
};

const EXAMPLES: Example[] = [
    { id: 'counter', title: 'Counter', desc: 'The classic. State flows into text and event handlers update it.', code: COUNTER_CODE, render: Counter },
    { id: 'todo', title: 'Todo list', desc: 'A list backed by State<T[]>. Subscribe re-renders rows when the array is replaced.', code: TODO_CODE, render: TodoApp },
    { id: 'greeting', title: 'Two-way input', desc: 'Input element bound to a State — typing updates the live headline below.', code: GREETING_CODE, render: Greeting },
];

export const ExamplesPage = (): VNode => ({
    tagName: 'div',
    props: { class: 'section' },
    children: [
        {
            tagName: 'div',
            props: { class: 'section-head' },
            children: [
                { tagName: 'div', props: { class: 'section-label' }, children: ['Examples'] },
                { tagName: 'h2', props: {}, children: ['Live demos'] },
                {
                    tagName: 'p',
                    props: { style: { color: '#9aa3b8', maxWidth: '560px', margin: '12px auto 0' } },
                    children: ['Each example below is live — interact with it. The source snippet shows the exact code that produces it.'],
                },
            ],
        },
        {
            tagName: 'div',
            props: { class: 'examples-grid' },
            children: EXAMPLES.map((ex) => ({
                tagName: 'div',
                props: { class: 'example-card', id: ex.id },
                children: [
                    {
                        tagName: 'div',
                        props: { class: 'example-preview' },
                        children: [ex.render()],
                    },
                    {
                        tagName: 'div',
                        props: { class: 'example-info' },
                        children: [
                            { tagName: 'h3', props: { class: 'example-title' }, children: [ex.title] },
                            { tagName: 'p', props: { class: 'example-desc' }, children: [ex.desc] },
                        ],
                    },
                    {
                        tagName: 'div',
                        props: { class: 'example-code' },
                        children: [CodeBlock({ label: `${ex.id}.ts`, code: ex.code })],
                    },
                ],
            })),
        },
    ],
});
