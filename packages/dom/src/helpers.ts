import type { Props, State } from '../../core/types';

export function resolveElement(rootElement: string | HTMLElement): HTMLElement | null {
    return typeof rootElement === 'string'
        ? document.getElementById(rootElement.replace('#', ''))
        : rootElement;
}

export function ensureElement(el: HTMLElement | null, rootElement: string | HTMLElement): HTMLElement {
    if (!el) {
        throw new Error(`Element not found: ${rootElement}`);
    }

    return el;
}

export function shouldSkipChild(child: any): boolean {
    return child == null || child === false;
}

export function isPrimitiveJson(json: any): json is string | number | boolean | null | undefined {
    return json == null || typeof json === 'boolean' || typeof json === 'string' || typeof json === 'number';
}

export function normalizeFormControlValue(value: unknown): string {
    if (Array.isArray(value)) {
        return value.map((entry) => String(entry)).join(',');
    }

    return value == null ? '' : String(value);
}

export function resolveTextareaValue(tagName: string, props: Props): string | undefined {
    return tagName === 'textarea' && props.value != null
        ? normalizeFormControlValue(props.value)
        : undefined;
}

export function hasDocumentApi(): boolean {
    return typeof document !== 'undefined';
}

export function isState(value: any): value is State<any> {
    return value && typeof value === 'object' && 'value' in value && 'subscribe' in value && typeof value.subscribe === 'function';
}