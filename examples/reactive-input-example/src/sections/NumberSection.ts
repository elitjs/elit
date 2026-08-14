import { div, input, option, output, p, select, span } from '@elitjs/el';
import { bindValue, computed, createState, reactive, text } from '@elitjs/state';
import { card, fieldLabel, hintStyle, inputStyle } from '../ui';

// Case: input[type=number] keeps a numeric state numeric (bindValue coerces via Number).
// Case: input[type=range] live value.
// Case: computed across several states.
// Case: select with numeric options.
export function NumberSection() {
    const price = createState(100);
    const quantity = createState(3);
    const discount = createState(10); // percent, driven by the range slider

    const subtotal = computed([price, quantity], (p, q) => p * q);
    const total = computed([subtotal, discount], (s, d) => Math.round(s * (1 - d / 100)));

    return card(
        'Number and range inputs',
        'bindValue converts input values back to numbers for numeric states, and computed() derives dependent values.',
        fieldLabel('input[type=number] × 2 + computed subtotal'),
        div(
            span({ style: hintStyle }, 'Price: '),
            input({ type: 'number', min: 0, step: 10, style: inputStyle, ...bindValue(price) }),
            span({ style: hintStyle }, 'Quantity: '),
            input({ type: 'number', min: 1, max: 99, style: inputStyle, ...bindValue(quantity) }),
        ),
        p({ style: hintStyle }, 'Subtotal = price × quantity = ', text(subtotal)),
        fieldLabel('input[type=range] driving a discount'),
        input({ type: 'range', min: 0, max: 50, step: 5, ...bindValue(discount) }),
        reactive(discount, (d) => span({ style: hintStyle }, ` Discount: ${d}%`)),
        p({ style: hintStyle }, 'Total after discount: ', reactive(total, (t) => output({ style: { fontWeight: '700' } }, `${t}`))),
        fieldLabel('select with numeric option values'),
        select({ style: inputStyle, ...bindValue(quantity) }, [
            option({ value: '1' }, '1 unit'),
            option({ value: '3' }, '3 units'),
            option({ value: '10' }, '10 units'),
        ]),
        reactive(quantity, (q) => span({ style: hintStyle }, ` → ${q} × ${price.value} = ${q * price.value}`)),
    );
}
