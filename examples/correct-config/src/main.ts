import { div, h1, h2, button, p } from '@elitjs/el';
import { createState, reactive } from '@elitjs/state';
import { render } from '@elitjs/dom';
import { compact } from 'lodash-es';
import './styles.ts';

// Create reactive state (shared between SSR and client)
export const count = createState(0);
const arr = compact([0, 1, false, 2, '', 3]);
// Create app (shared between SSR and client)
export const app = div({ className: 'container' },
  div({ className: 'card' },
    h1('Welcome to Elit! 🚀'),
    p('A lightweight TypeScript framework with reactive state management'),
    p(`Filtered array: ${arr.join(', ')}`),
    div({ className: 'counter' },
      h2('Counter Example'),
      reactive(count, (value) =>
        div({ className: 'count-display' }, `Count: ${value}`)
      ),
      div({ className: 'button-group' },
        button({
          onclick: () => count.value--,
          className: 'btn btn-secondary'
        }, '- Decrement'),
        button({
          onclick: () => count.value = 0,
          className: 'btn btn-secondary'
        }, 'Reset'),
        button({
          onclick: () => count.value++,
          className: 'btn btn-primary'
        }, '+ Increment')
      )
    )
  )
);

render('root', app);
console.log('[Main] App rendered');