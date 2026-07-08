import type { ElementFactory } from '../../core/types';

export const tags = [
    'html', 'head', 'body', 'title', 'base', 'link', 'meta', 'style',
    'address', 'article', 'aside', 'footer', 'header', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'main', 'nav', 'section',
    'blockquote', 'dd', 'div', 'dl', 'dt', 'figcaption', 'figure', 'hr', 'li', 'ol', 'p', 'pre', 'ul',
    'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'dfn', 'em', 'i', 'kbd', 'mark', 'q',
    'rp', 'rt', 'ruby', 's', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'wbr',
    'area', 'audio', 'img', 'map', 'track', 'video',
    'embed', 'iframe', 'object', 'param', 'picture', 'portal', 'source',
    'canvas', 'noscript', 'script',
    'del', 'ins',
    'caption', 'col', 'colgroup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr',
    'button', 'datalist', 'fieldset', 'form', 'input', 'label', 'legend', 'meter',
    'optgroup', 'option', 'output', 'progress', 'select', 'textarea',
    'details', 'dialog', 'menu', 'summary',
    'slot', 'template',
] as const;

export const svgTags = [
    'svg', 'circle', 'rect', 'path', 'line', 'polyline', 'polygon', 'ellipse', 'g', 'text', 'tspan',
    'defs', 'linearGradient', 'radialGradient', 'stop', 'pattern', 'mask', 'clipPath', 'use', 'symbol',
    'marker', 'image', 'foreignObject', 'animate', 'animateTransform', 'animateMotion', 'set', 'filter',
    'feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite', 'feConvolveMatrix', 'feDiffuseLighting',
    'feDisplacementMap', 'feFlood', 'feGaussianBlur', 'feMorphology', 'feOffset', 'feSpecularLighting',
    'feTile', 'feTurbulence',
] as const;

export const mathTags = [
    'math', 'mi', 'mn', 'mo', 'ms', 'mtext', 'mrow', 'mfrac', 'msqrt', 'mroot', 'msub', 'msup',
] as const;

export type Elements = {
    [K in typeof tags[number]]: ElementFactory;
} & {
    [K in typeof svgTags[number] as `svg${Capitalize<K>}`]: ElementFactory;
} & {
    [K in typeof mathTags[number] as `math${Capitalize<K>}`]: ElementFactory;
} & {
    varElement: ElementFactory;
};