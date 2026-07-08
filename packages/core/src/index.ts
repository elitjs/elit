/**
 * Elit core render and state contracts.
 */

export interface VNode {
    tagName: string;
    props: Props;
    children: Children;
}

export type Child = VNode | string | number | boolean | null | undefined | Child[];
export type Children = Child[];

export interface Props {
    [key: string]: any;
    className?: string | string[];
    class?: string | string[];
    style?: Partial<CSSStyleDeclaration> | string;
    dangerouslySetInnerHTML?: { __html: string };
    ref?: RefCallback | RefObject;
    onClick?: (event: MouseEvent) => void;
    onChange?: (event: Event) => void;
    onInput?: (event: Event) => void;
    onSubmit?: (event: Event) => void;
    value?: string | number | string[];
    checked?: boolean;
}

export type RefCallback = (element: HTMLElement | SVGElement) => void;

export interface RefObject {
    current: HTMLElement | SVGElement | null;
}

export interface State<T> {
    value: T;
    subscribe(fn: (value: T) => void): () => void;
    destroy(): void;
}

export interface StateOptions {
    throttle?: number;
    deep?: boolean;
}

export interface VirtualListController {
    render: () => void;
    destroy: () => void;
}

export interface JsonNode {
    tag: string;
    attributes?: Record<string, any>;
    children?: JsonNode | JsonNode[] | string | number | boolean | null;
}

export type VNodeJson = {
    tagName: string;
    props?: Record<string, any>;
    children?: (VNodeJson | string | number | boolean | null)[];
} | string | number | boolean | null;

export type ElementFactory = {
    (...children: Child[]): VNode;
    (props: Props | null, ...children: Child[]): VNode;
};
