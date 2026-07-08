import { div, main } from '@elitjs/el';
import { reactive } from '@elitjs/state';
import { AppFooter } from './components/AppFooter';
import { AppHeader } from './components/AppHeader';
import { router, RouterView } from './router';

export const App = () =>
	div({ className: 'app-shell' },
		div({ className: 'ambient-orb ambient-orb-one' }),
		div({ className: 'ambient-orb ambient-orb-two' }),
		AppHeader(router),
		main({ className: 'app-main' },
			reactive(router.currentRoute, () => RouterView())
		),
		AppFooter()
	);