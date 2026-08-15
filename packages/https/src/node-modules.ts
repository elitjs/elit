import { createRequire } from 'node:module';
import { isNode } from '@elitjs/runtime';

const require = (() => {
  // The test runner evaluates this source as CJS where __filename is injected and
  // import.meta.url is undefined; real ESM builds are the reverse.
  try {
    return createRequire(__filename);
  } catch {
    return createRequire(import.meta.url);
  }
})();

let https: any;

if (isNode && typeof process !== 'undefined') {
  try {
    https = require('node:https');
  } catch {
    https = require('https');
  }
}

export { https };
