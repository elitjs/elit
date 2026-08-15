import { div, html, head, body, title, link, script, meta } from '@elitjs/el';

export const client = html(
    head(
        title('Elit - Full-Stack TypeScript Framework'),
        link({ rel: 'icon', type: 'image/svg+xml', href: 'favicon.svg' }),
        meta({ charset: 'UTF-8' }),
        meta({ name: 'viewport', content: 'width=device-width, initial-scale=1.0' }),
        meta({ name: 'description', content: 'Elit - Full-stack TypeScript framework with dev server, HMR, routing, SSR, and REST API. Zero dependencies, ~10KB gzipped.' })

    ),
    body(
        div({ id: 'root' }),
        script({ type: 'module', src: '/src/main.js' })
    )
);