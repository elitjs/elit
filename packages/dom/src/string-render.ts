import type { Child, Props } from '../../core/types';
import { isState, resolveTextareaValue, shouldSkipChild } from './helpers';

const SELF_CLOSING_TAGS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

export function resolveStateValue(value: any): any {
    return isState(value) ? value.value : value;
}

export function isReactiveWrapper(vNode: any): boolean {
    if (!vNode || typeof vNode !== 'object' || !vNode.tagName) {
        return false;
    }

    return vNode.tagName === 'span'
        && vNode.props?.id
        && typeof vNode.props.id === 'string'
        && /^r[a-z0-9]{9}$/.test(vNode.props.id);
}

export function unwrapReactive(vNode: any): Child {
    if (!isReactiveWrapper(vNode)) {
        return vNode;
    }

    const children = vNode.children;
    if (!children || children.length === 0) {
        return '';
    }

    if (children.length === 1) {
        const child = children[0];

        if (child && typeof child === 'object' && child.tagName === 'span') {
            const props = child.props;
            const hasNoProps = !props || Object.keys(props).length === 0;
            const hasSingleStringChild = child.children
                && child.children.length === 1
                && typeof child.children[0] === 'string';

            if (hasNoProps && hasSingleStringChild) {
                return child.children[0];
            }
        }

        return unwrapReactive(child);
    }

    return children.map((child: Child) => unwrapReactive(child));
}

export function escapeHtml(text: string): string {
    const htmlEscapes: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
    };

    return text.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}

export function isSelfClosingTag(tagName: string): boolean {
    return SELF_CLOSING_TAGS.has(tagName.toLowerCase());
}

export function styleToString(style: any): string {
    if (typeof style === 'string') {
        return style;
    }

    if (typeof style === 'object' && style !== null) {
        const styles: string[] = [];
        for (const key in style) {
            const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            styles.push(`${cssKey}:${style[key]}`);
        }
        return styles.join(';');
    }

    return '';
}

export function propsToAttributes(props: Props, tagName?: string): string {
    const attrs: string[] = [];

    for (const key in props) {
        if (key === 'children' || key === 'dangerouslySetInnerHTML' || key === 'ref' || (tagName === 'textarea' && key === 'value')) {
            continue;
        }

        let value = props[key];
        value = resolveStateValue(value);

        if (value == null || value === false) continue;

        if (key.startsWith('on') && typeof value === 'function') {
            continue;
        }

        if (key === 'className' || key === 'class') {
            const className = Array.isArray(value) ? value.join(' ') : value;
            if (className) {
                attrs.push(`class="${escapeHtml(String(className))}"`);
            }
            continue;
        }

        if (key === 'style') {
            const styleStr = styleToString(value);
            if (styleStr) {
                attrs.push(`style="${escapeHtml(styleStr)}"`);
            }
            continue;
        }

        if (value === true) {
            attrs.push(key);
            continue;
        }

        attrs.push(`${key}="${escapeHtml(String(value))}"`);
    }

    return attrs.join(' ');
}

