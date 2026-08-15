import { div, h1, h2, p, input, label, button, form, span } from '@elitjs/el';
import { createState, reactive } from '@elitjs/state';
import type { Router } from '@elitjs/router';

export function RegisterPage(router: Router) {
  // Check if already logged in
  const token = localStorage.getItem('token');
  if (token) {
    router.push('/profile');
  }

  const name = createState('');
  const email = createState('');
  const password = createState('');
  const confirmPassword = createState('');
  const error = createState('');
  const isLoading = createState(false);

  const handleRegister = async (e: Event) => {
    e.preventDefault();

    if (!name.value || !email.value || !password.value || !confirmPassword.value) {
      error.value = 'Please fill in all fields';
      return;
    }

    if (!email.value.includes('@')) {
      error.value = 'Please enter a valid email';
      return;
    }

    if (password.value.length < 6) {
      error.value = 'Password must be at least 6 characters';
      return;
    }

    if (password.value !== confirmPassword.value) {
      error.value = 'Passwords do not match';
      return;
    }

    isLoading.value = true;
    error.value = '';

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name.value,
          email: email.value,
          password: password.value
        })
      });

      const data = await response.json();

      if (!response.ok) {
        error.value = data.error || 'Registration failed';
        isLoading.value = false;
        return;
      }

      // Store token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Dispatch custom event to notify other components (like Header)
      window.dispatchEvent(new Event('elit:storage'));

      isLoading.value = false;
      router.push('/profile');
    } catch (err) {
      isLoading.value = false;
      error.value = 'Network error. Please try again.';
    }
  };

  return div({ className: 'auth-page' },
    div({ className: 'auth-container' },
      // Left side - branding
      div({ className: 'auth-branding' },
        div({ className: 'branding-content' },
          h1({ className: 'branding-title' }, 'Join Us Today'),
          p({ className: 'branding-description' },
            'Create your account and start building amazing applications in minutes.'
          ),
          div({ className: 'branding-features' },
            div({ className: 'branding-feature' },
              span({ className: 'feature-icon' }, '✓'),
              span({ className: 'feature-text' }, 'Free forever for personal projects')
            ),
            div({ className: 'branding-feature' },
              span({ className: 'feature-icon' }, '✓'),
              span({ className: 'feature-text' }, 'No credit card required')
            ),
            div({ className: 'branding-feature' },
              span({ className: 'feature-icon' }, '✓'),
              span({ className: 'feature-text' }, 'Instant setup & deployment')
            )
          )
        )
      ),

      // Right side - form
      div({ className: 'auth-form-wrapper' },
        div({ className: 'auth-form-card' },
          div({ className: 'auth-header' },
            h2({ className: 'auth-title' }, 'Create Account'),
            p({ className: 'auth-subtitle' }, 'Sign up to get started with your free account')
          ),

          reactive(error, (err) => err ? div({ className: 'auth-error' }, err) : null),

          form({ onsubmit: handleRegister },
            div({ className: 'form-group' },
              label({ htmlFor: 'name', className: 'form-label' }, 'Full Name'),
              div({ className: 'input-wrapper' },
                span({ className: 'input-icon' }, '👤'),
                input({
                  type: 'text',
                  id: 'name',
                  className: 'form-input',
                  placeholder: 'John Doe',
                  value: name.value,
                  oninput: (e: Event) => {
                    name.value = (e.target as HTMLInputElement).value;
                    error.value = '';
                  }
                })
              )
            ),

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

            div({ className: 'form-group' },
              label({ htmlFor: 'password', className: 'form-label' }, 'Password'),
              div({ className: 'input-wrapper' },
                span({ className: 'input-icon' }, '🔒'),
                input({
                  type: 'password',
                  id: 'password',
                  className: 'form-input',
                  placeholder: '••••••••',
                  value: password.value,
                  oninput: (e: Event) => {
                    password.value = (e.target as HTMLInputElement).value;
                    error.value = '';
                  }
                })
              )
            ),

            div({ className: 'form-group' },
              label({ htmlFor: 'confirmPassword', className: 'form-label' }, 'Confirm Password'),
              div({ className: 'input-wrapper' },
                span({ className: 'input-icon' }, '🔒'),
                input({
                  type: 'password',
                  id: 'confirmPassword',
                  className: 'form-input',
                  placeholder: '••••••••',
                  value: confirmPassword.value,
                  oninput: (e: Event) => {
                    confirmPassword.value = (e.target as HTMLInputElement).value;
                    error.value = '';
                  }
                })
              )
            ),

            div({ className: 'form-options' },
              label({ className: 'checkbox-label' },
                input({ type: 'checkbox', className: 'checkbox' }),
                span({ className: 'checkbox-text' }, 'I agree to the Terms of Service and Privacy Policy')
              )
            ),

            button({
              type: 'submit',
              className: 'btn btn-primary btn-block btn-lg',
              disabled: isLoading.value
            }, isLoading.value ? 'Creating account...' : 'Create Account')
          ),

          div({ className: 'auth-divider' }, 'OR'),

          div({ className: 'social-login' },
            button({ className: 'social-button' },
              span({ className: 'social-icon' }, 'G'),
              'Sign up with Google'
            ),
            button({ className: 'social-button' },
              span({ className: 'social-icon' }, 'Gh'),
              'Sign up with GitHub'
            )
          ),

          div({ className: 'auth-footer' },
            p({ className: 'footer-text' },
              'Already have an account? ',
              button({
                className: 'link-button-inline',
                onclick: () => router.push('/login')
              }, 'Sign in')
            )
          )
        )
      )
    )
  );
}
