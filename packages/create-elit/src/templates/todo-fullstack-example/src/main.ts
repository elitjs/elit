import { dom } from '@elitjs/dom';
import { injectStyles } from './styles';
import { App } from './web';

injectStyles();

dom.render('#app', App());
