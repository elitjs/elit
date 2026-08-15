import { div, h1, p } from '@elitjs/el';
import { render } from '@elitjs/dom';
import { TextSection } from './sections/TextSection';
import { ReactiveInputSection } from './sections/ReactiveInputSection';
import { NumberSection } from './sections/NumberSection';
import { ChoiceSection } from './sections/ChoiceSection';
import { TimingSection } from './sections/TimingSection';
import { FormSection } from './sections/FormSection';

const shellStyle: Partial<CSSStyleDeclaration> = {
    fontFamily: 'system-ui, sans-serif',
    maxWidth: '720px',
    margin: '0 auto',
    padding: '32px 16px',
    color: '#0f172a',
};

const app = div({ style: shellStyle }, [
    h1('reactive() input playground'),
    p('Every input below is bound to Elit state and re-rendered through reactive(), text(), computed(), bindValue() or bindChecked().'),
    TextSection(),
    ReactiveInputSection(),
    NumberSection(),
    ChoiceSection(),
    TimingSection(),
    FormSection(),
]);

render('root', app);
