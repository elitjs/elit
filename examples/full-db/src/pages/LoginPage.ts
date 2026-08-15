import { div, h1, h2, p, input, label, button, form, span } from '@elitjs/el';
import { createState, reactive } from '@elitjs/state';
import type { Router } from '@elitjs/router';

export function LoginPage(router: Router) {
  // Check if already logged in
  const token = localStorage.getItem('token');
  if (token) {
    router.push('/profile');
  }

  const email = createState('');
  const password = createState('');
  const error = createState('');
  const isLoading = createState(false);

  const handleLogin = async (e: Event) => {
    e.preventDefault();

    if (!email.value || !password.value) {
      error.value = 'Please fill in all fields';
      return;
    }

    if (!email.value.includes('@')) {
      error.value = 'Please enter a valid email';
      return;
    }

    isLoading.value = true;
    error.value = '';

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.value,
          password: password.value
        })
      });

      const data = await response.json();

      if (!response.ok) {
        error.value = data.error || 'Login failed';
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
          h1({ className: 'branding-title' }, 'Welcome Back'),
          p({ className: 'branding-description' },
            'Sign in to continue to your account and access all features.'
          ),
          div({ className: 'branding-features' },
            div({ className: 'branding-feature' },
              span({ className: 'feature-icon' }, '✓'),
              span({ className: 'feature-text' }, 'Lightning fast performance')
            ),
            div({ className: 'branding-feature' },
              span({ className: 'feature-icon' }, '✓'),
              span({ className: 'feature-text' }, 'Secure and reliable')
            ),
            div({ className: 'branding-feature' },
              span({ className: 'feature-icon' }, '✓'),
              span({ className: 'feature-text' }, '24/7 support available')
            )
          )
        )
      ),

      // Right side - form
      div({ className: 'auth-form-wrapper' },
        div({ className: 'auth-form-card' },
          div({ className: 'auth-header' },
            h2({ className: 'auth-title' }, 'Sign In'),
            p({ className: 'auth-subtitle' }, 'Enter your credentials to access your account')
          ),

          reactive(error, (err) => err ? div({ className: 'auth-error' }, err) : null),

          form({ onsubmit: handleLogin },
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

            div({ className: 'form-options' },
              label({ className: 'checkbox-label' },
                input({ type: 'checkbox', className: 'checkbox' }),
                span({ className: 'checkbox-text' }, 'Remember me')
              ),
              button({ type: 'button', className: 'link-button', onclick: () => router.push('/forgot-password') }, 'Forgot password?')
            ),

            button({
              type: 'submit',
              className: 'btn btn-primary btn-block btn-lg',
              disabled: isLoading.value
            }, isLoading.value ? 'Signing in...' : 'Sign In')
          ),

          div({ className: 'auth-divider' }, 'OR'),

          div({ className: 'social-login' },
            button({ className: 'social-button' },
              span({ className: 'social-icon' }, 'G'),
              'Continue with Google'
            ),
            button({ className: 'social-button' },
              span({ className: 'social-icon' }, 'Gh'),
              'Continue with GitHub'
            )
          ),

          div({ className: 'auth-footer' },
            p({ className: 'footer-text' },
              "Don't have an account? ",
              button({
                className: 'link-button-inline',
                onclick: () => router.push('/register')
              }, 'Sign up')
            )
          )
        )
      )
    )
  );
}
