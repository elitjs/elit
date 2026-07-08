export * from './cli/index';

import { main } from './cli/index';

function isDirectCliExecution(): boolean {
    if (typeof require !== 'undefined' && typeof module !== 'undefined') {
        return require.main === module;
    }

    const entry = process.argv[1]?.replace(/\\/g, '/');
    return Boolean(entry && /\/cli(?:\.(?:[cm]?js|[cm]?ts))?$/.test(entry));
}

if (isDirectCliExecution()) {
    main().catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}