/// <reference path="../../src/test-globals.d.ts" />

import { a, div, textarea } from '../../src/el';
import { render, renderToString } from '../../src/dom';
import { createState } from '../../src/state';

class FakeTextNode {
    constructor(public textContent: string) {}
}

class FakeDocumentFragment {
    children: Array<FakeElement | FakeTextNode> = [];

    appendChild(child: FakeElement | FakeTextNode): FakeElement | FakeTextNode {
        this.children.push(child);
        return child;
    }
}

class FakeElement {
    attributes: Record<string, string> = {};
    children: Array<FakeElement | FakeTextNode | FakeDocumentFragment> = [];
    className = '';
    namespaceURI?: string;
    style: Record<string, string> & { cssText?: string } = {};
    value = '';

    private html = '';

    constructor(public tagName: string) {}

    get innerHTML(): string {
        return this.html;
    }

    set innerHTML(value: string) {
        this.html = value;
        this.children = [];
    }

    appendChild(child: FakeElement | FakeTextNode | FakeDocumentFragment): FakeElement | FakeTextNode | FakeDocumentFragment {
        this.children.push(child);
        return child;
    }

    setAttribute(name: string, value: string): void {
        this.attributes[name] = value;
    }

    getAttribute(name: string): string | null {
        return Object.prototype.hasOwnProperty.call(this.attributes, name)
            ? this.attributes[name]
            : null;
    }
}

function createFakeDocument() {
    return {
        createDocumentFragment: () => new FakeDocumentFragment(),
        createElement: (tagName: string) => new FakeElement(tagName),
        createElementNS: (namespaceURI: string, tagName: string) => {
            const element = new FakeElement(tagName);
            element.namespaceURI = namespaceURI;
            return element;
        },
        createTextNode: (text: string) => new FakeTextNode(text),
        getElementById: () => null,
    };
}

describe('dom renderer props', () => {
    beforeEach(() => {
        (globalThis as any).document = createFakeDocument();
    });

    afterEach(() => {
        delete (globalThis as any).document;
    });

    it('does not treat rel as a ref object', async () => {
        const root = new FakeElement('root');

        render(root as any, div(
            a({ href: 'https://example.com', target: '_blank', rel: 'noreferrer' }, 'Open'),
        ));

        await new Promise((resolve) => setTimeout(resolve, 0));

        const wrapper = root.children[0] as FakeElement;
        const link = wrapper.children[0] as FakeElement;
        expect(link.getAttribute('rel')).toBe('noreferrer');
        expect(link.getAttribute('target')).toBe('_blank');
    });

    it('still assigns ref objects to the rendered element', async () => {
        const root = new FakeElement('root');
        const ref: { current: HTMLElement | null } = { current: null };

        render(root as any, div(
            a({ href: '#', ref }, 'Open'),
        ));

        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(ref.current).toBeDefined();
        expect(ref.current?.tagName).toBe('a');
    });

    it('sets textarea value through the DOM property', () => {
        const root = new FakeElement('root');

        render(root as any, div(
            textarea({ value: 'Preset message' }),
        ));

        const wrapper = root.children[0] as FakeElement;
        const field = wrapper.children[0] as FakeElement;
        expect(field.value).toBe('Preset message');
        expect(field.getAttribute('value')).toBeNull();
        expect(field.children).toHaveLength(0);
    });

    it('renders State children as live text nodes', () => {
        const root = new FakeElement('root');
        const label = createState('initial');

        render(root as any, div(label));

        const wrapper = root.children[0] as FakeElement;
        const textNode = wrapper.children[0] as FakeTextNode;
        expect(textNode.textContent).toBe('initial');

        label.value = 'updated';
        expect(textNode.textContent).toBe('updated');
    });

    it('renders textarea values as text content in SSR output', () => {
        expect(renderToString(textarea({ value: 'Preset message' }))).toBe('<textarea>Preset message</textarea>');
    });
});

describe('dom renderer elit-version', () => {
    beforeEach(() => {
        (globalThis as any).document = createFakeDocument();
    });

    afterEach(() => {
        delete (globalThis as any).document;
    });

    it('stamps the elit-version attribute on the mounted root element', () => {
        const root = new FakeElement('root');

        render(root as any, div('Hello'));

        expect(root.getAttribute('elit-version')).toBe('4.0.0');
    });
});