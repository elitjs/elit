import { div, h1, p } from 'elit/el';
import { render } from 'elit/dom';
// Alias import from the project root: '@/components/Counter' -> ./src/components/Counter.ts
import { Counter } from '@/components/Counter';
// Alias import for utilities:
import { multiply } from '@/utils/math';

const app = div(
  h1('resolve.alias example'),
  p(`6 * 7 = ${multiply(6, 7)} (imported via '@/utils/math')`),
  Counter(),
);

render('root', app);
