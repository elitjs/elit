import { div, main } from '@elitjs/el';
import { reactive } from '@elitjs/state';
import { dom } from '@elitjs/dom';
import { injectStyles } from './styles';
import { router, RouterView } from './router';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

injectStyles()
// Create reactive state (shared between SSR and client)
// Main App
const App = () =>
  div(
    Header(router),
    main(
      reactive(router.currentRoute, () => RouterView())
    ),
    Footer()
  );

// Render
dom.render('#app', App());