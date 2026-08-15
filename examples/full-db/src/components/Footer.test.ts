/**
 * Footer Component Unit Tests
 *
 * Tests the actual Footer component structure.
 * Uses real ES module import to test the component.
 */

import { Footer } from './Footer';
import type { VNode } from '@elitjs/core';

// Type guard to check if a child is a VNode
function isVNode(child: any): child is VNode {
    return child && typeof child === 'object' && 'tagName' in child;
}


describe('Footer Component', () => {
    describe('component structure', () => {
        it('should create a footer element with correct attributes', () => {
            const footerElement = Footer();

            expect(footerElement).toBeDefined();
            expect(footerElement.tagName).toBe('footer');
            expect(footerElement.props?.className).toBe('footer');
        });

        it('should have footer-content wrapper', () => {
            const footerElement = Footer();

            expect(footerElement.children).toBeDefined();
            expect(footerElement.children?.length).toBeGreaterThan(0);

            const content = footerElement.children?.[0] as VNode | undefined;
            expect(content?.tagName).toBe('div');
            expect(content?.props?.className).toBe('footer-content');
        });

        it('should have three footer sections', () => {
            const footerElement = Footer();
            const content = footerElement.children?.[0] as VNode | undefined;

            expect(content?.children?.length).toBe(3);

            content?.children?.forEach((child) => {
                if (isVNode(child)) {
                    expect(child.tagName).toBe('div');
                    expect(child.props?.className).toBe('footer-section');
                }
            });
        });
    });

    describe('title section', () => {
        it('should have app title', () => {
            const footerElement = Footer();
            const content = footerElement.children?.[0] as VNode | undefined;
            const titleSection = content?.children?.[0] as VNode | undefined;

            expect(titleSection?.children?.length).toBeGreaterThan(0);

            const title = titleSection?.children?.[0] as VNode | undefined;
            expect(title?.tagName).toBe('p');
            expect(title?.props?.className).toBe('footer-title');
            expect(title?.children?.[0]).toBe('My Elit App');
        });

        it('should have framework attribution', () => {
            const footerElement = Footer();
            
            const content = footerElement.children?.[0] as VNode | undefined;
            const titleSection = content?.children?.[0] as VNode | undefined;

            const text = titleSection?.children?.[1] as VNode | undefined;
            expect(text?.tagName).toBe('p');
            expect(text?.props?.className).toBe('footer-text');
            expect(text?.children?.[0]).toBe('Built with Elit Framework');
        });
    });

    describe('links section', () => {
        it('should have GitHub link', () => {
            const footerElement = Footer();
            const content = footerElement.children?.[0] as VNode | undefined;
            const linksSection = content?.children?.[1] as VNode | undefined;

            const githubLink = linksSection?.children?.[0] as VNode | undefined;
            expect(githubLink?.tagName).toBe('a');
            expect(githubLink?.props?.href).toBe('https://github.com');
            expect(githubLink?.props?.target).toBe('_blank');
            expect(githubLink?.props?.className).toBe('footer-link');
            expect(githubLink?.children?.[0]).toBe('GitHub');
        });

        it('should have Documentation link', () => {
            const footerElement = Footer();
            const content = footerElement.children?.[0] as VNode | undefined;
            const linksSection = content?.children?.[1] as VNode | undefined;

            const docLink = linksSection?.children?.[1] as VNode | undefined;
            expect(docLink?.tagName).toBe('a');
            expect(docLink?.props?.href).toBe('#');
            expect(docLink?.props?.className).toBe('footer-link');
            expect(docLink?.children?.[0]).toBe('Documentation');
        });

        it('should have Support link', () => {
            const footerElement = Footer();
            const content = footerElement.children?.[0] as VNode | undefined;
            const linksSection = content?.children?.[1] as VNode | undefined;

            const supportLink = linksSection?.children?.[2] as VNode | undefined;
            expect(supportLink?.tagName).toBe('a');
            expect(supportLink?.props?.href).toBe('#');
            expect(supportLink?.props?.className).toBe('footer-link');
            expect(supportLink?.children?.[0]).toBe('Support');
        });
    });

    describe('copyright section', () => {
        it('should have copyright element with correct text', () => {
            const footerElement = Footer();
            const content = footerElement.children?.[0] as VNode | undefined;
            const copyrightSection = content?.children?.[2] as VNode | undefined;

            const copyright = copyrightSection?.children?.[0] as VNode | undefined;
            expect(copyright?.tagName).toBe('p');
            expect(copyright?.props?.className).toBe('footer-copyright');

            const copyrightText = copyright?.children?.[0] as string;
            expect(copyrightText).toContain('©');
            expect(copyrightText).toContain('2026');
            expect(copyrightText).toContain('My Elit App');
            expect(copyrightText).toContain('All rights reserved');
        });
    });

    describe('CSS classes', () => {
        it('should use footer class for main element', () => {
            const footerElement = Footer();
            expect(footerElement.props?.className).toBe('footer');
        });

        it('should use footer-content class for wrapper', () => {
            const footerElement = Footer();
            const content = footerElement.children?.[0] as VNode | undefined;
            expect(content?.props?.className).toBe('footer-content');
        });

        it('should use footer-section class for each section', () => {
            const footerElement = Footer();
            const content = footerElement.children?.[0] as VNode | undefined;

            content?.children?.forEach((section) => {
                if (isVNode(section)) {
                    expect(section.props?.className).toBe('footer-section');
                }
            });
        });

        it('should use footer-link class for links', () => {
            const footerElement = Footer();
            const content = footerElement.children?.[0] as VNode | undefined;
            const linksSection = content?.children?.[1] as VNode | undefined;

            linksSection?.children?.forEach((link) => {
                if (isVNode(link)) {
                    expect(link.props?.className).toBe('footer-link');
                }
            });
        });

        it('should use footer-title class for title', () => {
            const footerElement = Footer();
            const content = footerElement.children?.[0] as VNode | undefined;
            const titleSection = content?.children?.[0] as VNode | undefined;
            const title = titleSection?.children?.[0] as VNode | undefined;

            expect(title?.props?.className).toBe('footer-title');
        });

        it('should use footer-text class for description', () => {
            const footerElement = Footer();
            const content = footerElement.children?.[0] as VNode | undefined;
            const titleSection = content?.children?.[0] as VNode | undefined;
            const text = titleSection?.children?.[1] as VNode | undefined;

            expect(text?.props?.className).toBe('footer-text');
        });

        it('should use footer-copyright class for copyright', () => {
            const footerElement = Footer();
            const content = footerElement.children?.[0] as VNode | undefined;
            const copyrightSection = content?.children?.[2] as VNode | undefined;
            const copyright = copyrightSection?.children?.[0] as VNode | undefined;

            expect(copyright?.props?.className).toBe('footer-copyright');
        });
    });

    describe('component consistency', () => {
        it('should always return the same structure', () => {
            const structure1 = Footer();
            const structure2 = Footer();

            expect(structure1.tagName).toBe(structure2.tagName);
            expect(structure1.props).toEqual(structure2.props);
            expect(structure1.children?.length).toBe(structure2.children?.length);
        });

        it('should have no undefined children', () => {
            const footerElement = Footer();
            const content = footerElement.children?.[0] as VNode | undefined;

            expect(content?.children).toBeDefined();
            expect(content?.children?.length).toBeGreaterThan(0);

            content?.children?.forEach((section) => {
                if (isVNode(section)) {
                    expect(section).toBeDefined();
                    expect(section).not.toBeNull();
                    expect(section.children).toBeDefined();
                }
            });
        });
    });
});
