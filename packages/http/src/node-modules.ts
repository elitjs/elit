import { createRequire } from 'node:module';
import { isNode } from '@elitjs/runtime';

const require = createRequire(import.meta.url);

let http: any;
let https: any;

if (isNode && typeof process !== 'undefined') {
  try {
    http = require('node:http');
    https = require('node:https');
  } catch {
    http = require('http');
    https = require('https');
  }
}

export { http, https };
