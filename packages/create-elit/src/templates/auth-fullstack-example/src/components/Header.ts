import { header, nav, div, h1, button, span } from '@elitjs/el';
import { createState, reactive } from '@elitjs/state';
import { routerLink } from '@elitjs/router';
import type { Router } from '@elitjs/router';

export function Header(router: Router) {
  // Check if user is logged in (has token in localStorage)
  const isLoggedIn = createState(!!localStorage.getItem('token'));
  const user = createState(() => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  });

  // Listen for storage changes to update header when login/logout happens
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'token' || e.key === 'user') {
      isLoggedIn.value = !!localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      user.value = userStr ? JSON.parse(userStr) : null;
    }
  };

  // Also listen for custom storage events (same-tab updates)
  const handleCustomStorageChange = () => {
    isLoggedIn.value = !!localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    user.value = userStr ? JSON.parse(userStr) : null;
  };

  window.addEventListener('storage', handleStorageChange);
  window.addEventListener('elit:storage', handleCustomStorageChange);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    isLoggedIn.value = false;
    router.push('/');
  };

  return header({ className: 'header' },
    nav({ className: 'nav' },
      div({ className: 'nav-brand' },
        routerLink(router, { to: '/', className: 'brand-link' },
          h1({ className: 'brand-title' }, 'ELIT_PROJECT_NAME')
        )
      ),

      reactive(isLoggedIn, (loggedIn) => {
        if (loggedIn) {
          return div({ className: 'nav-menu' },
            routerLink(router, { to: '/chat/list', className: 'nav-link' }, 'Messages'),
            routerLink(router, { to: '/profile', className: 'nav-link' }, 'Profile'),
            reactive(user, (u) => u ? span({ className: 'nav-user' }, `Welcome, ${u.name}`) : null),
            button({
              className: 'btn btn-secondary btn-sm',
              onclick: handleLogout
            }, 'Logout')
          );
        }

        return div({ className: 'nav-menu' },
          routerLink(router, { to: '/login', className: 'nav-link' }, 'Login'),
          button({
            className: 'btn btn-primary btn-sm',
            onclick: () => router.push('/register')
          }, 'Sign Up')
        );
      })
    )
  );
}
