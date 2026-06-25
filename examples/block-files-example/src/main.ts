import { div, h1, p, code, pre } from 'elit/el';
import { render } from 'elit/dom';

const app = div(
  h1('blockFiles example'),
  p('This page is served normally. Sensitive files in this project are blocked by elit.' ),
  pre(
    code(
`GET /.env                 -> 403 Forbidden  (default pattern: .env)
GET /.env.local           -> 403 Forbidden  (default pattern: .env.*)
GET /secrets/private.key  -> 403 Forbidden  (default pattern: *.key)
GET /secrets/api-key.txt  -> 403 Forbidden  (custom  pattern: secrets/**)
GET /public-notes.txt     -> 200 OK         (not blocked)
GET /                     -> 200 OK         (this page)`
    )
  )
);

render('root', app);
