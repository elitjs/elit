import { button, code, input, p, span } from '@elitjs/el';
import { bindValue, createState, debounce, reactive, throttle } from '@elitjs/state';
import { card, fieldLabel, hintStyle, inputStyle } from '../ui';

// Case: debounce() delays a derived state until typing pauses.
// Case: throttle() updates at most once per window while typing.
// Case: programmatic state writes update inputs in the opposite direction (state → input).
export function TimingSection() {
    const query = createState('');
    const debounced = createState('');
    const throttled = createState('');
    const typedCount = createState(0);

    const pushDebounced = debounce((value: string) => { debounced.value = value; }, 400);
    const pushThrottled = throttle((value: string) => { throttled.value = value; }, 300);

    const onQueryInput = (event: Event) => {
        const value = (event.target as HTMLInputElement).value;
        query.value = value;
        typedCount.value += 1;
        pushDebounced(value);
        pushThrottled(value);
    };

    return card(
        'Debounce, throttle and reverse binding',
        'Manual onInput handlers can combine raw state with debounced/throttled side states, and writing to a state updates a bound input in the other direction.',
        fieldLabel('search box: raw / debounced(400ms) / throttled(300ms)'),
        input({ type: 'search', placeholder: 'Search…', style: inputStyle, value: query.value, onInput: onQueryInput }),
        button({
            style: { marginLeft: '8px', padding: '8px 12px' },
            onClick: () => { query.value = 'set from code'; pushDebounced('set from code'); pushThrottled('set from code'); },
        }, 'Set from code'),
        p({ style: hintStyle }, 'Raw value: ', reactive(query, (q) => code(q || '—'))),
        p({ style: hintStyle }, 'Debounced: ', reactive(debounced, (q) => code(q || '—'))),
        p({ style: hintStyle }, 'Throttled: ', reactive(throttled, (q) => code(q || '—'))),
        p({ style: hintStyle }, 'Input events fired: ', reactive(typedCount, (n) => span(String(n)))),
        p({ style: hintStyle }, 'Clicking "Set from code" writes to the state — the input box itself follows.'),
    );
}
