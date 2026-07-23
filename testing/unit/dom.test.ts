/// <reference path="../../packages/test/src/globals.d.ts" />

import { a, div, textarea } from '../../packages/el/src';
import { render, renderToString, snapshotProps, prevPropsMap } from '../../packages/dom/src';
import { createState } from '../../packages/state/src';

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

// Characterization tests for snapshotProps: the prev-props snapshot is a ONE-LEVEL shallow
// clone. These tests pin that contract so future changes (e.g. switching to deep clone or
// value-equality diffing) have to update the expectations deliberately.
describe('snapshotProps shallow-clone contract', () => {
    it('isolates top-level key removal', () => {
        const shared: { color: string; fontSize?: string } = { color: 'red', fontSize: '12px' };
        const snap = snapshotProps({ 'data-style': shared });

        delete shared.fontSize;

        // Snapshot was shallow-cloned at top level, so removing a key from the caller's
        // object after snapshotting must NOT affect the snapshot.
        expect((snap['data-style'] as { fontSize?: string }).fontSize).toBe('12px');
    });

    it('isolates top-level value reassignment', () => {
        const shared = { color: 'red' };
        const snap = snapshotProps({ 'data-style': shared });

        shared.color = 'blue';

        expect((snap['data-style'] as { color: string }).color).toBe('red');
    });

    it('does NOT isolate deeply nested mutations (known shallow-clone limitation)', () => {
        // If Elit ever introduces deeply-nested prop shapes that callers mutate in place,
        // snapshotProps must switch to a per-key deep clone (or value-equality diffing) for
        // those keys. This test documents the current limitation explicitly so the change
        // shows up as a test failure rather than a silent regression.
        type Nested = { font: { size: string } };
        const shared: Nested = { font: { size: '12px' } };
        const snap = snapshotProps({ 'data-nested': shared });

        shared.font.size = '14px';

        // Shallow clone: the nested `font` object is shared, so the mutation leaks.
        expect((snap['data-nested'] as Nested).font.size).toBe('14px');
    });

    it('keeps Date references untouched (no silent data loss from spreading)', () => {
        const date = new Date(0);
        const snap = snapshotProps({ 'data-ts': date });

        // Date is not a plain object — spreading would strip its internal time. The current
        // isPlainObject guard keeps the reference, which preserves the value.
        expect(snap['data-ts']).toBe(date);
        expect((snap['data-ts'] as Date).getTime()).toBe(0);
    });

    it('skips State values (live values are resolved at diff time, not snapshotted)', () => {
        const state = createState('initial');
        const snap = snapshotProps({ 'data-state': state });

        expect('data-state' in snap).toBe(false);
    });

    it('skips the ref key', () => {
        const ref = { current: null };
        const snap = snapshotProps({ ref });

        expect('ref' in snap).toBe(false);
    });
});

describe('prevPropsMap lifecycle', () => {
    beforeEach(() => {
        (globalThis as any).document = createFakeDocument();
    });

    afterEach(() => {
        delete (globalThis as any).document;
    });

    it('stores a snapshot after initial render so the first reactive update can diff', () => {
        const root = new FakeElement('root');

        render(root as any, div({ id: 'host' }, div({ id: 'child', style: { color: 'red' } })));

        const child = (root.children[0] as FakeElement).children[0] as FakeElement;
        const snap = prevPropsMap.get(child as any);

        // Without this initial snapshot, the first reactive update would have nothing to
        // diff against and would skip removal of stale keys.
        expect(snap).toBeDefined();
        expect((snap as { style: { color: string } }).style.color).toBe('red');
    });
});