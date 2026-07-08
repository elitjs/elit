import { createRequire } from 'node:module';
import { isNode, isBun } from '@elitjs/runtime';

// Pre-load fs module for Node.js and Bun
let fs: any;
let fsPromises: any;

if (isNode || isBun) {
  const require = createRequire(import.meta.url);
  fs = require('fs');
  fsPromises = require('fs/promises');
}

export { fs, fsPromises };
