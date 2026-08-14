import { footer, div, p, a } from '@elitjs/el';

export function Footer() {
  return footer({ className: 'footer' },
    div({ className: 'footer-content' },
      div({ className: 'footer-section' },
        p({ className: 'footer-title' }, 'My Elit App'),
        p({ className: 'footer-text' }, 'Built with Elit Framework')
      ),
      div({ className: 'footer-section' },
        a({ href: 'https://github.com', target: '_blank', className: 'footer-link' }, 'GitHub'),
        a({ href: '#', className: 'footer-link' }, 'Documentation'),
        a({ href: '#', className: 'footer-link' }, 'Support')
      ),
      div({ className: 'footer-section' },
        p({ className: 'footer-copyright' }, '© 2026 My Elit App. All rights reserved.')
      )
    )
  );
}
