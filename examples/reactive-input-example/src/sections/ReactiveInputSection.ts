import { button, div, input, label, p, span } from '@elitjs/el';
import { bindChecked, createState, reactive } from '@elitjs/state';
import { card, fieldLabel, hintStyle, inputStyle } from '../ui';

// Case: controlled input — reactive() drives the input's value from state
// and an onInput handler writes back, with NO bindValue.
// Case: switching input type (text/password) re-renders it via reactive.
// Case: a reactive block whose root IS the input (elementRef) — props update
// in place, so focus is preserved while typing.
// Case: a reactive block that CONTAINS an input among changing siblings —
// reconcileChildren keeps the input unless its siblings change structurally.
export function ReactiveInputSection() {
    const value = createState('');
    const showPassword = createState(false);

    const password = createState('');
    const passwordVisible = createState(false);

    const sectionVisible = createState(true);

    // Controlled input: every keystroke re-renders the input from state.
    const onControlledInput = (event: Event) => {
        value.value = (event.target as HTMLInputElement).value;
    };

    const onPasswordInput = (event: Event) => {
        password.value = (event.target as HTMLInputElement).value;
    };

    return card(
        'reactive() wrapping an <input>',
        'Unlike bindValue (state-owned value), wrapping an input in reactive() lets the state drive the input. The block root can BE the input, contain it, or entirely replace it.',
        fieldLabel('controlled input — reactive() is the input node itself'),
        p({ style: hintStyle }, 'Value lives in state; the input is a projection of it. Focus survives typing because the same element has its props updated in place.'),
        reactive(value, (v) => input({ type: 'text', placeholder: 'Type here', style: inputStyle, value: v, onInput: onControlledInput })),
        p({ style: hintStyle }, 'State currently holds: ', reactive(value, (v) => span(v ? `“${v}”` : '(empty)'))),
        fieldLabel('input type toggle inside a reactive block'),
        label({ style: { ...hintStyle, display: 'block', margin: '8px 0' } },
            input({ type: 'checkbox', ...bindChecked(showPassword) }),
            ' Show the text',
        ),
        reactive(showPassword, (show) => [
            input({ type: show ? 'text' : 'password', placeholder: 'secret…', style: inputStyle }),
            span({ style: hintStyle }, show ? ' (readable)' : ' (masked)'),
        ]),
        fieldLabel('wrapping an input that must switch type from state'),
        p({ style: hintStyle }, 'Here the reactive block IS the input, so flip the type and watch it re-render from the same state.'),
        reactive(passwordVisible, (visible) =>
            input({
                type: visible ? 'text' : 'password',
                value: password.value,
                placeholder: 'A password',
                style: inputStyle,
                onInput: onPasswordInput,
            }),
        ),
        button({
            style: { marginLeft: '8px', padding: '8px 12px' },
            onClick: () => { passwordVisible.value = !passwordVisible.value; },
        }, 'Toggle type'),
        fieldLabel('collapsing a whole block that contains an input'),
        button({
            style: { margin: '4px 0', padding: '8px 12px' },
            onClick: () => { sectionVisible.value = !sectionVisible.value; },
        }, `Click to ${sectionVisible.value ? 'collapse' : 'expand'}`),
        reactive(sectionVisible, (visible) =>
            visible
                ? div({ style: hintStyle }, 'This ', input({ type: 'text', placeholder: 'is recreated', style: inputStyle }), ' input starts fresh each time the block re-renders.')
                : null,
        ),
        p({ style: hintStyle }, 'A reactive block replaced by null swaps in a comment node, so the input above remounts when the block comes back.'),
    );
}