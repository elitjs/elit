import type { Child, VNode } from '../../core/types';
import type { Route, RouteLocation, RouteParams } from './types';

export function matchRoute(pattern: string, path: string): RouteParams | null {
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = path.split('/').filter(Boolean);

    if (pattern.endsWith('*')) {
        const basePattern = pattern.slice(0, -1);
        if (path.startsWith(basePattern) || basePattern === '/' || pattern === '*') {
            return { '*': path.slice(basePattern.length) };
        }
    }

    if (patternParts.length !== pathParts.length) {
        return null;
    }

    const params: RouteParams = {};
    for (let i = 0; i < patternParts.length; i++) {
        const patternPart = patternParts[i];
        const pathPart = pathParts[i];

        if (patternPart.startsWith(':')) {
            params[patternPart.slice(1)] = decodeURIComponent(pathPart);
        } else if (patternPart !== pathPart) {
            return null;
        }
    }

    return params;
}

export function executeGuard(
    guard: (to: RouteLocation, from: RouteLocation | null) => boolean | string | void,
    to: RouteLocation,
    from: RouteLocation | null,
    navigate: (path: string, replace?: boolean) => void,
    replace = false,
): boolean {
    const result = guard(to, from);
    if (result === false) {
        return false;
    }

    if (typeof result === 'string') {
        navigate(result, replace);
        return false;
    }

    return true;
}

export function wrapComponent(component: VNode | Child): VNode {
    if (typeof component === 'object' && component !== null && 'tagName' in component) {
        return component as VNode;
    }

    return { tagName: 'span', props: {}, children: [component] };
}

export function parseQuery(search: string): Record<string, string> {
    const query: Record<string, string> = {};
    const params = new URLSearchParams(search);
    params.forEach((value, key) => {
        query[key] = value;
    });
    return query;
}

export function parseLocation(path: string): RouteLocation {
    const [pathPart, queryPart = ''] = path.split('?');
    const [cleanPath, hash = ''] = pathPart.split('#');

    return {
        path: cleanPath || '/',
        params: {},
        query: parseQuery(queryPart),
        hash: hash ? `#${hash}` : '',
    };
}

export function findRoute(routes: Route[], path: string): { route: Route; params: RouteParams } | null {
    for (const route of routes) {
        const params = matchRoute(route.path, path);
        if (params !== null) {
            return { route, params };
        }
    }

    return null;
}

export function getCurrentPath(mode: 'history' | 'hash', base: string): string {
    if (mode === 'hash') {
        return window.location.hash.slice(1) || '/';
    }

    return window.location.pathname.replace(base, '') || '/';
}

export function buildNavigationUrl(mode: 'history' | 'hash', base: string, path: string): string {
    if (mode === 'hash') {
        return `#${path}`;
    }

    const hasBaseSlash = base.endsWith('/');
    const hasPathSlash = path.startsWith('/');
    let urlPath = path;

    if (hasBaseSlash && hasPathSlash) {
        urlPath = path.slice(1);
    } else if (!hasBaseSlash && !hasPathSlash && path !== '/') {
        urlPath = `/${path}`;
    }

    return base + urlPath;
}