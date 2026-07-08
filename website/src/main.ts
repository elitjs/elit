import { render } from '@elitjs/dom';
import { installDevTools } from '@elitjs/devtools';
import { App } from './App';
import { injectGlobalStyles } from './styles';
import { initTheme } from './theme';
import { router } from './router';

initTheme();
injectGlobalStyles();
render('#app', App);
installDevTools({ router, showPanel: false, autoTrack: true });
