/**
 * Path module examples
 * Cross-runtime path operations compatible with Node.js 'path' module
 */

import {
  join,
  resolve,
  dirname,
  basename,
  extname,
  normalize,
  relative,
  isAbsolute,
  parse,
  format,
  sep,
  delimiter,
  posix,
  win32,
  getRuntime
} from '@elitjs/path';

console.log('=== Path Module Examples ===\n');
console.log('Runtime:', getRuntime());
console.log('Platform separator:', sep);
console.log('Platform delimiter:', delimiter);
console.log('');

// Join paths
console.log('--- join() ---');
console.log('join("foo", "bar", "baz"):', join('foo', 'bar', 'baz'));
console.log('join("/foo", "bar", "../baz"):', join('/foo', 'bar', '../baz'));
console.log('');

// Resolve paths
console.log('--- resolve() ---');
console.log('resolve("foo", "bar", "baz"):', resolve('foo', 'bar', 'baz'));
console.log('resolve("/foo", "bar"):', resolve('/foo', 'bar'));
console.log('');

// Normalize paths
console.log('--- normalize() ---');
console.log('normalize("/foo/bar//baz/asdf/quux/.."):', normalize('/foo/bar//baz/asdf/quux/..'));
console.log('normalize("foo/bar/../baz"):', normalize('foo/bar/../baz'));
console.log('');

// Get directory name
console.log('--- dirname() ---');
console.log('dirname("/foo/bar/baz.txt"):', dirname('/foo/bar/baz.txt'));
console.log('dirname("foo/bar.txt"):', dirname('foo/bar.txt'));
console.log('');

// Get base name
console.log('--- basename() ---');
console.log('basename("/foo/bar/baz.txt"):', basename('/foo/bar/baz.txt'));
console.log('basename("/foo/bar/baz.txt", ".txt"):', basename('/foo/bar/baz.txt', '.txt'));
console.log('');

// Get extension
console.log('--- extname() ---');
console.log('extname("index.html"):', extname('index.html'));
console.log('extname("index.coffee.md"):', extname('index.coffee.md'));
console.log('extname("index."):', extname('index.'));
console.log('');

// Check if absolute
console.log('--- isAbsolute() ---');
console.log('isAbsolute("/foo/bar"):', isAbsolute('/foo/bar'));
console.log('isAbsolute("foo/bar"):', isAbsolute('foo/bar'));
console.log('isAbsolute("."):', isAbsolute('.'));
console.log('');

// Get relative path
console.log('--- relative() ---');
console.log('relative("/data/orandea/test/aaa", "/data/orandea/impl/bbb"):',
  relative('/data/orandea/test/aaa', '/data/orandea/impl/bbb'));
console.log('');

// Parse path
console.log('--- parse() ---');
const parsed = parse('/home/user/dir/file.txt');
console.log('parse("/home/user/dir/file.txt"):');
console.log('  root:', parsed.root);
console.log('  dir:', parsed.dir);
console.log('  base:', parsed.base);
console.log('  ext:', parsed.ext);
console.log('  name:', parsed.name);
console.log('');

// Format path
console.log('--- format() ---');
const formatted = format({
  dir: '/home/user/dir',
  base: 'file.txt'
});
console.log('format({ dir: "/home/user/dir", base: "file.txt" }):', formatted);
console.log('');

// POSIX operations
console.log('--- posix ---');
console.log('posix.join("foo", "bar", "baz"):', posix.join('foo', 'bar', 'baz'));
console.log('posix.dirname("/foo/bar/baz"):', posix.dirname('/foo/bar/baz'));
console.log('');

// Windows operations
console.log('--- win32 ---');
console.log('win32.join("foo", "bar", "baz"):', win32.join('foo', 'bar', 'baz'));
console.log('win32.dirname("C:\\\\foo\\\\bar\\\\baz"):', win32.dirname('C:\\foo\\bar\\baz'));
console.log('');

// Common use cases
console.log('--- Common Use Cases ---');

// Get file extension
const filepath = '/path/to/file.js';
console.log('File:', filepath);
console.log('Extension:', extname(filepath));

// Change extension
const newPath = join(dirname(filepath), basename(filepath, '.js') + '.ts');
console.log('New path (change .js to .ts):', newPath);

// Join relative paths
const configPath = join('config', 'settings.json');
console.log('Config path:', configPath);

// Get absolute path
const absolutePath = resolve('src', 'index.ts');
console.log('Absolute path:', absolutePath);
