# reactive-input-example

Comprehensive demo of Elit `<input>` handling combined with `reactive()` from `@elitjs/state`. Every section isolates one binding pattern.

Run it:

```bash
npm install
npm run dev     # http://localhost:3060
npm run build   # production bundle in ./dist
```

## Cases covered

| Section | APIs | Cases |
| --- | --- | --- |
| Text inputs | `bindValue`, `reactive`, `text`, `computed`, `reactiveAs` | two-way text binding, live mirror, inline `text()` node, derived char count, textarea multiline, empty state rendering `null` (block swapped for a comment node), fixed-tag updates |
| `reactive()` wraps an input | `reactive`, `bindChecked` | controlled input (reactive is the input node itself, value driven by state), switching `type` text/password, a reactive block that *contains* an input among siblings, collapsing a whole block that holds an input |
| Number & range | `bindValue`, `computed` | numeric coercion back to `number`, `input[type=range]`, multi-state `computed` math, numeric `<option>` values |
| Choices | `bindChecked`, `bindValue`, `computed` | checkbox toggling conditional content, radio group on one shared state, single `<select>`, multiple `<select>` bound to `string[]`, computed over array state |
| Timing | `debounce`, `throttle`, manual `onInput` | raw vs debounced vs throttled echo, event counting, programmatic `state.value = …` updating a bound input in reverse |
| Form | `bindValue`, `bindChecked`, `computed` | `onSubmit` reading states, `preventDefault`, conditional validation messages, submit guard, reset clears all bound inputs, reactive submission list |

## Patterns

Two-way input binding:

```ts
const name = createState('');
input({ type: 'text', ...bindValue(name) });
reactive(name, (value) => value ? p(`Hello, ${value}`) : null);
```

Boolean binding for checkboxes:

```ts
const agree = createState(false);
input({ type: 'checkbox', ...bindChecked(agree) });
```

A controlled input — the state drives the value and an `onInput` writes back, no `bindValue`:

```ts
const name = createState('');
input({
    type: 'text',
    value: name.value,
    onInput: (event) => { name.value = (event.target as HTMLInputElement).value; },
});
```

Numeric states stay numeric — `bindValue` runs `Number()` on the target value and keeps the previous value on `NaN`:

```ts
const price = createState(100);
input({ type: 'number', ...bindValue(price) }); // price.value is always a number
```

Multiple selects bind to `string[]` and read `selectedOptions`:

```ts
const toppings = createState<string[]>([]);
select({ multiple: true, ...bindValue(toppings) }, [option({ value: 'bacon' }, 'Bacon')]);
```

Derived state with `computed` (pass a state map, get a state back):

```ts
const total = computed({ subtotal, discount }, (s, d) => Math.round(s * (1 - d / 100)));
p('Total: ', text(total));
```

Debounced echo from a manual handler:

```ts
const push = debounce((v: string) => { echo.value = v; }, 400);
const onInput = (event: Event) => {
    const value = (event.target as HTMLInputElement).value;
    query.value = value;
    push(value);
};
```
