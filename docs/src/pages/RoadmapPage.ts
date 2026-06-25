import {
    section, div, h1, h2, h3, p, article, span, reactive
} from 'elit';
import type { Router } from 'elit';
import { t, currentLang } from '../i18n';
import { roadmapPhases } from './roadmapContent';

export const RoadmapPage = (_router: Router) =>
    section({ className: 'container', style: 'padding-top: 6rem;' },
        reactive(currentLang, () =>
            div({ className: 'roadmap-page' },
                h1({ className: 'section-title' }, t('roadmap.title')),
                p({ className: 'section-subtitle' }, t('roadmap.subtitle')),
                ...roadmapPhases.map(phase =>
                    div({ className: `roadmap-phase roadmap-phase--${phase.id}` },
                        h2({ className: 'phase-title' },
                            currentLang.value === 'th' ? phase.title.th : phase.title.en),
                        p({ className: 'phase-subtitle' },
                            currentLang.value === 'th' ? phase.subtitle.th : phase.subtitle.en),
                        div({ className: 'roadmap-grid' },
                            ...phase.items.map(item =>
                                article({ className: `roadmap-item roadmap-item--${item.status}` },
                                    div({ className: `roadmap-badge roadmap-badge--${item.status}` },
                                        t(`roadmap.status.${item.status}`)),
                                    h3({ className: 'roadmap-item-title' },
                                        currentLang.value === 'th' ? item.title.th : item.title.en),
                                    p({ className: 'roadmap-item-desc' },
                                        currentLang.value === 'th' ? item.description.th : item.description.en),
                                    item.eta && span({ className: 'roadmap-eta' }, item.eta)
                                )
                            )
                        )
                    )
                )
            )
        )
    );
