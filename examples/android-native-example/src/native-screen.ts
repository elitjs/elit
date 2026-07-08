import { a, button, div, h1, h2, img, input, li, p, span, textarea, ul } from '../../../src/client/el';

export const screen = () => div(
    { style: { padding: '24px' } },
    h1('Elit Android Native Example'),
    p('This screen is generated into Android Compose from the same Elit syntax.'),
    img({ src: './native-preview.png', alt: 'Native preview' }),
    h2('Form coverage'),
    input({ value: 'android-native', placeholder: 'Search native UI' }),
    textarea({ value: 'Generated from one Elit screen.', placeholder: 'Notes for native form generation' }),
    div(
        { style: { paddingTop: '12px' } },
        input({ type: 'checkbox', checked: true }),
        span(' Native toggle generated from input[type=checkbox].')
    ),
    div(
        { style: { paddingTop: '8px' } },
        input({ type: 'checkbox', checked: false }),
        span(' Second toggle verifies multiple remember state bindings.')
    ),
    a({ href: 'https://github.com/elitjs/elit' }, 'Open Elit repository'),
    ul(
        li('Shared Elit syntax'),
        li('Generated Compose text inputs'),
        li('WebView fallback still available')
    ),
    button({ onClick: () => undefined }, 'Placeholder native action such as navigation or API call')
);
