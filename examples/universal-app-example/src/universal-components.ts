import { a, article, button, div, h1, h2, img, input, li, main, p, section, span, textarea, ul } from '@elitjs/el';
import { createUniversalBridgeProps, createUniversalLinkProps, mergeUniversalProps, type UniversalBridgeOptions } from '@elitjs/universal';
import type { Child, Props, VNode } from '@elitjs/core';

import { APP_NAME, APP_TAGLINE, PLATFORM_SURFACES, SHARED_CHECKLIST, VALIDATION_STEPS } from './shared';
import './web-styles';

const surfacePalette = {
    ink: '#261914',
    bodyCopy: '#5d4335',
    line: 'rgba(38, 25, 20, 0.12)',
} as const;

const sharedStyles = {
    heroTitle: {
        color: surfacePalette.ink,
        fontSize: '38px',
        fontWeight: '700',
    },
    bodyCopy: {
        color: surfacePalette.bodyCopy,
    },
    inputField: {
        width: '100%',
        background: '#fff',
        borderRadius: '16px',
        border: `1px solid ${surfacePalette.line}`,
        color: surfacePalette.ink,
    },
} as const;

export interface UniversalAction extends UniversalBridgeOptions {
    label: string;
    className?: string;
    href?: string;
    target?: string;
    rel?: string;
    onClick?: (event: Event) => void;
}

export interface UniversalFormOptions {
    title?: string;
    questionLabel: string;
    questionValue?: string;
    questionPlaceholder?: string;
    onQuestionInput?: (event: Event) => void;
    questionInputProps?: Props;
    noteLabel: string;
    noteValue?: string;
    notePlaceholder?: string;
    onNoteInput?: (event: Event) => void;
    noteInputProps?: Props;
    toggleLabel: string;
    nativeEnabled?: boolean;
    onToggleInput?: (event: Event) => void;
    toggleInputProps?: Props;
    statusItems?: Child[];
}

export interface UniversalShellOptions {
    iconSrc?: string;
    iconAlt?: string;
    iconChild?: Child;
    pageClassName?: string;
    heroClassName?: string;
    heroLayoutProps?: Props;
    heroActions: UniversalAction[];
    form: UniversalFormOptions;
    panelGridClassName?: string;
    surfaceTitle?: string;
    checklistTitle?: string;
    checklistItems?: readonly string[];
}

function mergeClassName(baseClassName: string, extraClassName?: string): string {
    const normalizedExtraClassName = typeof extraClassName === 'string'
        ? extraClassName.trim()
        : '';

    return normalizedExtraClassName
        ? `${baseClassName} ${normalizedExtraClassName}`
        : baseClassName;
}

export function createHeroBadge(): VNode {
    return div(
        {
            className: 'hero-badge',
            role: 'img',
            'aria-label': `${APP_NAME} icon`,
        },
        span({ className: 'hero-badge-mark' }, 'EU'),
    );
}

export function createStatusCard(content: Child): VNode {
    return div({ className: 'status' }, span(content));
}

function renderAction(action: UniversalAction): VNode {
    const bridgeOptions: UniversalBridgeOptions = {
        action: action.action,
        route: action.route,
        payload: action.payload,
        desktopMessage: action.desktopMessage,
    };
    const props: Props = mergeUniversalProps(
        action.href
            ? createUniversalLinkProps(action.href, bridgeOptions)
            : createUniversalBridgeProps(bridgeOptions),
        {
            className: action.className ?? 'btn btn-secondary',
        },
    );

    if (action.onClick) {
        props.onClick = action.onClick;
    }

    if (action.href) {
        props.href = action.href;
        if (action.target) props.target = action.target;
        if (action.rel) props.rel = action.rel;
        return a(props, action.label);
    }

    props.type = 'button';
    return button(props, action.label);
}

function createHero(options: UniversalShellOptions): VNode {
    const heroMedia: Child[] = [];
    if (options.iconChild !== undefined) {
        heroMedia.push(options.iconChild);
    } else if (options.iconSrc) {
        heroMedia.push(img({ className: 'hero-mark', src: options.iconSrc, alt: options.iconAlt ?? `${APP_NAME} icon` }));
    }

    const heroLayoutProps: Props = {
        ...(options.heroLayoutProps ?? {}),
    };
    const existingHeroLayoutClassName = typeof heroLayoutProps.className === 'string'
        ? heroLayoutProps.className.trim()
        : '';
    heroLayoutProps.className = existingHeroLayoutClassName
        ? `hero-layout ${existingHeroLayoutClassName}`
        : 'hero-layout';

    return section(
        { className: mergeClassName('hero', options.heroClassName) },
        div(
            heroLayoutProps,
            ...heroMedia,
            div(
                { className: 'hero-copy' },
                h1({ style: sharedStyles.heroTitle }, APP_NAME),
                p({ className: 'lede' }, APP_TAGLINE),
                div(
                    { className: 'button-row' },
                    ...options.heroActions.map(renderAction),
                ),
            ),
        ),
    );
}

function createSurfacePanel(title: string): VNode {
    return section(
        { className: 'panel' },
        h2(title),
        div(
            { className: 'surface-grid' },
            ...PLATFORM_SURFACES.map((surface) => article(
                { className: 'surface-card' },
                span({ className: 'surface-id' }, surface.id),
                h2(surface.title),
                p({ style: sharedStyles.bodyCopy }, surface.description),
            )),
        ),
    );
}

function createFormPanel(options: UniversalFormOptions): VNode {
    const questionInputProps: Props = {
        style: sharedStyles.inputField,
        value: options.questionValue,
        placeholder: options.questionPlaceholder ?? options.questionLabel,
        onInput: options.onQuestionInput,
        ...options.questionInputProps,
    };

    const noteInputProps: Props = {
        style: sharedStyles.inputField,
        value: options.noteValue,
        placeholder: options.notePlaceholder ?? options.noteLabel,
        onInput: options.onNoteInput,
        ...options.noteInputProps,
    };

    const toggleInputProps: Props = {
        type: 'checkbox',
        checked: options.nativeEnabled,
        onInput: options.onToggleInput,
        ...options.toggleInputProps,
    };

    return section(
        { className: 'panel' },
        h2(options.title ?? 'Shared validation form'),
        div(
            { className: 'form-grid' },
            div(
                { className: 'field-label' },
                span(options.questionLabel),
                input(questionInputProps),
            ),
            div(
                { className: 'field-label' },
                span(options.noteLabel),
                textarea(noteInputProps),
            ),
            div(
                { className: 'toggle-row' },
                input(toggleInputProps),
                span({ style: sharedStyles.bodyCopy }, options.toggleLabel),
            ),
            ...(options.statusItems ?? []),
        ),
    );
}

function createChecklistPanel(title: string, items: readonly string[]): VNode {
    return section(
        { className: 'panel' },
        h2(title),
        ul(
            { className: 'meta-list' },
            ...items.map((item) => li({ className: 'meta-item' }, item)),
        ),
    );
}

export function createUniversalShell(options: UniversalShellOptions): VNode {
    const checklistItems = options.checklistItems ?? [...VALIDATION_STEPS, ...SHARED_CHECKLIST];

    return main(
        { className: mergeClassName('page', options.pageClassName) },
        div(
            { className: 'shell' },
            createHero(options),
            createSurfacePanel(options.surfaceTitle ?? 'Platform surfaces'),
            div(
                { className: mergeClassName('panel-grid', options.panelGridClassName) },
                createFormPanel(options.form),
                createChecklistPanel(options.checklistTitle ?? 'Repo smoke checklist', checklistItems),
            ),
        ),
    );
}