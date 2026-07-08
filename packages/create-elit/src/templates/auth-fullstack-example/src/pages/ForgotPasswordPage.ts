import { div, h1, h2, p, input, label, button, form, span, h3 } from '@elitjs/el';
import { createState, reactive } from '@elitjs/state';
import type { Router } from '@elitjs/router';

export function ForgotPasswordPage(router: Router) {
  const email = createState('');
  const error = createState('');
  const success = createState(false);
  const isLoading = createState(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    if (!email.value) {
      error.value = 'Please enter your email address';
      return;
    }

    if (!email.value.includes('@')) {
      error.value = 'Please enter a valid email address';
      return;
    }

    isLoading.value = true;
    error.value = '';

    // Simulate API call
    setTimeout(() => {
      isLoading.value = false;
      success.value = true;
      console.log('Password reset requested for:', email.value);
    }, 1000);
  };

  return div({ className: 'auth-page' },
    div({ className: 'auth-container auth-container-single' },
      // Form side
      div({ className: 'auth-form-wrapper auth-form-wrapper-full' },
        div({ className: 'auth-form-card' },
          div({ className: 'auth-header' },
            button({
              className: 'back-button',
              onclick: () => router.push('/login')
            }, '←'),
            h2({ className: 'auth-title' }, 'Forgot Password?'),
            p({ className: 'auth-subtitle' }, 'Enter your email address and we\'ll send you a link to reset your password')
          ),

          reactive(error, (err) => err ? div({ className: 'auth-error' }, err) : null),

          reactive(success, (succ) => {
            if (succ) {
              return div({ className: 'success-message' },
                div({ className: 'success-icon' }, '✓'),
                h3({ className: 'success-title' }, 'Check your email'),
                p({ className: 'success-text' },
                  'We\'ve sent a password reset link to ',
                  span({ className: 'success-email' }, email.value)
                ),
                p({ className: 'success-description' },
                  'Didn\'t receive the email? Check your spam folder or try again.'
                ),
                button({
                  className: 'btn btn-primary btn-block btn-lg',
                  onclick: () => router.push('/login')
                }, 'Back to Login')
              );
            }

            return form({ onsubmit: handleSubmit },
              div({ className: 'form-group' },
                label({ htmlFor: 'email', className: 'form-label' }, 'Email Address'),
                div({ className: 'input-wrapper' },
                  span({ className: 'input-icon' }, '📧'),
                  input({
                    type: 'email',
                    id: 'email',
                    className: 'form-input',
                    placeholder: 'your@email.com',
                    value: email.value,
                    oninput: (e: Event) => {
                      email.value = (e.target as HTMLInputElement).value;
                      error.value = '';
                    }
                  })
                )
              ),

              button({
                type: 'submit',
                className: 'btn btn-primary btn-block btn-lg',
                disabled: isLoading.value
              }, isLoading.value ? 'Sending...' : 'Send Reset Link'),

              div({ className: 'auth-footer' },
                p({ className: 'footer-text' },
                  'Remember your password? ',
                  button({
                    className: 'link-button-inline',
                    onclick: () => router.push('/login')
                  }, 'Sign in')
                )
              )
            );
          })
        )
      )
    )
  );
}
