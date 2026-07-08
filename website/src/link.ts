import type { Child, VNode } from '@elitjs/core';
import { routerLink } from '@elitjs/router';
import { router } from './router';

interface LinkProps {
    to: string;
    class?: string;
    children?: Child[];
}

export const link = ({ to, class: cls, children = [] }: LinkProps): VNode =>
    routerLink(router, { to, class: cls }, ...children);
