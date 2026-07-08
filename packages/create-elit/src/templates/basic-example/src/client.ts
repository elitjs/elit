import { body, div, head, html, link, meta, script, title } from '@elitjs/el';

export const client = html(
  head(
    title('ELIT_PROJECT_NAME - Basic Example'),
    link({ rel: 'icon', type: 'image/svg+xml', href: 'public/favicon.svg' }),
    meta({ charset: 'UTF-8' }),
    meta({ name: 'viewport', content: 'width=device-width, initial-scale=1.0' }),
    meta({ name: 'description', content: 'A lightweight starter built with Elit.' })
  ),
  body(
    div({ id: 'app' }),
    script({ type: 'module', src: '/src/main.js' })
  )
);