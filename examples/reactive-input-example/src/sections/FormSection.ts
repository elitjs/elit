import { button, div, form, h3, input, label, li, p, span, strong, ul } from '@elitjs/el';
import { bindChecked, bindValue, computed, createState, reactive } from '@elitjs/state';
import { card, fieldLabel, hintStyle, inputStyle } from '../ui';

interface Signup {
    email: string;
    age: number;
    newsletter: boolean;
}

const submittedSignups: Signup[] = [];

// Case: form onSubmit reads the states directly (no FormData needed).
// Case: computed validation messages rendered conditionally.
// Case: resetting states clears every bound input.
// Case: rendering a derived list reactively.
export function FormSection() {
    const email = createState('');
    const age = createState(20);
    const newsletter = createState(true);
    const submitted = createState<Signup[]>(submittedSignups);

    const emailError = computed([email], (e) => {
        const value = e.trim();
        if (!value) return 'Email is required.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Email looks invalid.';
        return '';
    });
    const ageError = computed([age], (a) => (a < 13 ? 'Must be at least 13.' : a > 120 ? 'That age is unlikely.' : ''));
    const formError = computed([emailError, ageError], (e, a) => e || a);

    const submit = (event: Event) => {
        event.preventDefault();
        if (formError.value) return;
        submitted.value = [...submitted.value, { email: email.value.trim(), age: age.value, newsletter: newsletter.value }];
        email.value = '';
        age.value = 20;
        newsletter.value = true;
    };

    return card(
        'Form submit, validation and reset',
        'onSubmit reads the bound states, computed() produces validation messages, and resetting the states clears every bound input.',
        form({ onSubmit: submit }, [
            fieldLabel('Email'),
            input({ type: 'email', placeholder: 'you@example.com', style: inputStyle, ...bindValue(email) }),
            reactive(emailError, (err) => err ? p({ style: { ...hintStyle, color: '#dc2626' } }, err) : null),
            fieldLabel('Age'),
            input({ type: 'number', min: 0, max: 150, style: inputStyle, ...bindValue(age) }),
            reactive(ageError, (err) => err ? p({ style: { ...hintStyle, color: '#dc2626' } }, err) : null),
            label({ style: { ...hintStyle, display: 'block', margin: '12px 0' } },
                input({ type: 'checkbox', ...bindChecked(newsletter) }),
                ' Send me the newsletter',
            ),
            button({ type: 'submit', disabled: false, style: { padding: '8px 16px' } }, 'Sign up'),
            reactive(formError, (err) => err
                ? span({ style: hintStyle }, ' — fix the errors above first')
                : span({ style: hintStyle }, ' — ready to submit')),
        ]),
        h3('Submissions'),
        reactive(submitted, (rows) => rows.length
            ? ul(rows.map((r, i) => li({ key: String(i) }, strong(r.email), ` · age ${r.age}${r.newsletter ? ' · subscribed' : ''}`)))
            : p({ style: hintStyle }, 'Nothing submitted yet.')),
        div({ style: hintStyle }, 'Note: resetting after submit sets the states back, which clears the bound inputs automatically.'),
    );
}
