import { div, html, head, body, title, link, script, meta } from '@elitjs/el';

export const client = html(
  head(
    title('ELIT_PROJECT_NAME - Todo Workspace'),
    link({ rel: 'icon', type: 'image/svg+xml', href: 'public/favicon.svg' }),
    meta({ charset: 'UTF-8' }),
    meta({ name: 'viewport', content: 'width=device-width, initial-scale=1.0' }),
    meta({ name: 'description', content: 'Database-backed todo starter built with Elit and elit/database.' })
  ),
  body(
    div({ id: 'app' }),
    script({ type: 'module', src: '/src/main.js' })
  )
);