export function renderToString(vNode: Child, options: { pretty?: boolean; indent?: number } = {}): string {
    const { pretty = false, indent = 0 } = options;
    const indentStr = pretty ? '  '.repeat(indent) : '';
    const newLine = pretty ? '\n' : '';

    let resolvedVNode = resolveStateValue(vNode);
    resolvedVNode = unwrapReactive(resolvedVNode);

    if (Array.isArray(resolvedVNode)) {
        return resolvedVNode.map((child) => renderToString(child, options)).join('');
    }

    if (typeof resolvedVNode !== 'object' || resolvedVNode === null) {
        if (resolvedVNode === null || resolvedVNode === undefined || resolvedVNode === false) {
            return '';
        }

        return escapeHtml(String(resolvedVNode));
    }

    const { tagName, props, children } = resolvedVNode;
    const textareaValue = resolveTextareaValue(tagName, props);
    const selfClosing = isSelfClosingTag(tagName);

    let html = `${indentStr}<${tagName}`;
    const attrs = propsToAttributes(props, tagName);
    if (attrs) {
        html += ` ${attrs}`;
    }

    if (selfClosing) {
        html += ` />${newLine}`;
        return html;
    }

    html += '>';

    if (textareaValue !== undefined) {
        html += escapeHtml(textareaValue);
        html += `</${tagName}>${newLine}`;
        return html;
    }

    if (props.dangerouslySetInnerHTML) {
        html += props.dangerouslySetInnerHTML.__html;
        html += `</${tagName}>${newLine}`;
        return html;
    }

    const isRawText = tagName === 'script' || tagName === 'style';

    if (children && children.length > 0) {
        const resolvedChildren = children.map((child: Child) => unwrapReactive(resolveStateValue(child)));
        const hasComplexChildren = resolvedChildren.some(
            (child: any) => typeof child === 'object' && child !== null && !Array.isArray(child) && 'tagName' in child,
        );

        if (pretty && hasComplexChildren) {
            html += newLine;
            for (const child of resolvedChildren) {
                if (shouldSkipChild(child)) continue;

                if (Array.isArray(child)) {
                    for (const nestedChild of child) {
                        if (!shouldSkipChild(nestedChild)) {
                            html += isRawText && typeof nestedChild === 'string'
                                ? nestedChild
                                : renderToString(nestedChild, { pretty, indent: indent + 1 });
                        }
                    }
                } else {
                    html += isRawText && typeof child === 'string'
                        ? child
                        : renderToString(child, { pretty, indent: indent + 1 });
                }
            }
            html += indentStr;
        } else {
            for (const child of resolvedChildren) {
                if (shouldSkipChild(child)) continue;

                if (Array.isArray(child)) {
                    for (const nestedChild of child) {
                        if (!shouldSkipChild(nestedChild)) {
                            html += isRawText && typeof nestedChild === 'string'
                                ? nestedChild
                                : renderToString(nestedChild, { pretty: false, indent: 0 });
                        }
                    }
                } else {
                    html += isRawText && typeof child === 'string'
                        ? child
                        : renderToString(child, { pretty: false, indent: 0 });
                }
            }
        }
    }

    html += `</${tagName}>${newLine}`;
    return html;
}

export function renderToHTMLDocument(vNode: Child, options: {
    title?: string;
    meta?: Array<Record<string, string>>;
    links?: Array<Record<string, string>>;
    scripts?: Array<{ src?: string; content?: string; async?: boolean; defer?: boolean; type?: string }>;
    styles?: Array<{ href?: string; content?: string }>;
    lang?: string;
    head?: string;
    bodyAttrs?: Record<string, string>;
    pretty?: boolean;
} = {}): string {
    const {
        title = '',
        meta = [],
        links = [],
        scripts = [],
        styles = [],
        lang = 'en',
        head = '',
        bodyAttrs = {},
        pretty = false,
    } = options;
    const nl = pretty ? '\n' : '';
    const indent = pretty ? '  ' : '';
    const indent2 = pretty ? '    ' : '';

    let html = `<!DOCTYPE html>${nl}<html lang="${lang}">${nl}${indent}<head>${nl}${indent2}<meta charset="UTF-8">${nl}${indent2}<meta name="viewport" content="width=device-width, initial-scale=1.0">${nl}`;
    if (title) {
        html += `${indent2}<title>${escapeHtml(title)}</title>${nl}`;
    }

    for (const metaAttrs of meta) {
        html += `${indent2}<meta`;
        for (const key in metaAttrs) {
            html += ` ${key}="${escapeHtml(metaAttrs[key])}"`;
        }
        html += `>${nl}`;
    }

    for (const linkAttrs of links) {
        html += `${indent2}<link`;
        for (const key in linkAttrs) {
            html += ` ${key}="${escapeHtml(linkAttrs[key])}"`;
        }
        html += `>${nl}`;
    }

    for (const style of styles) {
        if (style.href) {
            html += `${indent2}<link rel="stylesheet" href="${escapeHtml(style.href)}">${nl}`;
        } else if (style.content) {
            html += `${indent2}<style>${style.content}</style>${nl}`;
        }
    }

    if (head) {
        html += head + nl;
    }

    html += `${indent}</head>${nl}${indent}<body`;
    for (const key in bodyAttrs) {
        html += ` ${key}="${escapeHtml(bodyAttrs[key])}"`;
    }
    html += `>${nl}`;
    html += renderToString(vNode, { pretty, indent: 2 });

    for (const script of scripts) {
        html += `${indent2}<script`;
        if (script.type) {
            html += ` type="${escapeHtml(script.type)}"`;
        }
        if (script.async) {
            html += ' async';
        }
        if (script.defer) {
            html += ' defer';
        }

        if (script.src) {
            html += ` src="${escapeHtml(script.src)}"></script>${nl}`;
        } else if (script.content) {
            html += `>${script.content}</script>${nl}`;
        } else {
            html += `></script>${nl}`;
        }
    }

    html += `${indent}</body>${nl}</html>`;
    return html;
}