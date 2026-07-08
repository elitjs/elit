import { footer, div, p, a } from '@elitjs/el';

export function Footer() {
  const today = new Date();
  const year = today.getFullYear();

  return footer({ className: 'footer' },
    div({ className: 'footer-content' },
      div({ className: 'footer-section' },
        p({ className: 'footer-title' }, 'ELIT_PROJECT_NAME'),
        p({ className: 'footer-text' }, 'Built with Elit Framework')
      ),
      div({ className: 'footer-section' },
        a({ href: 'https://github.com/n-devs', target: '_blank', className: 'footer-link' }, 'GitHub'),
        a({ href: 'https://d-osc.github.io/elit/#/docs', className: 'footer-link' }, 'Documentation'),
        a({ href: '#', className: 'footer-link' }, 'Support')
      ),
      div({ className: 'footer-section' },
        p({ className: 'footer-copyright' }, `© ${year} ELIT_PROJECT_NAME. All rights reserved.`)
      )
    )
  );
}
