import type { Child, VNode } from '@elitjs/core';
import type { Router, RouterLinkProps } from './types';

export const routerLink = (router: Router, props: RouterLinkProps, ...children: Child[]): VNode => {
    const href = router.mode === 'hash' ? `#${props.to}` : props.to;

    return {
        tagName: 'a',
        props: {
            ...props,
            href,
            onclick: (event: MouseEvent) => {
                event.preventDefault();
                router.push(props.to);
            },
        },
        children,
    };
};