import { createElementFactory } from './factory';
import { capitalize } from './helpers';
import type { Elements } from './tags';
import { mathTags, svgTags, tags } from './tags';

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

export const el = elements;
export { elements };