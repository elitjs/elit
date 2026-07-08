import type { VNode } from '@elitjs/core';
import { dom } from '@elitjs/dom';
import { createRouterView } from '@elitjs/router';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { router, ROUTES } from './router';

const routerView = createRouterView(router, ROUTES);

const mountRouterView = (host: HTMLElement | SVGElement): void => {
    const draw = (): void => {
        host.innerHTML = '';
        dom.renderToDOM(routerView(), host);
    };
    draw();
    router.currentRoute.subscribe(() => draw());
};

export const App: VNode = {
    tagName: 'div',
    props: {},
    children: [
        Header(),
        { tagName: 'main', props: { ref: mountRouterView }, children: [] },
        Footer(),
    ],
};
