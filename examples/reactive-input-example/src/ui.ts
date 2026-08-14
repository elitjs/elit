import type { Child, VNode } from '@elitjs/core';
import { div, h2, p, section } from '@elitjs/el';

const sectionStyle: Partial<CSSStyleDeclaration> = {
    borderBottom: '1px solid #e2e8f0',
    padding: '24px 0',
};

const demoStyle: Partial<CSSStyleDeclaration> = {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '12px',
};

const labelStyle: Partial<CSSStyleDeclaration> = {
    display: 'block',
    fontWeight: '600',
    marginBottom: '8px',
};

const noteStyle: Partial<CSSStyleDeclaration> = {
    color: '#64748b',
    fontSize: '13px',
    marginTop: '8px',
};

export const card = (title: string, description: string, ...children: Child[]): VNode =>
    section({ style: sectionStyle }, [
        h2(title),
        p({ style: noteStyle }, description),
        div({ style: demoStyle }, children),
    ]);

export const demo = (...children: Child[]): VNode => div({ style: demoStyle }, children);

export const fieldLabel = (text: string): VNode => div({ style: labelStyle }, text);

export const inputStyle: Partial<CSSStyleDeclaration> = {
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '14px',
    marginRight: '8px',
};

export const hintStyle = noteStyle;
