import { a, button, div, h1, input, p } from '../../../src/el';

export const screen = () => div(
    { style: { padding: '24px' } },
    h1('Elit Native Mobile Example'),
    p('This screen is generated from the same Elit syntax during elit mobile sync.'),
    input({ type: 'checkbox', checked: true }),
    a({ href: 'https://github.com/elitjs/elit' }, 'Open project page'),
    button({ onClick: () => undefined }, 'Native placeholder button')
);