import { setDesktopRenderOptions } from '@elitjs/render-context';

import './web-main';

const interactionFile = process.env.ELIT_DESKTOP_SMOKE_INTERACTION_FILE;
const interactionStdout = process.env.ELIT_DESKTOP_SMOKE_STDOUT === '1';

setDesktopRenderOptions({
	autoClose: true,
	...((interactionFile || interactionStdout)
		? {
			interactionOutput: {
				emitReady: true,
				...(interactionFile ? { file: interactionFile } : {}),
				...(interactionStdout ? { stdout: true } : {}),
			},
		}
		: {}),
});
