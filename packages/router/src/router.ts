import { dom } from '../dom';
import { buildNavigationUrl, executeGuard, findRoute, getCurrentPath, parseLocation } from './helpers';
import type { RouteLocation, Router, RouterOptions } from './types';

export function createRouter(options: RouterOptions): Router {
    const { mode = 'history', base = '', routes } = options;
    const globalGuards: Array<(to: RouteLocation, from: RouteLocation | null) => boolean | string | void> = [];
    const currentRoute = dom.createState<RouteLocation>(parseLocation(getCurrentPath(mode, base)));

    const navigate = (path: string, replace = false): void => {
        const location = parseLocation(path);
        const match = findRoute(routes, location.path);

        if (match) {
            location.params = match.params;
        }

        for (const guard of globalGuards) {
            if (!executeGuard(guard, location, currentRoute.value, navigate, replace)) {
                return;
            }
        }

        if (match?.route.beforeEnter) {
            if (!executeGuard(match.route.beforeEnter, location, currentRoute.value, navigate, replace)) {
                return;
            }
        }

        const url = buildNavigationUrl(mode, base, path);
        if (replace) {
            window.history.replaceState({ path }, '', url);
        } else {
            window.history.pushState({ path }, '', url);
        }

        currentRoute.value = location;
    };

    const handlePopState = (): void => {
        const path = getCurrentPath(mode, base);
        const location = parseLocation(path);
        const match = findRoute(routes, location.path);

        if (match) {
            location.params = match.params;
        }

        currentRoute.value = location;
    };

    if (typeof window !== 'undefined') {
        window.addEventListener('popstate', handlePopState);
    }

    return {
        currentRoute,
        mode,
        navigate,
        push: (path: string) => navigate(path, false),
        replace: (path: string) => navigate(path, true),
        back: () => window.history.back(),
        forward: () => window.history.forward(),
        go: (delta: number) => window.history.go(delta),
        beforeEach: (guard) => {
            globalGuards.push(guard);
        },
        destroy: () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('popstate', handlePopState);
            }
            currentRoute.destroy();
        },
    };
}