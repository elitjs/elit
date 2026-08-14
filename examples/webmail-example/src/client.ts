import { body, div, head, html, meta, script, title } from '@elitjs/el';

export const client = html(
  head(
    title('Elit Webmail Example'),
    meta({ charset: 'UTF-8' }),
    meta({ name: 'viewport', content: 'width=device-width, initial-scale=1.0' }),
    meta({ name: 'description', content: 'Webmail demo for Elit with an inbox UI, API routes, and a local SMTP sandbox.' })
  ),
  body(
    div({ id: 'root' }),
    script({ type: 'module', src: '/src/main.js' })
  )
);