import { bindDocMethod, hasDocument } from './helpers';

export const doc = hasDocument ? document : undefined as any;
export const getEl = bindDocMethod(doc, doc?.querySelector);
export const getEls = bindDocMethod(doc, doc?.querySelectorAll);
export const createEl = bindDocMethod(doc, doc?.createElement);
export const createSvgEl = hasDocument ? doc.createElementNS.bind(doc, 'http://www.w3.org/2000/svg') : undefined as any;
export const createMathEl = hasDocument ? doc.createElementNS.bind(doc, 'http://www.w3.org/1998/Math/MathML') : undefined as any;
export const fragment = bindDocMethod(doc, doc?.createDocumentFragment);
export const textNode = bindDocMethod(doc, doc?.createTextNode);
export const commentNode = bindDocMethod(doc, doc?.createComment);
export const getElId = bindDocMethod(doc, doc?.getElementById);
export const getElClass = bindDocMethod(doc, doc?.getElementsByClassName);
export const getElTag = bindDocMethod(doc, doc?.getElementsByTagName);
export const getElName = bindDocMethod(doc, doc?.getElementsByName);