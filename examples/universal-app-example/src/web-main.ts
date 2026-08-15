import { render } from '@elitjs/dom';
import { detectRenderRuntimeTarget, setDesktopRenderOptions, type RenderRuntimeTarget } from '@elitjs/render-context';
import { bindChecked, bindValue } from '@elitjs/state';

import {
    APP_NAME,
    APP_LINK,
    createUniversalExampleState,
    createUniversalStatusMessages,
    UNIVERSAL_FORM_COPY,
    UNIVERSAL_PRIMARY_ACTION_LABEL,
} from './shared';
import { createHeroBadge, createStatusCard, createUniversalShell } from './universal-components';

type UniversalSurface = Exclude<RenderRuntimeTarget, 'unknown'>;

function resolveSurface(): UniversalSurface {
    const runtimeTarget = detectRenderRuntimeTarget();

    if (runtimeTarget === 'desktop' || runtimeTarget === 'mobile') {
        return runtimeTarget;
    }

    return 'web';
}

function createHeroActions(surface: UniversalSurface, state = createUniversalExampleState()) {
    switch (surface) {
        case 'desktop':
            return [
                {
                    label: 'Ping native shell',
                    className: 'btn btn-primary',
                    action: 'desktop:ping',
                    payload: { surface: 'desktop' },
                },
                {
                    label: 'Open docs route',
                    className: 'btn btn-secondary',
                    route: '/desktop/docs',
                    payload: { surface: 'desktop', panel: 'docs' },
                },
                {
                    label: 'Back route',
                    className: 'btn btn-secondary',
                    action: 'desktop:back',
                    payload: { surface: 'desktop' },
                },
                {
                    label: 'Close window',
                    className: 'btn btn-secondary',
                    action: 'desktop:quit',
                    payload: { surface: 'desktop' },
                },
                {
                    label: 'Open the Elit repository',
                    className: 'btn btn-secondary',
                    href: APP_LINK,
                },
            ];
        case 'mobile':
            return [
                {
                    label: UNIVERSAL_PRIMARY_ACTION_LABEL,
                    className: 'btn btn-primary',
                    action: 'validation.record',
                    payload: { surface: 'mobile', target: 'android-compose' },
                },
                {
                    label: 'Open the Elit repository',
                    className: 'btn btn-secondary',
                    href: APP_LINK,
                },
            ];
        case 'web':
        default:
            return [
                {
                    label: UNIVERSAL_PRIMARY_ACTION_LABEL,
                    className: 'btn btn-primary',
                    action: 'validation.record',
                    payload: { surface: 'web' },
                    onClick: () => {
                        state.launchCount.value++;
                    },
                },
                {
                    label: 'Open the Elit repository',
                    className: 'btn btn-secondary',
                    href: APP_LINK,
                    target: '_blank',
                    rel: 'noreferrer',
                },
            ];
    }
}

function createApp(surface: UniversalSurface) {
    const state = createUniversalExampleState();

    return createUniversalShell({
        iconChild: createHeroBadge(),
        heroActions: createHeroActions(surface, state),
        pageClassName: surface === 'mobile' ? 'page-native' : undefined,
        heroClassName: surface === 'mobile' ? 'hero-native' : undefined,
        heroLayoutProps: surface === 'mobile'
            ? {
                className: 'hero-layout-native',
            }
            : undefined,
        panelGridClassName: surface === 'mobile' ? 'panel-grid-native' : undefined,
        form: {
            title: surface === 'desktop' ? 'Desktop shell and shared content' : UNIVERSAL_FORM_COPY.title,
            questionLabel: UNIVERSAL_FORM_COPY.questionLabel,
            questionPlaceholder: UNIVERSAL_FORM_COPY.questionPlaceholder,
            questionInputProps: bindValue(state.validationTarget),
            noteLabel: UNIVERSAL_FORM_COPY.noteLabel,
            notePlaceholder: UNIVERSAL_FORM_COPY.notePlaceholder,
            noteInputProps: bindValue(state.notes),
            toggleLabel: UNIVERSAL_FORM_COPY.toggleLabel,
            toggleInputProps: bindChecked(state.nativeEnabled),
            statusItems: createUniversalStatusMessages(state).map((message) => createStatusCard(message)),
        },
    });
}

const surface = resolveSurface();

if (surface === 'desktop') {
    setDesktopRenderOptions({
        center: true,
        height: 720,
        title: `${APP_NAME} Desktop`,
        width: 1080,
        icon:"./public/favicon.svg",
    });
}

render('root', createApp(surface));
