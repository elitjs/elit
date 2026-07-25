/// <reference path="../../packages/test/src/globals.d.ts" />

import { reactive, createState } from '../../packages/state/src';
import { render } from '../../packages/dom/src';

class FakeTextNode {
    nodeType = 3;
    parentNode: any = null;
    constructor(public textContent: string) {}
}

class FakeElement {
    nodeType = 1;
    tagName: string;
    namespaceURI?: string;
    attributes: Record<string, string> = {};
    children: Array<FakeElement | FakeTextNode> = [];
    className = '';
    style: Record<string, string> & { cssText: string } = { cssText: '' };
    value = '';
    parentNode: any = null;

    constructor(tagName: string) {
        this.tagName = tagName;
    }

    get childNodes() {
        return this.children;
    }

    appendChild<T extends FakeElement | FakeTextNode>(child: T): T {
        this.children.push(child);
        child.parentNode = this;
        return child;
    }

    removeChild(child: FakeElement | FakeTextNode) {
        const index = this.children.indexOf(child);
        if (index >= 0) this.children.splice(index, 1);
        child.parentNode = null;
        return child;
    }

    replaceChild(node: FakeElement | FakeTextNode, old: FakeElement | FakeTextNode) {
        const index = this.children.indexOf(old);
        if (index >= 0) this.children[index] = node;
        node.parentNode = this;
        return old;
    }

    insertBefore(node: FakeElement | FakeTextNode, ref: FakeElement | FakeTextNode) {
        const index = this.children.indexOf(ref);
        this.children.splice(index, 0, node);
        node.parentNode = this;
        return node;
    }

    setAttribute(name: string, value: string) {
        this.attributes[name] = String(value);
    }

    getAttribute(name: string): string | null {
        return name in this.attributes ? this.attributes[name] : null;
    }

    hasAttribute(name: string): boolean {
        return name in this.attributes;
    }

    removeAttribute(name: string) {
        delete this.attributes[name];
    }

    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {
        return true;
    }
}

class FakeDocumentFragment {
    children: any[] = [];
    appendChild(child: any) {
        this.children.push(child);
        return child;
    }
}

const originalDocument = (globalThis as any).document;
const originalRAF = (globalThis as any).requestAnimationFrame;
const originalCAF = (globalThis as any).cancelAnimationFrame;

let rafQueue: Array<() => void> = [];

function installDom(): void {
    (globalThis as any).document = {
        createElement: (tag: string) => new FakeElement(tag),
        createElementNS: (ns: string, tag: string) => {
            const el = new FakeElement(tag);
            el.namespaceURI = ns;
            return el;
        },
        createTextNode: (text: string) => new FakeTextNode(String(text)),
        createComment: (text: string) => {
            const node = new FakeTextNode(String(text));
            (node as any).nodeType = 8;
            return node;
        },
        createDocumentFragment: () => new FakeDocumentFragment(),
    };
    (globalThis as any).Node = { TEXT_NODE: 3, ELEMENT_NODE: 1, COMMENT_NODE: 8 };
    (globalThis as any).HTMLInputElement = class {};
    (globalThis as any).HTMLTextAreaElement = class {};
    (globalThis as any).HTMLSelectElement = class {};
    rafQueue = [];
    (globalThis as any).requestAnimationFrame = (cb: () => void) => {
        rafQueue.push(cb);
        return rafQueue.length;
    };
    (globalThis as any).cancelAnimationFrame = () => {};
}

function restoreDom(): void {
    if (originalDocument) (globalThis as any).document = originalDocument;
    else delete (globalThis as any).document;
    if (originalRAF) (globalThis as any).requestAnimationFrame = originalRAF;
    else delete (globalThis as any).requestAnimationFrame;
    if (originalCAF) (globalThis as any).cancelAnimationFrame = originalCAF;
    else delete (globalThis as any).cancelAnimationFrame;
}

const flushRAF = (): void => {
    const queue = rafQueue.slice();
    rafQueue.length = 0;
    queue.forEach((cb) => cb());
};

const nextTick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('reactive() realtime updates', () => {
    beforeEach(installDom);
    afterEach(restoreDom);

    it('replays a state change that arrived before the async ref fired', async () => {
        const state = createState('initial');
        const vnode = reactive(state, (value) => value);

        const root = new FakeElement('root');
        render(root as any, vnode);

        const span = root.children[0] as FakeElement;
        const text = () => (span.children[0] as FakeTextNode).textContent;
        expect(text()).toBe('initial');

        // The DOM renderer fires `ref` via setTimeout, so this change lands
        // before elementRef is set. Without the replay the update is dropped
        // and the element is stuck on the initial snapshot.
        state.value = 'updated';
        flushRAF();
        expect(text()).toBe('initial');

        await nextTick();
        expect(text()).toBe('updated');
    });

    it('updates normally once mounted', async () => {
        const state = createState('a');
        const vnode = reactive(state, (value) => value);

        const root = new FakeElement('root');
        render(root as any, vnode);
        await nextTick();

        state.value = 'b';
        flushRAF();

        const span = root.children[0] as FakeElement;
        expect((span.children[0] as FakeTextNode).textContent).toBe('b');
    });
});
