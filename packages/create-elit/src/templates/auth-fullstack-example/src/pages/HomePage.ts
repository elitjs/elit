import { div, h1, h2, h3, p, button, span } from '@elitjs/el';
import { createState, reactive } from '@elitjs/state';
import type { Router } from '@elitjs/router';

export function HomePage(router: Router) {
  // Check if user is logged in
  const isLoggedIn = createState(!!localStorage.getItem('token'));
  const user = createState(() => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  });

  // Listen for storage changes
  const handleStorageChange = () => {
    isLoggedIn.value = !!localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    user.value = userStr ? JSON.parse(userStr) : null;
  };

  window.addEventListener('storage', handleStorageChange);
  window.addEventListener('elit:storage', handleStorageChange);

  return div({ className: 'home-page' },
    // Hero Section
    div({ className: 'hero-section' },
      div({ className: 'hero-content' },
        div({ className: 'hero-badge' }, '✨ New Features Available'),
        reactive(isLoggedIn, (loggedIn) => {
          if (loggedIn) {
            return [
              h1({ className: 'hero-title' },
                'Welcome back, ',
                span({ className: 'hero-highlight' }, user.value?.name || 'User')
              ),
              p({ className: 'hero-description' },
                'Continue building amazing applications with your team.'
              ),
              div({ className: 'hero-buttons' },
                button({
                  className: 'btn btn-primary btn-lg',
                  onclick: () => router.push('/chat/list')
                }, 'Go to Messages'),
                button({
                  className: 'btn btn-outline btn-lg',
                  onclick: () => router.push('/profile')
                }, 'View Profile')
              )
            ];
          }
          return [
            h1({ className: 'hero-title' },
              'Build Amazing Apps ',
              span({ className: 'hero-highlight' }, 'Faster')
            ),
            p({ className: 'hero-description' },
              'A modern full-stack TypeScript framework designed for developers who love beautiful code and stunning interfaces.'
            ),
            div({ className: 'hero-buttons' },
              button({
                className: 'btn btn-primary btn-lg',
                onclick: () => router.push('/register')
              }, 'Get Started'),
              button({
                className: 'btn btn-outline btn-lg',
                onclick: () => router.push('/login')
              }, 'Sign In')
            )
          ];
        }),
        div({ className: 'hero-stats' },
          div({ className: 'hero-stat' },
            span({ className: 'hero-stat-number' }, '10K+'),
            span({ className: 'hero-stat-label' }, 'Developers')
          ),
          div({ className: 'hero-stat' }),
          div({ className: 'hero-stat' },
            span({ className: 'hero-stat-number' }, '50K+'),
            span({ className: 'hero-stat-label' }, 'Projects')
          ),
          div({ className: 'hero-stat' }),
          div({ className: 'hero-stat' },
            span({ className: 'hero-stat-number' }, '99.9%'),
            span({ className: 'hero-stat-label' }, 'Uptime')
          )
        )
      ),
      div({ className: 'hero-visual' },
        div({ className: 'hero-card-preview' },
          div({ className: 'preview-header' },
            div({ className: 'preview-dots' },
              span({ className: 'preview-dot preview-dot-red' }),
              span({ className: 'preview-dot preview-dot-yellow' }),
              span({ className: 'preview-dot preview-dot-green' })
            )
          ),
          div({ className: 'preview-body' },
            div({ className: 'preview-line preview-line-long' }),
            div({ className: 'preview-line preview-line-medium' }),
            div({ className: 'preview-line preview-line-short' }),
            div({ className: 'preview-grid' },
              div({ className: 'preview-grid-item' }),
              div({ className: 'preview-grid-item' }),
              div({ className: 'preview-grid-item' }),
              div({ className: 'preview-grid-item' })
            )
          )
        )
      )
    ),

    // Features Section
    div({ className: 'features-section' },
      h2({ className: 'section-title' }, 'Everything You Need'),
      p({ className: 'section-subtitle' }, 'Powerful features to help you build better applications'),
      div({ className: 'features-grid' },
        div({ className: 'feature-item' },
          div({ className: 'feature-icon' }, '⚡'),
          h3({ className: 'feature-title' }, 'Lightning Fast'),
          p({ className: 'feature-description' }, 'Optimized performance with cutting-edge rendering technology')
        ),
        div({ className: 'feature-item' },
          div({ className: 'feature-icon' }, '🔒'),
          h3({ className: 'feature-title' }, 'Secure'),
          p({ className: 'feature-description' }, 'Built-in security features to protect your applications')
        ),
        div({ className: 'feature-item' },
          div({ className: 'feature-icon' }, '📱'),
          h3({ className: 'feature-title' }, 'Responsive'),
          p({ className: 'feature-description' }, 'Beautiful interfaces that work perfectly on any device')
        ),
        div({ className: 'feature-item' },
          div({ className: 'feature-icon' }, '🎨'),
          h3({ className: 'feature-title' }, 'Customizable'),
          p({ className: 'feature-description' }, 'Flexible theming system for unlimited design possibilities')
        ),
        div({ className: 'feature-item' },
          div({ className: 'feature-icon' }, '🔧'),
          h3({ className: 'feature-title' }, 'Developer Friendly'),
          p({ className: 'feature-description' }, 'TypeScript-first with excellent tooling and DX')
        ),
        div({ className: 'feature-item' },
          div({ className: 'feature-icon' }, '🚀'),
          h3({ className: 'feature-title' }, 'Easy Deployment'),
          p({ className: 'feature-description' }, 'Deploy anywhere with minimal configuration required')
        )
      )
    ),

    // CTA Section
    reactive(isLoggedIn, (loggedIn) => {
      if (loggedIn) {
        return null; // Don't show CTA for logged in users
      }
      return div({ className: 'cta-section' },
        div({ className: 'cta-content' },
          h2({ className: 'cta-title' }, 'Ready to Get Started?'),
          p({ className: 'cta-description' }, 'Join thousands of developers building amazing applications'),
          button({
            className: 'btn btn-primary btn-lg cta-button',
            onclick: () => router.push('/register')
          }, 'Start Building Now')
        )
      );
    })
  );
}
