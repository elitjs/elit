#!/usr/bin/env node

import { main } from '@elitjs/cli';

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
