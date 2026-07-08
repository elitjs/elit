import type { Child, ElementFactory, Props, VNode } from '../../core/types';
import { flattenChildren, isStateLike, isVNodeLike } from './helpers';

export const createElementFactory = (tag: string): ElementFactory => {
    return function (props?: Props | Child | null, ...rest: Child[]): VNode {
        if (!arguments.length) {
            return { tagName: tag, props: {}, children: [] };
        }

        const isChild = typeof props !== 'object'
            || Array.isArray(props)
            || props === null
            || isStateLike(props)
            || isVNodeLike(props);

        const actualProps: Props = isChild ? {} : props as Props;
        const args: Child[] = isChild ? [props as Child, ...rest] : rest;

        if (!args.length) {
            return { tagName: tag, props: actualProps, children: [] };
        }

        return { tagName: tag, props: actualProps, children: flattenChildren(args) };
    } as ElementFactory;
};

export const frag: ElementFactory = function (...children: Child[]): VNode {
    return { tagName: '', props: {}, children: flattenChildren(children) };
} as ElementFactory;