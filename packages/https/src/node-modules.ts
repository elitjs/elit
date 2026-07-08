import { createRequire } from 'node:module';
import { isNode } from '@elitjs/runtime';

const require = createRequire(import.meta.url);

let https: any;

if (isNode && typeof process !== 'undefined') {
  try {
    https = require('node:https');
  } catch {
    https = require('https');
  }
}

export { https };
