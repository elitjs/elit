import type { Child, Props, State, VNode } from '../../core/types';

export interface Route {
    path: string;
    component: (params: RouteParams) => VNode | Child;
    beforeEnter?: (to: RouteLocation, from: RouteLocation | null) => boolean | string | void;
}

export interface RouteParams {
    [key: string]: string;
}

export interface RouteLocation {
    path: string;
    params: RouteParams;
    query: Record<string, string>;
    hash: string;
}

export interface RouterOptions {
    mode?: 'history' | 'hash';
    base?: string;
    routes: Route[];
    notFound?: (params: RouteParams) => VNode | Child;
}

export interface Router {
    currentRoute: State<RouteLocation>;
    mode: 'history' | 'hash';
    navigate: (path: string, replace?: boolean) => void;
    push: (path: string) => void;
    replace: (path: string) => void;
    back: () => void;
    forward: () => void;
    go: (delta: number) => void;
    beforeEach: (guard: (to: RouteLocation, from: RouteLocation | null) => boolean | string | void) => void;
    destroy: () => void;
}

export type RouterLinkProps = Props & { to: string };