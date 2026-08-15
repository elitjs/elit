import { div, input, p, span, textarea } from '@elitjs/el';
import { bindValue, computed, createState, reactive, reactiveAs, text } from '@elitjs/state';
import { card, fieldLabel, hintStyle, inputStyle } from '../ui';

// Case: two-way text binding with bindValue + reactive mirror.
// Case: text() inline reactive text node.
// Case: computed() derived state (character count) rendered reactively.
// Case: textarea multiline binding.
// Case: conditional rendering (reactive returning null when empty).
export function TextSection() {
    const name = createState('');
    const bio = createState('');

    const nameLength = computed([name], (n) => n.length);
    const bioLength = computed([bio], (b) => b.length);
    const shout = computed([name], (n) => n.trim().toUpperCase());

    return card(
        'Text inputs',
        'bindValue keeps the state in sync from the input, while reactive()/text() re-render the output on every change.',
        fieldLabel('input[type=text] + bindValue + reactive mirror'),
        input({ type: 'text', placeholder: 'Type your name', style: inputStyle, ...bindValue(name) }),
        reactive(name, (value) =>
            value.trim()
                ? p({ style: hintStyle }, `Hello, ${value.trim()}! (`, text(nameLength), ' chars)')
                : p({ style: hintStyle }, 'Name is empty — the reactive block swaps to a comment node.'),
        ),
        p({ style: hintStyle }, 'Computed uppercase: ', reactive(shout, (s) => s || '—')),
        fieldLabel('textarea + bindValue'),
        textarea({ placeholder: 'A few lines about you', rows: 3, style: { ...inputStyle, width: '320px', verticalAlign: 'top' }, ...bindValue(bio) }),
        reactive(bio, (value) =>
            value
                ? div({ style: hintStyle }, 'Preview: ', span(value.split('\n').join(' · ')))
                : null,
        ),
        p({ style: hintStyle }, 'Bio length: ', text(bioLength)),
        fieldLabel('reactiveAs — fixed tag whose children update'),
        reactiveAs('blockquote', bio, (value) =>
            value.trim() ? `“${value.trim()}”` : 'Type a bio above to fill this blockquote.',
            { style: hintStyle },
        ),
    );
}
