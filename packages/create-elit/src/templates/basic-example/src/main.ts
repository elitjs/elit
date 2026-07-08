import { button, div, h1, h2, p, section, span } from '@elitjs/el';
import { dom } from '@elitjs/dom';
import { createState, reactive } from '@elitjs/state';
import { injectStyles } from './styles';

const count = createState(0);

const highlights = [
  {
    title: 'Minimal setup',
    body: 'Start with one page, one entry file, and enough styling to shape your own direction quickly.'
  },
  {
    title: 'Reactive by default',
    body: 'The counter panel is deliberately small so you can replace it with your real state and interactions.'
  },
  {
    title: 'Ready to extend',
    body: 'Keep this starter simple for small tools, or grow it into a larger app with routing, APIs, and persistence later.'
  }
];

const nextSteps = [
  'Rename the placeholder copy to fit your project.',
  'Replace the counter with your first real feature.',
  'Use elit.config.ts as the place to add build, mobile, or desktop tweaks.'
];

function HighlightCard(title: string, body: string) {
  return div({ className: 'highlight-card' },
    h2({ className: 'highlight-title' }, title),
    p({ className: 'highlight-copy' }, body)
  );
}

function StepItem(index: number, label: string) {
  return div({ className: 'step-item' },
    span({ className: 'step-index' }, String(index).padStart(2, '0')),
    p({ className: 'step-copy' }, label)
  );
}

function App() {
  return div({ className: 'app-shell' },
    section({ className: 'hero-panel' },
      div({ className: 'hero-copy' },
        span({ className: 'hero-kicker' }, 'basic-example'),
        h1({ className: 'hero-title' }, 'A clean Elit starter for small ideas and fast prototypes.'),
        p({ className: 'hero-description' },
          'Use this template when you want the simplest possible starting point with a tasteful UI, one reactive example, and room to reshape the structure immediately.'
        ),
        div({ className: 'hero-actions' },
          button({ className: 'btn btn-primary', onclick: () => count.value += 1 }, 'Try the counter'),
          button({ className: 'btn btn-secondary', onclick: () => count.value = 0 }, 'Reset')
        )
      ),
      div({ className: 'counter-panel' },
        span({ className: 'counter-label' }, 'Reactive state'),
        reactive(count, (value: number) =>
          div({ className: 'counter-value' }, String(value))
        ),
        p({ className: 'counter-copy' }, 'This is intentionally small. Swap it for your first form, dashboard metric, or workflow state without undoing a heavy starter.'),
        div({ className: 'counter-row' },
          button({ className: 'btn btn-ghost', onclick: () => count.value -= 1 }, 'Decrease'),
          button({ className: 'btn btn-primary', onclick: () => count.value += 1 }, 'Increase')
        )
      )
    ),
    section({ className: 'content-grid' },
      div({ className: 'panel' },
        h2({ className: 'section-title' }, 'Why this starter exists'),
        p({ className: 'section-copy' }, 'Not every new project needs auth, a database, or a multi-page workflow on day one. This template keeps the footprint low while still feeling intentional.'),
        div({ className: 'highlight-grid' },
          ...highlights.map((item) => HighlightCard(item.title, item.body))
        )
      ),
      div({ className: 'panel panel-accent' },
        h2({ className: 'section-title section-title-light' }, 'First moves'),
        p({ className: 'section-copy section-copy-light' }, 'A good starter should disappear quickly. Use these as the first edits after scaffolding the app.'),
        div({ className: 'steps-list' },
          ...nextSteps.map((step, index) => StepItem(index + 1, step))
        )
      )
    )
  );
}

injectStyles();
dom.render('#app', App());