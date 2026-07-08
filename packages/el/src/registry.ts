import type { Child, ElementFactory, JsonNode, Props, VNode } from '@elitjs/core';
import { createElementFactory } from './factory';
import { capitalize } from './helpers';
import { jsonToVNode } from './json';
import type { Elements } from './tags';
import { mathTags, svgTags, tags } from './tags';

export type El = {
    (tagName: string): ElementFactory;
    (tagName: string, ...children: Child[]): VNode;
    (tagName: string, props: Props | null, ...children: Child[]): VNode;
    (json: JsonNode): VNode;
} & Elements;

function createPrefixedFactories(tagsToCreate: readonly string[], prefix: string, elements: Partial<Elements>): void {
    tagsToCreate.forEach((tag) => {
        const name = prefix + capitalize(tag);
        (elements as any)[name] = createElementFactory(tag);
    });
}

const elements: Partial<Elements> = {};

tags.forEach((tag) => {
    (elements as any)[tag] = createElementFactory(tag);
});

createPrefixedFactories(svgTags, 'svg', elements);
createPrefixedFactories(mathTags, 'math', elements);

(elements as any).varElement = createElementFactory('var');

export const {
    html, head, body, title, base, link, meta, style,
    address, article, aside, footer, header, h1, h2, h3, h4, h5, h6, main, nav, section,
    blockquote, dd, div, dl, dt, figcaption, figure, hr, li, ol, p, pre, ul,
    a, abbr, b, bdi, bdo, br, cite, code, data, dfn, em, i, kbd, mark, q,
    rp, rt, ruby, s, samp, small, span, strong, sub, sup, time, u, wbr,
    area, audio, img, map, track, video,
    embed, iframe, object, param, picture, portal, source,
    canvas, noscript, script,
    del, ins,
    caption, col, colgroup, table, tbody, td, tfoot, th, thead, tr,
    button, datalist, fieldset, form, input, label, legend, meter,
    optgroup, option, output, progress, select, textarea,
    details, dialog, menu, summary,
    slot, template,
    svgSvg, svgCircle, svgRect, svgPath, svgLine, svgPolyline, svgPolygon, svgEllipse, svgG, svgText, svgTspan,
    svgDefs, svgLinearGradient, svgRadialGradient, svgStop, svgPattern, svgMask, svgClipPath, svgUse, svgSymbol,
    svgMarker, svgImage, svgForeignObject, svgAnimate, svgAnimateTransform, svgAnimateMotion, svgSet, svgFilter,
    svgFeBlend, svgFeColorMatrix, svgFeComponentTransfer, svgFeComposite, svgFeConvolveMatrix, svgFeDiffuseLighting,
    svgFeDisplacementMap, svgFeFlood, svgFeGaussianBlur, svgFeMorphology, svgFeOffset, svgFeSpecularLighting,
    svgFeTile, svgFeTurbulence,
    mathMath, mathMi, mathMn, mathMo, mathMs, mathMtext, mathMrow, mathMfrac, mathMsqrt, mathMroot, mathMsub, mathMsup,
    varElement,
} = elements as Elements;

function elImpl(tagName: string): ElementFactory;
function elImpl(tagName: string, ...children: Child[]): VNode;
function elImpl(tagName: string, props: Props | null, ...children: Child[]): VNode;
function elImpl(json: JsonNode): VNode;
function elImpl(arg: string | JsonNode, ...rest: unknown[]): ElementFactory | VNode {
    if (typeof arg === 'string') {
        const factory = createElementFactory(arg);
        if (rest.length === 0) return factory;
        return (factory as (...args: unknown[]) => VNode)(...rest);
    }
    const vnode = jsonToVNode(arg);
    if (vnode == null || typeof vnode !== 'object') {
        throw new Error('el(JsonNode): invalid JsonNode (missing tag)');
    }
    return vnode;
}

export const el: El = Object.assign(elImpl, elements as Elements);
export { elements };
