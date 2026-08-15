import { button, div, h2 } from '@elitjs/el';
import { createState, reactive } from '@elitjs/state';
// Importing through the alias from a nested module:
import { add } from '@/utils/math';

export function Counter() {
  const count = createState(0);

  return div(
    h2('Counter (alias @/components/Counter)'),
    reactive(count, (value) => div(`Count: ${value}`)),
    button(
      { onclick: () => { count.value = add(count.value, 1); } },
      '+1',
    ),
  );
}
