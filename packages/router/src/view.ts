import type { VNode } from '../../core/types';
import { matchRoute, wrapComponent } from './helpers';
import type { Router, RouterOptions } from './types';

export function createRouterView(router: Router, options: RouterOptions): () => VNode {
    const { routes, notFound } = options;

    return (): VNode => {
        const location = router.currentRoute.value;
        const match = routes.find((route) => matchRoute(route.path, location.path) !== null);

        if (match) {
            const params = matchRoute(match.path, location.path) || {};
            const component = match.component({ ...params, ...location.query });
            return wrapComponent(component);
        }

        if (notFound) {
            const component = notFound(location.params);
            return wrapComponent(component);
        }

        return { tagName: 'div', props: {}, children: ['404 - Not Found'] };
    };
}