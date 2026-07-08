# @elitjs/el

Hyperscript-style element factory for building virtual DOM nodes. Extracted from [elit](https://github.com/elitjs/elit) as a standalone package.

## Install

```bash
npm install @elitjs/el
```

## Usage

```ts
import { div, span, p, frag } from '@elitjs/el';

const node = div({ className: 'card' }, [
  p('Hello'),
  span({ style: { color: 'red' } }, 'world')
]);
```

Each tag factory is overloaded: pass children directly, or pass props first.

## License

MIT
