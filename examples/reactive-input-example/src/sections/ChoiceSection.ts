import { div, input, label, li, option, p, select, span, strong, ul } from '@elitjs/el';
import { bindChecked, bindValue, computed, createState, reactive, text } from '@elitjs/state';
import { card, fieldLabel, hintStyle, inputStyle } from '../ui';

// Case: checkbox with bindChecked toggling conditional content.
// Case: radio group sharing one state.
// Case: single select bound with bindValue.
// Case: multiple select bound to a string[] state (bindValue handles selectedOptions).
// Case: computed over an array state.
export function ChoiceSection() {
    const agree = createState(false);
    const plan = createState('pro');
    const country = createState('th');
    const toppings = createState<string[]>(['cheese']);

    const toppingCount = computed([toppings], (t) => t.length);
    const canSubmit = computed([agree, plan], (a, p) => a && p !== '');

    const plans: Array<{ id: string; label: string; price: number }> = [
        { id: 'free', label: 'Free', price: 0 },
        { id: 'pro', label: 'Pro', price: 29 },
        { id: 'team', label: 'Team', price: 99 },
    ];
    const planPrice = computed([plan], (p) => plans.find((x) => x.id === p)?.price ?? 0);

    return card(
        'Checkboxes, radios and selects',
        'bindChecked drives boolean states, radio groups share a single state, and multiple selects bind to string[] states.',
        fieldLabel('checkbox + bindChecked (toggles a whole reactive block)'),
        label({ style: hintStyle },
            input({ type: 'checkbox', ...bindChecked(agree) }),
            ' I accept the terms',
        ),
        reactive(agree, (a) =>
            a
                ? p({ style: hintStyle }, '✓ Terms accepted — hidden block restored into the DOM.')
                : null,
        ),
        fieldLabel('radio group → one shared state'),
        div(plans.map((x) =>
            label({ key: x.id, style: { ...hintStyle, marginRight: '16px' } },
                input({ type: 'radio', name: 'plan', value: x.id, ...bindValue(plan) }),
                ` ${x.label}`,
            ),
        )),
        reactive(plan, (planId) => p({ style: hintStyle }, 'Selected plan: ', strong(planId), ' — $', text(planPrice), '/mo')),
        fieldLabel('single select'),
        select({ style: inputStyle, ...bindValue(country) }, [
            option({ value: 'th' }, 'Thailand'),
            option({ value: 'jp' }, 'Japan'),
            option({ value: 'us' }, 'United States'),
        ]),
        reactive(country, (c) => span({ style: hintStyle }, ` → shipping region: ${c.toUpperCase()}`)),
        fieldLabel('multiple select → string[] state'),
        select({ multiple: true, style: { ...inputStyle, height: '84px', verticalAlign: 'top' }, ...bindValue(toppings) }, [
            option({ value: 'cheese' }, 'Extra cheese'),
            option({ value: 'mushroom' }, 'Mushrooms'),
            option({ value: 'bacon' }, 'Bacon'),
            option({ value: 'olive' }, 'Olives'),
        ]),
        reactive(toppings, (t) => t.length
            ? ul(t.map((x) => li({ key: x }, x)))
            : p({ style: hintStyle }, 'No toppings selected.'),
        ),
        p({ style: hintStyle }, 'Topping count via computed: ', text(toppingCount)),
        p({ style: hintStyle }, 'Form ready (agree AND plan chosen): ', reactive(canSubmit, (ok) => ok ? 'yes' : 'no')),
    );
}
